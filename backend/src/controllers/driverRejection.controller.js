const Order = require('../models/order.model');
const User = require('../models/user.model');
const OrderLog = require('../models/orderLog.model');
const ioSingleton = require('../lib/ioSingleton');

function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return date1.toDateString() === date2.toDateString();
}

const driverRejectionController = {
  /**
   * Tài xế bấm "Từ chối nhận đơn gom hàng (Pickup)"
   * POST /api/driver/pickup/:orderId/reject
   * Body: { reason: String }
   */
  async rejectPickup(req, res) {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
      const driverId = req.user._id;

      if (!reason || reason.trim() === '') {
        return res.status(400).json({ message: 'Vui lòng cung cấp lý do từ chối đơn hàng' });
      }

      const driver = await User.findById(driverId);
      if (!driver) {
        return res.status(404).json({ message: 'Không tìm thấy tài khoản tài xế' });
      }

      // Lazy Reset Quota
      if (!isSameDay(driver.rejectionQuota?.lastResetDate, new Date())) {
        driver.rejectionQuota = driver.rejectionQuota || {};
        driver.rejectionQuota.remainingToday = 3;
        driver.rejectionQuota.lastResetDate = new Date();
      }

      if (driver.rejectionQuota.remainingToday <= 0) {
        return res.status(429).json({
          message: 'Bạn đã dùng hết 3 lượt từ chối đơn hôm nay. Vui lòng liên hệ Quản lý tài xế nếu cần hỗ trợ.',
          remainingQuota: 0,
        });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
      }

      const assignedDriver = order.pickupAssignment?.driverId || order.assignedDriverId || order.assignedShipperId;
      if (!assignedDriver || assignedDriver.toString() !== driverId.toString()) {
        return res.status(403).json({ message: 'Đơn hàng này không được phân công cho bạn' });
      }

      if (['PICKED_UP', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
        return res.status(400).json({ message: `Không thể từ chối đơn hàng đang ở trạng thái "${order.status}"` });
      }

      // Ghi nhận yêu cầu từ chối
      order.pickupAssignment = order.pickupAssignment || {};
      order.pickupAssignment.status = 'REJECT_REQUESTED';
      order.pickupAssignment.rejectReason = reason;

      // Trừ Quota 1 lượt
      driver.rejectionQuota.remainingToday = Math.max(0, driver.rejectionQuota.remainingToday - 1);

      await driver.save();
      await order.save();

      // Ghi Audit Log
      try {
        await OrderLog.create({
          orderId: order._id,
          actionBy: driver._id,
          preStatus: order.status,
          postStatus: order.status,
          actionType: 'STATUS_UPDATED',
          trackingCode: order.trackingCode,
          note: `Tài xế (${driver.fullName}) gửi yêu cầu từ chối gom hàng. Lý do: ${reason}. Số lượt từ chối còn lại: ${driver.rejectionQuota.remainingToday}`,
        });
      } catch (logErr) {
        console.error('[OrderLog Error]:', logErr.message);
      }

      ioSingleton.emitOrderUpdate(order.sellerId, order);

      return res.json({
        message: 'Gửi yêu cầu từ chối gom hàng thành công. Chờ Quản lý tài xế xét duyệt.',
        remainingQuota: driver.rejectionQuota.remainingToday,
        order,
      });
    } catch (error) {
      console.error('[rejectPickup Error]:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi gửi yêu cầu từ chối đơn', error: error.message });
    }
  },

  /**
   * Tài xế bấm "Từ chối nhận đơn giao hàng (Delivery)"
   * POST /api/driver/delivery/:orderId/reject
   * Body: { reason: String }
   */
  async rejectDelivery(req, res) {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
      const driverId = req.user._id;

      if (!reason || reason.trim() === '') {
        return res.status(400).json({ message: 'Vui lòng cung cấp lý do từ chối đơn hàng' });
      }

      const driver = await User.findById(driverId);
      if (!driver) {
        return res.status(404).json({ message: 'Không tìm thấy tài khoản tài xế' });
      }

      // Lazy Reset Quota
      if (!isSameDay(driver.rejectionQuota?.lastResetDate, new Date())) {
        driver.rejectionQuota = driver.rejectionQuota || {};
        driver.rejectionQuota.remainingToday = 3;
        driver.rejectionQuota.lastResetDate = new Date();
      }

      if (driver.rejectionQuota.remainingToday <= 0) {
        return res.status(429).json({
          message: 'Bạn đã dùng hết 3 lượt từ chối đơn hôm nay. Vui lòng liên hệ Quản lý tài xế nếu cần hỗ trợ.',
          remainingQuota: 0,
        });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
      }

      const assignedDriver = order.deliveryAssignment?.driverId || order.assignedDriverId || order.assignedShipperId;
      if (!assignedDriver || assignedDriver.toString() !== driverId.toString()) {
        return res.status(403).json({ message: 'Đơn hàng này không được phân công giao cho bạn' });
      }

      if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
        return res.status(400).json({ message: `Không thể từ chối đơn hàng đang ở trạng thái "${order.status}"` });
      }

      // Ghi nhận yêu cầu từ chối
      order.deliveryAssignment = order.deliveryAssignment || {};
      order.deliveryAssignment.status = 'REJECT_REQUESTED';
      order.deliveryAssignment.rejectReason = reason;

      // Trừ Quota 1 lượt
      driver.rejectionQuota.remainingToday = Math.max(0, driver.rejectionQuota.remainingToday - 1);

      await driver.save();
      await order.save();

      // Ghi Audit Log
      try {
        await OrderLog.create({
          orderId: order._id,
          actionBy: driver._id,
          preStatus: order.status,
          postStatus: order.status,
          actionType: 'STATUS_UPDATED',
          trackingCode: order.trackingCode,
          note: `Tài xế (${driver.fullName}) gửi yêu cầu từ chối giao hàng. Lý do: ${reason}. Số lượt từ chối còn lại: ${driver.rejectionQuota.remainingToday}`,
        });
      } catch (logErr) {
        console.error('[OrderLog Error]:', logErr.message);
      }

      ioSingleton.emitOrderUpdate(order.sellerId, order);

      return res.json({
        message: 'Gửi yêu cầu từ chối giao hàng thành công. Chờ Quản lý tài xế xét duyệt.',
        remainingQuota: driver.rejectionQuota.remainingToday,
        order,
      });
    } catch (error) {
      console.error('[rejectDelivery Error]:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ khi gửi yêu cầu từ chối đơn', error: error.message });
    }
  },
};

module.exports = driverRejectionController;
