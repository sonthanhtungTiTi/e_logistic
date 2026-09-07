const express = require('express');
const router = express.Router();
const driverManagerController = require('../controllers/driverManager.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Driver Manager xem danh sách đơn chờ phân tài xế gom hàng
router.get(
  '/pending-pickup-assignment',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN', 'DISPATCHER', 'OPERATIONS', 'HUB_COORDINATOR'),
  driverManagerController.getPendingPickupAssignments
);

// Driver Manager xem danh sách đơn chờ phân tài xế giao hàng
router.get(
  '/pending-delivery-assignment',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN', 'DISPATCHER', 'OPERATIONS', 'HUB_COORDINATOR'),
  driverManagerController.getPendingDeliveryAssignments
);

// Tìm danh sách tài xế theo khu vực phụ trách
router.get(
  '/drivers-by-area',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN', 'DISPATCHER', 'OPERATIONS', 'HUB_COORDINATOR'),
  driverManagerController.getDriversByArea
);

// Driver Manager phân tài xế gom hàng
router.post(
  '/assign-pickup',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN', 'DISPATCHER', 'OPERATIONS', 'HUB_COORDINATOR'),
  driverManagerController.assignPickup
);

// Driver Manager phân tài xế giao hàng
router.post(
  '/assign-delivery',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN', 'DISPATCHER', 'OPERATIONS', 'HUB_COORDINATOR'),
  driverManagerController.assignDelivery
);

// Driver Manager xem và duyệt yêu cầu từ chối đơn hàng từ tài xế
router.post(
  '/review-rejection',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN', 'DISPATCHER', 'OPERATIONS', 'HUB_COORDINATOR'),
  driverManagerController.reviewRejection
);

// Driver Manager theo dõi danh sách tài xế dùng hết quota từ chối trong ngày
router.get(
  '/drivers-quota-exhausted',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN', 'DISPATCHER', 'OPERATIONS', 'HUB_COORDINATOR'),
  driverManagerController.getExhaustedQuotaDrivers
);

// Điều phối tự động: Xem trước phương án phân công (Preview)
router.post(
  '/auto-assign-preview',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN', 'DISPATCHER', 'OPERATIONS', 'HUB_COORDINATOR'),
  driverManagerController.autoAssignPreview
);

// Điều phối tự động: Xác nhận lưu phân công vào Database (Commit)
router.post(
  '/auto-assign-commit',
  protect,
  authorize('DRIVER_MANAGER', 'ADMIN', 'DISPATCHER', 'OPERATIONS', 'HUB_COORDINATOR'),
  driverManagerController.autoAssignCommit
);

module.exports = router;
