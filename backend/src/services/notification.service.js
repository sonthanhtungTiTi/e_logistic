/**
 * Email Service — Actor phụ trong UC Quên mật khẩu
 * Hiện tại: Log OTP ra console (mock) để test không cần SMTP thật.
 * Nâng cấp: Thay bằng nodemailer + Gmail/SendGrid khi triển khai production.
 */

/**
 * Gửi OTP đặt lại mật khẩu qua Email
 * @param {string} toEmail - Email người nhận
 * @param {string} otp - Mã OTP plaintext (6 số)
 * @returns {Promise<void>}
 */
const sendPasswordResetEmail = async (toEmail, otp) => {
  // TODO (production): Thay bằng nodemailer thật
  // const transporter = nodemailer.createTransport({ ... });
  // await transporter.sendMail({ to: toEmail, subject: '...', text: `Mã OTP: ${otp}` });

  // Mock: In OTP ra console để test (Ex 5.1 ĐT: nếu hàm này throw, controller bắt)
  console.log(`[EMAIL SERVICE - MOCK] Gửi OTP đến ${toEmail}: ${otp}`);
  console.log(`[EMAIL SERVICE] OTP hết hạn sau 10 phút.`);
};

/**
 * Gửi OTP đặt lại mật khẩu qua SMS
 * @param {string} phoneNumber - Số điện thoại người nhận
 * @param {string} otp - Mã OTP plaintext (6 số)
 * @returns {Promise<void>}
 */
const sendPasswordResetSms = async (phoneNumber, otp) => {
  // TODO (production): Tích hợp Twilio / Vonage / Zalo OTP API
  console.log(`[SMS SERVICE - MOCK] Gửi OTP đến ${phoneNumber}: ${otp}`);
  console.log(`[SMS SERVICE] OTP hết hạn sau 10 phút.`);
};

module.exports = { sendPasswordResetEmail, sendPasswordResetSms };
