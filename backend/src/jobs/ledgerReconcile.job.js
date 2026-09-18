const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const User = require('../models/user.model');
const LedgerEntry = require('../models/ledgerEntry.model');
const Wallet = require('../models/wallet.model');
const { getRedisClient } = require('../config/redis.config');

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 giờ
const LOCK_KEY = 'lock:job:ledgerReconcile';
const LOCK_TTL_SEC = 3600; // 1 giờ

/**
 * Chạy 1 chu kỳ kiểm tra đối soát Sổ cái Kế toán & Số dư Ví
 */
async function runLedgerReconcileOnce(deps = {}) {
  const redis = deps.redisClient || getRedisClient();
  const LedgerModel = deps.LedgerModel || LedgerEntry;
  const WalletModel = deps.WalletModel || Wallet;
  const UserModel = deps.UserModel || User;
  const now = deps.now ? new Date(deps.now) : new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 1. Phân tán lock
  if (redis && typeof redis.set === 'function') {
    try {
      const lockAcquired = await redis.set(LOCK_KEY, '1', 'EX', LOCK_TTL_SEC, 'NX');
      if (!lockAcquired) {
        return { success: true, skipped: true, reason: 'LOCK_HELD_BY_ANOTHER_INSTANCE' };
      }
    } catch (err) {
      console.warn('[JOB:ledgerReconcile] Lỗi thiết lập Redis lock:', err.message);
    }
  }

  const reports = [];
  const anomalies = [];

  try {
    // 2. Lấy danh sách các chủ ví có phát sinh bút toán trong 24h qua
    const recentEntries = await LedgerModel.find({
      createdAt: { $gte: twentyFourHoursAgo },
    }).sort({ createdAt: 1 });

    const ownerIds = [...new Set(recentEntries.map((e) => String(e.walletOwnerId)))];

    for (const ownerId of ownerIds) {
      const ownerEntries = recentEntries.filter((e) => String(e.walletOwnerId) === ownerId);
      const wallet = await WalletModel.findOne({ ownerId });
      const user = await UserModel.findById(ownerId);

      let sumCredit = 0;
      let sumDebit = 0;
      let ownerAnomalies = 0;

      // Kiểm tra đồng bộ số dư: Wallet.balance vs User.walletBalance
      if (wallet && user) {
        const walletBal = Number(wallet.balance) || 0;
        const userBal = Number(user.walletBalance) || 0;
        if (walletBal !== userBal) {
          ownerAnomalies += 1;
          const msg = `LỆCH SỐ DƯ VÍ VS USER [owner: ${ownerId}]: Wallet.balance=${walletBal}, User.walletBalance=${userBal} (Chênh lệch: ${Math.abs(walletBal - userBal)})`;
          console.error(`🚨 [RECONCILE ERROR] ${msg}`);
          anomalies.push({
            entryCode: 'BALANCE_MISMATCH_WALLET_USER',
            walletOwnerId: ownerId,
            error: msg,
          });
        }
      }

      for (const entry of ownerEntries) {
        if (entry.direction === 'CREDIT') {
          sumCredit += entry.amount;
        } else if (entry.direction === 'DEBIT') {
          sumDebit += entry.amount;
        }

        // BẤT BIẾN TỐI THIỂU: balanceAfter phải luôn bằng balanceBefore + (CREDIT ? amount : -amount)
        const expectedBalanceAfter =
          entry.direction === 'CREDIT'
            ? entry.balanceBefore + entry.amount
            : entry.balanceBefore - entry.amount;

        if (entry.balanceAfter !== expectedBalanceAfter) {
          ownerAnomalies += 1;
          const msg = `LỆCH BÚT TOÁN [${entry.entryCode}]: balanceBefore=${entry.balanceBefore}, amount=${entry.amount}, balanceAfter=${entry.balanceAfter} (Kỳ vọng: ${expectedBalanceAfter})`;
          console.error(`🚨 [RECONCILE ERROR] ${msg}`);
          anomalies.push({
            entryCode: entry.entryCode,
            walletOwnerId: ownerId,
            error: msg,
          });
        }
      }

      const netChange = sumCredit - sumDebit;
      reports.push({
        walletOwnerId: ownerId,
        currentWalletBalance: wallet ? wallet.balance : 'NO_WALLET',
        currentUserBalance: user ? user.walletBalance : 'NO_USER',
        sumCredit,
        sumDebit,
        netChange,
        entryCount: ownerEntries.length,
        anomaliesCount: ownerAnomalies,
      });
    }

    // 3. Xuất báo cáo CSV: /reports/reconcile-YYYYMMDD.csv
    const ymd = DateTime.fromJSDate(now).setZone('Asia/Ho_Chi_Minh').toFormat('yyyyMMdd');
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvPath = path.join(reportsDir, `reconcile-${ymd}.csv`);
    const csvHeader = 'walletOwnerId,currentWalletBalance,currentUserBalance,sumCredit,sumDebit,netChange,entryCount,anomaliesCount\n';
    const csvRows = reports
      .map(
        (r) =>
          `${r.walletOwnerId},${r.currentWalletBalance},${r.currentUserBalance},${r.sumCredit},${r.sumDebit},${r.netChange},${r.entryCount},${r.anomaliesCount}`
      )
      .join('\n');

    fs.writeFileSync(csvPath, csvHeader + csvRows, 'utf8');

    return {
      success: true,
      processedOwners: ownerIds.length,
      anomaliesFound: anomalies.length,
      csvFile: csvPath,
      reports,
      anomalies,
    };
  } catch (err) {
    console.error('[JOB:ledgerReconcile] Lỗi trong quá trình đối soát:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Khởi động background job chạy hàng ngày lúc 02:00 sáng
 */
function startLedgerReconcileJob() {
  console.log('⏰ [JOB:ledgerReconcile] Khởi động lập lịch đối soát Sổ cái Kế toán hàng ngày (02:00 AM)...');

  const checkSchedule = () => {
    const nowVN = DateTime.now().setZone('Asia/Ho_Chi_Minh');
    // Nếu là khung giờ 02:00 - 02:05
    if (nowVN.hour === 2 && nowVN.minute < 5) {
      runLedgerReconcileOnce().catch((err) =>
        console.error('[JOB:ledgerReconcile] Lỗi thực thi chu kỳ:', err.message)
      );
    }
  };

  // Kiểm tra mỗi 5 phút
  setInterval(checkSchedule, 5 * 60 * 1000);
}

module.exports = {
  runLedgerReconcileOnce,
  startLedgerReconcileJob,
};
