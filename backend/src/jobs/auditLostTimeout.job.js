/**
 * Audit Lost Timeout Job — UC-18
 * Polling pattern giống driverConfirmTimeout.job.js.
 *
 * SEARCH_ZONE + searchZoneEnteredAt quá AUDIT_MISSING_ITEM_TIMEOUT_HOURS → SUSPECTED_LOST
 * SUSPECTED_LOST + lostSearchDeadlineAt quá hạn → LOST + OrderLog(LOST_CONFIRMED)
 *
 * TODO PO xác nhận timeout giá trị cuối.
 */
const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');

const MISSING_TIMEOUT_MS  = (Number(process.env.AUDIT_MISSING_ITEM_TIMEOUT_HOURS) || 24) * 3600 * 1000;
const LOST_CONFIRM_MS     = (Number(process.env.LOST_CONFIRMATION_HOURS)         || 24) * 3600 * 1000;
const CHECK_INTERVAL_MS   = Math.min(MISSING_TIMEOUT_MS / 2, 60_000); // poll tối đa 60s

async function runAuditLostCheck() {
  try {
    const now = new Date();

    // 1. SEARCH_ZONE → SUSPECTED_LOST
    const searchZoneCutoff = new Date(now.getTime() - MISSING_TIMEOUT_MS);
    const toSuspect = await Order.find({
      status: 'SEARCH_ZONE',
      searchZoneEnteredAt: { $lt: searchZoneCutoff },
    }).lean();

    for (const o of toSuspect) {
      const lostDeadline = new Date(now.getTime() + LOST_CONFIRM_MS);
      const updated = await Order.findOneAndUpdate(
        { _id: o._id, status: 'SEARCH_ZONE' }, // OCC
        { $set: { status: 'SUSPECTED_LOST', lostSearchDeadlineAt: lostDeadline, updatedAt: now } },
        { returnDocument: 'after' }
      );
      if (!updated) continue;
      console.log(`[AUDIT_LOST_JOB] 🔍 SEARCH_ZONE → SUSPECTED_LOST: ${o.trackingCode}`);
      setImmediate(async () => {
        try {
          await OrderLog.create({
            orderId: o._id, trackingCode: o.trackingCode,
            preStatus: 'SEARCH_ZONE', postStatus: 'SUSPECTED_LOST',
            actionType: 'STATUS_CHANGED',
            actionBy: o.cancelledBy || o._id, // system actor
            note: `[Tự động] Quá hạn tìm kiếm → SUSPECTED_LOST`,
            metadata: { lostDeadline: lostDeadline.toISOString(), triggeredAt: now.toISOString() },
          });
        } catch (e) { console.error('[AUDIT_LOST_LOG_ERROR]', e.message); }
      });
    }

    // 2. SUSPECTED_LOST → LOST
    const toLost = await Order.find({
      status: 'SUSPECTED_LOST',
      lostSearchDeadlineAt: { $lt: now },
    }).lean();

    for (const o of toLost) {
      const updated = await Order.findOneAndUpdate(
        { _id: o._id, status: 'SUSPECTED_LOST' }, // OCC
        { $set: { status: 'LOST', updatedAt: now } },
        { returnDocument: 'after' }
      );
      if (!updated) continue;
      console.log(`[AUDIT_LOST_JOB] ⚠️ SUSPECTED_LOST → LOST: ${o.trackingCode}`);
      setImmediate(async () => {
        try {
          await OrderLog.create({
            orderId: o._id, trackingCode: o.trackingCode,
            preStatus: 'SUSPECTED_LOST', postStatus: 'LOST',
            actionType: 'LOST_CONFIRMED',
            actionBy: o._id, // system actor
            note: `[Tự động] Quá hạn xác nhận mất → LOST`,
            metadata: { confirmedAt: now.toISOString() },
          });
        } catch (e) { console.error('[AUDIT_LOST_CONFIRM_LOG_ERROR]', e.message); }
      });
    }

    if (toSuspect.length + toLost.length > 0) {
      console.log(`[AUDIT_LOST_JOB] Chu kỳ xong: ${toSuspect.length} → SUSPECTED_LOST, ${toLost.length} → LOST`);
    }
  } catch (e) {
    console.error('[AUDIT_LOST_JOB_ERROR]', e.message);
  }
}

function startAuditLostTimeoutJob() {
  console.log(`⏱️ Audit Lost Timeout Job khởi động (interval ${CHECK_INTERVAL_MS}ms, missingTimeout ${MISSING_TIMEOUT_MS}ms, lostConfirm ${LOST_CONFIRM_MS}ms)`);
  setInterval(runAuditLostCheck, CHECK_INTERVAL_MS);
  runAuditLostCheck(); // Chạy ngay lần đầu
}

module.exports = { startAuditLostTimeoutJob, runAuditLostCheck };
