const express = require('express');
const router = express.Router();
const driverManagerController = require('../controllers/driverManager.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Driver Manager xem danh sách đơn chờ phân tài xế gom hàng
router.get(
  '/pending-pickup-assignment',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN'),
  driverManagerController.getPendingPickupAssignments
);

// Driver Manager xem danh sách đơn chờ phân tài xế giao hàng
router.get(
  '/pending-delivery-assignment',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN'),
  driverManagerController.getPendingDeliveryAssignments
);

// Tìm danh sách tài xế theo khu vực phụ trách
router.get(
  '/drivers-by-area',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN'),
  driverManagerController.getDriversByArea
);

// Driver Manager phân tài xế gom hàng
router.post(
  '/assign-pickup',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN'),
  driverManagerController.assignPickup
);

// Driver Manager phân tài xế giao hàng
router.post(
  '/assign-delivery',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN'),
  driverManagerController.assignDelivery
);

// Driver Manager xem và duyệt yêu cầu từ chối đơn hàng từ tài xế
router.post(
  '/review-rejection',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN'),
  driverManagerController.reviewRejection
);

// Driver Manager theo dõi danh sách tài xế dùng hết quota từ chối trong ngày
router.get(
  '/drivers-quota-exhausted',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN'),
  driverManagerController.getExhaustedQuotaDrivers
);

module.exports = router;
