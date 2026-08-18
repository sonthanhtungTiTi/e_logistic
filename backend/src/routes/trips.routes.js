const express = require('express');
const router = express.Router();
const { createTrip } = require('../controllers/trips.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
router.use(protect);
router.post('/', authorize('HUB_COORDINATOR','ADMIN'), createTrip);
module.exports = router;
