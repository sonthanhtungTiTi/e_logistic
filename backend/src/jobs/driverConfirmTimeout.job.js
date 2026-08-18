/**
 * Driver Confirm Timeout Job
 * Chạy định kỳ để kiểm tra Trip quá hạn xác nhận tài xế.
 * Độc lập khỏi web server — có thể chạy bằng setInterval (simple)
 * hoặc tích hợp Agenda/Bull sau này.
 *
 * TODO PO xác nhận DRIVER_CONFIRM_TIMEOUT_MINUTES (hiện mặc định 30)
 */
const Trip = require('../models/trip.model');
const OrderLog = require('../models/orderLog.model');

const TIMEOUT_MS = (Number(process.env.DRIVER_CONFIRM_TIMEOUT_MINUTES) || 30) * 60 * 1000;
const CHECK_INTERVAL_MS = Math.min(TIMEOUT_MS / 2, 60_000); // poll tối đa 60s

async function runTimeoutCheck() {
  try {
    const now = new Date();
    const overdueTime = new Date(now.getTime() - TIMEOUT_MS);
    const halfTime = new Date(now.getTime() - TIMEOUT_MS / 2);

    // Trips cần nhắc lần 1 (quá nửa thời gian, chưa gửi nhắc)
    const needsReminder = await Trip.find({
      status: 'LOCKED_PENDING_DRIVER_CONFIRM',
      lockedAt: { $lt: halfTime },
      driverConfirmReminderSentAt: null,
    });
    for (const trip of needsReminder) {
      await Trip.updateOne({ _id: trip._id }, { $set: { driverConfirmReminderSentAt: now } });
      console.log(`[DRIVER_TIMEOUT_JOB] • Nhắc lần 1: ${trip.tripCode} (lockedAt: ${trip.lockedAt})`)
      // TODO: gửi push notification / email tới tài xế và HUB_COORDINATOR
    }

    // Trips quá hạn hoàn toàn — escalate
    const overdue = await Trip.find({
      status: 'LOCKED_PENDING_DRIVER_CONFIRM',
      lockedAt: { $lt: overdueTime },
      driverConfirmReminderSentAt: { $ne: null },
    });
    for (const trip of overdue) {
      console.log(`[DRIVER_TIMEOUT_JOB] ⚠️ Escalate (quá hạn): ${trip.tripCode}`);
      // Ghi log để HUB_COORDINATOR thấy
      setImmediate(async () => {
        try {
          for (const item of trip.scannedItems) {
            const { default: Order } = await import('../models/order.model.js').catch(() => ({ default: require('../models/order.model') }));
            const o = await Order.findOne({ trackingCode: item.trackingCode }).lean();
            if (o) {
              await OrderLog.create({
                orderId: o._id, trackingCode: o.trackingCode,
                preStatus: o.status, postStatus: o.status,
                actionType: 'STATUS_UPDATED',
                actionBy: trip.createdBy || trip._id,
                note: `[Tự động] Chuyến xe ${trip.tripCode} quá hạn xác nhận tài xế — Escalate tới HUB_COORDINATOR`,
                metadata: { tripCode: trip.tripCode, escalatedAt: now.toISOString() },
              });
            }
          }
        } catch (e) { console.error('[ESCALATE_LOG_ERROR]', e.message); }
      });
      // TODO: gửi cảnh báo tới HUB_COORDINATOR qua module CSKH/notification
    }
  } catch (e) {
    console.error('[DRIVER_TIMEOUT_JOB_ERROR]', e.message);
  }
}

function startDriverConfirmTimeoutJob() {
  console.log(`⏱️ Driver Confirm Timeout Job khởi động (interval ${CHECK_INTERVAL_MS}ms, timeout ${TIMEOUT_MS}ms)`);
  setInterval(runTimeoutCheck, CHECK_INTERVAL_MS);
  // Chạy ngay lần đầu
  runTimeoutCheck();
}

module.exports = { startDriverConfirmTimeoutJob, runTimeoutCheck };
