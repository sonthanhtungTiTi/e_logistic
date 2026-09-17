const Ticket = require('../models/ticket.model');
const { getRedisClient } = require('../config/redis.config');

const INTERVAL_MS = 2 * 60 * 1000; // 2 phút
const LOCK_KEY = 'lock:job:slaMonitor';
const LOCK_TTL_SEC = 110; // 110 giây

/**
 * Thăng cấp ưu tiên lên 1 bậc (P4 -> P3 -> P2 -> P1)
 */
function escalatePriority(currentPriority) {
  const p = (currentPriority || 'P4').toUpperCase();
  switch (p) {
    case 'P4':
      return 'P3';
    case 'P3':
      return 'P2';
    case 'P2':
      return 'P1';
    case 'P1':
    default:
      return 'P1';
  }
}

/**
 * Chạy 1 chu kỳ kiểm tra SLA Monitor (Tách riêng để unit/integration test độc lập)
 * @param {object} [deps] - Dependency injection cho test: { redisClient, TicketModel, now }
 */
async function runSlaMonitorOnce(deps = {}) {
  const redis = deps.redisClient || getRedisClient();
  const TicketModel = deps.TicketModel || Ticket;
  const now = deps.now ? new Date(deps.now) : new Date();
  const startTime = Date.now();

  // 1. Phân tán Lock qua Redis (tránh nhiều node/worker chạy trùng lặp)
  if (redis && typeof redis.set === 'function') {
    try {
      const lockAcquired = await redis.set(LOCK_KEY, '1', 'EX', LOCK_TTL_SEC, 'NX');
      if (!lockAcquired) {
        return { success: true, skipped: true, reason: 'LOCK_HELD_BY_ANOTHER_INSTANCE' };
      }
    } catch (err) {
      console.warn('[JOB:slaMonitor] Lỗi thiết lập Redis lock:', err.message);
    }
  }

  let processedCount = 0;
  let breachCount = 0;
  let warnCount = 0;
  let lastError = null;

  try {
    // 2. Query tối đa 500 ticket chưa hoàn tất có hạn SLA
    const activeTickets = await TicketModel.find({
      status: { $nin: ['RESOLVED', 'CLOSED'] },
      'sla.resolutionDueAt': { $exists: true },
    }).limit(500);

    for (const t of activeTickets) {
      if (!t.sla) t.sla = {};
      let modified = false;

      const createdAt = t.createdAt ? new Date(t.createdAt).getTime() : now.getTime();
      const resolutionDueAt = t.sla.resolutionDueAt ? new Date(t.sla.resolutionDueAt).getTime() : null;
      const firstResponseDueAt = t.sla.firstResponseDueAt ? new Date(t.sla.firstResponseDueAt).getTime() : null;
      const nowMs = now.getTime();

      // ── a. Kiểm tra Vi phạm Hạn Xử lý (Resolution Breach) ──────────────
      if (resolutionDueAt && nowMs > resolutionDueAt && !t.sla.breachedResolution) {
        t.sla.breachedResolution = true;
        const prevPriority = t.priority;
        const newPriority = escalatePriority(t.priority);
        if (newPriority !== prevPriority) {
          t.priority = newPriority;
          console.warn(`🚨 [SLA BREACH] Ticket ${t.ticketCode} quá hạn xử lý! Nâng cấp ưu tiên ${prevPriority} -> ${newPriority}`);
        }
        breachCount++;
        modified = true;
      }

      // ── b. Cảnh báo sắp quá hạn Xử lý (Còn <= 20% thời gian) ──────────
      if (resolutionDueAt && nowMs <= resolutionDueAt && !t.sla.warnedResolution) {
        const totalResolutionWindow = Math.max(1, resolutionDueAt - createdAt);
        const remainingTime = resolutionDueAt - nowMs;
        if (remainingTime <= 0.20 * totalResolutionWindow) {
          t.sla.warnedResolution = true;
          warnCount++;
          modified = true;
          console.log(`⚠️ [SLA WARNING] Ticket ${t.ticketCode} sắp chạm ngưỡng hạn chót xử lý (còn <= 20% thời gian).`);
        }
      }

      // ── c. Kiểm tra Phản hồi đầu tiên (First Response) ──────────────────
      if (!t.sla.firstRespondedAt && firstResponseDueAt) {
        if (nowMs > firstResponseDueAt && !t.sla.breachedFirstResponse) {
          t.sla.breachedFirstResponse = true;
          breachCount++;
          modified = true;
          console.warn(`🚨 [SLA BREACH] Ticket ${t.ticketCode} quá hạn phản hồi đầu tiên!`);
        } else if (nowMs <= firstResponseDueAt && !t.sla.warnedFirstResponse) {
          const totalFirstResponseWindow = Math.max(1, firstResponseDueAt - createdAt);
          const remainingTime = firstResponseDueAt - nowMs;
          if (remainingTime <= 0.20 * totalFirstResponseWindow) {
            t.sla.warnedFirstResponse = true;
            warnCount++;
            modified = true;
          }
        }
      }

      // ── d. Cảnh báo Ticket MỚI TẠO quá 10 phút chưa được tiếp nhận ───────
      if (t.status === 'NEW' && (nowMs - createdAt) > 10 * 60 * 1000) {
        console.warn(`⏱️ [SLA NOTICE] Ticket ${t.ticketCode} ở trạng thái MỚI TẠO quá 10 phút chưa có CS tiếp nhận.`);
      }

      if (modified) {
        await t.save();
      }
      processedCount++;
    }
  } catch (err) {
    lastError = err.message;
    console.error('❌ [JOB:slaMonitor] Lỗi thực thi chu kỳ:', err);
  }

  const durationMs = Date.now() - startTime;

  // 3. Ghi log trạng thái thực thi vào Redis hash 'system:jobs'
  if (redis && typeof redis.hset === 'function') {
    try {
      await redis.hset(
        'system:jobs',
        'slaMonitor',
        JSON.stringify({
          name: 'slaMonitor',
          intervalMs: INTERVAL_MS,
          lastRunAt: new Date().toISOString(),
          lastDurationMs: durationMs,
          lastError,
          isRunning: false,
          processedCount,
          breachCount,
          warnCount,
        })
      );
    } catch (err) {
      console.warn('[JOB:slaMonitor] Lỗi ghi metric Redis:', err.message);
    }
  }

  return {
    success: !lastError,
    processedCount,
    breachCount,
    warnCount,
    durationMs,
    error: lastError,
  };
}

let monitorInterval = null;

function startSlaMonitorJob() {
  if (monitorInterval) return;

  console.log('🚀 [JOB] slaMonitor started - interval 2m');
  
  // Chạy lần đầu sau 5 giây khởi động
  setTimeout(() => {
    runSlaMonitorOnce().catch(err => console.error('[JOB:slaMonitor] Lỗi lần chạy đầu:', err));
  }, 5000);

  monitorInterval = setInterval(() => {
    runSlaMonitorOnce().catch(err => console.error('[JOB:slaMonitor] Lỗi định kỳ:', err));
  }, INTERVAL_MS);
}

function stopSlaMonitorJob() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

module.exports = {
  runSlaMonitorOnce,
  startSlaMonitorJob,
  stopSlaMonitorJob,
};
