const Order = require('../models/order.model');
const pricingService = require('./pricing.service');

/**
 * Service xử lý logic đơn hàng (Order Domain Logic)
 */
const orderService = {
  /**
   * Xem trước báo giá cước phí
   */
  async getQuotePreview(data) {
    const { items, dimensions, actualWeight, isCod, codAmount, goodsValue, discountCode } = data;
    return pricingService.calculateShippingFee({
      items,
      dimensions,
      actualWeight,
      isCod,
      codAmount,
      goodsValue,
      discountCode
    });
  },

  /**
   * Tạo đơn hàng mới
   */
  async createNewOrder(sellerId, data, idempotencyKey) {
    if (idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey });
      if (existing) {
        return { statusCode: 200, message: 'Đơn hàng đã tồn tại (Idempotent)', order: existing };
      }
    }

    // Sinh mã vận đơn tự động nếu chưa có
    const trackingCode = data.trackingCode || `ELG-VN-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;

    const calcFee = await pricingService.calculateShippingFee(data);

    const newOrder = new Order({
      ...data,
      trackingCode,
      sellerId,
      idempotencyKey,
      chargeableWeight: calcFee.chargeableWeight || data.actualWeight,
      baseFee: calcFee.baseFee || 30000,
      insuranceFee: calcFee.insuranceFee || 0,
      shippingFee: calcFee.totalFee || data.shippingFee || 30000,
      status: data.status || 'CREATED'
    });

    await newOrder.save();
    return { statusCode: 201, message: 'Tạo đơn hàng thành công', order: newOrder };
  },

  /**
   * Cập nhật thông tin đơn hàng
   */
  async updateExistingOrder(userId, isAdmin, id, data) {
    let query = { _id: id };
    if (!isAdmin) query.sellerId = userId;

    const order = await Order.findOne(query);
    if (!order) {
      const err = new Error('Không tìm thấy đơn hàng hoặc không có quyền truy cập');
      err.statusCode = 404;
      throw err;
    }

    if (!['DRAFT', 'CREATED', 'PENDING_VERIFICATION'].includes(order.status) && !isAdmin) {
      const err = new Error(`Không thể chỉnh sửa đơn hàng đang ở trạng thái ${order.status}`);
      err.statusCode = 400;
      throw err;
    }

    Object.assign(order, data);
    await order.save();
    return { message: 'Cập nhật đơn hàng thành công', order };
  },

  /**
   * Hủy 1 đơn hàng
   */
  async cancelOrder(userId, isAdmin, id, data) {
    let query = { _id: id };
    if (!isAdmin) query.sellerId = userId;

    const order = await Order.findOne(query);
    if (!order) {
      const err = new Error('Không tìm thấy đơn hàng để hủy');
      err.statusCode = 404;
      throw err;
    }

    const unCancellable = ['DELIVERED', 'RETURNED', 'CANCELLED'];
    if (unCancellable.includes(order.status)) {
      const err = new Error(`Không thể hủy đơn hàng ở trạng thái ${order.status}`);
      err.statusCode = 400;
      throw err;
    }

    const wasRouted = Boolean(order.currentDriverId || order.currentDriver?.driverId);

    order.status = 'CANCELLED';
    order.cancelReason = data?.reason || 'Hủy bởi người dùng';
    order.cancelNote = data?.customReason || data?.note || '';
    order.cancelledBy = userId;
    order.cancelledAt = new Date();

    await order.save();
    return { cancelledOrder: order, wasRouted };
  },

  /**
   * Hủy hàng loạt đơn hàng
   */
  async bulkCancelOrders(userId, isAdmin, data) {
    const { orderIds, reason } = data;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      const err = new Error('Vui lòng cung cấp danh sách orderIds dạng mảng');
      err.statusCode = 400;
      throw err;
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const id of orderIds) {
      try {
        const res = await this.cancelOrder(userId, isAdmin, id, { reason });
        results.push({ id, success: true, order: res.cancelledOrder, wasRouted: res.wasRouted });
        successCount++;
      } catch (err) {
        results.push({ id, success: false, error: err.message });
        failedCount++;
      }
    }

    return { total: orderIds.length, successCount, failedCount, results };
  },

  /**
   * Tra cứu & Lọc danh sách đơn hàng cho Admin / Seller
   */
  async searchSellerOrders(sellerId, isAdmin, query) {
    const {
      search,
      status,
      riskFlag,
      hub,
      page = 1,
      limit = 20
    } = query;

    const filter = {};
    if (!isAdmin) {
      filter.sellerId = sellerId;
    }

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (riskFlag && riskFlag !== 'ANY') {
      if (riskFlag === 'COD_ANOMALY') filter.flagCodAnomaly = true;
      if (riskFlag === 'FEE_WARNING') filter.flagFeeWarning = true;
      if (riskFlag === 'MANUAL_ROUTING') filter.needsManualRouting = true;
    }

    const andConditions = [];

    if (hub && hub !== 'GLOBAL') {
      const hubOrConditions = [{ pickupHub: hub }, { deliveryHub: hub }];
      if (mongoose.Types.ObjectId.isValid(hub)) {
        hubOrConditions.push({ currentHubId: hub });
      }
      andConditions.push({ $or: hubOrConditions });
    }

    if (search) {
      // Escape special regex characters in search input
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      andConditions.push({
        $or: [
          { trackingCode: searchRegex },
          { 'deliveryAddress.fullName': searchRegex },
          { 'deliveryAddress.phone': searchRegex },
          { 'pickupAddress.fullName': searchRegex },
          { 'pickupAddress.phone': searchRegex }
        ]
      });
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const orders = await Order.find(filter)
      .populate('sellerId', 'fullName email phoneNumber companyName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Order.countDocuments(filter);

    return {
      orders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  },

  /**
   * Tra cứu công khai cho Khách mua
   */
  async getPublicOrderTracking(trackingCode, phoneLast4) {
    const order = await Order.findOne({ trackingCode });
    if (!order) {
      const err = new Error('Không tìm thấy thông tin vận đơn với mã này');
      err.statusCode = 404;
      throw err;
    }

    if (phoneLast4) {
      const receiverPhone = order.deliveryAddress?.phone || '';
      if (!receiverPhone.endsWith(phoneLast4)) {
        const err = new Error('4 số cuối số điện thoại không trùng khớp');
        err.statusCode = 400;
        throw err;
      }
    }

    return {
      trackingCode: order.trackingCode,
      status: order.status,
      deliveryAddress: {
        district: order.deliveryAddress?.district,
        province: order.deliveryAddress?.province
      },
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  },

  /**
   * Cập nhật trạng thái đơn hàng
   */
  async updateOrderStatus(userId, isAdmin, id, status, note) {
    let query = { _id: id };
    if (!isAdmin) query.sellerId = userId;

    const order = await Order.findOne(query);
    if (!order) {
      const err = new Error('Không tìm thấy đơn hàng');
      err.statusCode = 404;
      throw err;
    }

    order.status = status;
    if (note) order.cancelNote = note;
    await order.save();
    return order;
  }
};

module.exports = orderService;
