const express = require('express');
const router = express.Router();
const { listUsers, createUser, updateUser, setUserStatus } = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

const { reviewKycDocument } = require('../controllers/kyc.controller');

// Tất cả route Admin đều yêu cầu đăng nhập + role ADMIN
// Tiền điều kiện ĐT: Middleware protect + authorize('ADMIN') bảo vệ toàn bộ
router.use(protect, authorize('ADMIN'));

// Rate Limit cho Admin actions: 60 lần / 15 phút (cao hơn thông thường)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  statusCode: 429,
  message: { message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút' }
});

router.use(adminLimiter);

// Bước 2 ĐT: Lấy danh sách user (lọc theo role, isActive)
// GET /api/admin/users?role=DRIVER&isActive=true&page=1&limit=20
router.get('/users', listUsers);

// Bước 8-11 ĐT: Tạo tài khoản nội bộ mới (sinh mật khẩu tạm, gửi Email)
// POST /api/admin/users
router.post('/users', createUser);

// Bước 5-9 ĐT: Chỉnh sửa thông tin tài khoản
// PUT /api/admin/users/:id
router.put('/users/:id', updateUser);

// Alt 3.1 / 3.2 / 3.3 ĐT: Khóa / Mở khóa / Vô hiệu hóa tài khoản
// PATCH /api/admin/users/:id/status  body: { "action": "lock" | "unlock" | "deactivate" }
router.patch('/users/:id/status', setUserStatus);

// Admin Duyệt / Từ chối tài liệu KYC của Seller
// PATCH /api/admin/kyc/review/:docId
router.patch('/kyc/review/:docId', reviewKycDocument);

module.exports = router;
