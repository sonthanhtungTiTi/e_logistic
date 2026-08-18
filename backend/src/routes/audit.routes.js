const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/audit.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

const staffRoles = authorize('HUB_STAFF','HUB_COORDINATOR','ADMIN');
const coordRoles = authorize('HUB_COORDINATOR','ADMIN');

router.post('/start',                   staffRoles, ctrl.startAudit);
router.post('/sync',                    staffRoles, ctrl.syncAudit);
router.post('/:sessionCode/pause',      staffRoles, ctrl.pauseAudit);
router.post('/:sessionCode/resume',     staffRoles, ctrl.resumeAudit);
router.post('/:sessionCode/submit',     staffRoles, ctrl.submitAudit);
router.post('/:sessionCode/approve',    coordRoles, ctrl.approveAudit);

module.exports = router;
