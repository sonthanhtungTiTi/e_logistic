const express = require('express');
const router = express.Router();
const { scanOutbound, commitOutbound } = require('../controllers/outbound.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
router.use(protect);
router.use(authorize('HUB_STAFF','HUB_COORDINATOR','ADMIN'));
router.post('/scan', scanOutbound);
router.post('/commit', commitOutbound);
module.exports = router;
