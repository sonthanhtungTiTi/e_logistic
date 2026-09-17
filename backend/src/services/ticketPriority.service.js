const Order = require('../models/order.model');
const TicketAuditLog = require('../models/ticketAuditLog.model');

/**
 * Tính toán mức độ ưu tiên tự động (Auto-Priority) cho Ticket
 * @param {object} ticket - Thông tin Ticket (category, subject, ...)
 * @param {object} [order] - Thông tin Vận đơn liên quan (status, codAmount, ...)
 * @param {object} [requesterStats] - Thống kê người yêu cầu ({ isVip: boolean })
 * @returns {'P1' | 'P2' | 'P3' | 'P4'}
 */
function computePriority(ticket, order = null, requesterStats = {}) {
  const category = (ticket?.category || '').toUpperCase();
  const orderStatus = (order?.status || '').toUpperCase();
  const codAmount = Number(order?.codAmount || order?.cod || 0);

  // ── MỨC P1: Khẩn cấp (Sự cố nghiêm trọng / Hàng đang trên đường hoặc COD giá trị lớn)
  const isWrongAddressInTransit = category === 'WRONG_ADDRESS' && ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(orderStatus);
  const isHighValueCodMismatch = ['COD_MISMATCH', 'COD_DISPUTE'].includes(category) && codAmount > 5000000;

  if (isWrongAddressInTransit || isHighValueCodMismatch) {
    return 'P1';
  }

  // ── MỨC P2: Cao (Thất lạc / Hư hỏng hoặc Đối tác VIP)
  const isLostOrDamaged = ['LOST', 'LOST_GOODS', 'DAMAGED', 'DAMAGED_GOODS'].includes(category);
  const isVipSeller = requesterStats?.isVip === true;

  if (isLostOrDamaged || isVipSeller) {
    return 'P2';
  }

  // ── MỨC P3: Trung bình (Chậm trễ giao / Không lấy được hàng)
  const isDelayOrPickupFail = ['LATE', 'DELIVERY_DELAY', 'PICKUP_FAIL'].includes(category);
  if (isDelayOrPickupFail) {
    return 'P3';
  }

  // ── MỨC P4: Thường (Các vấn đề khác)
  return 'P4';
}

/**
 * Kiểm tra xem Seller có đạt chuẩn VIP không (>= 500 đơn hoàn tất trong 30 ngày)
 * Cache kết quả vào Redis với TTL 1 giờ (3600s)
 * @param {string} sellerId
 * @param {object} [redisClient]
 * @param {object} [OrderModel]
 * @returns {Promise<boolean>}
 */
async function computeIsVip(sellerId, redisClient = null, OrderModel = Order) {
  if (!sellerId) return false;

  const cacheKey = `seller:vip:${sellerId}`;

  if (redisClient) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached !== null && cached !== undefined) {
        return cached === 'true' || cached === '1';
      }
    } catch (err) {
      console.warn('Lỗi đọc Redis cache VIP:', err.message);
    }
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let isVip = false;

  try {
    const completedOrdersCount = await OrderModel.countDocuments({
      sellerId,
      status: { $in: ['DELIVERED', 'COMPLETED', 'SUCCESSFUL'] },
      createdAt: { $gte: thirtyDaysAgo },
    });

    isVip = completedOrdersCount > 500;
  } catch (err) {
    console.warn('Lỗi đếm số lượng đơn VIP seller:', err.message);
    isVip = false;
  }

  if (redisClient) {
    try {
      await redisClient.set(cacheKey, isVip ? 'true' : 'false', 'EX', 3600);
    } catch (err) {
      console.warn('Lỗi ghi Redis cache VIP:', err.message);
    }
  }

  return isVip;
}

/**
 * CS Ghi đè mức độ ưu tiên bằng tay (Manual Override) kèm lý do bắt buộc >= 10 ký tự
 * @param {object} ticket
 * @param {'P1'|'P2'|'P3'|'P4'} newPriority
 * @param {string} overrideReason
 * @param {object} actor - { _id, role, fullName }
 * @param {object} [AuditLogModel]
 */
async function overridePriority(ticket, newPriority, overrideReason, actor = {}, AuditLogModel = TicketAuditLog) {
  if (!overrideReason || typeof overrideReason !== 'string' || overrideReason.trim().length < 10) {
    const error = new Error('Lý do ghi đè mức độ ưu tiên bắt buộc phải từ 10 ký tự trở lên');
    error.statusCode = 400;
    throw error;
  }

  const validPriorities = ['P1', 'P2', 'P3', 'P4'];
  const targetPriority = (newPriority || '').toUpperCase();
  if (!validPriorities.includes(targetPriority)) {
    const error = new Error(`Mức độ ưu tiên không hợp lệ. Cho phép: ${validPriorities.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const previousPriority = ticket.priority;
  ticket.priority = targetPriority;
  ticket.manualPriorityOverride = true;
  ticket.overrideReason = overrideReason.trim();

  if (typeof ticket.save === 'function') {
    await ticket.save();
  }

  if (AuditLogModel && typeof AuditLogModel.create === 'function') {
    try {
      await AuditLogModel.create({
        ticketId: ticket._id,
        action: 'PRIORITY_OVERRIDE',
        actorId: actor?._id || null,
        actorRole: actor?.role || 'CS',
        details: {
          previousPriority,
          newPriority: targetPriority,
          reason: overrideReason.trim(),
        },
      });
    } catch (err) {
      console.warn('Lỗi ghi TicketAuditLog khi override priority:', err.message);
    }
  }

  return ticket;
}

module.exports = {
  computePriority,
  computeIsVip,
  overridePriority,
};
