const Order = require('../models/order.model');
const User = require('../models/user.model');
const OrderLog = require('../models/orderLog.model');
const dispatchEngine = require('../services/dispatchEngine.service');
const ioSingleton = require('../lib/ioSingleton');

/**
 * Controller: Quản trị Đơn hàng & Nhà cung cấp (ORDER_VENDOR_MANAGER & ADMIN)
 */
class VendorOpsController {
  /**
   * Lấy số lượng đơn theo từng tab (Badge counts)
   * GET /api/vendor-ops/counts
   */
  async getOverviewCounts(req, res, next) {
    try {
      const pendingCount = await Order.countDocuments({
        status: { $in: ['PENDING_VERIFICATION', 'SUSPENDED_RISK_REVIEW'] },
      });

      const approvedCount = await Order.countDocuments({
        $or: [
          { approvedAt: { $ne: null } },
          {
            status: {
              $in: [
                'READY_TO_PICK',
                'PICKING',
                'PICKED',
                'PICKED_UP',
                'INBOUND_HUB',
                'IN_HUB_ORIGIN',
                'SORTING',
                'IN_SORTING_HUB',
                'BAGGED_SEALED',
                'IN_TRANSIT',
                'INBOUND_HUB_DEST',
                'IN_HUB_DEST',
                'OUT_FOR_DELIVERY',
                'DELIVERING',
                'DELIVERED',
                'PENDING_REDELIVERY',
              ],
            },
          },
        ],
      });

      const rejectedCount = await Order.countDocuments({
        status: 'CANCELLED',
      });

      const sellerCount = await User.countDocuments({ role: 'SELLER' });

      return res.status(200).json({
        success: true,
        data: {
          pendingCount,
          approvedCount,
          rejectedCount,
          sellerCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lấy danh sách đơn hàng cần thẩm duyệt hoặc đang bị đình chỉ
   * GET /api/vendor-ops/pending-review
   */
  async getPendingReviewOrders(req, res, next) {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      const query = {
        status: status ? status : { $in: ['PENDING_VERIFICATION', 'SUSPENDED_RISK_REVIEW'] },
      };

      const total = await Order.countDocuments(query);
      const orders = await Order.find(query)
        .populate('sellerId', 'fullName email phoneNumber companyName kycStatus')
        .populate('pickupGeozoneId', 'name code')
        .populate('deliveryGeozoneId', 'name code')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách đơn hàng chờ duyệt thành công',
        data: orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lấy danh sách đơn hàng đã phê duyệt (Lịch sử đã duyệt)
   * GET /api/vendor-ops/approved
   */
  async getApprovedOrders(req, res, next) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const query = {
        $or: [
          { approvedAt: { $ne: null } },
          {
            status: {
              $in: [
                'READY_TO_PICK',
                'PICKING',
                'PICKED',
                'PICKED_UP',
                'INBOUND_HUB',
                'IN_HUB_ORIGIN',
                'SORTING',
                'IN_SORTING_HUB',
                'BAGGED_SEALED',
                'IN_TRANSIT',
                'INBOUND_HUB_DEST',
                'IN_HUB_DEST',
                'OUT_FOR_DELIVERY',
                'DELIVERING',
                'DELIVERED',
                'PENDING_REDELIVERY',
              ],
            },
          },
        ],
      };

      const total = await Order.countDocuments(query);
      const orders = await Order.find(query)
        .populate('sellerId', 'fullName email phoneNumber companyName kycStatus')
        .populate('approvedBy', 'fullName email role')
        .populate('pickupGeozoneId', 'name code')
        .populate('deliveryGeozoneId', 'name code')
        .sort({ approvedAt: -1, updatedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách đơn hàng đã phê duyệt thành công',
        data: orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lấy danh sách đơn hàng đã bị từ chối / hủy (Kèm lý do chi tiết)
   * GET /api/vendor-ops/rejected
   */
  async getRejectedOrders(req, res, next) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const query = {
        status: 'CANCELLED',
      };

      const total = await Order.countDocuments(query);
      const orders = await Order.find(query)
        .populate('sellerId', 'fullName email phoneNumber companyName kycStatus')
        .populate('rejectedBy', 'fullName email role')
        .populate('cancelledBy', 'fullName email role')
        .populate('pickupGeozoneId', 'name code')
        .populate('deliveryGeozoneId', 'name code')
        .sort({ rejectedAt: -1, cancelledAt: -1, updatedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách đơn hàng đã từ chối thành công',
        data: orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Phê duyệt đơn hàng thủ công
   * POST /api/vendor-ops/orders/:id/approve
   */
  async approveOrder(req, res, next) {
    try {
      const { id } = req.params;
      const { note } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }

      const previousStatus = order.status;
      order.status = 'READY_TO_PICK';
      order.riskViolationReason = null;
      order.approvedBy = req.user?._id || req.user?.id;
      order.approvedAt = new Date();
      order.approvalNote = note || 'Quản lý duyệt chấp nhận vận chuyển';
      await order.save();

      // Log lịch sử
      await OrderLog.create({
        orderId: order._id,
        trackingCode: order.trackingCode,
        actionType: 'STATUS_CHANGED',
        actionBy: req.user?._id || req.user?.id,
        preStatus: previousStatus,
        postStatus: 'READY_TO_PICK',
        note: `Phê duyệt đơn hàng từ [${previousStatus}] sang [READY_TO_PICK]. Ghi chú: ${note || 'Hợp lệ'}`,
        metadata: {
          actorRole: req.user?.role || 'ORDER_VENDOR_MANAGER',
          approvedAt: new Date().toISOString(),
        },
      });

      return res.status(200).json({
        success: true,
        message: `Đã phê duyệt đơn hàng [${order.trackingCode}] thành công`,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Từ chối đơn hàng thủ công
   * POST /api/vendor-ops/orders/:id/reject
   */
  async rejectOrder(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối' });
      }

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }

      const wasRouted = Boolean(order.currentDriverId || order.currentDriver?.driverId || order.pickupShipperId || order.deliveryShipperId);
      const assignedShipperId = order.pickupShipperId || order.currentDriverId || order.currentDriver?.driverId || order.deliveryShipperId;

      const previousStatus = order.status;
      order.status = 'CANCELLED';
      order.riskViolationReason = reason;
      order.rejectionReason = reason;
      order.cancelReason = reason;
      order.cancelNote = reason;
      order.rejectedBy = req.user?._id || req.user?.id;
      order.rejectedAt = new Date();
      order.cancelledBy = req.user?._id || req.user?.id;
      order.cancelledAt = new Date();
      await order.save();

      ioSingleton.emitOrderUpdate(order.sellerId, order);

      if (wasRouted && assignedShipperId) {
        try {
          await dispatchEngine.compensateCancelledOrder(order, assignedShipperId);
        } catch (compErr) {
          console.warn('[VendorOps] Auto compensation on reject error:', compErr.message);
        }
      }

      // Log lịch sử
      await OrderLog.create({
        orderId: order._id,
        trackingCode: order.trackingCode,
        actionType: 'CANCELLED',
        actionBy: req.user?._id || req.user?.id,
        preStatus: previousStatus,
        postStatus: 'CANCELLED',
        note: `Từ chối đơn hàng: ${reason}`,
        metadata: {
          actorRole: req.user?.role || 'ORDER_VENDOR_MANAGER',
          rejectedAt: new Date().toISOString(),
        },
      });

      return res.status(200).json({
        success: true,
        message: `Đã từ chối đơn hàng [${order.trackingCode}]`,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Báo cáo SLA và chất lượng của các Seller
   * GET /api/vendor-ops/sellers/sla
   */
  async getSellersSlaReport(req, res, next) {
    try {
      const sellers = await User.find({ role: 'SELLER' }).select(
        'fullName email phoneNumber companyName kycStatus createdAt'
      );

      const report = await Promise.all(
        sellers.map(async (seller) => {
          const totalOrders = await Order.countDocuments({ sellerId: seller._id });
          const cancelledOrders = await Order.countDocuments({ sellerId: seller._id, status: 'CANCELLED' });
          const suspendedOrders = await Order.countDocuments({
            sellerId: seller._id,
            status: { $in: ['PENDING_VERIFICATION', 'SUSPENDED_RISK_REVIEW'] },
          });

          const cancelRate = totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : 0;

          return {
            sellerId: seller._id,
            fullName: seller.fullName,
            companyName: seller.companyName || seller.fullName,
            phone: seller.phoneNumber,
            kycStatus: seller.kycStatus,
            totalOrders,
            cancelledOrders,
            suspendedOrders,
            cancelRate: Number(cancelRate),
            isRiskHigh: cancelRate > 15 || suspendedOrders > 5,
          };
        })
      );

      return res.status(200).json({
        success: true,
        message: 'Lấy báo cáo SLA Seller thành công',
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VendorOpsController();
