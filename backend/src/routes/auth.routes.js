const express = require('express');
const router = express.Router();
const { loginUser, registerUser, getUserProfile, updateUserProfile, logoutUser, refreshAccessToken, forgotPassword, verifyOtp, resetPassword, changePassword, sendRegisterOtp, verifyRegisterOtp } = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

// Rate Limit cho Đăng nhập: chống Brute Force (100 lần / 15 phút trong môi trường dev/test)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  statusCode: 429,
  message: { message: 'Bạn đã thử đăng nhập quá nhiều lần, vui lòng thử lại sau 15 phút' }
});

// Rate Limit cho Đăng ký: chống spam tạo tài khoản (5 lần / 1 giờ) — Alternate Flow 4.1
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 5,
  statusCode: 429,
  message: { message: 'Bạn đã tạo quá nhiều tài khoản, vui lòng thử lại sau 1 giờ' }
});

// Rate Limit cho Quên mật khẩu: chống spam gửi OTP (3 lần / 15 phút)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  statusCode: 429,
  message: { message: 'Bạn đã yêu cầu gửi OTP quá nhiều lần, vui lòng thử lại sau 15 phút' }
});

router.post('/register', registerLimiter, registerUser);
router.post('/send-register-otp', otpLimiter, sendRegisterOtp);
router.post('/verify-register-otp', verifyRegisterOtp);
router.post('/login', loginLimiter, loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile); // UC Cập nhật hồ sơ cá nhân
router.post('/logout', protect, logoutUser);
router.post('/refresh', refreshAccessToken); // Public — không cần accessToken

// UC Quên mật khẩu — 3 bước: Yêu cầu OTP → Xác thực OTP → Đặt mật khẩu mới
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

// UC Đổi mật khẩu (khi đã đăng nhập) — Yêu cầu accessToken hợp lệ
router.put('/change-password', protect, changePassword);

module.exports = router;
