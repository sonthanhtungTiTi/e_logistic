const express = require('express');
const router = express.Router();
const linehaulDispatchController = require('../controllers/linehaulDispatch.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Bảo vệ toàn bộ route: Chỉ ADMIN và LINE_HAUL_DISPATCHER mới có quyền truy cập
router.use(protect, authorize('ADMIN', 'LINE_HAUL_DISPATCHER', 'DISPATCHER'));

router.get('/trips', linehaulDispatchController.getTrips);
router.get('/sealed-bags', linehaulDispatchController.getSealedBagsReady);
router.get('/drivers', linehaulDispatchController.getLinehaulDrivers);
router.post('/trips', linehaulDispatchController.createTrip);
router.post('/trips/:id/assign-driver', linehaulDispatchController.assignDriverToTrip);

module.exports = router;
