const express = require('express');
const router = express.Router();
const { scanSingleInbound, scanBatchInbound } = require('../controllers/inbound.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Áp dụng bảo vệ JWT & Authorization cho toàn bộ endpoint nhập kho
router.use(protect);
router.use(authorize('HUB_STAFF', 'HUB_COORDINATOR', 'ADMIN', 'DRIVER', 'SHIPPER'));

// POST /api/inbound/scan-single - Quét nhập kho đơn lẻ
router.post('/scan-single', scanSingleInbound);

// POST /api/inbound/scan-batch - Quét nhập kho hàng loạt
router.post('/scan-batch', scanBatchInbound);

module.exports = router;
