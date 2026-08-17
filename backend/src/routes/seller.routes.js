const express = require('express');
const router = express.Router();
const { protect, authorize, resolveSellerContext, requirePermission } = require('../middleware/auth.middleware');
const {
  getPickupAddresses,
  createPickupAddress,
  setDefaultPickupAddress,
  deletePickupAddress,
} = require('../controllers/pickupAddress.controller');

const {
  createSubAccount,
  listSubAccounts,
  updateSubAccountPermissions,
  deleteSubAccount,
} = require('../controllers/subAccount.controller');

// ==========================================
// 1. QUẢN LÝ NHIỀU ĐỊA CHỈ KHO (PICKUP POINTS)
// ==========================================
router.get('/pickup-addresses', protect, authorize('SELLER'), resolveSellerContext, getPickupAddresses);
router.post('/pickup-addresses', protect, authorize('SELLER'), resolveSellerContext, createPickupAddress);
router.put('/pickup-addresses/:id/default', protect, authorize('SELLER'), resolveSellerContext, setDefaultPickupAddress);
router.delete('/pickup-addresses/:id', protect, authorize('SELLER'), resolveSellerContext, deletePickupAddress);

// ==========================================
// 2. PHÂN QUYỀN NHÂN VIÊN PHỤ (SUB-ACCOUNTS)
// ==========================================
router.get('/sub-accounts', protect, authorize('SELLER'), listSubAccounts);
router.post('/sub-accounts', protect, authorize('SELLER'), createSubAccount);
router.put('/sub-accounts/:id/permissions', protect, authorize('SELLER'), updateSubAccountPermissions);
router.delete('/sub-accounts/:id', protect, authorize('SELLER'), deleteSubAccount);

module.exports = router;
