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
        'DRIVER',
        'LINE_HAUL_DRIVER',
        'HUB_STAFF',
        'HUB_COORDINATOR',
        'CS',
        'ACCOUNTANT',
        'ADMIN',
      ],
      default: 'BUYER',
    },
    // Dành cho Driver / Line-haul Driver
    vehicleInfo: {
      licensePlate: String,
      vehicleType: String, // Xe máy, xe tải 1.5 tấn...
    },
    // Trạng thái làm việc (Đang bật app, đang chạy ca, tắt app)
    isWorking: {
      type: Boolean,
      default: false,
    },
    // Dành cho Seller
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
    }
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
