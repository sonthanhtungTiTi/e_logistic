const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    trackingCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Mã đơn hàng từ sàn TMĐT (nếu có, không bắt buộc)
    orderIdSan: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Chuỗi Idempotency Key gửi từ Header/Body
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Hash SHA-256 của Payload để đối soát lặp request
    payloadHash: {
      type: String,
    },
    // Trạng thái Vòng đời đơn hàng (Order State Machine)
    status: {
      type: String,
      enum: [
        'DRAFT',
        'CREATED',
        'PENDING_VERIFICATION',
        'READY_TO_PICK',
        'PICKING',
        'PICKED',
        'INBOUND_HUB',
        'SORTING',
        'BAGGED_SEALED',
        'IN_TRANSIT',
        'INBOUND_HUB_DEST',
        'OUT_FOR_DELIVERY',
        'DELIVERING',
        'DELIVERED',
        'FAILED',
        'RETURNING',
        'RETURNED',
        'CANCELLED',
      ],
      default: 'CREATED',
    },
    // Liên kết với Seller
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Thông tin lấy hàng (Pickup)
    pickupAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      ward: { type: String, required: true },
      district: { type: String, required: true },
      province: { type: String, required: true },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    // Thông tin người nhận (Delivery)
    deliveryAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      ward: { type: String, required: true },
      district: { type: String, required: true },
      province: { type: String, required: true },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    // Thông tin hàng hóa
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        weight: { type: Number, required: true, min: 0.01 }, // kg
      },
    ],
    // Kích thước kiện hàng (cm)
    dimensions: {
      length: { type: Number, default: 0, min: [0, 'Kích thước chiều dài không được âm'] },
      width: { type: Number, default: 0, min: [0, 'Kích thước chiều rộng không được âm'] },
      height: { type: Number, default: 0, min: [0, 'Kích thước chiều cao không được âm'] },
    },
    // Trọng lượng và Cước phí
    actualWeight: { type: Number, required: true, min: [0.01, 'Khối lượng phải lớn hơn 0'] }, // kg
    volumetricWeight: { type: Number, default: 0 }, // kg
    chargeableWeight: { type: Number, required: true }, // kg

    // COD & Giá trị khai báo (Integer Đồng)
    isCod: {
      type: Boolean,
      default: false,
    },
    codAmount: {
      type: Number,
      default: 0,
      min: [0, 'COD không được âm'],
      validate: { validator: Number.isInteger, message: 'Số tiền phải là số nguyên (đơn vị Đồng)' }
    },
    goodsValue: {
      type: Number,
      default: 0,
      min: [0, 'Giá trị hàng hóa không được âm'],
      validate: { validator: Number.isInteger, message: 'Số tiền phải là số nguyên (đơn vị Đồng)' }
    },

    // Phân rã Cước phí (Integer Đồng)
    baseFee: {
      type: Number,
      default: 0,
      validate: { validator: Number.isInteger, message: 'Số tiền phải là số nguyên (đơn vị Đồng)' }
    },
    insuranceFee: {
      type: Number,
      default: 0,
      validate: { validator: Number.isInteger, message: 'Số tiền phải là số nguyên (đơn vị Đồng)' }
    },
    discountAmount: {
      type: Number,
      default: 0,
      validate: { validator: Number.isInteger, message: 'Số tiền phải là số nguyên (đơn vị Đồng)' }
    },
    discountCode: {
      type: String,
      default: null
    },
    shippingFee: {
      type: Number,
      required: true,
      min: [0, 'Cước phí không được âm'],
      validate: { validator: Number.isInteger, message: 'Số tiền phải là số nguyên (đơn vị Đồng)' }
    },

    // Bưu cục phục vụ
    pickupHub: { type: String, default: null },
    deliveryHub: { type: String, default: null },

    // Các cờ rủi ro & điều phối
    flagFeeWarning: { type: Boolean, default: false },
    flagCodAnomaly: { type: Boolean, default: false },
    needsManualRouting: { type: Boolean, default: false },

    // Thông tin hủy đơn
    cancelReason: { type: String, default: null },
    cancelNote: { type: String, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },

    // Thất bại / Tài xế & Live Tracking
    failedAttempts: { type: Number, default: 0 },
    currentDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    driver: {
      fullName: { type: String, default: 'Nguyễn Văn Nam (Shipper)' },
      phone: { type: String, default: '0988776655' }
    },
    driverLastLocation: {
      lat: { type: Number, default: 10.776889 },
      lng: { type: Number, default: 106.700806 },
      updatedAt: { type: Date, default: Date.now }
    },
    destinationLocation: {
      lat: { type: Number, default: 10.769012 },
      lng: { type: Number, default: 106.695123 }
    },
    calculatedEta: { type: Number, default: 15 }
  },
  {
    timestamps: true,
  }
);

// Indexes
orderSchema.index({ status: 1 });
orderSchema.index({ sellerId: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
