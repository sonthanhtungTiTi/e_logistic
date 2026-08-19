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

router.use(protect);

// Endpoint tạo chuyến xe & danh sách chuyến xe
router.post('/trips', authorize('HUB_STAFF', 'HUB_COORDINATOR', 'ADMIN'), createTrip);
router.get('/trips', authorize('HUB_STAFF', 'HUB_COORDINATOR', 'ADMIN', 'DRIVER', 'LINE_HAUL_DRIVER'), listTrips);

// Quét xuất kho
router.post('/scan', authorize('HUB_STAFF', 'HUB_COORDINATOR', 'ADMIN'), scanOutbound);

// Chốt chuyến xe
router.post('/commit', authorize('HUB_STAFF', 'HUB_COORDINATOR', 'ADMIN'), commitOutbound);

// Tài xế xác nhận nhận hàng (Cho phép cả Driver, Admin và Hub Staff khi demo)
router.post('/driver-confirm', authorize('DRIVER', 'LINE_HAUL_DRIVER', 'ADMIN', 'HUB_COORDINATOR', 'HUB_STAFF', 'WAREHOUSE_STAFF'), driverConfirmOutbound);

module.exports = router;
