const mongoose = require('mongoose');
const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');
const PickupConfirmation = require('../models/pickupConfirmation.model');
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

    // Tự động tính actualWeight từ items nếu client không gửi trực tiếp
    let actualWeight = data.actualWeight;
    if (actualWeight === undefined || actualWeight === null || Number(actualWeight) <= 0) {
      if (Array.isArray(data.items) && data.items.length > 0) {
        actualWeight = data.items.reduce((sum, item) => sum + (Number(item.weight) || 0) * (Number(item.quantity) || 1), 0);
      }
    }
    actualWeight = Math.max(0.1, Number(actualWeight) || 0.5);

    const calcFee = await pricingService.calculateShippingFee({ ...data, actualWeight });

    const newOrder = new Order({
      ...data,
      actualWeight,
      trackingCode,
      sellerId,
      idempotencyKey,
      volumetricWeight: calcFee.volumetricWeight || 0,
      chargeableWeight: calcFee.chargeableWeight || actualWeight,
      baseFee: calcFee.baseFee || 30000,
      insuranceFee: calcFee.insuranceFee || 0,
      discountAmount: calcFee.discountAmount || 0,
      discountCode: data.discountCode || null,
      shippingFee: calcFee.shippingFee || data.shippingFee || 30000,
      pickupHub: calcFee.pickupHub || null,
      deliveryHub: calcFee.deliveryHub || null,
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
  },

  /**
   * UC-12: Xác minh đơn hàng khi Shipper quét mã (Verify Pickup Scan)
   */
  async verifyPickupScan(user, trackingCode) {
    const code = trackingCode ? trackingCode.trim().toUpperCase() : '';
    let order = await Order.findOne({ trackingCode: code });

    if (!order && mongoose.Types.ObjectId.isValid(trackingCode)) {
      order = await Order.findById(trackingCode);
    }

    if (!order) {
      const err = new Error(`Không tìm thấy đơn hàng với mã "${code}"`);
      err.statusCode = 404;
      throw err;
    }

    if (order.status === 'CANCELLED') {
      const err = new Error(`Không thể lấy hàng! Đơn hàng [${order.trackingCode}] đã bị HỦY trước đó.`);
      err.statusCode = 409;
      throw err;
    }

    if (order.status === 'CREATED' || order.status === 'DRAFT' || order.status === 'PENDING_VERIFICATION') {
      const err = new Error(`Không thể lấy hàng! Đơn hàng [${order.trackingCode}] mới ở trạng thái "${order.status}" (Chưa chuẩn bị xong). Yêu cầu Seller bấm "Chuẩn Bị Xong" trước.`);
      err.statusCode = 400;
      throw err;
    }

    if (order.status === 'PICKED_UP' || order.status === 'DELIVERED') {
      const err = new Error(`Đơn hàng [${order.trackingCode}] đã được lấy hoặc giao thành công trước đó.`);
      err.statusCode = 400;
      throw err;
    }

    const allowedStatuses = ['READY_TO_PICK', 'PICKING'];
    if (!allowedStatuses.includes(order.status)) {
      const err = new Error(`Đơn hàng [${order.trackingCode}] đang ở trạng thái "${order.status}", không hợp lệ để lấy hàng.`);
      err.statusCode = 400;
      throw err;
    }

    return {
      valid: true,
      order: {
        _id: order._id,
        trackingCode: order.trackingCode,
        status: order.status,
        actualWeight: order.actualWeight,
        chargeableWeight: order.chargeableWeight
      },
      message: `Đơn hàng [${order.trackingCode}] hợp lệ và sẵn sàng lấy hàng!`
    };
  },

  /**
   * UC-12: Xác nhận lấy hàng (Confirm Pickup)
   */
  async confirmPickup(user, orderId, data = {}) {
    const {
      trackingCode,
      scannedCode,
      signatureImageUrl,
      gpsLat,
      gpsLng,
      actualWeight,
      dimensions,
      clientOfflineId,
      note
    } = data;

    // 1. Kiểm tra Idempotency cho Offline Queue
    if (clientOfflineId) {
      const existingProof = await PickupConfirmation.findOne({ clientOfflineId });
      if (existingProof) {
        const order = await Order.findById(existingProof.orderId);
        return {
          order,
          confirmation: existingProof,
          message: 'Xác nhận lấy hàng đã được ghi nhận trước đó (Offline Sync)'
        };
      }
    }

    // 2. Tìm đơn hàng bằng ObjectId hoặc trackingCode
    let order;
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId);
    }
    if (!order && (trackingCode || scannedCode || orderId)) {
      const code = trackingCode || scannedCode || orderId;
      order = await Order.findOne({ trackingCode: code });
    }

    if (!order) {
      const err = new Error('Không tìm thấy đơn hàng');
      err.statusCode = 404;
      throw err;
    }

    // 2b. TC_UC12_11: State Machine Guard
    if (order.status === 'CANCELLED') {
      const err = new Error(`Không thể lấy hàng! Đơn hàng [${order.trackingCode}] đã bị HỦY trước đó.`);
      err.statusCode = 409;
      throw err;
    }

    if (order.status === 'CREATED' || order.status === 'DRAFT' || order.status === 'PENDING_VERIFICATION') {
      const err = new Error(`Không thể lấy hàng! Đơn hàng [${order.trackingCode}] mới ở trạng thái "${order.status}" (Chưa chuẩn bị xong). Yêu cầu Seller bấm "Chuẩn Bị Xong" (READY_TO_PICK) trước.`);
      err.statusCode = 400;
      throw err;
    }

    if (order.status === 'PICKED_UP' || order.status === 'DELIVERED') {
      const err = new Error(`Đơn hàng [${order.trackingCode}] đã được lấy hoặc giao thành công trước đó.`);
      err.statusCode = 400;
      throw err;
    }

    // 2c. TC_UC12_12: Driver Assignment / Ownership Guard
    const assignedDriver = order.assignedDriverId || order.assignedShipperId;
    if (assignedDriver && user && (user.role === 'DRIVER' || user.role === 'SHIPPER') && assignedDriver.toString() !== user._id.toString()) {
      const err = new Error('Đơn hàng không nằm trong danh sách tuyến thu gom được gán cho bạn.');
      err.statusCode = 403;
      throw err;
    }

    // 3. Alt Flow 7.1: Đối chiếu mã quét
    const checkCode = scannedCode || trackingCode;
    if (checkCode && checkCode.toUpperCase() !== order.trackingCode.toUpperCase()) {
      const err = new Error('Mã vận đơn không khớp.');
      err.statusCode = 400;
      throw err;
    }

    // 4. Bắt buộc chữ ký Seller (Trừ khi client gửi URL chữ ký hợp lệ)
    if (!signatureImageUrl || typeof signatureImageUrl !== 'string' || signatureImageUrl.trim() === '') {
      const err = new Error('Yêu cầu chữ ký Seller xác thực bàn giao.');
      err.statusCode = 400;
      throw err;
    }

    // 5. Kiểm tra trạng thái đơn hợp lệ (Theo UC-12 Pre-condition: Đơn phải ở trạng thái READY_TO_PICK / PICKING)
    const allowedStatuses = ['READY_TO_PICK', 'PICKING'];
    if (!allowedStatuses.includes(order.status)) {
      const err = new Error(`Không thể lấy hàng! Đơn hàng [${order.trackingCode}] đang ở trạng thái "${order.status}", không hợp lệ để lấy hàng.`);
      err.statusCode = 400;
      throw err;
    }

    // 6. Xử lý Alt Flow 8.1 & TC_UC12_13: Chênh lệch khối lượng (Cân nặng & Thể tích quy đổi)
    let weightDiscrepancy = false;
    let surchargeFee = 0;

    const hasNewWeight = (actualWeight !== undefined && actualWeight !== null) || (dimensions && typeof dimensions === 'object');
    let targetWeight = actualWeight !== undefined && actualWeight !== null ? Number(actualWeight) : (order.chargeableWeight || order.actualWeight || 0);
    if (dimensions && typeof dimensions === 'object') {
      const { length = 0, width = 0, height = 0 } = dimensions;
      const volWeight = (Number(length) * Number(width) * Number(height)) / 5000;
      targetWeight = Math.max(targetWeight, volWeight);
    }

    if (hasNewWeight && targetWeight > 0 && targetWeight !== (order.chargeableWeight || order.actualWeight)) {
      const oldWeight = order.chargeableWeight || order.actualWeight || 0;
      weightDiscrepancy = true;

      if (targetWeight > oldWeight) {
        const extraKg = Math.ceil(targetWeight - oldWeight);
        surchargeFee = extraKg * 5000;
      }

      order.actualWeight = actualWeight !== undefined && actualWeight !== null ? Number(actualWeight) : order.actualWeight;
      order.chargeableWeight = targetWeight;
      order.weightDiscrepancy = true;
      order.surchargeFee = surchargeFee;
      order.shippingFee = (order.shippingFee || 0) + surchargeFee;
    }

    // 6b. TC_UC12_14: Yêu cầu ảnh chụp kiện hàng thực tế khi có chênh lệch khối lượng/kích thước
    const parcelPhoto = data.parcelImageUrl || (data.proofPhotoUrls && data.proofPhotoUrls[0]);
    if (weightDiscrepancy && !parcelPhoto) {
      const err = new Error('Bắt buộc chụp ảnh kiện hàng đối chứng khi phát hiện lệch cân nặng/kích thước.');
      err.statusCode = 422;
      throw err;
    }

    // 7. Ex 9.1: GPS Check
    const hasGps = gpsLat !== undefined && gpsLat !== null && gpsLng !== undefined && gpsLng !== null;
    const gpsMissing = !hasGps;

    // 8. Cập nhật trạng thái Order
    const preStatus = order.status;
    order.status = 'PICKED_UP';
    order.pickedAt = new Date();
    await order.save();

    // 9. Lưu ePOH (PickupConfirmation)
    const confirmation = await PickupConfirmation.create({
      orderId: order._id,
      shipperId: user._id,
      signatureImageUrl,
      proofPhotoUrls: parcelPhoto ? [parcelPhoto] : [],
      gpsLat: hasGps ? Number(gpsLat) : null,
      gpsLng: hasGps ? Number(gpsLng) : null,
      gpsMissing,
      actualWeight: order.actualWeight,
      weightDiscrepancy,
      surchargeFee,
      clientOfflineId,
      confirmedAt: new Date()
    });

    // 10. Ghi nhận Audit Log
    try {
      await OrderLog.create({
        orderId: order._id,
        actionBy: user._id,
        preStatus,
        postStatus: 'PICKED_UP',
        actionType: 'PICKED_UP',
        trackingCode: order.trackingCode,
        note: `Xác nhận lấy hàng thành công (Shipper: ${user.fullName || user._id})`,
        metadata: {
          surchargeFee,
          weightDiscrepancy,
          gpsMissing,
          clientOfflineId
        }
      });
    } catch (logErr) {
      console.error(`[OrderLog] Failed to log pickup confirmation: ${logErr.message}`);
    }

    return {
      order,
      confirmation,
      message: 'Xác nhận lấy hàng thành công'
    };
  },

  /**
   * UC-12: Ghi nhận lấy hàng thất bại (Pickup Failed)
   */
  async pickupFailed(user, orderId, data = {}) {
    const { reason, note, trackingCode } = data;
    const failReason = reason || note || 'SELLER_REFUSED_SIGNATURE';

    let order;
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId);
    }
    if (!order && (trackingCode || orderId)) {
      const code = trackingCode || orderId;
      order = await Order.findOne({ trackingCode: code });
    }

    if (!order) {
      const err = new Error('Không tìm thấy đơn hàng');
      err.statusCode = 404;
      throw err;
    }

    const preStatus = order.status;
    order.status = 'PICKUP_FAILED';
    order.cancelNote = `Lấy hàng thất bại: ${failReason}`;
    await order.save();

    try {
      await OrderLog.create({
        orderId: order._id,
        actionBy: user._id,
        preStatus,
        postStatus: 'PICKUP_FAILED',
        actionType: 'PICKUP_FAILED',
        trackingCode: order.trackingCode,
        note: `Ghi nhận lấy hàng thất bại: ${failReason}`
      });
    } catch (logErr) {
      console.error(`[OrderLog] Failed to log pickup failure: ${logErr.message}`);
    }

    return {
      order,
      message: 'Đã ghi nhận lấy hàng thất bại'
    };
  }
};

module.exports = orderService;
