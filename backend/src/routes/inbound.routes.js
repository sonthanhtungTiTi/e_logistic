const express = require('express');
const router = express.Router();
const { scanSingleInbound, scanBatchInbound, scanSealInbound, reportIncident } = require('../controllers/inbound.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Áp dụng bảo vệ JWT & Authorization cho toàn bộ endpoint nhập kho
router.use(protect);
router.use(authorize('HUB_STAFF', 'HUB_COORDINATOR', 'ADMIN', 'DRIVER', 'SHIPPER', 'LINE_HAUL_DRIVER'));

// POST /api/inbound/scan-single - Quét nhập kho đơn lẻ (route gốc, không đổi)
router.post('/scan-single', scanSingleInbound);

// POST /api/inbound/scan-batch - Quét nhập kho hàng loạt (route gốc, không đổi)
router.post('/scan-batch', scanBatchInbound);

// POST /api/inbound/scan-seal - Quét nhập kho theo Seal bao tải
router.post('/scan-seal', scanSealInbound);

// POST /api/inbound/incident - Báo cáo sự cố / ngoại lệ kiện hàng
router.post('/incident', reportIncident);

module.exports = router;
