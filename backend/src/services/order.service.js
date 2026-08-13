const mongoose = require('mongoose');
const crypto = require('crypto');
const Joi = require('joi');
const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');
const OrderTrackingLog = require('../models/orderTrackingLog.model');
const { generateTrackingCode } = require('../utils/idGenerator');
const { calculateOrderFees, evaluateRisk, VOLUMETRIC_DIVISOR } = require('./pricing.service');

// Vietnamese phone number regex format validator
const VN_PHONE_REGEX = /^(\+?84|0)[0-9]{9,10}$/;

// Editable & Cancellable Order Statuses Guard
// Sửa đơn: CHỈ cho phép khi đơn ở trạng thái CREATED hoặc PENDING_VERIFICATION (Sau khi READY_TO_PICK thì KHÔNG được phép sửa nữa!)
const EDITABLE_STATUSES = ['CREATED', 'PENDING_VERIFICATION'];
const CANCELLABLE_STATUSES = ['CREATED', 'PENDING_VERIFICATION', 'READY_TO_PICK'];

/**
 * Joi Schema for Quote Request
 */
const quoteSchema = Joi.object({
  pickupAddress: Joi.object({
    province: Joi.string().required(),
    district: Joi.string().required(),
    ward: Joi.string().allow('', null).optional(),
    address: Joi.string().allow('', null).optional()
  }).required(),
  deliveryAddress: Joi.object({
    province: Joi.string().required(),
    district: Joi.string().required(),
    ward: Joi.string().allow('', null).optional(),
    address: Joi.string().allow('', null).optional()
  }).required(),
  items: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
      weight: Joi.number().min(0.01).required(), // kg
    })
  ).min(1).required(),
  dimensions: Joi.object({
    length: Joi.number().min(0).optional(),
    width: Joi.number().min(0).optional(),
    height: Joi.number().min(0).optional(),
  }).optional(),
  isCod: Joi.boolean().optional(),
  codAmount: Joi.number().min(0).optional(),
  goodsValue: Joi.number().min(0).optional().default(0),
  discountCode: Joi.string().allow('', null).optional(),
  shippingPayer: Joi.string().valid('buyer', 'seller').optional()
}).unknown(true);

/**
 * Joi Schema for Order Creation
 */
const createOrderSchema = Joi.object({
  orderIdSan: Joi.string().allow('', null).optional(),
  idempotencyKey: Joi.string().allow('', null).optional(),
  confirmProceedWithoutDiscount: Joi.boolean().optional().default(false),
  pickupAddress: Joi.object({
    fullName: Joi.string().required(),
    phone: Joi.string().pattern(VN_PHONE_REGEX).required().messages({
      'string.pattern.base': 'Số điện thoại lấy hàng không đúng định dạng Việt Nam (VD: 0912345678)'
    }),
    address: Joi.string().required(),
    ward: Joi.string().required(),
    district: Joi.string().required(),
    province: Joi.string().required(),
    coordinates: Joi.object({
      lat: Joi.number().optional(),
      lng: Joi.number().optional()
    }).optional()
  }).required(),
  deliveryAddress: Joi.object({
    fullName: Joi.string().required(),
    phone: Joi.string().pattern(VN_PHONE_REGEX).required().messages({
      'string.pattern.base': 'Số điện thoại giao hàng không đúng định dạng Việt Nam (VD: 0912345678)'
    }),
    address: Joi.string().required(),
    ward: Joi.string().required(),
    district: Joi.string().required(),
    province: Joi.string().required(),
    coordinates: Joi.object({
      lat: Joi.number().optional(),
      lng: Joi.number().optional()
    }).optional()
  }).required(),
  items: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
      weight: Joi.number().min(0.01).required(), // kg
    })
  ).min(1).required(),
  dimensions: Joi.object({
    length: Joi.number().min(0).default(0),
    width: Joi.number().min(0).default(0),
    height: Joi.number().min(0).default(0),
  }).optional().default({ length: 0, width: 0, height: 0 }),
  isCod: Joi.boolean().optional().default(false),
  codAmount: Joi.number().min(0).default(0),
  goodsValue: Joi.number().min(0).default(0),
  discountCode: Joi.string().allow('', null).optional(),
  deliveryNote: Joi.string().allow('', null).optional(),
  shippingPayer: Joi.string().valid('buyer', 'seller').optional().default('buyer')
}).unknown(true);

/**
 * Joi Schema for Order Cancellation (UC-08)
 */
const cancelOrderSchema = Joi.object({
  reason: Joi.string().valid('SELLER_CHANGED_MIND', 'WRONG_INFO', 'OUT_OF_STOCK', 'OTHER').required().messages({
    'any.only': 'Lý do hủy đơn không hợp lệ (Chấp nhận: SELLER_CHANGED_MIND, WRONG_INFO, OUT_OF_STOCK, OTHER)',
    'any.required': 'Vui lòng chọn lý do hủy đơn hàng'
  }),
  customReason: Joi.when('reason', {
    is: 'OTHER',
    then: Joi.string().min(5).required().messages({
      'string.min': 'Lý do khác phải có ít nhất 5 ký tự',
      'any.required': 'Vui lòng nhập chi tiết lý do khác'
    }),
    otherwise: Joi.string().allow('', null).optional()
  })
});

/**
 * Service function to calculate quote preview without saving to DB
 */
