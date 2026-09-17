const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/warehouseLookup.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

const mgrRoles = authorize('WAREHOUSE_MANAGER', 'ADMIN', 'HUB_COORDINATOR', 'OPERATIONS', 'HUB_STAFF', 'WAREHOUSE_STAFF');

// Tra cứu danh sách đơn hàng dạng bảng
router.get('/lookup/orders', mgrRoles, ctrl.getWarehouseOrders);

// Tra cứu danh sách bao tải & mã Seal dạng bảng
router.get('/lookup/bags', mgrRoles, ctrl.getWarehouseBags);

// Danh sách nhân viên kho trực thuộc Hub
router.get('/staff', mgrRoles, ctrl.getWarehouseStaff);

// Điều chuyển vai trò nhân viên
router.patch('/staff/:id/role', authorize('WAREHOUSE_MANAGER', 'ADMIN'), ctrl.updateStaffRole);

module.exports = router;
