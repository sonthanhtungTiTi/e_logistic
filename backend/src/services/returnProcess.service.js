const Order = require('../models/order.model');

/**
 * Return Process Service — Khởi tạo quy trình 7 (Xử lý hoàn hàng) khi đơn giao thất bại đủ số lần cấu hình
 */
const initiate = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) return null;
    
    // Đảm bảo trạng thái chuyển hướng sang quy trình hoàn hàng
    if (order.status !== 'DELIVERY_FAILED_PENDING_RETURN' && order.status !== 'RETURNING') {
      order.status = 'DELIVERY_FAILED_PENDING_RETURN';
      await order.save();
    }
    console.log(`[ReturnProcessService] Đã khởi tạo quy trình hoàn hàng cho đơn: ${orderId} (${order.trackingCode})`);
    return { success: true, orderId: order._id, status: order.status };
  } catch (error) {
    console.error(`[ReturnProcessService Error] Không thể khởi tạo quy trình hoàn hàng đơn ${orderId}:`, error);
    throw error;
  }
};

module.exports = { initiate };
