const Ticket = require('../models/ticket.model');
const TicketMessage = require('../models/ticketMessage.model');
const ticketCore = require('../services/ticketCore.service');
const { getRedisClient } = require('../config/redis.config');

const INTERVAL_MS = 60 * 60 * 1000; // 1 giờ
const LOCK_KEY = 'lock:job:ticketAutoClose';
const LOCK_TTL_SEC = 3500; // 3500 giây (~58 phút)
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

const SYSTEM_ACTOR = { _id: null, role: 'SYSTEM', fullName: 'Hệ Thống Tự Động (Auto-Close)' };

/**
 * Chạy 1 chu kỳ kiểm tra tự động đóng Ticket quá hạn (Tách riêng để unit/integration test)
 * @param {object} [deps] - { redisClient, TicketModel, TicketMessageModel, now }
 */
async function runTicketAutoCloseOnce(deps = {}) {
  const redis = deps.redisClient || getRedisClient();
  const TicketModel = deps.TicketModel || Ticket;
  const TicketMessageModel = deps.TicketMessageModel || TicketMessage;
  const now = deps.now ? new Date(deps.now) : new Date();
  const nowMs = now.getTime();
  const startTime = Date.now();

  // 1. Phân tán Lock qua Redis
  if (redis && typeof redis.set === 'function') {
    try {
      const lockAcquired = await redis.set(LOCK_KEY, '1', 'EX', LOCK_TTL_SEC, 'NX');
      if (!lockAcquired) {
        return { success: true, skipped: true, reason: 'LOCK_HELD_BY_ANOTHER_INSTANCE' };
      }
    } catch (err) {
      console.warn('[JOB:ticketAutoClose] Lỗi thiết lập Redis lock:', err.message);
    }
  }

  let closedNoResponseCount = 0;
  let closedResolvedCount = 0;
  let lastError = null;

  try {
    // ── 2. Xử lý các Ticket WAITING_USER / WAITING_SELLER quá 7 ngày không có phản hồi ──
    const waitingTickets = await TicketModel.find({
      status: { $in: ['WAITING_USER', 'WAITING_SELLER'] },
    }).limit(500);

    for (const t of waitingTickets) {
      const lastUpdatedMs = t.updatedAt ? new Date(t.updatedAt).getTime() : 0;
      
      // Kiểm tra tin nhắn PUBLIC mới nhất từ Seller/User
      const lastPublicMsg = await TicketMessageModel.findOne({
        ticketId: t._id,
        visibility: 'PUBLIC',
      }).sort({ seq: -1 });

      const lastMsgTimeMs = lastPublicMsg ? new Date(lastPublicMsg.createdAt).getTime() : lastUpdatedMs;
      const inactiveDurationMs = nowMs - Math.max(lastUpdatedMs, lastMsgTimeMs);

      if (inactiveDurationMs >= SEVEN_DAYS_MS) {
        try {
          await ticketCore.transitionTicket(
            t._id,
            'CLOSED',
            SYSTEM_ACTOR,
            { closedReason: 'AUTO_CLOSED_NO_RESPONSE' }
          );
          closedNoResponseCount++;
          console.log(`🔒 [AUTO-CLOSE] Ticket ${t.ticketCode} tự động đóng do Người dùng không phản hồi quá 7 ngày.`);
        } catch (err) {
          console.warn(`Lỗi đóng ticket ${t.ticketCode}:`, err.message);
        }
      }
    }

    // ── 3. Xử lý các Ticket RESOLVED quá 72 giờ không có khiếu nại mở lại ──
    const resolvedTickets = await TicketModel.find({
      status: 'RESOLVED',
    }).limit(500);

    for (const t of resolvedTickets) {
      const resolvedAtMs = t.sla?.resolvedAt
        ? new Date(t.sla.resolvedAt).getTime()
        : (t.resolvedAt ? new Date(t.resolvedAt).getTime() : (t.updatedAt ? new Date(t.updatedAt).getTime() : 0));

      if (nowMs - resolvedAtMs >= SEVENTY_TWO_HOURS_MS) {
        try {
          await ticketCore.transitionTicket(
            t._id,
            'CLOSED',
            SYSTEM_ACTOR,
            { closedReason: 'AUTO_CLOSED_AFTER_RESOLVED' }
          );
          closedResolvedCount++;
          console.log(`🔒 [AUTO-CLOSE] Ticket ${t.ticketCode} tự động đóng sau 72 giờ ở trạng thái ĐÃ GIẢI QUYẾT.`);
        } catch (err) {
          console.warn(`Lỗi đóng ticket resolved ${t.ticketCode}:`, err.message);
        }
      }
    }
  } catch (err) {
    lastError = err.message;
    console.error('❌ [JOB:ticketAutoClose] Lỗi thực thi chu kỳ:', err);
  }

  const durationMs = Date.now() - startTime;

  // 4. Ghi log trạng thái thực thi vào Redis hash 'system:jobs'
  if (redis && typeof redis.hset === 'function') {
    try {
      await redis.hset(
        'system:jobs',
        'ticketAutoClose',
        JSON.stringify({
          name: 'ticketAutoClose',
          intervalMs: INTERVAL_MS,
          lastRunAt: new Date().toISOString(),
          lastDurationMs: durationMs,
          lastError,
          isRunning: false,
          closedNoResponseCount,
          closedResolvedCount,
        })
      );
    } catch (err) {
      console.warn('[JOB:ticketAutoClose] Lỗi ghi metric Redis:', err.message);
    }
  }

  return {
    success: !lastError,
    closedNoResponseCount,
    closedResolvedCount,
    durationMs,
    error: lastError,
  };
}

let autoCloseInterval = null;

function startTicketAutoCloseJob() {
  if (autoCloseInterval) return;

  console.log('🚀 [JOB] ticketAutoClose started - interval 1h');

  // Chạy lần đầu sau 10 giây khởi động
  setTimeout(() => {
    runTicketAutoCloseOnce().catch(err => console.error('[JOB:ticketAutoClose] Lỗi lần chạy đầu:', err));
  }, 10000);

  autoCloseInterval = setInterval(() => {
    runTicketAutoCloseOnce().catch(err => console.error('[JOB:ticketAutoClose] Lỗi định kỳ:', err));
  }, INTERVAL_MS);
}

function stopTicketAutoCloseJob() {
  if (autoCloseInterval) {
    clearInterval(autoCloseInterval);
    autoCloseInterval = null;
  }
}

module.exports = {
  SYSTEM_ACTOR,
  runTicketAutoCloseOnce,
  startTicketAutoCloseJob,
  stopTicketAutoCloseJob,
};
