const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const deliveryFailureController = require('../controllers/deliveryFailure.controller');

// Chỉ Shipper/Driver/ADMIN/STAFF được báo giao thất bại (Hỗ trợ DRIVER và các vai trò vận hành)
router.post(
  '/orders/:orderId/delivery-failure',
  protect,
  authorize('DRIVER', 'SHIPPER', 'ADMIN', 'STAFF', 'HUB_STAFF'),
  deliveryFailureController.reportDeliveryFailure
);

router.post(
  '/delivery-failure/sync-offline',
  protect,
  authorize('DRIVER', 'SHIPPER', 'ADMIN', 'STAFF', 'HUB_STAFF'),
  deliveryFailureController.syncOfflineFailureReports
);

module.exports = router;
