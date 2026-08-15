const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventory.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

const staffRoles = authorize('HUB_STAFF','HUB_COORDINATOR','ADMIN');
const coordRoles = authorize('HUB_COORDINATOR','ADMIN');

router.get('/aging',                          staffRoles, ctrl.getAging);
router.get('/summary',                        staffRoles, ctrl.getSummary);
router.get('/:trackingCode/movement-history', staffRoles, ctrl.getMovementHistory);
router.get('/export',                         coordRoles, ctrl.exportInventory);
router.post('/action',                        coordRoles, ctrl.performAction);

module.exports = router;
