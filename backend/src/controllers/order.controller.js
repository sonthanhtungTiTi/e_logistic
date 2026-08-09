const mongoose = require('mongoose');
const crypto = require('crypto');
const Joi = require('joi');
const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');

// Hàm tạo mã Tracking đơn giản
const generateTrackingCode = () => {
  return `ELG${Date.now()}${Math.floor(Math.random() * 1000)}`;
};

// @desc    Tạo đơn hàng mới (UC06)
// @route   POST /api/orders
// @access  Private (Seller/Admin)
const createOrder = async (req, res) => {
  // 1. Validation Input bằng Joi
  const schema = Joi.object({
    orderIdSan: Joi.string().allow('', null).optional(),
    pickupAddress: Joi.object().required(),
    deliveryAddress: Joi.object().required(),
    items: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        weight: Joi.number().min(1).required(), // Gram
      })
    ).min(1).required(),
    dimensions: Joi.object({
      length: Joi.number().min(1).required(), // cm
      width: Joi.number().min(1).required(),
      height: Joi.number().min(1).required(),
    }).required(),
    codAmount: Joi.number().integer().min(0).default(0),
    goodsValue: Joi.number().integer().min(0).default(0),
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  // 2. Whitelist Dữ Liệu & Xử lý sparse:true
  const orderData = { ...value };
  
  // Xóa rỗng để MongoDB không dính bẫy sparse index ""
  if (!orderData.orderIdSan || orderData.orderIdSan.trim() === '') {
    delete orderData.orderIdSan;
  }

  // Tạo Idempotency Hash (Chống lặp request)
  const hashPayload = JSON.stringify({
    orderIdSan: orderData.orderIdSan || null,
    pickup: orderData.pickupAddress,
    delivery: orderData.deliveryAddress,
    items: orderData.items,
  });
  const payloadHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

  // 3. Tự động tính toán (Không tin tưởng Client)
  // Tính tổng cân nặng thực tế
  const actualWeight = orderData.items.reduce((acc, item) => acc + (item.weight * item.quantity), 0);
  
  // Tính cân nặng quy đổi thể tích (Gram)
  // Công thức chuẩn: (D * R * C) / 5000 (kg) -> Đổi ra gram
  const volWeightKg = (orderData.dimensions.length * orderData.dimensions.width * orderData.dimensions.height) / 5000;
  const volumetricWeight = Math.ceil(volWeightKg * 1000); 

  const chargeableWeight = Math.max(actualWeight, volumetricWeight);

  // Tính cước phí (Ví dụ: 15.000đ cho 1kg đầu, 5000đ cho mỗi 0.5kg tiếp theo)
  let shippingFee = 15000;
  if (chargeableWeight > 1000) {
    const extraWeight = chargeableWeight - 1000;
    shippingFee += Math.ceil(extraWeight / 500) * 5000;
  }

  // 4. Bắt đầu Transaction (Đảm bảo tính toàn vẹn Order + OrderLog)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const trackingCode = generateTrackingCode();

    const newOrder = new Order({
      trackingCode,
      orderIdSan: orderData.orderIdSan,
      sellerId: req.user._id,
      pickupAddress: orderData.pickupAddress,
      deliveryAddress: orderData.deliveryAddress,
      items: orderData.items,
      actualWeight,
      volumetricWeight,
      chargeableWeight,
      shippingFee,
      codAmount: orderData.codAmount,
      goodsValue: orderData.goodsValue,
      payloadHash,
      status: 'CREATED' // Trạng thái mặc định post_status
    });

    const savedOrder = await newOrder.save({ session });

    // Lưu Log (Audit)
    await OrderLog.create([{
      orderId: savedOrder._id,
      actionBy: req.user._id,
      preStatus: null,
      postStatus: 'CREATED',
      actionType: 'CREATED',
      note: 'Seller tạo đơn hàng mới'
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: 'Tạo đơn hàng thành công',
      trackingCode: savedOrder.trackingCode,
      shippingFee,
      chargeableWeight
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    // 5. Bắt lỗi E11000 (Xử lý Idempotency và Unique)
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.orderIdSan) {
        // Có người đã tạo bằng mã này -> Kiểm tra hash
        const existingOrder = await Order.findOne({ orderIdSan: orderData.orderIdSan });
        
        if (existingOrder && existingOrder.payloadHash === payloadHash) {
          // Idempotency: Request bị lặp lại (ví dụ do mạng lag), trả về kết quả cũ 200 OK
          return res.status(200).json({
            message: 'Đơn hàng đã tồn tại (Idempotency)',
            trackingCode: existingOrder.trackingCode,
            shippingFee: existingOrder.shippingFee,
            chargeableWeight: existingOrder.chargeableWeight
          });
        } else {
          // Xung đột: Mã này đã có nhưng payload khác -> Báo lỗi Conflict
          return res.status(409).json({
            message: 'Xung đột dữ liệu: Mã đơn hàng Sàn (orderIdSan) này đã tồn tại với một nội dung khác.'
          });
        }
      }
    }

    console.error('Lỗi tạo Order:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

module.exports = {
  createOrder,
};
