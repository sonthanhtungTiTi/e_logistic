const Order = require('../models/order.model');
const orderService = require('../services/order.service');

/**
 * Background Task Helper: Notify Dispatcher when a routed order is cancelled (Step 8 & Alt 8.1)
 * Must NOT block response, MUST NOT rollback transaction if error occurs!
 */
const notifyDispatcherOrderRemoved = async (cancelledOrder) => {
  // Simulate dispatch notification logic / webhook / event trigger
  if (process.env.SIMULATE_DISPATCHER_FAIL === 'true') {
    throw new Error('[SIMULATED] Dispatcher notification service offline');
  }
  console.log(`📡 [DISPATCHER NOTIFIED] Order ${cancelledOrder.trackingCode} removed from route for driver ${cancelledOrder.currentDriverId}`);
};

/**
 * @desc    Lấy báo giá cước phí xem trước (UC-06 Step 4)
 * @route   POST /api/orders/quote
 * @access  Private (Seller/Admin)
 */
const getQuote = async (req, res, next) => {
  try {
    const quoteResult = await orderService.getQuotePreview(req.body);
    return res.status(200).json({
      success: true,
      data: quoteResult
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message, code: err.code });
    }
    next(err);
  }
};

/**
 * @desc    Tạo đơn hàng mới (UC-06 Step 6-10)
 * @route   POST /api/orders
 * @access  Private (Seller/Admin)
 */
const createOrder = async (req, res, next) => {
  try {
    const headerIdempotencyKey = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];
    const result = await orderService.createNewOrder(req.user._id, req.body, headerIdempotencyKey);

    return res.status(result.statusCode).json({
      success: true,
      message: result.message,
      trackingCode: result.order.trackingCode,
      tracking_id: result.order.trackingCode,
      status: result.order.status,
      data: result.order,
      printLabelUrl: result.printLabelUrl
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code || 'BAD_REQUEST'
      });
    }
    next(err);
  }
};

/**
 * @desc    Cập nhật đơn hàng (UC-07)
 * @route   PUT /api/orders/:id
 * @access  Private (Seller/Admin)
 */
const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'ADMIN';

    const result = await orderService.updateExistingOrder(userId, isAdmin, id, req.body);

    const responsePayload = {
      success: true,
      message: result.message,
      fee_changed: result.fee_changed,
      order: result.order
    };

    if (result.fee_changed) {
      responsePayload.old_fee = result.old_fee;
      responsePayload.new_fee = result.new_fee;
    }

    return res.status(200).json(responsePayload);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code || 'BAD_REQUEST'
      });
    }
    next(err);
  }
};

/**
 * @desc    Hủy 1 đơn hàng (UC-08 Single Cancel)
 * @route   DELETE /api/orders/:id/cancel
 * @access  Private (Seller/Admin)
 */
const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'ADMIN';

    const result = await orderService.cancelOrder(userId, isAdmin, id, req.body);

    // Step 8 & Alt 8.1: Background Notification to Dispatcher if order was routed
    if (result.wasRouted) {
      notifyDispatcherOrderRemoved(result.cancelledOrder).catch(err => {
        console.error('⚠️ [ALT 8.1] Không thể gửi thông báo gỡ đơn cho Điều phối viên:', err.message);
        // Fallback: system monitoring log for manual audit trace
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Hủy đơn hàng thành công',
      order: result.cancelledOrder
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code || 'BAD_REQUEST'
      });
    }
    next(err);
  }
};

/**
 * @desc    Hủy hàng loạt đơn hàng (UC-08 Bulk Cancel Alt Flow 3.1)
 * @route   POST /api/orders/bulk-cancel
 * @access  Private (Seller/Admin)
 */
