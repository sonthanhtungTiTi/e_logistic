const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventory.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

const staffRoles = authorize('HUB_STAFF', 'HUB_COORDINATOR', 'ADMIN', 'WAREHOUSE_STAFF');
const coordRoles = authorize('HUB_COORDINATOR', 'ADMIN');

// Lấy danh sách tồn kho + phân trang + bộ lọc
router.get('/aging',                          staffRoles, ctrl.getAging);

// Tổng hợp tồn kho + Sức chứa Zone + Vận tốc 24h
router.get('/summary',                        staffRoles, ctrl.getSummary);

// Gợi ý chuyến xe từ tồn kho
router.get('/trip-suggestions',               staffRoles, ctrl.getTripSuggestions);

// Tạo chuyến xe 1-chạm từ tồn kho
router.post('/create-trip-from-stock',        staffRoles, ctrl.createTripFromStock);

// Lịch sử di chuyển của 1 kiện hàng
router.get('/:trackingCode/movement-history', staffRoles, ctrl.getMovementHistory);

// Xuất file CSV / JSON
router.get('/export',                         coordRoles, ctrl.exportInventory);

// Thao tác tồn kho đơn lẻ
router.post('/action',                        coordRoles, ctrl.performAction);

// Thao tác tồn kho hàng loạt
router.post('/batch-action',                  coordRoles, ctrl.performBatchAction);

module.exports = router;
