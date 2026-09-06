const express = require('express');
const router = express.Router();
const driverRejectionController = require('../controllers/driverRejection.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Tài xế gửi yêu cầu từ chối gom hàng
router.post(
  '/pickup/:orderId/reject',
  protect,
  authorize('DRIVER', 'LINE_HAUL_DRIVER'),
  driverRejectionController.rejectPickup
);

// Tài xế gửi yêu cầu từ chối giao hàng
router.post(
  '/delivery/:orderId/reject',
  protect,
  authorize('DRIVER', 'LINE_HAUL_DRIVER'),
  driverRejectionController.rejectDelivery
);

module.exports = router;
