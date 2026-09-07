const express = require('express');
const router = express.Router();
const { listUsers, createUser, updateUser, setUserStatus } = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

const {
  listPendingKyc,
  getPendingKycCount,
  getKycDetail,
  approveKyc,
  rejectKyc,
} = require('../controllers/kyc.controller');

// Tất cả route Admin đều yêu cầu đăng nhập
router.use(protect);

// Rate Limit cho Admin actions: 60 lần / 15 phút
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  statusCode: 429,
  message: { message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút' },
});

router.use(adminLimiter);

// ==========================================
// 1. QUẢN LÝ XÁC THỰC DANH TÍNH (KYC) - ADMIN & CS
// ==========================================
router.get('/kyc/pending', authorize('ADMIN', 'CS'), listPendingKyc);
router.get('/kyc/pending-count', authorize('ADMIN', 'CS'), getPendingKycCount);
router.get('/kyc/:sellerId', authorize('ADMIN', 'CS'), getKycDetail);
router.post('/kyc/:sellerId/approve', authorize('ADMIN', 'CS'), approveKyc);
router.post('/kyc/:sellerId/reject', authorize('ADMIN', 'CS'), rejectKyc);

// ==========================================
// 2. QUẢN TRỊ NGƯỜI DÙNG & TÀI KHOẢN (CHỈ ADMIN)
// ==========================================
// Bước 2 ĐT: Lấy danh sách user (lọc theo role, isActive)
// GET /api/admin/users?role=DRIVER&isActive=true&page=1&limit=20
router.get('/users', authorize('ADMIN'), listUsers);

// Bước 8-11 ĐT: Tạo tài khoản nội bộ mới (sinh mật khẩu tạm, gửi Email)
// POST /api/admin/users
router.post('/users', authorize('ADMIN'), createUser);

// Bước 5-9 ĐT: Chỉnh sửa thông tin tài khoản
// PUT /api/admin/users/:id
router.put('/users/:id', authorize('ADMIN'), updateUser);

// Alt 3.1 / 3.2 / 3.3 ĐT: Khóa / Mở khóa / Vô hiệu hóa tài khoản
// PATCH /api/admin/users/:id/status body: { "action": "lock" | "unlock" | "deactivate" }
router.patch('/users/:id/status', authorize('ADMIN'), setUserStatus);


const shipperZoneController = require('../controllers/shipperZone.controller');
// Admin xem, duyệt, từ chối hoặc gán trực tiếp khu vực hoạt động cho Shipper
router.get('/zone-change-requests', shipperZoneController.getZoneChangeRequests);
router.post('/zone-change-requests/:id/approve', shipperZoneController.approveZoneChangeRequest);
router.post('/zone-change-requests/:id/reject', shipperZoneController.rejectZoneChangeRequest);
router.put('/users/:id/assign-zone', shipperZoneController.adminAssignZone);

module.exports = router;
