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
        'PICKED_UP',
        'INBOUND_HUB',
        'IN_HUB_ORIGIN',
        'SORTING',
        'IN_SORTING_HUB',
        'BAGGED_SEALED',
        'IN_TRANSIT',
        'INBOUND_HUB_DEST',
        'IN_HUB_DEST',
        'OUT_FOR_DELIVERY',
        'DELIVERING',
        'DELIVERED',
        'FAILED',
        'PICKUP_FAILED',
        'RETURNING',
        'RETURN_IN_TRANSIT',
        'RETURNED',
        'RETURNED_TO_HUB_ORIGIN',
        'EXCEPTION_INBOUND',
        'CANCELLED',
        'SEARCH_ZONE',
        'SUSPECTED_LOST',
        'LOST',
        'SURPLUS',
        'OVERDUE',
        'LIQUIDATED',
      ],
      default: 'CREATED',
    },
    originHubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', default: null },
    destinationHubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', default: null },
    isFlagged: { type: Boolean, default: false },
    pickupFailReason: { type: String, default: null },
    pickupFailNote: { type: String, default: null },
    // Liên kết với Seller & Tài xế được gán
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedShipperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

    // Thông tin mốc thời gian chuẩn bị hàng
    readyToPickAt: { type: Date, default: null },

    // Thông tin hủy đơn
    cancelReason: { type: String, default: null },
    cancelNote: { type: String, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },

    // Bưu cục hiện tại & Tài xế & Live Tracking & POD Image
    currentHubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', default: null },
    currentDriver: {
      driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, default: 'Phạm Tấn Triệu' },
      phone: { type: String, default: '0932448711' },
      avatar: { type: String, default: 'https://cdn.e-logistic.vn/drivers/drv_default.jpg' }
    },
    podImageUrl: { type: String, default: null },

    // Thất bại / Live Tracking legacy
    failedAttempts: { type: Number, default: 0 },
    currentDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    driver: {
      fullName: { type: String, default: 'Phạm Tấn Triệu (Shipper)' },
      phone: { type: String, default: '0932448711' }
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
    calculatedEta: { type: Number, default: 15 },
    // UC-16 Module 4: Hub Inbound Processing
    sealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bag', default: null },
    currentZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', default: null },
    hubInboundAt: { type: Date, default: null },
    hubMeasuredWeight: { type: Number, default: null },
    weightDiscrepancyGram: { type: Number, default: null },
    // UC-17: Trip/Outbound
    currentTripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },
    // UC-18: Kiểm kê kho
    searchZoneEnteredAt: { type: Date, default: null },
    lostSearchDeadlineAt: { type: Date, default: null },
    // UC-19: Quản lý tồn kho / Thanh lý
    liquidationApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    liquidationApprovedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Indexes
orderSchema.index({ status: 1 });
orderSchema.index({ sellerId: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
