const mongoose = require('mongoose');
const crypto = require('crypto');
const Joi = require('joi');
const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');
const { generateTrackingCode } = require('../utils/idGenerator');
const { calculateOrderFees, evaluateRisk, VOLUMETRIC_DIVISOR } = require('./pricing.service');

// Vietnamese phone number regex format validator
const VN_PHONE_REGEX = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;

// Editable & Cancellable Order Statuses Guard
const EDITABLE_STATUSES = ['CREATED', 'READY_TO_PICK', 'PENDING_VERIFICATION'];
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
  goodsValue: Joi.number().min(0).optional().default(0),
  discountCode: Joi.string().allow('', null).optional()
});

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
  codAmount: Joi.number().min(0).default(0),
  goodsValue: Joi.number().min(0).default(0),
  discountCode: Joi.string().allow('', null).optional(),
  deliveryNote: Joi.string().allow('', null).optional()
});

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

  // COD Amount Validation & Sanitization (Integer Đồng)
  if (body.codAmount !== undefined) {
    const cod = Number(body.codAmount);
    if (isNaN(cod) || cod < 0) {
      const err = new Error('Số tiền COD không được âm.');
      err.statusCode = 400;
      throw err;
    }
    allowed.codAmount = Math.floor(cod);
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
  if (!EDITABLE_STATUSES.includes(existingOrder.status)) {
    const err = new Error('Đơn hàng đã được xử lý, không thể cập nhật.');
    err.statusCode = 409;
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
      status: { $in: EDITABLE_STATUSES }
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
    const err = new Error('Đơn hàng không thể hủy ở trạng thái hiện tại. Vui lòng liên hệ CSKH để được hỗ trợ.');
    err.statusCode = 409;
    err.code = 'ORDER_STATUS_NOT_CANCELLABLE';
    throw err;
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
  if (!isAdmin) {
    filter.sellerId = sellerId;
  }

  // Filter by trackingCode / general keyword search
  if (trackingCode || search) {
    const term = (trackingCode || search).trim();
    filter.$or = [
      { trackingCode: { $regex: term, $options: 'i' } },
      { 'deliveryAddress.fullName': { $regex: term, $options: 'i' } },
      { 'deliveryAddress.phone': { $regex: term, $options: 'i' } }
    ];
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
  const total = await Order.countDocuments(filter);
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
 * Helper function Masking PII Data
 */
const maskString = (str, visibleStart = 1, visibleEnd = 1) => {
  if (!str) return '';
  const s = String(str).trim();
  if (s.length <= visibleStart + visibleEnd) return s;
  return s.substring(0, visibleStart) + '***' + s.substring(s.length - visibleEnd);
};

/**
 * Service function: Tra cứu công khai dành cho Khách mua / Người nhận qua Mã vận đơn (Public Buyer Tracking)
 * Áp dụng cơ chế Masking PII & Tích hợp Live Tracking (WebSocket Room Pattern)
 */
const getPublicOrderTracking = async (trackingCode) => {
  if (!trackingCode || typeof trackingCode !== 'string' || trackingCode.trim() === '') {
    const err = new Error('Mã vận đơn tra cứu không được để trống.');
    err.statusCode = 400;
    throw err;
  }

  const cleanCode = trackingCode.trim().toUpperCase();
  const order = await Order.findOne({ trackingCode: cleanCode });

  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng với mã vận đơn này.');
    err.statusCode = 404;
    throw err;
  }

  const logs = await OrderLog.find({ orderId: order._id }).sort({ timestamp: 1 });

  // 1. PII Masking
  const receiverData = {
    name: maskString(order.deliveryAddress?.fullName || 'Khách Hàng', 2, 1),
    phone: maskString(order.deliveryAddress?.phone || '0900000000', 3, 2),
    address: `*** ${order.deliveryAddress?.ward || ''}, ${order.deliveryAddress?.district || ''}, ${order.deliveryAddress?.province || ''}`
  };

  // 2. Status Mapping
  let statusText = 'Đang xử lý';
  if (order.status === 'CREATED') statusText = 'Đơn hàng đã được tạo';
  if (order.status === 'IN_TRANSIT') statusText = 'Đang luôn chuyển bưu cục';
  if (['OUT_FOR_DELIVERY', 'DELIVERING'].includes(order.status)) statusText = 'Đang giao hàng chặng cuối';
  if (order.status === 'DELIVERED') statusText = 'Giao hàng thành công';
  if (order.status === 'CANCELLED') statusText = 'Đã hủy đơn hàng';

  // 3. Timeline Mapping
  const defaultTimeline = [
    { status: 'CREATED', title: 'Đơn hàng đã được tạo', time: order.createdAt },
    { status: 'PICKED', title: 'Đã lấy hàng tại Bưu cục', time: order.createdAt },
    ...(['OUT_FOR_DELIVERY', 'DELIVERING', 'DELIVERED'].includes(order.status)
      ? [{ status: order.status, title: statusText, time: order.updatedAt }]
      : [])
  ];

  const timeline = logs && logs.length > 0
    ? logs.map(l => ({
        status: l.postStatus || l.actionType,
        title: l.note || `Trạng thái: ${l.postStatus || l.actionType}`,
        time: l.timestamp
      }))
    : defaultTimeline;

  // 4. Real-time Live Tracking Status & Graceful Degradation (8.2)
  const isLastMile = ['OUT_FOR_DELIVERY', 'DELIVERING'].includes(order.status);
  const driverLastLoc = order.driverLastLocation || { lat: 10.776889, lng: 106.700806, updatedAt: new Date() };
  const gpsUpdatedAt = driverLastLoc.updatedAt ? new Date(driverLastLoc.updatedAt) : new Date();
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - gpsUpdatedAt.getTime()) / 60000);
  const isGpsStale = diffMinutes >= 3;

  const liveTracking = {
    is_active: isLastMile,
    is_gps_stale: isGpsStale,
    stale_warning: isGpsStale ? `Vị trí cập nhật ${diffMinutes} phút trước` : null,
    driver_name: order.driver ? maskString(order.driver.fullName, 2, 1) : 'Nguy*** B**',
    driver_phone: order.driver ? maskString(order.driver.phone, 3, 2) : '098*****88',
    current_location: { lat: driverLastLoc.lat, lng: driverLastLoc.lng },
    destination_location: order.destinationLocation || { lat: 10.769012, lng: 106.695123 },
    eta_minutes: isGpsStale ? null : (order.calculatedEta || 12)
  };

  return {
    tracking_number: order.trackingCode,
    trackingCode: order.trackingCode,
    status: order.status,
    status_text: statusText,
    receiver: receiverData,
    recipient: {
      fullName: receiverData.name,
      phone: receiverData.phone,
      addressMasked: receiverData.address
    },
    timeline,
    live_tracking: liveTracking,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
};

module.exports = {
  EDITABLE_STATUSES,
  CANCELLABLE_STATUSES,
  getQuotePreview,
  createNewOrder,
  updateExistingOrder,
  cancelOrder,
  bulkCancelOrders,
  searchSellerOrders,
  getPublicOrderTracking
};