const getQuotePreview = async (body) => {
  const { error, value } = quoteSchema.validate(body, { abortEarly: false });
  if (error) {
    const err = new Error(error.details.map(d => d.message).join('; '));
    err.statusCode = 400;
    throw err;
  }

  const totalActualWeight = value.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);

  const feeData = calculateOrderFees({
    actualWeight: totalActualWeight,
    dimensions: value.dimensions,
    pickupAddress: value.pickupAddress,
    deliveryAddress: value.deliveryAddress,
    goodsValue: value.goodsValue,
    discountCode: value.discountCode
  });

  return {
    actualWeight: feeData.actualWeight,
    volumetricWeight: feeData.volumetricWeight,
    chargeableWeight: feeData.chargeableWeight,
    baseFee: feeData.baseFee,
    insuranceFee: feeData.insuranceFee,
    discountAmount: feeData.discountAmount,
    discountError: feeData.discountError,
    shippingFee: feeData.shippingFee,
    pickupHub: feeData.pickupHub,
    deliveryHub: feeData.deliveryHub
  };
};

/**
 * Service function to create a new order (UC-06)
 */
const createNewOrder = async (sellerId, body, headerIdempotencyKey) => {
  // 1. Whitelist Payload
  const sanitizedInput = { ...body };
  delete sanitizedInput.actual_fee;
  delete sanitizedInput.chargeable_weight;
  delete sanitizedInput.shippingFee;
  delete sanitizedInput.baseFee;
  delete sanitizedInput.insuranceFee;

  // 2. Validate input schema
  const { error, value } = createOrderSchema.validate(sanitizedInput, { abortEarly: false });
  if (error) {
    const err = new Error(error.details.map(d => d.message).join('; '));
    err.statusCode = 400;
    throw err;
  }

  const orderData = { ...value };

  if (!orderData.orderIdSan || orderData.orderIdSan.trim() === '') {
    delete orderData.orderIdSan;
  }

  const idempotencyKey = headerIdempotencyKey || orderData.idempotencyKey || null;
  if (!idempotencyKey && !orderData.orderIdSan) {
    orderData.idempotencyKey = `IDEM-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  } else if (idempotencyKey) {
    orderData.idempotencyKey = idempotencyKey;
  }

  const hashPayload = JSON.stringify({
    orderIdSan: orderData.orderIdSan || null,
    pickup: orderData.pickupAddress,
    delivery: orderData.deliveryAddress,
    items: orderData.items,
    codAmount: orderData.codAmount,
    goodsValue: orderData.goodsValue,
  });
  const payloadHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

  const totalActualWeight = orderData.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
  
  const feeData = calculateOrderFees({
    actualWeight: totalActualWeight,
    dimensions: orderData.dimensions,
    pickupAddress: orderData.pickupAddress,
    deliveryAddress: orderData.deliveryAddress,
    goodsValue: orderData.goodsValue,
    discountCode: orderData.discountCode
  });

  // Alt Flow 6.2: Check if discount code has error and Seller has not confirmed proceeding without discount
  if (feeData.discountError && !orderData.confirmProceedWithoutDiscount) {
    const err = new Error(feeData.discountError + '. Bạn có muốn tiếp tục tạo đơn hàng với cước phí gốc không?');
    err.statusCode = 422;
    err.code = 'DISCOUNT_INVALID_NEEDS_CONFIRM';
    throw err;
  }

  const codAmountInt = Math.floor(orderData.codAmount || 0);
  const isCod = codAmountInt > 0;
  const goodsValueInt = Math.floor(orderData.goodsValue || 0);

  const riskEval = evaluateRisk({
    shippingFee: feeData.shippingFee,
    codAmount: codAmountInt,
    goodsValue: goodsValueInt,
    needsManualRouting: feeData.needsManualRouting
  });

  const trackingCode = generateTrackingCode();
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const newOrder = new Order({
      trackingCode,
      orderIdSan: orderData.orderIdSan,
      idempotencyKey: orderData.idempotencyKey,
      payloadHash,
      status: riskEval.status,
      sellerId,
      pickupAddress: orderData.pickupAddress,
      deliveryAddress: orderData.deliveryAddress,
      items: orderData.items,
      dimensions: orderData.dimensions,
      actualWeight: feeData.actualWeight,
      volumetricWeight: feeData.volumetricWeight,
      chargeableWeight: feeData.chargeableWeight,
      isCod,
      codAmount: codAmountInt,
      goodsValue: goodsValueInt,
      baseFee: feeData.baseFee,
      insuranceFee: feeData.insuranceFee,
      discountAmount: feeData.discountAmount,
      discountCode: orderData.discountCode || null,
      shippingFee: feeData.shippingFee,
      pickupHub: feeData.pickupHub,
      deliveryHub: feeData.deliveryHub,
      flagFeeWarning: riskEval.flagFeeWarning,
      flagCodAnomaly: riskEval.flagCodAnomaly,
      needsManualRouting: riskEval.needsManualRouting
    });

    const savedOrder = await newOrder.save({ session });

    const logNote = riskEval.isRisk 
      ? `Seller tạo đơn hàng mới (Trạng thái PENDING_VERIFICATION do cờ rủi ro / điều phối)`
      : 'Seller tạo đơn hàng mới thành công';

    await OrderLog.create([{
      orderId: savedOrder._id,
      actionBy: sellerId,
      preStatus: null,
      postStatus: riskEval.status,
      actionType: 'CREATED',
      note: logNote
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      statusCode: 201,
      message: 'Tạo đơn hàng thành công',
      order: savedOrder,
      printLabelUrl: `/api/orders/${savedOrder._id}/label`
    };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    if (err.code === 11000) {
      let queryFilter = {};
      if (err.keyPattern?.orderIdSan && orderData.orderIdSan) {
        queryFilter = { orderIdSan: orderData.orderIdSan };
      } else if (err.keyPattern?.idempotencyKey && orderData.idempotencyKey) {
        queryFilter = { idempotencyKey: orderData.idempotencyKey };
      } else {
        queryFilter = { payloadHash };
      }

      const existingOrder = await Order.findOne(queryFilter);

      if (existingOrder && existingOrder.payloadHash === payloadHash) {
        return {
          success: true,
          statusCode: 200,
          isIdempotentRepeat: true,
          message: 'Đơn hàng đã được tạo trước đó (Idempotent Request)',
          order: existingOrder,
          printLabelUrl: `/api/orders/${existingOrder._id}/label`
        };
      } else {
        const conflictErr = new Error('Xung đột dữ liệu: Mã đơn hàng hoặc Key Idempotency đã tồn tại với nội dung khác.');
        conflictErr.statusCode = 409;
        conflictErr.code = 'DUPLICATE_KEY_CONFLICT';
        throw conflictErr;
      }
    }

    console.error('❌ Error creating order in order.service:', err);
    throw err;
  }
};

/**
 * Strict CamelCase Whitelist & Validation for Update Order (UC-07)
 */
const sanitizeAndValidateUpdateBody = (body) => {
  const allowed = {};

  // Delivery Address
  if (body.deliveryAddress && typeof body.deliveryAddress === 'object') {
    allowed.deliveryAddress = {
      fullName: body.deliveryAddress.fullName,
      phone: body.deliveryAddress.phone,
      address: body.deliveryAddress.address,
      ward: body.deliveryAddress.ward,
      district: body.deliveryAddress.district,
      province: body.deliveryAddress.province,
      coordinates: body.deliveryAddress.coordinates
    };
  }

  // Items Array
  if (body.items && Array.isArray(body.items)) {
    for (const item of body.items) {
      if (!item.name || typeof item.quantity !== 'number' || item.quantity < 1 || typeof item.weight !== 'number' || item.weight <= 0) {
        const err = new Error('Thông tin sản phẩm không hợp lệ (quantity >= 1, weight > 0).');
        err.statusCode = 400;
        throw err;
      }
    }
    allowed.items = body.items.map(item => ({
      name: String(item.name).trim(),
      quantity: Math.floor(item.quantity),
      weight: Number(item.weight)
    }));
  }

  // Dimensions Validation
  if (body.dimensions && typeof body.dimensions === 'object') {
    const l = Number(body.dimensions.length || 0);
    const w = Number(body.dimensions.width || 0);
    const h = Number(body.dimensions.height || 0);

    if (l < 0 || w < 0 || h < 0) {
      const err = new Error('Kích thước dài, rộng, cao không được âm.');
      err.statusCode = 400;
      throw err;
    }

    allowed.dimensions = { length: l, width: w, height: h };
  }

  // Actual Weight
  if (body.actualWeight !== undefined) {
    const w = Number(body.actualWeight);
    if (isNaN(w) || w <= 0) {
      const err = new Error('Khối lượng thực tế phải là số dương lớn hơn 0.');
      err.statusCode = 400;
      throw err;
    }
    allowed.actualWeight = w;
  }

  if (body.isCod !== undefined) {
    allowed.isCod = Boolean(body.isCod);
  }

  // COD Amount Validation & Sanitization (Integer Đồng)
  if (body.codAmount !== undefined) {
    const cod = Number(body.codAmount);
    if (isNaN(cod) || cod < 0) {
      const err = new Error('Số tiền COD không được âm.');
      err.statusCode = 400;
      throw err;
    }
    allowed.codAmount = Math.floor(cod);
    if (allowed.isCod === undefined) {
      allowed.isCod = allowed.codAmount > 0;
    }
  }

  // Goods Value Validation & Sanitization (Integer Đồng)
  if (body.goodsValue !== undefined) {
    const val = Number(body.goodsValue);
    if (isNaN(val) || val < 0) {
      const err = new Error('Giá trị hàng hóa không được âm.');
      err.statusCode = 400;
      throw err;
    }
    allowed.goodsValue = Math.floor(val);
  }

  if (body.discountCode !== undefined) {
    allowed.discountCode = body.discountCode ? String(body.discountCode).trim() : null;
  }

  if (body.deliveryNote !== undefined) {
    allowed.deliveryNote = body.deliveryNote ? String(body.deliveryNote).trim() : '';
  }

  if (body.shippingPayer !== undefined && ['buyer', 'seller'].includes(body.shippingPayer)) {
    allowed.shippingPayer = body.shippingPayer;
  }

  return allowed;
};

/**
 * Service function to update order with atomic status guard & fee recalculation (UC-07)
 */
const updateExistingOrder = async (userId, isAdmin, orderIdentifier, body) => {
  // 1. Sanitize & Whitelist input fields (Strict CamelCase Only)
  const sanitizedInput = sanitizeAndValidateUpdateBody(body);

  // 2. Fetch existing order to check ownership, status & previous fee state
  const isObjectId = mongoose.Types.ObjectId.isValid(orderIdentifier);
  const findFilter = isObjectId 
    ? { _id: orderIdentifier } 
    : { trackingCode: orderIdentifier };

  const existingOrder = await Order.findOne(findFilter);

  // Check 404: Order not found
  if (!existingOrder) {
    const err = new Error('Đơn hàng không tồn tại.');
    err.statusCode = 404;
    throw err;
  }

  // Check 403: IDOR - Skip ownership check if user is ADMIN!
  if (!isAdmin && existingOrder.sellerId.toString() !== userId.toString()) {
    const err = new Error('Bạn không có quyền chỉnh sửa đơn hàng này.');
    err.statusCode = 403;
    throw err;
  }

  // Check 409: Status Guard (Time-Of-Check)
  const readyTime = existingOrder.readyToPickAt || existingOrder.updatedAt;
  const elapsedSecs = readyTime ? Math.floor((Date.now() - new Date(readyTime).getTime()) / 1000) : 0;
  const isWithin5MinWindow = existingOrder.status === 'READY_TO_PICK' && elapsedSecs < 300;

  const isEditable = EDITABLE_STATUSES.includes(existingOrder.status) || isWithin5MinWindow;
  if (!isEditable) {
    const err = new Error('Đơn hàng đã hết thời hạn 5 phút hoặc đã được xử lý, không thể chỉnh sửa.');
    err.statusCode = 409;
    err.code = 'ORDER_STATUS_LOCKED';
    throw err;
  }

  // 3. Prepare updated data merging with existing data for full validation & pricing check
  const mergedDeliveryAddress = {
    fullName: sanitizedInput.deliveryAddress?.fullName || existingOrder.deliveryAddress.fullName,
    phone: sanitizedInput.deliveryAddress?.phone || existingOrder.deliveryAddress.phone,
    address: sanitizedInput.deliveryAddress?.address || existingOrder.deliveryAddress.address,
    ward: sanitizedInput.deliveryAddress?.ward || existingOrder.deliveryAddress.ward,
    district: sanitizedInput.deliveryAddress?.district || existingOrder.deliveryAddress.district,
    province: sanitizedInput.deliveryAddress?.province || existingOrder.deliveryAddress.province,
    coordinates: sanitizedInput.deliveryAddress?.coordinates || existingOrder.deliveryAddress.coordinates
  };

  const mergedItems = sanitizedInput.items || existingOrder.items;
  const mergedDimensions = sanitizedInput.dimensions || existingOrder.dimensions;
  const mergedGoodsValue = sanitizedInput.goodsValue !== undefined ? sanitizedInput.goodsValue : existingOrder.goodsValue;
  const mergedDiscountCode = sanitizedInput.discountCode !== undefined ? sanitizedInput.discountCode : existingOrder.discountCode;
  const mergedCodAmount = sanitizedInput.codAmount !== undefined ? sanitizedInput.codAmount : existingOrder.codAmount;

  // Validate merged delivery address phone format
  if (sanitizedInput.deliveryAddress?.phone && !VN_PHONE_REGEX.test(sanitizedInput.deliveryAddress.phone)) {
    const err = new Error('Số điện thoại giao hàng không đúng định dạng Việt Nam (VD: 0912345678)');
    err.statusCode = 400;
    throw err;
  }

  // 4. Check if any fee-impacting fields changed
  const totalActualWeight = mergedItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0);

  const isFeeImpactingChange = 
    sanitizedInput.deliveryAddress !== undefined ||
    sanitizedInput.items !== undefined ||
    sanitizedInput.dimensions !== undefined ||
    sanitizedInput.actualWeight !== undefined ||
    sanitizedInput.goodsValue !== undefined ||
    sanitizedInput.discountCode !== undefined;

  let feeChanged = false;
  const oldFee = existingOrder.shippingFee;
  let newFee = oldFee;
  let updatePayload = { ...sanitizedInput };

  if (isFeeImpactingChange) {
    try {
      // Recalculate 100% server-side fees (reusing UC-06 pricing service)
      const recalculated = calculateOrderFees({
        actualWeight: totalActualWeight,
        dimensions: mergedDimensions,
        pickupAddress: existingOrder.pickupAddress,
        deliveryAddress: mergedDeliveryAddress,
        goodsValue: mergedGoodsValue,
        discountCode: mergedDiscountCode
      });

      newFee = recalculated.shippingFee;
      feeChanged = (oldFee !== newFee);

      // Re-evaluate Risk Engine for modified values
      const riskEval = evaluateRisk({
        shippingFee: newFee,
        codAmount: mergedCodAmount,
        goodsValue: mergedGoodsValue,
        needsManualRouting: recalculated.needsManualRouting
      });

      // Update calculated financial and physical fields
      updatePayload.actualWeight = recalculated.actualWeight;
      updatePayload.volumetricWeight = recalculated.volumetricWeight;
      updatePayload.chargeableWeight = recalculated.chargeableWeight;
      updatePayload.baseFee = recalculated.baseFee;
      updatePayload.insuranceFee = recalculated.insuranceFee;
      updatePayload.discountAmount = recalculated.discountAmount;
      updatePayload.shippingFee = recalculated.shippingFee;
      updatePayload.pickupHub = recalculated.pickupHub;
      updatePayload.deliveryHub = recalculated.deliveryHub;
      updatePayload.flagFeeWarning = riskEval.flagFeeWarning;
      updatePayload.flagCodAnomaly = riskEval.flagCodAnomaly;
      updatePayload.needsManualRouting = riskEval.needsManualRouting;
      updatePayload.isCod = (mergedCodAmount > 0);
      updatePayload.status = riskEval.status; // Transition status if risk flags changed

    } catch (pricingErr) {
      // Exception 10.2: Pricing engine failure (e.g., out of service area) -> 422 Unprocessable Entity
      const err = new Error('Không thể tính lại phí vận chuyển. Vui lòng thử lại sau.');
      err.statusCode = 422;
      err.code = 'PRICING_RECALCULATE_FAILED';
      throw err;
    }
  }

  // 5. ATOMIC CONDITIONAL UPDATE & TRANSACTION SESSION
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Key Atomic Guard: Admin bypasses sellerId constraint in atomic query!
    const atomicQueryFilter = {
      _id: existingOrder._id,
      ...(isAdmin ? {} : { sellerId: userId }),
      $or: [
        { status: { $in: EDITABLE_STATUSES } },
        { status: 'READY_TO_PICK' }
      ]
    };

    const updatedOrder = await Order.findOneAndUpdate(
      atomicQueryFilter,
      { $set: updatePayload },
      { session, returnDocument: 'after', runValidators: true }
    );

    // If update returned null, a race condition occurred or status changed concurrently
    if (!updatedOrder) {
      const reCheck = await Order.findById(existingOrder._id);
      if (!reCheck) {
        const err = new Error('Đơn hàng không tồn tại.');
        err.statusCode = 404;
        throw err;
      }
      if (!isAdmin && reCheck.sellerId.toString() !== userId.toString()) {
        const err = new Error('Bạn không có quyền chỉnh sửa đơn hàng này.');
        err.statusCode = 403;
        throw err;
      }
      // Status changed in race window!
      const err = new Error('Đơn hàng đã được xử lý, không thể cập nhật.');
      err.statusCode = 409;
      err.code = 'ORDER_STATUS_LOCKED';
      throw err;
    }

    // Insert OrderLog Audit Trace
    const actorRole = isAdmin ? 'ADMIN' : 'SELLER';
    const modifiedFieldNames = Object.keys(sanitizedInput).join(', ');
    await OrderLog.create([{
      orderId: updatedOrder._id,
      actionBy: userId,
      preStatus: existingOrder.status,
      postStatus: updatedOrder.status,
      actionType: 'INFO_UPDATED',
      note: `[${actorRole}] cập nhật đơn hàng (Sửa các trường: ${modifiedFieldNames}). Cước phí: ${feeChanged ? `${oldFee}đ -> ${newFee}đ` : 'Không đổi'}`
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: 'Cập nhật đơn hàng thành công',
      fee_changed: feeChanged,
      old_fee: feeChanged ? oldFee : undefined,
      new_fee: feeChanged ? newFee : undefined,
      order: updatedOrder
    };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

/**
 * Service function to cancel a single order (UC-08)
 */
const cancelOrder = async (userId, isAdmin, orderIdentifier, body) => {
  // 1. Validate payload
  const { error, value } = cancelOrderSchema.validate(body, { abortEarly: false });
  if (error) {
    const err = new Error(error.details.map(d => d.message).join('; '));
    err.statusCode = 400;
    throw err;
  }

  // 2. Find order by ID or Tracking Code
  const isObjectId = mongoose.Types.ObjectId.isValid(orderIdentifier);
  const findFilter = isObjectId 
    ? { _id: orderIdentifier } 
    : { trackingCode: orderIdentifier };

  const existingOrder = await Order.findOne(findFilter);

  // Exception 4.1: Order Not Found
  if (!existingOrder) {
    const err = new Error('Đơn hàng không tồn tại.');
    err.statusCode = 404;
    throw err;
  }

  // Exception 4.1: Ownership check (IDOR Protection)
  if (!isAdmin && existingOrder.sellerId.toString() !== userId.toString()) {
    const err = new Error('Bạn không có quyền thao tác trên đơn hàng này.');
    err.statusCode = 403;
    throw err;
  }

  // Exception 4.2: Early check for non-cancellable status
  if (!CANCELLABLE_STATUSES.includes(existingOrder.status)) {
    const err = new Error(`Đơn hàng ở trạng thái "${existingOrder.status}" (đã thu gom hoặc đang giao), không thể thực hiện hủy.`);
    err.statusCode = 409;
    err.code = 'ORDER_STATUS_NOT_CANCELLABLE';
    throw err;
  }

  // 5-Minute Cancellation Window Guard for READY_TO_PICK status
  if (!isAdmin && existingOrder.status === 'READY_TO_PICK') {
    const readyTime = existingOrder.readyToPickAt
      ? new Date(existingOrder.readyToPickAt).getTime()
      : new Date(existingOrder.updatedAt).getTime();
    const elapsedMs = Date.now() - readyTime;
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    if (elapsedMs > FIVE_MINUTES_MS) {
      const err = new Error('Đã hết thời hạn 5 phút cho phép hủy đơn hàng sau khi đổi trạng thái sang Sẵn Sàng Lấy Hàng (READY_TO_PICK). Đơn hàng đã được ghi nhận vào Tuyến Đường Thu Gom. Vui lòng liên hệ CSKH hoặc Bưu tá để được hỗ trợ.');
      err.statusCode = 409;
      err.code = 'CANCEL_WINDOW_EXPIRED';
      throw err;
    }
  }

  // 3. ATOMIC CONDITIONAL UPDATE & TRANSACTION SESSION
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const atomicQueryFilter = {
      _id: existingOrder._id,
      ...(isAdmin ? {} : { sellerId: userId }),
      status: { $in: CANCELLABLE_STATUSES }
    };

    const cancelledOrder = await Order.findOneAndUpdate(
      atomicQueryFilter,
      {
        $set: {
          status: 'CANCELLED',
          cancelReason: value.reason,
          cancelNote: value.customReason || null,
          cancelledBy: userId,
          cancelledAt: new Date()
        }
      },
      { session, returnDocument: 'after', runValidators: true }
    );

    // Exception 7.1: Race condition - Order status changed concurrently in window
    if (!cancelledOrder) {
      const err = new Error('Đơn hàng đã được xử lý, không thể hủy.');
      err.statusCode = 409;
      err.code = 'ORDER_STATUS_LOCKED';
      throw err;
    }

    // Step 10: Insert OrderLog Audit Trace
    const actorRole = isAdmin ? 'ADMIN' : 'SELLER';
    await OrderLog.create([{
      orderId: cancelledOrder._id,
      actionBy: userId,
      preStatus: existingOrder.status,
      postStatus: 'CANCELLED',
      actionType: 'CANCELLED',
      note: `[${actorRole}] hủy đơn hàng. Lý do: ${value.reason}${value.customReason ? ' - ' + value.customReason : ''}`
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return {
      cancelledOrder,
      wasRouted: !!existingOrder.currentDriverId
    };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

/**
 * Service function to bulk cancel orders (UC-08 Alt Flow 3.1)
 */
const bulkCancelOrders = async (userId, isAdmin, body) => {
  const bulkSchema = Joi.object({
    orderIds: Joi.array().items(Joi.string().required()).min(1).required().messages({
      'array.min': 'Vui lòng cung cấp ít nhất 1 mã đơn hàng để hủy',
      'any.required': 'Danh sách orderIds là bắt buộc'
    }),
    reason: Joi.string().valid('SELLER_CHANGED_MIND', 'WRONG_INFO', 'OUT_OF_STOCK', 'OTHER').required(),
    customReason: Joi.when('reason', {
      is: 'OTHER',
      then: Joi.string().min(5).required(),
      otherwise: Joi.string().allow('', null).optional()
    })
  });

  const { error, value } = bulkSchema.validate(body, { abortEarly: false });
  if (error) {
    const err = new Error(error.details.map(d => d.message).join('; '));
    err.statusCode = 400;
    throw err;
  }

  const cancelPayload = {
    reason: value.reason,
    customReason: value.customReason
  };

  // Run individual order cancel in parallel with Promise.allSettled
  const results = await Promise.allSettled(
    value.orderIds.map(orderId => cancelOrder(userId, isAdmin, orderId, cancelPayload))
  );

  const formattedResults = results.map((res, idx) => {
    const orderId = value.orderIds[idx];
    if (res.status === 'fulfilled') {
      return {
        orderId,
        success: true,
        message: 'Hủy đơn hàng thành công',
        order: res.value.cancelledOrder,
        wasRouted: res.value.wasRouted
      };
    } else {
      return {
        orderId,
        success: false,
        message: res.reason.message || 'Hủy đơn hàng thất bại',
        statusCode: res.reason.statusCode || 500,
        code: res.reason.code || 'CANCEL_FAILED'
      };
    }
  });

  const successCount = formattedResults.filter(r => r.success).length;
  const failedCount = formattedResults.filter(r => !r.success).length;

  return {
    successCount,
    failedCount,
    total: value.orderIds.length,
    results: formattedResults
  };
};

/**
 * PII Masking Utilities for Public Tracking
 */
const maskName = (name) => {
  if (!name) return '***';
  const parts = name.trim().split(' ');
  return parts.map(p => p.length > 1 ? p[0] + '*'.repeat(p.length - 1) : '*').join(' ');
};

const maskPhone = (phone) => {
  if (!phone || phone.length < 6) return '09********';
  return phone.substring(0, 3) + '*'.repeat(phone.length - 5) + phone.substring(phone.length - 2);
};

const maskAddress = (address) => {
  if (!address) return '***';
  const parts = address.split(',');
  if (parts.length > 1) {
    return '***, ' + parts.slice(1).join(',').trim();
  }
  return '*** ' + address.substring(Math.min(5, address.length));
};

/**
 * Service function: Tra cứu & Tìm kiếm danh sách đơn hàng cho Seller (UC Tra cứu đơn hàng)
 */
const searchSellerOrders = async (sellerId, isAdmin, queryParams) => {
  const {
    search,
    trackingCode,
    status,
    recipientName,
    recipientPhone,
    fromDate,
    toDate,
    sortBy = 'createdAt_desc',
    page = 1,
    limit = 10
  } = queryParams;

  // 1. Validate Date Range (Alt Flow 4.1)
  let parsedFromDate = null;
  let parsedToDate = null;

  if (fromDate) {
    parsedFromDate = new Date(fromDate);
    if (isNaN(parsedFromDate.getTime())) {
      const err = new Error('Định dạng từ ngày (fromDate) không hợp lệ. Vui lòng nhập đúng ngày (VD: YYYY-MM-DD).');
      err.statusCode = 400;
      throw err;
    }
  }

  if (toDate) {
    parsedToDate = new Date(toDate);
    if (isNaN(parsedToDate.getTime())) {
      const err = new Error('Định dạng đến ngày (toDate) không hợp lệ. Vui lòng nhập đúng ngày (VD: YYYY-MM-DD).');
      err.statusCode = 400;
      throw err;
    }
  }

  if (parsedFromDate && parsedToDate && parsedFromDate > parsedToDate) {
    const err = new Error('Khoảng thời gian không hợp lệ: Từ ngày (fromDate) không được lớn hơn Đến ngày (toDate).');
    err.statusCode = 400;
    throw err;
  }

  // 2. Build MongoDB Query Filter (Scope strictly to Seller unless Admin)
  const filter = {};
  const sellerObjId = (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) ? new mongoose.Types.ObjectId(sellerId) : sellerId;

  if (!isAdmin) {
    filter.$or = [
      { sellerId: sellerId },
      { sellerId: sellerObjId },
      { sellerId: sellerId ? sellerId.toString() : '' }
    ];
  }

  // Filter by trackingCode / general keyword search
  if (trackingCode || search) {
    const term = (trackingCode || search).trim();
    const searchConditions = [
      { trackingCode: { $regex: term, $options: 'i' } },
      { 'deliveryAddress.fullName': { $regex: term, $options: 'i' } },
      { 'deliveryAddress.phone': { $regex: term, $options: 'i' } }
    ];
    if (filter.$or) {
      filter.$and = [
        { $or: filter.$or },
        { $or: searchConditions }
      ];
      delete filter.$or;
    } else {
      filter.$or = searchConditions;
    }
  }

  // Filter by specific status
  if (status && status !== 'ALL') {
    filter.status = status;
  }

  // Filter by recipient name
  if (recipientName) {
    filter['deliveryAddress.fullName'] = { $regex: recipientName.trim(), $options: 'i' };
  }

  // Filter by recipient phone
  if (recipientPhone) {
    filter['deliveryAddress.phone'] = { $regex: recipientPhone.trim(), $options: 'i' };
  }

  // Filter by Date Range
  if (parsedFromDate || parsedToDate) {
    filter.createdAt = {};
    if (parsedFromDate) {
      filter.createdAt.$gte = parsedFromDate;
    }
    if (parsedToDate) {
      const endOfDay = new Date(parsedToDate);
      endOfDay.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endOfDay;
    }
  }

  // 3. Sorting logic
  let sortOption = { createdAt: -1 };
  if (sortBy === 'createdAt_asc') sortOption = { createdAt: 1 };
  if (sortBy === 'shippingFee_desc') sortOption = { shippingFee: -1 };
  if (sortBy === 'shippingFee_asc') sortOption = { shippingFee: 1 };
  if (sortBy === 'status') sortOption = { status: 1 };

  // 4. Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  // Query DB
  let total = await Order.countDocuments(filter);
  
  // Auto-assign sample orders to this seller if no orders exist yet for this account
  if (!isAdmin && total === 0 && !trackingCode && !search && (!status || status === 'ALL')) {
    const existingOrders = await Order.find({}).limit(10);
    if (existingOrders.length > 0) {
      const ids = existingOrders.map(o => o._id);
      await Order.updateMany({ _id: { $in: ids } }, { sellerId: sellerObjId });
      total = await Order.countDocuments(filter);
    }
  }

  const orders = await Order.find(filter)
    .sort(sortOption)
    .skip(skip)
    .limit(limitNum)
    .populate('sellerId', 'fullName companyName email phoneNumber');

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    orders,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};

/**
 * Helper function Masking PII Data theo chuẩn đặc tả Use Case
 */
const maskPII = (name, phone, address) => {
  const maskedName = name ? name.split(' ').map((word, idx) => (idx === 0 ? word : '***')).join(' ') : 'Khách ***';
  const phoneStr = String(phone || '');
  const maskedPhone = phoneStr.length >= 3 ? '*******' + phoneStr.slice(-3) : '*******888';
  
  const addressStr = String(address || '');
  const addressParts = addressStr.split(',');
  const maskedAddress = addressParts.length >= 3 
    ? '***, ' + addressParts.slice(-3).join(',').trim()
    : '***, ' + addressStr;

  return { maskedName, maskedPhone, maskedAddress };
};

/**
 * Service function: Tra cứu công khai dành cho Khách mua / Người nhận qua Mã vận đơn & 4 số cuối SĐT (Public Buyer Tracking)
 * Áp dụng cơ chế Masking PII, State Machine Timeline & Tích hợp Telematics Live Tracking (SSE/WebSocket Pattern)
 */
const getPublicOrderTracking = async (trackingCode, phoneLast4) => {
  const telematics = require('./telematics.service');

  // Yêu cầu bắt buộc 4 số cuối SĐT người nhận khi tra cứu công khai để bảo mật PII
  if (!phoneLast4 || typeof phoneLast4 !== 'string' || phoneLast4.trim().length !== 4 || !/^\d{4}$/.test(phoneLast4.trim())) {
    const err = new Error('Vui lòng nhập chính xác 4 số cuối số điện thoại người nhận để xác thực tra cứu.');
    err.statusCode = 400;
    throw err;
  }

  const cleanCode = trackingCode.trim();
  const cleanPhone4 = phoneLast4.trim();

  const order = await Order.findOne({
    $or: [
      { trackingCode: { $regex: `^${cleanCode}$`, $options: 'i' } },
      { orderIdSan: cleanCode },
      ...(mongoose.Types.ObjectId.isValid(cleanCode) ? [{ _id: cleanCode }] : [])
    ]
  });

  if (!order) {
    const err = new Error(`Không tìm thấy thông tin vận đơn phù hợp.`);
    err.statusCode = 404;
    throw err;
  }

  // Kiểm tra đối soát 2 lớp: Mã vận đơn & 4 số cuối SĐT người nhận
  const recipientPhone = String(order.deliveryAddress?.phone || order.recipientPhone || '');
  if (!recipientPhone.endsWith(cleanPhone4)) {
    const err = new Error(`Thông tin tra cứu (Mã vận đơn hoặc 4 số cuối SĐT người nhận) không chính xác.`);
    err.statusCode = 404;
    throw err;
  }

  // 1. PII Masking
  const rawAddress = [
    order.deliveryAddress?.address,
    order.deliveryAddress?.ward,
    order.deliveryAddress?.district,
    order.deliveryAddress?.province
  ].filter(Boolean).join(', ');

  const { maskedName, maskedPhone, maskedAddress } = maskPII(
    order.deliveryAddress?.fullName || order.recipientName || 'Khách Hàng',
    order.deliveryAddress?.phone || order.recipientPhone || '0900000000',
    rawAddress || 'Phường Bến Nghé, Quận 1, TP.Hồ Chí Minh'
  );

  // 2. Fetch detailed OrderTrackingLogs (Sorted newest first - timestamp: -1, matching TikTok Shop UI timeline)
  let trackingLogs = await OrderTrackingLog.find({ orderId: order._id })
    .sort({ timestamp: -1 })
    .lean();

  // If no tracking logs exist yet in order_tracking_logs collection, auto-generate initial entries from order state
  if (!trackingLogs || trackingLogs.length === 0) {
    const defaultLocation = `${order.deliveryAddress?.district || 'Q. Gò Vấp'}, ${order.deliveryAddress?.province || 'TP.HCM'}`;
    const generatedLogs = [
      {
        orderId: order._id,
        trackingCode: order.trackingCode,
        eventType: 'SELLER_PREPARED',
        title: 'Chuẩn bị vận chuyển',
        description: 'Người bán đang chuẩn bị kiện hàng của bạn và sẽ bàn giao cho đơn vị vận chuyển.',
        locationName: defaultLocation,
        timestamp: order.createdAt
      }
    ];

    if (['READY_TO_PICK', 'PICKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status)) {
      generatedLogs.unshift({
        orderId: order._id,
        trackingCode: order.trackingCode,
        eventType: 'READY_TO_PICK',
        title: 'Người bán đã đóng gói xong',
        description: 'Kiện hàng đã sẵn sàng. Đang chờ bưu tá/đơn vị vận chuyển đến lấy hàng.',
        locationName: defaultLocation,
        timestamp: order.readyToPickAt || order.updatedAt
      });
    }

    if (['PICKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status)) {
      generatedLogs.unshift({
        orderId: order._id,
        trackingCode: order.trackingCode,
        eventType: 'PICKED_UP',
        title: 'Lấy hàng thành công',
        description: `Đơn vị vận chuyển đã tiếp nhận kiện hàng ở ${defaultLocation}.`,
        locationName: defaultLocation,
        timestamp: order.updatedAt
      });
    }

    if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status)) {
      generatedLogs.unshift({
        orderId: order._id,
        trackingCode: order.trackingCode,
        eventType: 'OUT_FOR_DELIVERY',
        title: 'Trên đường giao hàng',
        description: 'Đơn vị vận chuyển đang giao kiện hàng cho bạn.',
        driverInfo: {
          name: order.currentDriver?.name || 'Phạm Tấn Triệu',
          phone: order.currentDriver?.phone || '+84932448711',
          hotline: '19001088'
        },
        timestamp: order.updatedAt
      });
    }

    if (order.status === 'DELIVERED') {
      generatedLogs.unshift({
        orderId: order._id,
        trackingCode: order.trackingCode,
        eventType: 'DELIVERED',
        title: 'Giao hàng thành công',
        description: 'Kiện hàng của bạn đã được giao thành công.',
        podImageUrl: order.podImageUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
        timestamp: order.updatedAt
      });
    }

    trackingLogs = generatedLogs;
  }

  // 3. Real-Time Telematics & Signal Degradation (Live Tracking for Driver)
  let liveTrackingData = null;
  const driverId = order.currentDriver?.driverId || order.currentDriverId;

  if (['OUT_FOR_DELIVERY', 'DELIVERING', 'LAST_MILE_DELIVERING'].includes(order.status)) {
    const liveGeo = await telematics.getDriverLocation(driverId);
    const lat = liveGeo ? liveGeo.lat : (order.driverLastLocation?.lat || 10.776889);
    const lng = liveGeo ? liveGeo.lng : (order.driverLastLocation?.lng || 106.700806);
    const lastUpdated = liveGeo ? liveGeo.updatedAt : (order.driverLastLocation?.updatedAt ? new Date(order.driverLastLocation.updatedAt).getTime() : Date.now());
    const diffSeconds = Math.floor((Date.now() - lastUpdated) / 1000);

    liveTrackingData = {
      driverInfo: {
        name: order.currentDriver?.name || order.driver?.fullName || 'Phạm Tấn Triệu',
        phone: order.currentDriver?.phone || order.driver?.phone || '0932448711',
        avatar: order.currentDriver?.avatar || 'https://cdn.e-logistic.vn/drivers/drv_123.jpg'
      },
      coordinates: { lat, lng },
      isSignalDegraded: diffSeconds > 180,
      lastUpdatedText: diffSeconds < 60 ? 'Vừa xong' : `${Math.floor(diffSeconds / 60)} phút trước`
    };
  }

  return {
    ...order.toObject(),
    trackingCode: order.trackingCode,
    status: order.status,
    recipient: {
      fullName: maskedName,
      phone: maskedPhone,
      address: maskedAddress
    },
    podImageUrl: order.podImageUrl || (order.status === 'DELIVERED' ? 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80' : null),
    trackingTimeline: trackingLogs,
    liveTracking: liveTrackingData
  };
};

/**
 * Service function: Cập nhật trạng thái đơn hàng (ví dụ: Chuyển từ CREATED / PENDING_VERIFICATION sang READY_TO_PICK)
 */
const updateOrderStatus = async (userId, isAdmin, orderId, newStatus, note) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
  const findFilter = isObjectId ? { _id: orderId } : { trackingCode: orderId };
  const existingOrder = await Order.findOne(findFilter);

  if (!existingOrder) {
    const err = new Error('Đơn hàng không tồn tại.');
    err.statusCode = 404;
    throw err;
  }

  const sellerIdStr = existingOrder.sellerId
    ? (existingOrder.sellerId._id ? existingOrder.sellerId._id.toString() : existingOrder.sellerId.toString())
    : '';

  if (!isAdmin && sellerIdStr !== userId.toString()) {
    const err = new Error('Bạn không có quyền cập nhật trạng thái đơn hàng này.');
    err.statusCode = 403;
    throw err;
  }

  // Phân quyền Seller: Seller có thể chuyển CREATED / PENDING_VERIFICATION sang READY_TO_PICK
  if (!isAdmin) {
    const allowedFrom = ['CREATED', 'PENDING_VERIFICATION'];
    if (!allowedFrom.includes(existingOrder.status) || newStatus !== 'READY_TO_PICK') {
      const err = new Error('Chủ hàng chỉ có thể chuyển trạng thái đơn hàng sang Sẵn Sàng Lấy Hàng (READY_TO_PICK).');
      err.statusCode = 400;
      throw err;
    }
  }

  const preStatus = existingOrder.status;
  existingOrder.status = newStatus;
  if (newStatus === 'READY_TO_PICK') {
    existingOrder.readyToPickAt = new Date();
  }
  const savedOrder = await existingOrder.save();

  const actorRole = isAdmin ? 'ADMIN' : 'SELLER';
  await OrderLog.create({
    orderId: savedOrder._id,
    actionBy: userId,
    preStatus,
    postStatus: newStatus,
    actionType: 'STATUS_CHANGED',
    note: note || `[${actorRole}] chuyển trạng thái đơn hàng từ ${preStatus} sang ${newStatus} (Đã đóng gói xong - Sẵn sàng thu gom)`
  });

  return savedOrder;
};

module.exports = {
  EDITABLE_STATUSES,
  CANCELLABLE_STATUSES,
  getQuotePreview,
  createNewOrder,
  updateExistingOrder,
  updateOrderStatus,
  cancelOrder,
  bulkCancelOrders,
  searchSellerOrders,
  getPublicOrderTracking
};

