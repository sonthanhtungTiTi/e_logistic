const express = require('express');
const router = express.Router();
const {
  getQuote,
  createOrder,
  updateOrder,
  cancelOrder,
  bulkCancelOrders,
  searchOrders,
  trackOrderPublic,
  getOrderById,
  getPrintLabel
} = require('../controllers/order.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { createOrderRateLimiter, trackingRateLimiter } = require('../middleware/rateLimit.middleware');

// GET /api/orders/track/:trackingCode - Tra cứu công khai cho Khách mua (Public Buyer Tracking - Rate Limited 10 req/min, PII Masked)
router.get('/track/:trackingCode', trackingRateLimiter, trackOrderPublic);

// GET /api/orders - Tra cứu & Lọc danh sách đơn hàng của Seller (UC Tra Cứu Đơn Hàng)
router.get('/', protect, authorize('SELLER', 'ADMIN'), searchOrders);

// POST /api/orders/quote - Lấy báo giá xem trước (chưa lưu DB)
router.post('/quote', protect, authorize('SELLER', 'ADMIN'), getQuote);

// POST /api/orders/bulk-cancel - Hủy hàng loạt đơn hàng (UC-08 Alt 3.1)
router.post('/bulk-cancel', protect, authorize('SELLER', 'ADMIN'), bulkCancelOrders);

// POST /api/orders - Tạo đơn hàng chính thức (UC-06)
router.post('/', createOrderRateLimiter, protect, authorize('SELLER', 'ADMIN'), createOrder);

// PUT /api/orders/:id - Cập nhật đơn hàng (UC-07)
router.put('/:id', protect, authorize('SELLER', 'ADMIN'), updateOrder);

// DELETE /api/orders/:id/cancel - Hủy 1 đơn hàng (UC-08)
router.delete('/:id/cancel', protect, authorize('SELLER', 'ADMIN'), cancelOrder);

// GET /api/orders/:id - Chi tiết đơn hàng (Riêng tư - IDOR Protection)
router.get('/:id', protect, getOrderById);

// GET /api/orders/:id/label - In nhãn dán vận đơn
router.get('/:id/label', protect, getPrintLabel);

module.exports = router;
