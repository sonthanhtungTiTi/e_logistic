/**
 * Định mức bồi thường & Đền bù theo cấp bậc CSKH (Compensation & Refund Rules)
 */
const REFUND_LIMITS = {
  L1: 200_000,     // CS Level 1: Tối đa 200.000 VNĐ / ticket
  L2: 2_000_000,   // CS Level 2: Tối đa 2.000.000 VNĐ / ticket
  LEAD: 5_000_000, // CS Lead: Tối đa 5.000.000 VNĐ / ticket
  ADMIN: Infinity, // Admin: Không giới hạn hạn mức (Infinity)
};

const L1_DAILY_CAP = 2_000_000; // Hạn mức cộng dồn / ngày cho 1 CS L1: 2.000.000 VNĐ

const DAILY_REFUND_CAPS = {
  L1: 2_000_000,   // CS Level 1: Hạn mức tích luỹ tối đa trong 1 ngày = 2.000.000 VNĐ
};

const TWO_FA_THRESHOLD = 5_000_000; // Giao dịch bồi thường trên 5.000.000 VNĐ bắt buộc 2FA

const COMPENSATION_STATUS = {
  NONE: 'NONE',
  PROPOSED: 'PROPOSED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAID: 'PAID',
  FAILED: 'FAILED',
};

module.exports = {
  REFUND_LIMITS,
  L1_DAILY_CAP,
  DAILY_REFUND_CAPS,
  TWO_FA_THRESHOLD,
  COMPENSATION_STATUS,
};
