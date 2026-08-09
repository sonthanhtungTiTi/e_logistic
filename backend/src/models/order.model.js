const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    trackingCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Mã đơn hàng từ sàn TMĐT (nếu có, không bắt buộc vì Seller có thể tạo tay)
    orderIdSan: {
      type: String,
      unique: true,
      sparse: true, // Cho phép null/undefined nhưng vẫn giữ unique cho những đơn có mã
    },
    // Chống trùng lặp request (Idempotency)
    payloadHash: {
      type: String,
    },
    // Trạng thái Vòng đời đơn hàng (Order State Machine)
    status: {
      type: String,
      enum: [
        'DRAFT',
        'CREATED',
        'READY_TO_PICK',
        'PICKING',
        'PICKED',
        'INBOUND_HUB',
        'SORTING',
        'BAGGED_SEALED',
        'IN_TRANSIT',
        'INBOUND_HUB_DEST',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'FAILED',
        'RETURNING',
        'RETURNED',
      ],
      default: 'DRAFT',
    },
    // Liên kết với Seller
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Thông tin lấy hàng (Pickup)
    pickupAddress: {
      fullName: String,
      phone: String,
      address: String,
      ward: String,
      district: String,
      province: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    // Thông tin người nhận (Delivery)
    deliveryAddress: {
      fullName: String,
      phone: String,
      address: String,
      ward: String,
      district: String,
      province: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    // Thông tin hàng hóa
    items: [
      {
        name: String,
        quantity: Number,
        weight: Number, // Gram
      },
    ],
    // Trọng lượng và Cước phí
    actualWeight: Number, // Trọng lượng thực tế (Gram)
    volumetricWeight: Number, // Trọng lượng quy đổi thể tích
    chargeableWeight: Number, // Trọng lượng tính cước
    shippingFee: {
      type: Number, // Đơn vị VND Integer để tránh lỗi số thập phân
      default: 0,
      min: [0, 'Cước phí không được âm'],
      validate: { validator: Number.isInteger, message: 'Số tiền phải là số nguyên (đơn vị Đồng)' }
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
    // Lịch sử thất bại
    failedAttempts: {
      type: Number,
      default: 0,
    },
    // Tài xế phụ trách hiện tại
    currentDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Ghi chú ngoại lệ (cờ rủi ro)
    flagRisk: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Tạo index hỗ trợ truy vấn địa lý và trạng thái
orderSchema.index({ status: 1 });
orderSchema.index({ sellerId: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
