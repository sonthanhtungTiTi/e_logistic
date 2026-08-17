const express = require('express');
const router = express.Router();
const {
  loginUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  logoutUser,
  refreshAccessToken,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
  sendRegisterOtp,
  verifyRegisterOtp,
} = require('../controllers/auth.controller');

const {
  setupTwoFactor,
  verifyAndEnableTwoFactor,
  loginStep2_verifyTotp,
  disableTwoFactor,
} = require('../controllers/twoFactor.controller');

const {
  requestSelfDeactivation,
  confirmSelfDeactivation,
} = require('../controllers/accountDeactivation.controller');

const {
  submitKycDocument,
  getKycStatus,
} = require('../controllers/kyc.controller');

const {
  getNotificationPreferences,
  updateNotificationPreferences,
} = require('../controllers/notificationPreference.controller');

const { protect } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

// Rate Limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  statusCode: 429,
  message: { message: 'Bạn đã thử đăng nhập quá nhiều lần, vui lòng thử lại sau 15 phút' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  statusCode: 429,
  message: { message: 'Bạn đã tạo quá nhiều tài khoản, vui lòng thử lại sau 1 giờ' },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  statusCode: 429,
  message: { message: 'Bạn đã yêu cầu gửi OTP quá nhiều lần, vui lòng thử lại sau 15 phút' },
});

// Auth & Profile
router.post('/register', registerLimiter, registerUser);
router.post('/send-register-otp', otpLimiter, sendRegisterOtp);
router.post('/verify-register-otp', verifyRegisterOtp);
router.post('/login', loginLimiter, loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.post('/logout', protect, logoutUser);
router.post('/refresh', refreshAccessToken);

// Password recovery & change
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.put('/change-password', protect, changePassword);

// 2FA TOTP Routes
router.post('/2fa/setup', protect, setupTwoFactor);
router.post('/2fa/verify-enable', protect, verifyAndEnableTwoFactor);
router.post('/2fa/login-step2', loginStep2_verifyTotp);
router.post('/2fa/disable', protect, disableTwoFactor);

// Self Deactivation Routes
router.post('/self-deactivate/request', protect, requestSelfDeactivation);
router.post('/self-deactivate/confirm', protect, confirmSelfDeactivation);

// KYC Seller Routes
router.post('/kyc/submit', protect, submitKycDocument);
router.get('/kyc/status', protect, getKycStatus);

// Notification Preferences Routes
router.get('/notifications/preferences', protect, getNotificationPreferences);
router.put('/notifications/preferences', protect, updateNotificationPreferences);

module.exports = router;
