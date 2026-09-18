const Order = require('../models/order.model');
const Ticket = require('../models/ticket.model');
const { getRedisClient } = require('../config/redis.config');

const LOCK_KEY = 'lock:job:claimHoldWatchdog';
const LOCK_TTL_SEC = 3600; // 1 giờ
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Chạy 1 chu kỳ kiểm tra cảnh báo đơn hàng bị kẹt Claim Hold quá 7 ngày
 */
async function runClaimHoldWatchdogOnce(deps = {}) {
  const redis = deps.redisClient || getRedisClient();
  const OrderModel = deps.OrderModel || Order;
  const TicketModel = deps.TicketModel || Ticket;
  const now = deps.now ? new Date(deps.now) : new Date();
  const thresholdDate = new Date(now.getTime() - SEVEN_DAYS_MS);

  if (redis && typeof redis.set === 'function') {
    try {
      const lockAcquired = await redis.set(LOCK_KEY, '1', 'EX', LOCK_TTL_SEC, 'NX');
      if (!lockAcquired) {
        return { success: true, skipped: true, reason: 'LOCK_HELD_BY_ANOTHER_INSTANCE' };
      }
    } catch (err) {
      console.warn('[JOB:claimHoldWatchdog] Lỗi thiết lập Redis lock:', err.message);
    }
  }

  let flaggedOrdersCount = 0;
  const alerts = [];

  try {
    // Tìm các đơn hàng claimHold=true quá 7 ngày
    const heldOrders = await OrderModel.find({
      claimHold: true,
      claimHoldSetAt: { $lte: thresholdDate },
    }).limit(200);

    for (const order of heldOrders) {
      // Kiểm tra ticket liên quan
      const relatedTicket = await TicketModel.findOne({
        $or: [{ orderId: order._id }, { trackingCode: order.trackingCode }],
      });

      if (!relatedTicket || !['CLOSED', 'RESOLVED'].includes(relatedTicket.status)) {
        flaggedOrdersCount += 1;
        const msg = `⚠️ [CLAIM_HOLD_ALERT] Đơn hàng [${order.trackingCode}] bị giữ Claim Hold hơn 7 ngày chưa được giải quyết (Ticket ID: ${relatedTicket ? relatedTicket._id : 'N/A'})`;
        console.warn(msg);
        alerts.push({
          orderId: order._id,
          trackingCode: order.trackingCode,
          claimHoldSetAt: order.claimHoldSetAt,
          ticketId: relatedTicket ? relatedTicket._id : null,
          ticketStatus: relatedTicket ? relatedTicket.status : null,
        });
      }
    }

    return {
      success: true,
      flaggedOrdersCount,
      alerts,
    };
  } catch (err) {
    console.error('[JOB:claimHoldWatchdog] Lỗi thực thi watchdog:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Khởi động background job chạy hàng ngày
 */
function startClaimHoldWatchdogJob() {
  console.log('⏰ [JOB:claimHoldWatchdog] Khởi động giám sát đơn hàng Claim Hold quá hạn (> 7 ngày)...');
  // Chạy định kỳ mỗi 12 giờ
  setInterval(() => {
    runClaimHoldWatchdogOnce().catch((err) =>
      console.error('[JOB:claimHoldWatchdog] Lỗi thực thi chu kỳ:', err.message)
    );
  }, 12 * 60 * 60 * 1000);
}

module.exports = {
  runClaimHoldWatchdogOnce,
  startClaimHoldWatchdogJob,
};
