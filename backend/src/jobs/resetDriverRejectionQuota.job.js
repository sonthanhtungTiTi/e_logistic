/**
 * Reset Driver Rejection Quota Job
 * Tự động reset số lượt từ chối đơn hàng (remainingToday = 3) cho tất cả Tài xế lúc 00:00 hàng ngày.
 */
const User = require('../models/user.model');

async function resetRejectionQuota() {
  try {
    const result = await User.updateMany(
      { role: 'DRIVER' },
      {
        $set: {
          'rejectionQuota.remainingToday': 3,
          'rejectionQuota.lastResetDate': new Date(),
        },
      }
    );
    console.log(`[QUOTA_RESET_JOB] ✅ Đã reset quota từ chối đơn hàng cho ${result.modifiedCount} tài xế.`);
    return result;
  } catch (error) {
    console.error('[QUOTA_RESET_JOB_ERROR] Lỗi reset quota từ chối tài xế:', error.message);
  }
}

// Kiểm tra thời điểm nạp lại mỗi 15 phút (Nếu chuyển sang 00:00 ngày mới)
let lastRunDateStr = new Date().toDateString();

function startResetDriverRejectionQuotaJob() {
  console.log('⏱️ Reset Driver Rejection Quota Job đã khởi động (Tự động reset lúc 00:00 mỗi ngày)');
  
  setInterval(async () => {
    const currentDateStr = new Date().toDateString();
    if (currentDateStr !== lastRunDateStr) {
      lastRunDateStr = currentDateStr;
      await resetRejectionQuota();
    }
  }, 15 * 60 * 1000); // 15 phút check 1 lần
}

module.exports = { startResetDriverRejectionQuotaJob, resetRejectionQuota };
