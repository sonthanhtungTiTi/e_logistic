const express = require('express');
const router = express.Router();
const orderManagerController = require('../controllers/orderManager.controller');
const { protect, authorize, resolveSellerContext } = require('../middleware/auth.middleware');

// Seller báo đã chuẩn bị xong hàng -> PENDING_APPROVAL
router.patch(
  '/orders/:id/mark-prepared',
  protect,
  authorize('SELLER'),
  resolveSellerContext,
  orderManagerController.markPrepared
);

// Order Manager xem danh sách đơn chờ duyệt
router.get(
  '/order-manager/pending-approval',
  protect,
  authorize('ORDER_MANAGER', 'ADMIN'),
  orderManagerController.getPendingApproval
);

// Order Manager duyệt đơn hàng loạt -> APPROVED
router.post(
  '/order-manager/bulk-approve',
  protect,
  authorize('ORDER_MANAGER', 'ADMIN'),
  orderManagerController.bulkApprove
);

module.exports = router;
