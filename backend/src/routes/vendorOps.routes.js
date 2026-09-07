const express = require('express');
const router = express.Router();
const vendorOpsController = require('../controllers/vendorOps.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Bảo vệ toàn bộ route: Chỉ ADMIN và ORDER_VENDOR_MANAGER mới có quyền truy cập
router.use(protect, authorize('ADMIN', 'ORDER_VENDOR_MANAGER'));

router.get('/counts', vendorOpsController.getOverviewCounts);
router.get('/pending-review', vendorOpsController.getPendingReviewOrders);
router.get('/approved', vendorOpsController.getApprovedOrders);
router.get('/rejected', vendorOpsController.getRejectedOrders);
router.post('/orders/:id/approve', vendorOpsController.approveOrder);
router.post('/orders/:id/reject', vendorOpsController.rejectOrder);
router.get('/sellers/sla', vendorOpsController.getSellersSlaReport);

module.exports = router;
