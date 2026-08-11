const mongoose = require('mongoose');

// Model lưu mã OTP cho chức năng Quên mật khẩu
const passwordResetOtpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    // Lưu OTP đã hash (không lưu plaintext)
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    // Thời điểm hết hạn — Alt 7.2 ĐT: OTP hết hạn
    expiresAt: {
      type: Date,
      required: true,
    },
    // Ex 7.3 ĐT: Đếm số lần nhập sai OTP
    failedAttempts: {
      type: Number,
      default: 0,
    },
    // Đã sử dụng chưa — Bước 11 ĐT: vô hiệu hóa OTP sau khi dùng
    isUsed: {
      type: Boolean,
      default: false,
    },
    // Kênh gửi OTP (email/sms) — Actor phụ ĐT
    channel: {
      type: String,
      enum: ['email', 'sms'],
      required: true,
    },
    // Lưu identifier để biết gửi đến đâu
    sentTo: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: MongoDB tự xóa document sau khi hết hạn
// (giải phóng DB, tránh OTP cũ tích tụ)
passwordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);
