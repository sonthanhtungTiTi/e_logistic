const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');
const ioSingleton = require('../lib/ioSingleton');

/**
 * Controller dành cho Nghiệp vụ Duyệt Đơn hàng (Seller & Order Manager)
 */
const orderManagerController = {
  /**
   * 4.1 Seller báo "Đã chuẩn bị xong hàng"
   * PATCH /api/orders/:id/mark-prepared
   */
  async markPrepared(req, res) {
    try {
      const { id } = req.params;
      const effectiveSellerId = req.effectiveSellerId || req.user._id;

      const order = await Order.findOne({ _id: id, sellerId: effectiveSellerId });
      if (!order) {
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng hoặc bạn không có quyền thao tác' });
      }

      if (!['CREATED', 'SELLER_PREPARING', 'DRAFT', 'READY_TO_PICK'].includes(order.status)) {
        return res.status(400).json({
          message: `Đơn hàng đang ở trạng thái "${order.status}", không thể đánh dấu chuẩn bị xong.`,
        });
      }

      const preStatus = order.status;
      order.status = 'PENDING_APPROVAL';
      order.sellerPreparedAt = new Date();
      await order.save();

      // Ghi audit log
      try {
        await OrderLog.create({
          orderId: order._id,
          actionBy: req.user._id,
          preStatus,
          postStatus: 'PENDING_APPROVAL',
          actionType: 'STATUS_UPDATED',
          trackingCode: order.trackingCode,
          note: 'Seller báo đã chuẩn bị xong hàng. Đơn chuyển sang Chờ Duyệt (PENDING_APPROVAL).',
        });
      } catch (logErr) {
        console.error('[OrderLog Error]:', logErr.message);
      }

      ioSingleton.emitOrderUpdate(order.sellerId, order);
      return res.json({
        message: 'Đã cập nhật trạng thái đơn hàng: Chờ duyệt (PENDING_APPROVAL)',
        order,
      });
    } catch (error) {
      console.error('[markPrepared Error]:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật chuẩn bị hàng', error: error.message });
    }
  },

  /**
   * 4.2 Order Manager — Xem danh sách đơn hàng chờ duyệt
   * GET /api/order-manager/pending-approval?groupBy=region&province=&district=
   */
  async getPendingApproval(req, res) {
    try {
      const { groupBy, province, district, search, page = 1, limit = 20 } = req.query;

      const filter = { status: 'PENDING_APPROVAL' };

      if (province) {
        filter['pickupAddress.province'] = new RegExp(province.trim(), 'i');
      }
      if (district) {
        filter['pickupAddress.district'] = new RegExp(district.trim(), 'i');
      }
      if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const reg = new RegExp(escaped, 'i');
        filter.$or = [
          { trackingCode: reg },
          { 'pickupAddress.fullName': reg },
          { 'pickupAddress.phone': reg },
          { 'deliveryAddress.fullName': reg },
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);

      const orders = await Order.find(filter)
        .populate('sellerId', 'fullName email phoneNumber companyName')
        .sort({ sellerPreparedAt: 1, createdAt: 1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Order.countDocuments(filter);

      // Nhóm theo tỉnh/thành nếu có groupBy=region
      let grouped = null;
      if (groupBy === 'region') {
        grouped = {};
        for (const order of orders) {
          const prov = order.pickupAddress?.province || 'Khác';
          if (!grouped[prov]) grouped[prov] = [];
          grouped[prov].push(order);
        }
      }

      return res.json({
        orders,
        groupedByRegion: grouped,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('[getPendingApproval Error]:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách đơn chờ duyệt', error: error.message });
    }
  },

  /**
   * 4.2 Order Manager — Duyệt đơn hàng loạt
   * POST /api/order-manager/bulk-approve
   */
  async bulkApprove(req, res) {
    try {
      const { orderIds } = req.body;
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: 'Danh sách orderIds phải là mảng và không được rỗng' });
      }

      let approvedCount = 0;
      const skippedOrders = [];
      const approvedOrders = [];

      for (const orderId of orderIds) {
        try {
          const order = await Order.findById(orderId);
          if (!order) {
            skippedOrders.push({ orderId, reason: 'Không tìm thấy đơn hàng' });
            continue;
          }

          if (order.status !== 'PENDING_APPROVAL') {
            skippedOrders.push({
              orderId,
              trackingCode: order.trackingCode,
              reason: `Trạng thái đơn là "${order.status}", không ở trạng thái PENDING_APPROVAL`,
            });
            continue;
          }

          const preStatus = order.status;
          order.status = 'APPROVED';
          order.orderApproval = {
            approvedBy: req.user._id,
            approvedAt: new Date(),
          };

          await order.save();

          // Ghi Log Audit
          try {
            await OrderLog.create({
              orderId: order._id,
              actionBy: req.user._id,
              preStatus,
              postStatus: 'APPROVED',
              actionType: 'STATUS_UPDATED',
              trackingCode: order.trackingCode,
              note: `Order Manager (${req.user.fullName || req.user.email}) duyệt đơn thành công.`,
            });
          } catch (logErr) {
            console.error('[OrderLog Error]:', logErr.message);
          }

          ioSingleton.emitOrderUpdate(order.sellerId, order);
          approvedOrders.push(order);
          approvedCount++;
        } catch (err) {
          skippedOrders.push({ orderId, reason: err.message });
        }
      }

      return res.json({
        message: `Đã duyệt thành công ${approvedCount}/${orderIds.length} đơn hàng.`,
        approvedCount,
        skippedCount: skippedOrders.length,
        skippedOrders,
        approvedOrders,
      });
    } catch (error) {
      console.error('[bulkApprove Error]:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi duyệt đơn hàng loạt', error: error.message });
    }
  },
};

module.exports = orderManagerController;
