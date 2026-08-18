const express = require('express');
const router = express.Router();
const { driverConfirmTrip } = require('../controllers/driverHandoff.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
router.use(protect);
router.use(authorize('DRIVER','LINE_HAUL_DRIVER','ADMIN'));
router.post('/:tripCode/confirm', driverConfirmTrip);
module.exports = router;
