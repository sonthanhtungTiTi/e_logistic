const express = require('express');
const router = express.Router();
const custodyController = require('../controllers/custody.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/transfer', custodyController.recordTransfer);
router.get('/history/:trackingCode', custodyController.getCustodyHistory);

module.exports = router;
