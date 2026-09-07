const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Họ và tên là bắt buộc'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Số điện thoại là bắt buộc'],
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Mật khẩu là bắt buộc'],
      minlength: 6,
      select: false, // Không tự động query password
    },
    role: {
      type: String,
      enum: [
        'SELLER',
        'BUYER',
        'SHIPPER', // Shipper giao nhận chặng đầu / chặng cuối
        'LOCAL_SHIPPER', // Shipper nội vùng
        'LINE_HAUL_DRIVER', // Tài xế xe tải liên tỉnh / liên kho
        'DRIVER', // Tài xế vận chuyển (tương thích ngược)
        'ORDER_VENDOR_MANAGER', // Quản lý Duyệt đơn & Nhà cung cấp
        'LAST_MILE_DISPATCHER', // Quản lý Điều phối Shipper nội vùng
        'LINE_HAUL_DISPATCHER', // Quản lý Điều phối Đội xe tải
        'HUB_STAFF',
        'WAREHOUSE_STAFF', // Nhân viên kho vận
        'HUB_COORDINATOR',
        'CS',
        'ACCOUNTANT',
        'ADMIN',
        'ORDER_MANAGER',
        'DRIVER_MANAGER',
        'WAREHOUSE_MANAGER',
      ],
      default: 'BUYER',
    },
    // Dành riêng cho WAREHOUSE_MANAGER - Gắn với 1 kho/bưu cục cụ thể
    assignedHubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      default: null,
    },
    // Dành cho DRIVER_MANAGER & DRIVER - Khu vực phụ trách / khu vực hoạt động
    serviceAreas: [
      {
        province: { type: String, required: true },
        district: { type: String, required: true },
      },
    ],
    // Dành riêng cho DRIVER - Quota từ chối nhận đơn trong ngày
    rejectionQuota: {
      remainingToday: { type: Number, default: 3 },
      lastResetDate: { type: Date, default: Date.now },
    },
    // Dành cho Shipper / Driver / Line-haul Driver
    vehicleInfo: {
      licensePlate: String,
      vehicleType: String, // Xe máy, xe tải 1.5 tấn...
    },
    // Trạng thái làm việc (Đang bật app, đang chạy ca, tắt app)
    isWorking: {
      type: Boolean,
      default: false,
    },
    // Phân vùng & Quota dành riêng cho LOCAL_SHIPPER
    activeGeozoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Geozone',
      default: null,
    },
    pickupQuota: {
      max: { type: Number, default: 25 },
      current: { type: Number, default: 0 },
    },
    deliveryQuota: {
      max: { type: Number, default: 35 },
      current: { type: Number, default: 0 },
    },
    maxWeightCapacityKg: {
      type: Number,
      default: 45,
    },
    currentWeightKg: {
      type: Number,
      default: 0,
    },
    acceptanceRate: {
      type: Number,
      default: 100, // Tỷ lệ chấp nhận đơn (%)
    },
    dispatchRejectionCount: {
      type: Number,
      default: 0,
    },
    shiftStartedAt: {
      type: Date,
      default: null,
    },
    requiresManualRoleReview: {
      type: Boolean,
      default: false,
    },
    // Khu vực hoạt động chính thức của Shipper (được Admin cấp/duyệt)
    operatingArea: {
      province: { type: String, default: '' },
      district: { type: String, default: '' },
      ward: { type: String, default: '' },
      subZone: { type: String, default: '' }, // Cụm tuyến / Khu phố phụ trách (VD: "Khu phố 5", "Tổ 12")
      detailAddress: { type: String, default: '' },
    },
    // Yêu cầu xin chuyển khu vực hoạt động (Cần Admin duyệt)
    zoneChangeRequest: {
      requestedArea: {
        province: { type: String, default: '' },
        district: { type: String, default: '' },
        ward: { type: String, default: '' },
        subZone: { type: String, default: '' },
        detailAddress: { type: String, default: '' },
      },
      reason: { type: String, default: '' },
      status: {
        type: String,
        enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'],
        default: 'NONE',
      },
      requestedAt: { type: Date, default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reviewedAt: { type: Date, default: null },
      rejectionReason: { type: String, default: null },
    },
    // Dành cho Seller & Hồ sơ cá nhân
    companyName: String,
    taxCode: String,
    avatarUrl: String,
    address: String,
    businessType: String,
    industryCategory: String,
    estimatedDailyOrders: String,
    websiteUrl: String,
    latitude: String,
    longitude: String,
    bankName: String,
    bankAccount: String,
    bankAccountName: String,
    walletBalance: {
      type: Number,
      default: 0, // Lưu bằng đơn vị Đồng (VND)
    },
    // Thông tin bưu cục/kho làm việc (Dành cho Staff/Driver)
    hubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Dành cho kiểm soát khóa tài khoản khi sai mật khẩu nhiều lần
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    // Alt 9.1 ĐT: Buộc đổi mật khẩu sau khi Admin tạo tài khoản mới
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false, // Không trả về khi query thông thường, phải dùng .select('+refreshToken')
    },
    // Trạng thái xác minh KYC
    kycStatus: {
      type: String,
      enum: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED', 'PENDING_KYC', 'VERIFIED_KYC', 'REJECTED_KYC'],
      default: 'NOT_SUBMITTED',
      index: true,
    },
    kycVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Bảo mật 2 lớp (2FA TOTP)
    twoFactorSecret: {
      type: String,
      select: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorBackupCodes: {
      type: [String],
      select: false,
    },
    // Phân quyền tài khoản phụ (Sub-Account)
    parentSellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    subAccountPermissions: {
      type: [String],
      enum: ['VIEW_ORDERS', 'MANAGE_ORDERS', 'VIEW_FINANCE', 'MANAGE_FINANCE', 'MANAGE_PRODUCTS', 'MANAGE_COMPLAINTS'],
      default: [],
    },
    // Tự tạm ngưng tài khoản
    deactivatedAt: Date,
    deactivationReason: String,
  },
  {
    timestamps: true, // Tự động có createdAt, updatedAt (mặc định múi giờ hệ thống)
  }
);

// Hash mật khẩu trước khi lưu
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// So sánh mật khẩu
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
