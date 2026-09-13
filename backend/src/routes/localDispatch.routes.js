const express = require('express');
const router = express.Router();
const localDispatchController = require('../controllers/localDispatch.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Bàn giao ca làm việc (Shipper hoặc Dispatcher/Admin)
router.post(
  '/shift-handover',
  protect,
  authorize('ADMIN', 'LAST_MILE_DISPATCHER', 'DISPATCHER', 'PICKUP_SHIPPER', 'DELIVERY_SHIPPER', 'LOCAL_SHIPPER', 'SHIPPER'),
  localDispatchController.handleShiftHandover
);

// Quét dọn đơn tồn ca & qua ngày (Admin / Dispatcher)
router.post(
  '/overnight-rollover-sweep',
  protect,
  authorize('ADMIN', 'LAST_MILE_DISPATCHER', 'DISPATCHER'),
  localDispatchController.overnightRolloverSweep
);

// Bảo vệ toàn bộ route còn lại: Chỉ ADMIN và LAST_MILE_DISPATCHER mới có quyền truy cập
router.use(protect, authorize('ADMIN', 'LAST_MILE_DISPATCHER', 'DISPATCHER'));

const shipperZoneController = require('../controllers/shipperZone.controller');

router.get('/geozones', localDispatchController.getGeozones);
router.post('/geozones', localDispatchController.createGeozone);
router.get('/shippers-overview', localDispatchController.getShippersOverview);
router.get('/escalated-orders', localDispatchController.getEscalatedOrders);
router.post('/escalated-orders/:id/approve-cancel', localDispatchController.approveCancelEscalatedOrder);
router.post('/escalated-orders/:id/retry-pickup', localDispatchController.retryPickupEscalatedOrder);
router.post('/manual-assign', localDispatchController.manualAssignOrder);
router.post('/auto-dispatch', localDispatchController.triggerAutoDispatch);
router.patch('/surge-quota', localDispatchController.updateSurgeQuota);

// Duyệt / Từ chối yêu cầu đổi khu vực của Shipper
router.get('/zone-change-requests', shipperZoneController.getZoneChangeRequests);
router.post('/zone-change-requests/:id/approve', shipperZoneController.approveZoneChangeRequest);
router.post('/zone-change-requests/:id/reject', shipperZoneController.rejectZoneChangeRequest);

module.exports = router;
