const express = require('express');
const router = express.Router();
const {
  scanOutbound,
  commitOutbound,
  createTrip,
  listTrips,
  driverConfirmOutbound,
} = require('../controllers/outbound.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { requireOwnHub } = require('../middleware/hubScope.middleware');

router.use(protect);
router.use(requireOwnHub);

// Endpoint tạo chuyến xe & danh sách chuyến xe
router.post('/trips', authorize('HUB_STAFF', 'HUB_COORDINATOR', 'ADMIN', 'WAREHOUSE_MANAGER'), createTrip);
router.get('/trips', authorize('HUB_STAFF', 'HUB_COORDINATOR', 'ADMIN', 'DRIVER', 'LINE_HAUL_DRIVER', 'WAREHOUSE_MANAGER'), listTrips);

// Quét xuất kho
router.post('/scan', authorize('HUB_STAFF', 'HUB_COORDINATOR', 'ADMIN', 'WAREHOUSE_MANAGER'), scanOutbound);

// Chốt chuyến xe
router.post('/commit', authorize('HUB_STAFF', 'HUB_COORDINATOR', 'ADMIN', 'WAREHOUSE_MANAGER'), commitOutbound);

// Tài xế xác nhận nhận hàng (Cho phép cả Driver, Admin và Hub Staff khi demo)
router.post('/driver-confirm', authorize('DRIVER', 'LINE_HAUL_DRIVER', 'ADMIN', 'HUB_COORDINATOR', 'HUB_STAFF', 'WAREHOUSE_STAFF', 'WAREHOUSE_MANAGER'), driverConfirmOutbound);

module.exports = router;
