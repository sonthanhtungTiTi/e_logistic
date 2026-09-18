const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  proposeCompensation,
  approveCompensation,
  rejectCompensation,
  listCompensations,
  getCompensationLedger,
} = require('../controllers/compensation.controller');

// Rate limiter cho các thao tác phê duyệt / từ chối nhạy cảm: 10 requests / phút theo req.user._id
const financialActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => (req.user && req.user._id ? String(req.user._id) : req.ip),
  message: {
    status: 429,
    code: 'TOO_MANY_REQUESTS',
    message: 'Bạn đã thực hiện quá nhiều thao tác duyệt/từ chối tài chính. Vui lòng chờ 1 phút.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// 1. Danh sách bồi thường: GET /api/admin/compensations
router.get(
  '/',
  protect,
  authorize('ADMIN', 'ACCOUNTANT', 'CS'),
  listCompensations
);

// 3. Phê duyệt bồi thường: POST /api/admin/compensations/:id/approve
router.post(
  '/:id/approve',
  protect,
  authorize('ADMIN', 'ACCOUNTANT', 'CS'),
  financialActionLimiter,
  approveCompensation
);

// 4. Từ chối bồi thường: POST /api/admin/compensations/:id/reject
router.post(
  '/:id/reject',
  protect,
  authorize('ADMIN', 'ACCOUNTANT'),
  financialActionLimiter,
  rejectCompensation
);

// 5. Xem sổ cái bồi thường: GET /api/admin/compensations/:id/ledger
router.get(
  '/:id/ledger',
  protect,
  authorize('ADMIN', 'ACCOUNTANT'),
  getCompensationLedger
);

module.exports = router;
