const express = require('express');
const router = express.Router();
const {
  getQuote,
  createOrder,
  updateOrder,
  updateOrderStatus,
  cancelOrder,
  bulkCancelOrders,
  searchOrders,
  trackOrderPublic,
  getPublicRecentOrders,
  getOrderById,
  getPrintLabel,
  updateDriverLocation,
  verifyPickupScanHandler,
  confirmPickupHandler,
  confirmBatchPickupHandler,
  pickupFailedHandler,
  processItemScanHandler,
  completePickupManifestHandler,
  approveOrderHandler,
  getShipperPickupTasks,
  getShipperPickupHistory,
  getShipperDeliveryTasks,
  getShipperDeliveryHistory,
  getShipperAvailableZones,
  flushShipperTripHandler
} = require('../controllers/order.controller');
const { protect, authorize, resolveSellerContext } = require('../middleware/auth.middleware');
const { createOrderRateLimiter, trackingRateLimiter } = require('../middleware/rateLimit.middleware');
const { requireVerifiedKyc } = require('../middleware/kyc.middleware');

// GET /api/orders/public-recent - Danh sách vận đơn hiển thị công khai trên LandingPage
router.get('/public-recent', getPublicRecentOrders);

// GET /api/orders/track/:trackingCode - Tra cứu công khai cho Khách mua (Public Buyer Tracking - Rate Limited 10 req/min, PII Masked)
router.get('/track/:trackingCode', trackingRateLimiter, trackOrderPublic);

// POST /api/orders/driver-location - Ingestion API GPS cho tài xế (Telematics)
// SEC-01 fixed: Thêm protect + authorize — trước đây endpoint công khai, ai cũng ghi GPS được
router.post('/driver-location', protect, authorize('DRIVER', 'SHIPPER', 'LINE_HAUL_DRIVER', 'LOCAL_SHIPPER', 'ADMIN'), updateDriverLocation);

// GET /api/orders - Tra cứu & Lọc danh sách đơn hàng của Seller hoặc Nhân viên vận hành
router.get('/', protect, authorize('SELLER', 'ADMIN', 'MANAGER', 'OPERATOR', 'COORDINATOR', 'HUB_STAFF', 'DRIVER', 'SHIPPER', 'LOCAL_SHIPPER', 'LINE_HAUL_DRIVER'), resolveSellerContext, searchOrders);

// POST /api/orders/quote - Lấy báo giá xem trước (chưa lưu DB)
router.post('/quote', protect, authorize('SELLER', 'ADMIN'), resolveSellerContext, getQuote);

// POST /api/orders/bulk-cancel - Hủy hàng loạt đơn hàng (UC-08 Alt 3.1)
router.post('/bulk-cancel', protect, authorize('SELLER', 'ADMIN'), resolveSellerContext, bulkCancelOrders);

// POST /api/orders - Tạo đơn hàng chính thức (UC-06)
router.post('/', createOrderRateLimiter, protect, authorize('SELLER', 'ADMIN'), requireVerifiedKyc, resolveSellerContext, createOrder);


// PUT /api/orders/:id - Cập nhật đơn hàng (UC-07)
router.put('/:id', protect, authorize('SELLER', 'ADMIN'), updateOrder);

// POST /api/orders/:id/approve - Admin phê duyệt đơn hàng từ Risk Review
router.post('/:id/approve', protect, authorize('ADMIN'), approveOrderHandler);

// PATCH /api/orders/:id/status - Cập nhật trạng thái đơn hàng (VD: Chuyển sang READY_TO_PICK)
router.patch('/:id/status', protect, authorize('SELLER', 'ADMIN'), updateOrderStatus);

// DELETE /api/orders/:id/cancel - Hủy 1 đơn hàng (UC-08)
router.delete('/:id/cancel', protect, authorize('SELLER', 'ADMIN'), cancelOrder);
router.post('/:id/cancel', protect, authorize('SELLER', 'ADMIN'), cancelOrder);

// UC-12: Shipper Pickup Endpoints (2-Phase Session & Legacy endpoints)
// UC-12: Shipper Task & Operating Zone Endpoints
router.get('/shipper/pickup-tasks', protect, authorize('PICKUP_SHIPPER', 'LOCAL_SHIPPER', 'SHIPPER', 'DRIVER', 'LINE_HAUL_DRIVER', 'ADMIN'), getShipperPickupTasks);
router.get('/shipper/pickup-history', protect, authorize('PICKUP_SHIPPER', 'LOCAL_SHIPPER', 'SHIPPER', 'DRIVER', 'LINE_HAUL_DRIVER', 'ADMIN'), getShipperPickupHistory);
router.get('/shipper/delivery-tasks', protect, authorize('DELIVERY_SHIPPER', 'LOCAL_SHIPPER', 'SHIPPER', 'DRIVER', 'LINE_HAUL_DRIVER', 'ADMIN'), getShipperDeliveryTasks);
router.get('/shipper/delivery-history', protect, authorize('DELIVERY_SHIPPER', 'LOCAL_SHIPPER', 'SHIPPER', 'DRIVER', 'LINE_HAUL_DRIVER', 'ADMIN'), getShipperDeliveryHistory);
router.get('/shipper/zones', protect, authorize('PICKUP_SHIPPER', 'LOCAL_SHIPPER', 'SHIPPER', 'DRIVER', 'LINE_HAUL_DRIVER', 'ADMIN'), getShipperAvailableZones);
router.post('/shipper/trip-flush', protect, authorize('PICKUP_SHIPPER', 'LOCAL_SHIPPER', 'SHIPPER', 'ADMIN'), flushShipperTripHandler);
router.post('/shipper/process-scan', protect, authorize('PICKUP_SHIPPER', 'DELIVERY_SHIPPER', 'DRIVER', 'SHIPPER', 'SELLER', 'ADMIN'), processItemScanHandler);
router.post('/shipper/complete-manifest', protect, authorize('PICKUP_SHIPPER', 'DELIVERY_SHIPPER', 'DRIVER', 'SHIPPER', 'SELLER', 'ADMIN'), completePickupManifestHandler);
router.post('/shipper/batch-pickup', protect, authorize('PICKUP_SHIPPER', 'LOCAL_SHIPPER', 'DRIVER', 'SHIPPER', 'SELLER', 'ADMIN'), confirmBatchPickupHandler);
router.post('/shipper/:id/verify-scan', protect, authorize('PICKUP_SHIPPER', 'LOCAL_SHIPPER', 'DRIVER', 'SHIPPER', 'SELLER', 'ADMIN'), verifyPickupScanHandler);
router.post('/shipper/:id/verify-pickup-scan', protect, authorize('PICKUP_SHIPPER', 'LOCAL_SHIPPER', 'DRIVER', 'SHIPPER', 'SELLER', 'ADMIN'), verifyPickupScanHandler);
router.post('/shipper/:id/confirm-pickup', protect, authorize('PICKUP_SHIPPER', 'LOCAL_SHIPPER', 'DRIVER', 'SHIPPER', 'SELLER', 'ADMIN'), confirmPickupHandler);
router.post('/shipper/:id/pickup-failed', protect, authorize('PICKUP_SHIPPER', 'LOCAL_SHIPPER', 'DRIVER', 'SHIPPER', 'SELLER', 'ADMIN'), pickupFailedHandler);


// GET /api/orders/:id - Chi tiết đơn hàng (Riêng tư - IDOR Protection)
router.get('/:id', protect, getOrderById);

// GET /api/orders/:id/label - In nhãn dán vận đơn
router.get('/:id/label', protect, getPrintLabel);

module.exports = router;
