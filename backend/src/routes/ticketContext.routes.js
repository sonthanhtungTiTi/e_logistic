const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middleware/auth.middleware');
const { getTicketContext, revealTicketPii } = require('../controllers/ticketContext.controller');

// Rate limiter for context retrieval: 60 req / phút / user
const contextRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip || 'anonymous',
  message: {
    success: false,
    message: 'Bạn đã vượt quá giới hạn yêu cầu context ticket (Tối đa 60 lượt/phút)',
  },
  validate: false,
});

// Rate limiter for PII reveal: 30 req / giờ / user
const revealPiiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip || 'anonymous',
  message: {
    success: false,
    message: 'Bạn đã vượt quá giới hạn tra cứu thông tin bảo mật PII (Tối đa 30 lượt/giờ)',
  },
  validate: false,
});

const CS_ADMIN_ROLES = ['ADMIN', 'CS'];

// @route   GET /api/admin/tickets/:id/context
// @desc    Lấy dữ liệu 360 độ đa chiều cho CS Workspace (Đã mask PII)
// @access  Private (CS, ADMIN)
router.get(
  '/:id/context',
  protect,
  authorize(...CS_ADMIN_ROLES),
  contextRateLimiter,
  getTicketContext
);

// @route   POST /api/admin/tickets/:id/reveal-pii
// @desc    Tra cứu thông tin thật (PII) của khách hàng và ghi audit log
// @access  Private (CS, ADMIN)
router.post(
  '/:id/reveal-pii',
  protect,
  authorize(...CS_ADMIN_ROLES),
  revealPiiRateLimiter,
  revealTicketPii
);

// @route   POST /api/admin/tickets/:ticketId/compensations
// @desc    Tạo đề xuất bồi thường cho ticket
// @access  Private (CS, ADMIN)
const { proposeCompensation } = require('../controllers/compensation.controller');
router.post(
  '/:ticketId/compensations',
  protect,
  authorize(...CS_ADMIN_ROLES),
  proposeCompensation
);

module.exports = router;
