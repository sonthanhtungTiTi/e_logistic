const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  openBag,
  addItem,
  removeItem,
  sealBag,
  getBag,
  listBags,
} = require('../controllers/bag.controller');

// Áp dụng bảo vệ JWT & Quyền hạn cho toàn bộ endpoint Gom bao
router.use(protect);
router.use(authorize('HUB_STAFF', 'HUB_COORDINATOR', 'ADMIN', 'WAREHOUSE_STAFF'));

// POST /api/bags/open - Mở bao tải mới
router.post('/open', openBag);

// POST /api/bags/add-item - Quét thả kiện vào bao (có Route Guard)
router.post('/add-item', addItem);

// POST /api/bags/remove-item - Xóa kiện khỏi bao
router.post('/remove-item', removeItem);

// POST /api/bags/seal - Khóa niêm phong bao tải
router.post('/seal', sealBag);

// GET /api/bags/:sealCode - Lấy chi tiết thông tin bao tải
router.get('/:sealCode', getBag);

// GET /api/bags - Lấy danh sách bao tải trong Hub
router.get('/', listBags);

module.exports = router;