const bulkCancelOrders = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'ADMIN';

    const bulkResult = await orderService.bulkCancelOrders(userId, isAdmin, req.body);

    // Step 8 background notifications for routed orders in bulk results
    bulkResult.results.forEach(resItem => {
      if (resItem.success && resItem.wasRouted) {
        notifyDispatcherOrderRemoved(resItem.order).catch(err => {
          console.error(`⚠️ [ALT 8.1] Lỗi thông báo gỡ đơn ${resItem.order.trackingCode}:`, err.message);
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: `Đã xử lý hủy ${bulkResult.total} đơn hàng (Thành công: ${bulkResult.successCount}, Thất bại: ${bulkResult.failedCount})`,
      data: bulkResult
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code || 'BAD_REQUEST'
      });
    }
    next(err);
  }
};

/**
 * @desc    Tra cứu & Lọc danh sách đơn hàng của Seller (UC Tra Cứu Đơn Hàng)
 * @route   GET /api/orders
 * @access  Private (Seller/Admin)
 */
const searchOrders = async (req, res, next) => {
  try {
    const sellerId = req.user._id;
    const isAdmin = req.user.role === 'ADMIN';

    const searchResult = await orderService.searchSellerOrders(sellerId, isAdmin, req.query);

    return res.status(200).json({
      success: true,
      message: searchResult.orders.length > 0 ? 'Tìm thấy danh sách đơn hàng' : 'Không có đơn hàng phù hợp.',
      data: searchResult.orders,
      pagination: searchResult.pagination
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: 'BAD_REQUEST'
      });
    }
    next(err);
  }
};

/**
 * @desc    Tra cứu công khai hành trình đơn hàng qua mã vận đơn (Dành cho Khách mua / Public)
 * @route   GET /api/orders/track/:trackingCode
 * @access  Public
 */
const trackOrderPublic = async (req, res, next) => {
  try {
    const { trackingCode } = req.params;
    const { phoneLast4 } = req.query;
    const trackingData = await orderService.getPublicOrderTracking(trackingCode, phoneLast4);

    return res.status(200).json({
      success: true,
      message: 'Tra cứu hành trình đơn hàng thành công',
      data: trackingData
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
};

/**
 * @desc    Lấy danh sách đơn hàng gần đây nhất hiển thị công khai trên trang chủ LandingPage
 * @route   GET /api/orders/public-recent
 * @access  Public
 */
const getPublicRecentOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(8);

    return res.status(200).json({
      success: true,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Lấy chi tiết đơn hàng riêng tư theo ID hoặc Tracking Code (Dành cho Seller/Admin)
 * @route   GET /api/orders/:id
 * @access  Private (Seller/Admin)
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'ADMIN';

    let order;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id).populate('sellerId', 'fullName email phoneNumber companyName');
    } else {
      order = await Order.findOne({ trackingCode: id }).populate('sellerId', 'fullName email phoneNumber companyName');
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại hoặc không thể truy cập.' });
    }

    // Exception Flow 8.1: Ownership check (IDOR Guard)
    if (!isAdmin && order.sellerId._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Đơn hàng không tồn tại hoặc không thuộc quyền sở hữu của bạn.'
      });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    In nhãn dán vận đơn (Print Shipping Label)
 * @route   GET /api/orders/:id/label
 * @access  Private
 */
const getPrintLabel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'ADMIN';

    const order = await Order.findById(id).populate('sellerId', 'fullName phoneNumber');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng để in nhãn' });
    }

    // Ownership Guard
    if (!isAdmin && order.sellerId._id.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền in nhãn đơn hàng này.' });
    }

    const labelData = {
      trackingCode: order.trackingCode,
      status: order.status,
      sender: {
        name: order.pickupAddress.fullName,
        phone: order.pickupAddress.phone,
        address: `${order.pickupAddress.address}, ${order.pickupAddress.ward}, ${order.pickupAddress.district}, ${order.pickupAddress.province}`
      },
      receiver: {
        name: order.deliveryAddress.fullName,
        phone: order.deliveryAddress.phone,
        address: `${order.deliveryAddress.address}, ${order.deliveryAddress.ward}, ${order.deliveryAddress.district}, ${order.deliveryAddress.province}`
      },
      packageInfo: {
        items: order.items,
        chargeableWeight: `${order.chargeableWeight} kg`,
        codAmount: `${order.codAmount.toLocaleString('vi-VN')} VNĐ`,
        isCod: order.isCod
      },
      hubs: {
        pickupHub: order.pickupHub,
        deliveryHub: order.deliveryHub
      },
      printedAt: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      data: labelData
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Cập nhật trạng thái đơn hàng (VD: CREATED / PENDING_VERIFICATION -> READY_TO_PICK)
 * @route   PATCH /api/orders/:id/status
 * @access  Private (Seller/Admin)
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!status) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp trạng thái mới (status)' });
    }

    const updatedOrder = await orderService.updateOrderStatus(userId, isAdmin, id, status, note);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công',
      order: updatedOrder
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code || 'BAD_REQUEST'
      });
    }
  }
};

