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
    // Phân loại luồng định tuyến: DIRECT (Nội tỉnh / Cùng kho - Giao thẳng) hoặc HUB_ROUTED (Liên kho)
    routeType: {
      type: String,
      enum: ['DIRECT', 'HUB_ROUTED'],
      default: 'HUB_ROUTED',
    },
    // Trạng thái Vòng đời đơn hàng (Order State Machine)
    status: {
      type: String,
      enum: [
        'DRAFT',
        'CREATED',
        'SELLER_PREPARING',
        'PENDING_APPROVAL',
        'APPROVED',
        'CONFIRMED',
        'ASSIGNED_TO_PICKUP_AND_DELIVERY',
        'ASSIGNED_TO_PICKUP',
        'PENDING_VERIFICATION',
        'SUSPENDED_RISK_REVIEW', // Đơn bị đình chỉ do vi phạm/gian lận
        'DISPATCH_ESCALATED', // Đơn cạn kiệt shipper/quá hạn retry cần Dispatcher can thiệp
        'READY_TO_PICK',
        'PICKING',
        'PICKED',
        'PICKED_UP',
        'INBOUND_HUB',
        'IN_HUB_ORIGIN',
        'INBOUND_ORIGIN_HUB',
        'SORTING',
        'IN_SORTING_HUB',
        'BAGGED_SEALED',
        'IN_TRANSIT',
        'INBOUND_HUB_DEST',
        'IN_HUB_DEST',
        'INBOUND_DEST_HUB',
        'PENDING_DELIVERY_ASSIGNMENT',
        'ASSIGNED_TO_DELIVERY',
        'OUT_FOR_DELIVERY',
        'DELIVERING',
        'DELIVERED',
        'PENDING_REDELIVERY',
        'DELIVERY_FAILED_PENDING_RETURN',
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
    // Thời điểm Seller báo đã chuẩn bị xong hàng
    sellerPreparedAt: { type: Date, default: null },

    // Thông tin Order Manager duyệt đơn hàng
    orderApproval: {
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      approvedAt: { type: Date, default: null },
    },

    // Phân công chặng lấy hàng (Pickup) - Gán bởi Driver Manager
    pickupAssignment: {
      driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      assignedAt: { type: Date, default: null },
      status: {
        type: String,
        enum: ['ASSIGNED', 'REJECT_REQUESTED', 'REJECTED_CONFIRMED'],
        default: 'ASSIGNED',
      },
      rejectReason: { type: String, default: null },
    },

    // Phân công chặng giao hàng (Delivery) - Gán bởi Driver Manager
    deliveryAssignment: {
      driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      assignedAt: { type: Date, default: null },
      status: {
        type: String,
        enum: ['ASSIGNED', 'REJECT_REQUESTED', 'REJECTED_CONFIRMED'],
        default: 'ASSIGNED',
      },
      rejectReason: { type: String, default: null },
    },

    dispatcherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deliveryFailureCount: { type: Number, default: 0 },
    deliveryFailureHistory: [
      {
        reasonGroup: {
          type: String,
          enum: ['CANNOT_CONTACT', 'CUSTOMER_REFUSED', 'WRONG_ADDRESS', 'CUSTOMER_RESCHEDULE', 'OTHER'],
          required: true,
        },
        failureCategory: {
          type: String,
          enum: ['CUSTOMER_FAULT', 'OPERATIONAL_FAULT', 'OTHER', 'TEMPORARY_RESCHEDULE', 'RECIPIENT_REJECTED', 'WRONG_ADDRESS'],
          required: true,
        },
        contactAttempts: { type: Number, default: 0 },
        rescheduleRequestedAt: { type: Date, default: null },
        rescheduledAt: { type: Date, default: null },
        failureReason: { type: String },
        note: { type: String, default: '' },
        proofImageUrls: { type: [String], default: [] },
        gpsLocation: {
          lat: { type: Number, default: null },
          lng: { type: Number, default: null },
          isGpsMissing: { type: Boolean, default: false },
        },
        reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        clientOfflineId: { type: String, default: null, index: true },
        reportedAt: { type: Date, default: Date.now },
        reportedAt: { type: Date, default: Date.now },
      },
    ],
    originHubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', default: null },
    destinationHubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', default: null },
    isFlagged: { type: Boolean, default: false },
    pickupFailReason: { type: String, default: null },
    pickupFailNote: { type: String, default: null },
    // Liên kết với Seller & Shipper / Bao hàng / Chuyến xe
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    pickupShipperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    deliveryShipperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    pickupGeozoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Geozone',
      default: null,
      index: true,
    },
    deliveryGeozoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Geozone',
      default: null,
      index: true,
    },
    bagId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bag',
      default: null,
      index: true,
    },
    currentTripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      default: null,
      index: true,
    },
    autoApproved: {
      type: Boolean,
      default: false,
    },
    // Quản lý đơn tồn chuyển ca & qua ngày (Shift Rollover & Overnight Aging)
    isRolloverOrder: {
      type: Boolean,
      default: false,
      index: true,
    },
    rolloverCount: {
      type: Number,
      default: 0,
    },
    rolloverReason: {
      type: String,
      default: null,
    },
    agingPriority: {
      type: String,
      enum: ['NORMAL', 'HIGH', 'CRITICAL'],
      default: 'NORMAL',
      index: true,
    },
    rescheduledForDate: {
      type: Date,
      default: null,
    },
    riskFlags: {
      type: [String],
      default: [],
    },
    riskViolationReason: {
      type: String,
      default: null,
    },
    dispatchRetryCount: {
      type: Number,
      default: 0,
    },
    // Giữ trường cũ để tương thích ngược
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
      subZone: { type: String, default: '' }, // Khu phố / Tuyến đường
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
      subZone: { type: String, default: '' }, // Khu phố / Tuyến đường
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

    // ── THÊM MỚI: Định tuyến Đa Kho (Multi-Hub Routing Nodes) ──
    routeNodes: [
      {
        hubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', required: true },
        hubType: { type: String, enum: ['PICKUP', 'SORTING', 'DELIVERY'], required: true },
        sequenceIndex: { type: Number, required: true },
        status: { type: String, enum: ['PENDING', 'ARRIVED', 'DEPARTED'], default: 'PENDING' },
        arrivedAt: { type: Date, default: null },
        departedAt: { type: Date, default: null },
      },
    ],
    currentRouteIndex: { type: Number, default: 0 },

    // Các cờ rủi ro & điều phối
    flagFeeWarning: { type: Boolean, default: false },
    flagCodAnomaly: { type: Boolean, default: false },
    needsManualRouting: { type: Boolean, default: false },

    // Thông tin mốc thời gian chuẩn bị hàng
    readyToPickAt: { type: Date, default: null },

    // Thông tin hủy đơn & Từ chối
    cancelReason: { type: String, default: null },
    cancelNote: { type: String, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },

    // Thông tin phê duyệt thủ công của Admin / Vendor Ops
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    approvalNote: { type: String, default: null },

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
    // UC-17: Trip/Outbound — currentTripId được khai báo tại trường chính ở trên (có index:true). Không khai báo lại ở đây.
    // UC-18: Kiểm kê kho
    searchZoneEnteredAt: { type: Date, default: null },
    lostSearchDeadlineAt: { type: Date, default: null },
    // UC-19: Quản lý tồn kho / Thanh lý
    liquidationApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    liquidationApprovedAt: { type: Date, default: null },
    // UC-Routing: Phân vùng & Khoảng cách
    zoneTier: { type: String, default: null },
    routeDistanceKm: { type: Number, default: null },
    estimatedDeliveryDays: { type: Number, default: null },

    // Chuyến gom hàng của Shipper (Pickup Trip Manifest)
    pickupTripId: { type: String, default: null, index: true },

    // Chuyến giao hàng của Shipper (Delivery Trip / Runsheet Manifest)
    deliveryTripId: { type: String, default: null, index: true },

    // Lịch sử thất bại lấy hàng (First-Mile)
    pickupFailureCount: { type: Number, default: 0 },
    pickupFailureHistory: [
      {
        failureCategory: {
          type: String,
          enum: ['TEMPORARY_RESCHEDULE', 'PERMANENT_CANCEL', 'VIOLATION', 'OTHER'],
          default: 'TEMPORARY_RESCHEDULE',
        },
        failureReason: { type: String },
        rescheduledAt: { type: Date, default: null },
        reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reportedAt: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
orderSchema.index({ status: 1 });
orderSchema.index({ sellerId: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
