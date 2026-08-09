const express = require('express');
const router = express.Router();
const { createOrder } = require('../controllers/order.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Tuyến đường POST /api/orders
// Chỉ định Seller hoặc Admin mới được phép tạo đơn
router.post('/', protect, authorize('SELLER', 'ADMIN', 'SYSTEM'), createOrder);

module.exports = router;
