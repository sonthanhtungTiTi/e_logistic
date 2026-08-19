const express = require('express');
const router = express.Router();
const { protect, authorize, resolveSellerContext, requirePermission } = require('../middleware/auth.middleware');
const { getWalletBalance, requestWithdrawal } = require('../controllers/wallet.controller');

// GET /api/wallet/balance - Xem số dư ví COD (yêu cầu VIEW_FINANCE)
router.get('/balance', protect, authorize('SELLER', 'ADMIN'), resolveSellerContext, requirePermission('VIEW_FINANCE'), getWalletBalance);

// POST /api/wallet/withdraw - Rút tiền ví COD (yêu cầu MANAGE_FINANCE)
router.post('/withdraw', protect, authorize('SELLER', 'ADMIN'), resolveSellerContext, requirePermission('MANAGE_FINANCE'), requestWithdrawal);

module.exports = router;