/**
 * @desc    Admin phê duyệt đơn hàng từ màn hình Risk Review
 * @route   POST /api/orders/:id/approve
 * @access  Private (Admin)
 */
const approveOrderHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deliveryHub, overrideNote } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
    }

    order.status = 'READY_TO_PICK';
    if (deliveryHub) order.deliveryHub = deliveryHub;
    if (overrideNote) order.cancelNote = overrideNote;
    order.needsManualRouting = false;
    order.flagCodAnomaly = false;
    order.flagFeeWarning = false;

    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Phê duyệt đơn hàng và chuyển sang READY_TO_PICK thành công',
      data: order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Cập nhật vị trí GPS siêu tốc của Tài xế (Driver Telematics Ingestion API)
 * @route   POST /api/orders/driver-location
 * @access  Public / Driver
 */
const updateDriverLocation = async (req, res, next) => {
  try {
    const telematics = require('../services/telematics.service');
    const { driverId, lat, lng } = req.body;
    const targetDriverId = driverId || (req.user ? req.user._id : 'drv_123');
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin tọa độ lat, lng' });
    }
    const updated = await telematics.updateDriverLocation(targetDriverId, lat, lng);
    return res.status(200).json({ success: true, message: 'Cập nhật tọa độ GPS tài xế thành công', data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * UC-12 Shipper Pickup Handlers (2-Phase Session & Mobile Manifest)
 */
const processItemScanHandler = async (req, res, next) => {
  try {
    const result = await orderService.processItemScan(req.user, req.body);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        manifest: result.manifest,
        order: result.order
      }
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code || 'BAD_REQUEST'
      });
    }
    next(err);
  }
};

const completePickupManifestHandler = async (req, res, next) => {
  try {
    const result = await orderService.completePickupManifest(req.user, req.body);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        manifest: result.manifest,
        completedCount: result.completedCount,
        totalOrders: result.totalOrders
      }
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code || 'BAD_REQUEST'
      });
    }
    next(err);
  }
};

const confirmBatchPickupHandler = async (req, res, next) => {
  try {
    const result = await orderService.confirmBatchPickup(req.user, req.body);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code || 'BAD_REQUEST'
      });
    }
    next(err);
  }
};

const verifyPickupScanHandler = async (req, res, next) => {
  try {
    const code = req.params.id || req.body.trackingCode || req.body.scannedCode;
    const result = await orderService.verifyPickupScan(req.user, code);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.order
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code || 'BAD_REQUEST'
      });
    }
    next(err);
  }
};

const confirmPickupHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await orderService.confirmPickup(req.user, id, req.body);
    return res.status(200).json({
      success: true,
      message: result.message || 'Xác nhận lấy đơn hàng thành công',
      data: result.confirmation,
      order: result.order
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code || 'BAD_REQUEST'
      });
    }
    next(err);
  }
};

const pickupFailedHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await orderService.pickupFailed(req.user, id, req.body);
    return res.status(200).json({
      success: true,
      message: result.message || 'Ghi nhận lấy hàng thất bại',
      order: result.order
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code || 'BAD_REQUEST'
      });
    }
    next(err);
  }
};

module.exports = {
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
  notifyDispatcherOrderRemoved,
  updateDriverLocation,
  processItemScanHandler,
  completePickupManifestHandler,
  confirmBatchPickupHandler,
  verifyPickupScanHandler,
  confirmPickupHandler,
  pickupFailedHandler,
  approveOrderHandler
};

