const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const bcrypt = require('bcryptjs');

const AuthLog = require('../models/authLog.model');
const PasswordResetOtp = require('../models/passwordResetOtp.model');
const { sendPasswordResetEmail, sendRegistrationOtpEmail, sendPasswordResetSms } = require('../services/notification.service');

// Hàm tạo Access Token
const generateAccessToken = (id) => {
  if (!process.env.JWT_SECRET) throw new Error('Thiếu cấu hình JWT_SECRET');
  return jwt.sign({ id, type: 'access' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
};

// Hàm tạo Refresh Token
const generateRefreshToken = (id) => {
  // Dùng JWT_REFRESH_SECRET riêng, fallback tạm JWT_SECRET nếu team chưa kịp update .env
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  return jwt.sign({ id, type: 'refresh' }, secret, { expiresIn: '7d' });
};

// @desc    Đăng nhập người dùng (UC01)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    // 5. Kiểm tra tính hợp lệ của dữ liệu đầu vào (Luồng thay thế 5.1)
    const schema = Joi.object({
      identifier: Joi.string().required().messages({
        'any.required': 'Vui lòng cung cấp Email hoặc Số điện thoại'
      }),
      password: Joi.string().required().messages({
        'any.required': 'Vui lòng cung cấp Mật khẩu'
      })
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { identifier, password } = req.body;

    // Bước 6 ĐT: Authentication Service — Tìm user bằng Email HOẶC Số điện thoại
    const user = await User.findOne({ 
      $or: [{ email: identifier }, { phoneNumber: identifier }] 
    }).select('+password');

    // Alt 6.1 ĐT: Tài khoản không tồn tại
    if (!user) {
      return res.status(401).json({ message: `Đăng nhập thất bại. Người dùng ${identifier} không tồn tại.` });
    }

    // Bước 7 ĐT: Kiểm tra trạng thái tài khoản TRƯỚC khi xác thực mật khẩu
    // Alt 7.2 ĐT: Tài khoản bị khóa tạm thời (do sai mật khẩu quá số lần cho phép)
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(403).json({ message: `Tài khoản tạm thời bị khóa. Vui lòng thử lại sau ${minutesLeft} phút.` });
    }

    // Alt 7.1 ĐT: Tài khoản chưa kích hoạt hoặc bị vô hiệu hóa
    if (!user.isActive) {
      return res.status(403).json({ message: 'Tài khoản chưa được kích hoạt hoặc đã bị vô hiệu hóa.' });
    }

    // Alt 10.1 ĐT: Tài khoản chưa được phân quyền
    if (!user.role) {
      return res.status(403).json({ message: 'Tài khoản chưa được phân quyền, vui lòng liên hệ quản trị viên.' });
    }

    // Bước 6 ĐT: Xác thực mật khẩu (sau khi trạng thái tài khoản hợp lệ)
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      // Alt 6.1 ĐT: Tăng bộ đếm sai
      user.failedLoginAttempts += 1;
      
      // Alt 6.2 ĐT: Vượt quá 5 lần → Tạm khóa 5 phút (đúng theo đặc tả)
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = Date.now() + 5 * 60 * 1000; // 5 phút
      }
      await user.save();
      
      return res.status(401).json({ 
        message: 'Mật khẩu không đúng. Tài khoản sẽ bị khóa sau khi nhập sai 5 lần.' 
      });
    }

    // Đăng nhập thành công → Reset bộ đếm sai
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;

    // Bước 8 ĐT: Tạo Access Token và Refresh Token
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    // Bước 9 ĐT: Ghi nhận Audit Log (thất bại ghi log KHÔNG chặn luồng chính)
    try {
      await AuthLog.create({
        userId: user._id,
        action: 'LOGIN_SUCCESS',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
    } catch (logErr) {
      console.error(`[AuthLog] Không thể ghi Audit Log đăng nhập: ${logErr.message}`);
    }

    // Bước 10 ĐT: Trả về thông tin để Client điều hướng đến Dashboard theo vai trò
    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken,
    });

  } catch (error) {
    // Ex 6.3 ĐT: Không thể kết nối CSDL
    // Ex 8.1 ĐT: Lỗi hệ thống khi tạo Token
    console.error(`Lỗi Đăng nhập: ${error.stack}`);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ, vui lòng thử lại sau.' });
  }
};

// @desc    Đăng ký tài khoản (Dành cho Seller/Admin)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    // Bước 5 đặc tả: Joi Validation — loại bỏ trường không được phép + kiểm tra định dạng
    const schema = Joi.object({
      fullName: Joi.string().required().messages({
        'any.required': 'Vui lòng cung cấp họ tên'
      }),
      email: Joi.string().email().required().messages({
        'string.email': 'Email không đúng định dạng',
        'any.required': 'Vui lòng cung cấp email'
      }),
      phoneNumber: Joi.string().pattern(/^[0-9]{10,11}$/).required().messages({
        'string.pattern.base': 'Số điện thoại không hợp lệ',
        'any.required': 'Vui lòng cung cấp số điện thoại'
      }),
      password: Joi.string().min(6).required().messages({
        'string.min': 'Mật khẩu phải từ 6 ký tự',
        'any.required': 'Vui lòng cung cấp mật khẩu'
      }),
      // Xác nhận mật khẩu — bước 2 của form đăng ký theo đặc tả Main Flow bước 3
      confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'Mật khẩu xác nhận không khớp',
        'any.required': 'Vui lòng xác nhận mật khẩu'
      })
      // Không khai báo 'role' — Joi sẽ tự động chặn bất kỳ field lạ nào (chống Privilege Escalation)
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { fullName, email, phoneNumber, password } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { phoneNumber }] });

    if (userExists) {
      return res.status(400).json({ message: 'Email hoặc số điện thoại đã tồn tại' });
    }

    // Kiểm tra xem email này đã xác thực OTP thành công (isUsed: true) trong 10 phút gần nhất hay chưa
    const verifiedOtp = await PasswordResetOtp.findOne({
      sentTo: email,
      isUsed: true,
      expiresAt: { $gt: new Date() },
    });

    if (!verifiedOtp) {
      return res.status(400).json({ message: 'Email chưa được xác thực OTP hoặc phiên xác thực đã hết hạn. Vui lòng thực hiện lại từ đầu.' });
    }

    const user = await User.create({
      fullName,
      email,
      phoneNumber,
      password,
      role: 'SELLER', // Bắt buộc đăng ký public luôn là SELLER
    });

    if (user) {
      // Dọn dẹp mã OTP đã dùng để tránh tái sử dụng
      await PasswordResetOtp.deleteMany({ sentTo: email });

      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);
      user.refreshToken = refreshToken;
      await user.save();

      // Bước 9 đặc tả: Ghi Audit Log (thất bại ghi log KHÔNG chặn luồng chính)
      try {
        await AuthLog.create({
          userId: user._id,
          action: 'REGISTER_SUCCESS',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          note: 'Tài khoản đăng ký mới',
        });
      } catch (logErr) {
        console.error(`[AuthLog] Không thể ghi Audit Log: ${logErr.message}`);
      }

      res.status(201).json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        accessToken,
        refreshToken,
      });
    } else {
      res.status(400).json({ message: 'Dữ liệu người dùng không hợp lệ' });
    }
  } catch (error) {
    // Ngoại lệ 7.1 đặc tả: Race Condition — MongoDB E11000 Duplicate Key
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email hoặc số điện thoại đã tồn tại' });
    }
    // Ngoại lệ 8.1 đặc tả: Lỗi hệ thống (hash mật khẩu, sinh token, kết nối DB)
    console.error(`Lỗi Đăng ký: ${error.stack}`);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ, vui lòng thử lại sau' });
  }
};

// @desc    Lấy thông tin hồ sơ cá nhân
// @route   GET /api/auth/profile
// @access  Private
// @desc    Lấy thông tin hồ sơ cá nhân
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    // Bước 2 ĐT: Hiển thị thông tin hồ sơ của chính người dùng đang đăng nhập
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isActive: user.isActive,
      companyName: user.companyName || '',
      taxCode: user.taxCode || '',
      avatarUrl: user.avatarUrl || '',
      address: user.address || '',
      latitude: user.latitude || '',
      longitude: user.longitude || '',
      bankName: user.bankName || '',
      bankAccount: user.bankAccount || '',
      bankAccountName: user.bankAccountName || '',
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error(`Lỗi lấy profile: ${error.stack}`);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
};

// ============================================================
// UC Cập nhật hồ sơ cá nhân
// @desc    Chỉnh sửa thông tin cá nhân của chính người dùng đang đăng nhập
// @route   PUT /api/auth/profile
// @access  Private
// ============================================================
const updateUserProfile = async (req, res) => {
  try {
    const schema = Joi.object({
      fullName: Joi.string().min(2).optional().messages({
        'string.min': 'Họ tên phải từ 2 ký tự'
      }),
      phoneNumber: Joi.string().pattern(/^[0-9]{10,11}$/).optional().messages({
        'string.pattern.base': 'Số điện thoại không hợp lệ'
      }),
      email: Joi.string().email().optional().messages({
        'string.email': 'Email không đúng định dạng'
      }),
      newPassword: Joi.string().min(6).optional().messages({
        'string.min': 'Mật khẩu mới phải từ 6 ký tự'
      }),
      companyName: Joi.string().allow('', null).optional(),
      taxCode: Joi.string().allow('', null).optional(),
      avatarUrl: Joi.string().allow('', null).optional(),
      address: Joi.string().allow('', null).optional(),
      latitude: Joi.string().allow('', null).optional(),
      longitude: Joi.string().allow('', null).optional(),
      bankName: Joi.string().allow('', null).optional(),
      bankAccount: Joi.string().allow('', null).optional(),
      bankAccountName: Joi.string().allow('', null).optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'Vui lòng cung cấp ít nhất một trường cần cập nhật.' });
    }

    const {
      fullName,
      phoneNumber,
      email,
      newPassword,
      companyName,
      taxCode,
      avatarUrl,
      address,
      latitude,
      longitude,
      bankName,
      bankAccount,
      bankAccountName,
    } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email này đã được sử dụng bởi tài khoản khác.' });
      }
    }

    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const phoneExists = await User.findOne({ phoneNumber, _id: { $ne: req.user._id } });
      if (phoneExists) {
        return res.status(400).json({ message: 'Số điện thoại này đã được sử dụng bởi tài khoản khác.' });
      }
    }

    if (newPassword) {
      const isSame = await user.matchPassword(newPassword);
      if (isSame) {
        return res.status(400).json({ message: 'Mật khẩu không hợp lệ, không được trùng với mật khẩu hiện tại.' });
      }
      user.password = newPassword;
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (companyName !== undefined) user.companyName = companyName;
    if (taxCode !== undefined) user.taxCode = taxCode;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (address !== undefined) user.address = address;
    if (latitude !== undefined) user.latitude = latitude;
    if (longitude !== undefined) user.longitude = longitude;
    if (bankName !== undefined) user.bankName = bankName;
    if (bankAccount !== undefined) user.bankAccount = bankAccount;
    if (bankAccountName !== undefined) user.bankAccountName = bankAccountName;

    try {
      await user.save();
    } catch (saveError) {
      if (saveError.code === 11000) {
        const duplicatedField = Object.keys(saveError.keyPattern)[0];
        const fieldName = duplicatedField === 'email' ? 'Email' : 'Số điện thoại';
        return res.status(400).json({ message: `${fieldName} này đã được sử dụng bởi tài khoản khác.` });
      }
      console.error(`[UpdateProfile] Lỗi lưu hồ sơ: ${saveError.stack}`);
      return res.status(500).json({ message: 'Cập nhật hồ sơ thất bại. Vui lòng thử lại sau.' });
    }

    res.status(200).json({
      message: 'Cập nhật hồ sơ thành công.',
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        companyName: user.companyName,
        taxCode: user.taxCode,
        avatarUrl: user.avatarUrl,
        address: user.address,
        latitude: user.latitude,
        longitude: user.longitude,
        bankName: user.bankName,
        bankAccount: user.bankAccount,
        bankAccountName: user.bankAccountName,
      },
    });

  } catch (error) {
    console.error(`Lỗi cập nhật hồ sơ: ${error.stack}`);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ, vui lòng thử lại sau.' });
  }
};


// @desc    Cấp lại Access Token bằng Refresh Token (UC01 - Session Management)
// @route   POST /api/auth/refresh
// @access  Public (chỉ cần refreshToken, không cần accessToken)
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Không có Refresh Token' });
    }

    // BƯỚC 1: Kiểm tra chữ ký JWT + thời hạn + loại token
    let decoded;
    try {
      const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
      decoded = jwt.verify(refreshToken, secret);
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ message: 'Token không đúng định dạng (Yêu cầu Refresh Token)' });
      }
    } catch (err) {
      return res.status(401).json({ message: 'Refresh Token không hợp lệ hoặc đã hết hạn' });
    }

    // BƯỚC 2 (QUAN TRỌNG): Đối chiếu với giá trị đang lưu trong DB
    // Bước này vô hiệu hóa refresh token cũ khi user đã logout
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      // refreshToken đã bị thu hồi (logout) hoặc đã bị ghi đè (đăng nhập thiết bị khác)
      return res.status(401).json({ message: 'Refresh Token đã bị thu hồi hoặc không còn hiệu lực' });
    }

    // Kiểm tra tài khoản vẫn active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hóa' });
    }

    // Cấp Access Token mới (Refresh Token giữ nguyên — không cấp lại để tránh phức tạp)
    const newAccessToken = generateAccessToken(user._id);

    // Ghi chú: khi triển khai Refresh Token Rotation (nâng cao),
    // cần tạo refreshToken mới, cập nhật DB và trả về cả hai

    res.status(200).json({
      accessToken: newAccessToken,
    });

  } catch (error) {
    console.error(`Lỗi Refresh Token: ${error.message}`);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

// @desc    Đăng xuất hệ thống (UC Đăng xuất)
// @route   POST /api/auth/logout
// @access  Private (Bảo vệ bởi middleware 'protect' — Điều kiện tiền 3.1: Token hết hạn sẽ bị chặn tại đây)
const logoutUser = async (req, res) => {
  // Bước 3 ĐT: Kiểm tra trạng thái phiên — middleware 'protect' đã chạy trước.
  // req.user tồn tại nghĩa là accessToken hợp lệ. Alt 3.1 được xử lý tương đương.
  try {
    // Bước 4. Hủy Session/JWT Token phía server — xóa refreshToken trong DB
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

    // Bước 5. Ghi nhận lịch sử đăng xuất (Audit Log)
    // Ngoại lệ 5.1: Nếu ghi log lỗi, vẫn đăng xuất thành công (không throw lỗi ra ngoài)
    try {
      await AuthLog.create({
        userId: req.user._id,
        action: 'LOGOUT',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
    } catch (logError) {
      // Lỗi ghi log không được làm gián đoạn luồng đăng xuất
      console.error(`[WARN] Không thể ghi Audit Log đăng xuất: ${logError.message}`);
    }

    // Bước 6. Thông báo đăng xuất thành công (Client xóa token phía frontend)
    res.status(200).json({ message: 'Đăng xuất thành công. Vui lòng chuyển về màn hình Đăng nhập.' });

  } catch (error) {
    // Ngoại lệ 4.1 ĐT: Không hủy được refreshToken phía server do lỗi hệ thống.
    // Hệ thống vẫn báo đăng xuất thành công. Client sẽ tự xóa token cục bộ;
    // accessToken sẽ tự động hết hiệu lực sau 15 phút.
    console.error(`[ERROR] Lỗi khi hủy refreshToken khi đăng xuất: ${error.stack}`);
    res.status(200).json({ message: 'Đăng xuất thành công.' });
  }
};

// ============================================================
// UC Quên mật khẩu — Bước 1: Yêu cầu gửi OTP
// @desc    Kiểm tra tài khoản và gửi mã OTP về Email/SĐT
// @route   POST /api/auth/forgot-password
// @access  Public
// ============================================================
const forgotPassword = async (req, res) => {
  try {
    // Joi Validation — chỉ cần 1 trong 2: email hoặc số điện thoại
    const schema = Joi.object({
      identifier: Joi.string().required().messages({
        'any.required': 'Vui lòng nhập Email hoặc Số điện thoại'
      })
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { identifier } = req.body;

    // Bước 4 ĐT: Kiểm tra tồn tại tài khoản
    const user = await User.findOne({
      $or: [{ email: identifier }, { phoneNumber: identifier }]
    });

    // Alt 4.1 ĐT: Không tìm thấy tài khoản
    if (!user) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
    }

    // Sinh OTP 6 số ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const OTP_EXPIRE_MINUTES = 10;

    // Hash OTP trước khi lưu DB (bảo mật: DB không lưu plaintext)
    const otpHash = await bcrypt.hash(otp, 10);

    // Xóa OTP cũ của user này (tránh tích tụ rác, mỗi lân chỉ 1 OTP hợp lệ)
    await PasswordResetOtp.deleteMany({ userId: user._id });

    // Xác định kênh gửi và địa chỉ gửi
    const isEmail = identifier.includes('@');
    const channel = isEmail ? 'email' : 'sms';
    const sentTo = identifier;

    // Lưu OTP mới vào DB
    await PasswordResetOtp.create({
      userId: user._id,
      otpHash,
      expiresAt: new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000),
      channel,
      sentTo,
    });

    // Bước 5 ĐT: Gửi OTP — Ex 5.1: lỗi gửi thì bắt được ở đây
    try {
      if (isEmail) {
        await sendPasswordResetEmail(sentTo, otp);
      } else {
        await sendPasswordResetSms(sentTo, otp);
      }
    } catch (sendError) {
      // Ex 5.1 ĐT: Không thể gửi OTP — xóa OTP vừa tạo, trả lỗi
      await PasswordResetOtp.deleteMany({ userId: user._id });
      console.error(`[OTP] Lỗi gửi OTP: ${sendError.message}`);
      return res.status(503).json({ message: 'Không thể gửi mã xác thực. Vui lòng thử lại sau.' });
    }

    res.status(200).json({
      message: `Mã OTP đã được gửi đến ${sentTo}. Hiệu lực trong ${OTP_EXPIRE_MINUTES} phút.`,
      // userId trả về để Client dùng gửi tiếp ở bước verify
      userId: user._id,
      channel,
    });

  } catch (error) {
    console.error(`Lỗi Quên mật khẩu: ${error.stack}`);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ, vui lòng thử lại sau.' });
  }
};

// ============================================================
// UC Quên mật khẩu — Bước 2: Xác thực mã OTP
// @desc    Kiểm tra mã OTP người dùng nhập
// @route   POST /api/auth/verify-otp
// @access  Public
// ============================================================
const verifyOtp = async (req, res) => {
  try {
    const schema = Joi.object({
      userId: Joi.string().required(),
      otp: Joi.string().length(6).required().messages({
        'string.length': 'Mã OTP gồm 6 chữ số',
        'any.required': 'Vui lòng nhập mã OTP'
      })
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { userId, otp } = req.body;
    const MAX_OTP_ATTEMPTS = 5;

    // Tìm OTP chưa dùng của user này
    const otpRecord = await PasswordResetOtp.findOne({
      userId,
      isUsed: false,
    }).select('+otpHash');

    if (!otpRecord) {
      return res.status(400).json({ message: 'Yêu cầu đặt lại mật khẩu không tồn tại hoặc đã được sử dụng.' });
    }

    // Alt 7.2 ĐT: OTP hết hạn
    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.' });
    }

    // Ex 7.3 ĐT: Vượt quá số lần cho phép
    if (otpRecord.failedAttempts >= MAX_OTP_ATTEMPTS) {
      await PasswordResetOtp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: 'Vượt quá số lần nhập sai. Yêu cầu đã bị hủy, vui lòng thực hiện lại từ đầu.' });
    }

    // Bước 7 ĐT: Xác thực mã OTP bằng bcrypt.compare (so với hash đã lưu)
    const isOtpValid = await bcrypt.compare(otp, otpRecord.otpHash);

    if (!isOtpValid) {
      // Alt 7.1 ĐT: Mã OTP không chính xác — tăng bộ đếm sai
      otpRecord.failedAttempts += 1;
      await otpRecord.save();
      const attemptsLeft = MAX_OTP_ATTEMPTS - otpRecord.failedAttempts;
      return res.status(400).json({
        message: `Mã OTP không chính xác. Còn ${attemptsLeft} lần thử.`
      });
    }

    // OTP hợp lệ: Đánh dấu là đã dùng (chặn dùng lại)
    // Không xóa ngay — giữ lại để bước reset-password xác nhận lần nữa
    otpRecord.isUsed = true;
    await otpRecord.save();

    res.status(200).json({
      message: 'Xác thực OTP thành công. Vui lòng nhập mật khẩu mới.',
      userId,
    });

  } catch (error) {
    console.error(`Lỗi Xác thực OTP: ${error.stack}`);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ, vui lòng thử lại sau.' });
  }
};

// ============================================================
// UC Quên mật khẩu — Bước 3: Đặt lại mật khẩu mới
// @desc    Cập nhật mật khẩu mới sau khi OTP đã xác thực
// @route   POST /api/auth/reset-password
// @access  Public
// ============================================================
const resetPassword = async (req, res) => {
  try {
    // Bước 9 ĐT: Joi validation mật khẩu mới
    const schema = Joi.object({
      userId: Joi.string().required(),
      newPassword: Joi.string().min(6).required().messages({
        'string.min': 'Mật khẩu phải từ 6 ký tự',
        'any.required': 'Vui lòng nhập mật khẩu mới'
      }),
      // Alt 9.2 ĐT: Xác nhận mật khẩu không khớp
      confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'Mật khẩu xác nhận không khớp',
        'any.required': 'Vui lòng xác nhận mật khẩu mới'
      })
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { userId, newPassword } = req.body;

    // Xác nhận OTP đã được xác thực (isUsed: true) và chưa hết hạn
    const otpRecord = await PasswordResetOtp.findOne({
      userId,
      isUsed: true,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng thực hiện lại từ đầu.' });
    }

    // Bước 10 ĐT: Cập nhật mật khẩu mới vào DB
    // (pre-save hook tự động hash nếu isModified('password'))
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
    }

    user.password = newPassword;
    // Ex 10.1 ĐT: Lỗi khi cập nhật mật khẩu
    try {
      await user.save();
    } catch (saveError) {
      console.error(`[ResetPassword] Lỗi lưu mật khẩu: ${saveError.stack}`);
      return res.status(500).json({ message: 'Đặt lại mật khẩu thất bại. Vui lòng thử lại sau.' });
    }

    // Bước 11 ĐT: Vô hiệu hóa OTP đã dùng + thu hồi mọi phiên cũ
    await PasswordResetOtp.deleteMany({ userId });
    await User.findByIdAndUpdate(userId, { refreshToken: null }); // bẫt buộc đăng nhập lại

    // Bước 11 ĐT: Ghi Audit Log
    try {
      await AuthLog.create({
        userId: user._id,
        action: 'PASSWORD_CHANGED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        note: 'Đặt lại mật khẩu qua OTP',
      });
    } catch (logErr) {
      console.error(`[AuthLog] Không thể ghi log PASSWORD_CHANGED: ${logErr.message}`);
    }

    // Bước 12 ĐT: Thông báo thành công
    res.status(200).json({ message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.' });

  } catch (error) {
    console.error(`Lỗi Đặt lại mật khẩu: ${error.stack}`);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ, vui lòng thử lại sau.' });
  }
};

// ============================================================
// UC Đổi mật khẩu — Người dùng đã đăng nhập
// @desc    Xác thực mật khẩu hiện tại và đổi sang mật khẩu mới
// @route   PUT /api/auth/change-password
// @access  Private (Bảo vệ bởi middleware protect)
// ============================================================
const changePassword = async (req, res) => {
  const MAX_FAILED_ATTEMPTS = 5;
  const LOCK_DURATION_MINUTES = 15;

  try {
    // Bước 4 ĐT: Kiểm tra đầy đủ trường + đúng định dạng
    const schema = Joi.object({
      currentPassword: Joi.string().required().messages({
        'any.required': 'Vui lòng nhập mật khẩu hiện tại'
      }),
      // Bước 6 ĐT: Chính sách bảo mật mật khẩu mới (≥ 6 ký tự)
      newPassword: Joi.string().min(6).required().messages({
        'string.min': 'Mật khẩu mới phải từ 6 ký tự trở lên',
        'any.required': 'Vui lòng nhập mật khẩu mới'
      }),
      // Alt 4.2 ĐT: Xác nhận không khớp → chặn ngay ở đây
      confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'Mật khẩu xác nhận không khớp với mật khẩu mới',
        'any.required': 'Vui lòng xác nhận mật khẩu mới'
      })
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { currentPassword, newPassword } = req.body;

    // Lấy user kèm password (select: false — phải gọi tường minh)
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }

    // Ex 5.2 ĐT: Kiểm tra tài khoản có đang bị khóa chức năng đổi mật khẩu không
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(403).json({
        message: `Chức năng đổi mật khẩu tạm thời bị khóa. Vui lòng thử lại sau ${minutesLeft} phút.`
      });
    }

    // Bước 5 ĐT: Xác thực mật khẩu hiện tại
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      // Alt 5.1 ĐT: Sai mật khẩu — tăng bộ đếm
      user.failedLoginAttempts += 1;

      // Ex 5.2 ĐT: Vượt quá số lần cho phép → khóa chức năng
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = Date.now() + LOCK_DURATION_MINUTES * 60 * 1000;
        await user.save();
        return res.status(403).json({
          message: `Nhập sai mật khẩu quá ${MAX_FAILED_ATTEMPTS} lần. Chức năng bị tạm khóa ${LOCK_DURATION_MINUTES} phút.`
        });
      }

      await user.save();
      const attemptsLeft = MAX_FAILED_ATTEMPTS - user.failedLoginAttempts;
      return res.status(401).json({
        message: `Mật khẩu hiện tại không đúng. Còn ${attemptsLeft} lần thử trước khi bị khóa.`
      });
    }

    // Bước 7 ĐT: Mật khẩu mới không được trùng mật khẩu hiện tại
    const isSamePassword = await user.matchPassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({ message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' });
    }

    // Bước 8 ĐT: Cập nhật mật khẩu mới — pre-save hook tự động hash
    user.password = newPassword;
    user.failedLoginAttempts = 0;  // Reset bộ đếm sau khi đổi thành công
    user.lockUntil = undefined;
    // Bước 9 ĐT: Hủy phiên đăng nhập trên thiết bị khác
    user.refreshToken = null;

    // Ex 8.1 ĐT: Lỗi khi lưu vào DB
    try {
      await user.save();
    } catch (saveError) {
      console.error(`[ChangePassword] Lỗi lưu mật khẩu: ${saveError.stack}`);
      return res.status(500).json({ message: 'Đổi mật khẩu thất bại. Vui lòng thử lại sau.' });
    }

    // Bước 9 ĐT: Ghi Audit Log (lỗi log không chặn response)
    try {
      await AuthLog.create({
        userId: user._id,
        action: 'PASSWORD_CHANGED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        note: 'Đổi mật khẩu chủ động khi đã đăng nhập',
      });
    } catch (logErr) {
      console.error(`[AuthLog] Không thể ghi log PASSWORD_CHANGED: ${logErr.message}`);
    }

    // Bước 10 ĐT: Thông báo thành công
    res.status(200).json({ message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.' });

  } catch (error) {
    console.error(`Lỗi Đổi mật khẩu: ${error.stack}`);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ, vui lòng thử lại sau.' });
  }
};

// ============================================================
// @desc    Gửi mã OTP xác thực Email khi Đăng ký tài khoản (Google Mail SMTP)
// @route   POST /api/auth/send-register-otp
// @access  Public
// ============================================================
const sendRegisterOtp = async (req, res) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required().messages({
        'string.email': 'Email không đúng định dạng',
        'any.required': 'Vui lòng nhập Email xác thực'
      })
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { email } = req.body;

    // Kiểm tra trùng lặp email
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email này đã được sử dụng bởi tài khoản khác' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const OTP_EXPIRE_MINUTES = 10;
    const otpHash = await bcrypt.hash(otp, 10);

    // Lưu OTP tạm cho registration
    await PasswordResetOtp.deleteMany({ sentTo: email });
    await PasswordResetOtp.create({
      otpHash,
      expiresAt: new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000),
      channel: 'email',
      sentTo: email,
    });

    await sendRegistrationOtpEmail(email, otp);

    res.status(200).json({
      message: `Mã xác thực OTP đã được gửi về Google Email ${email}. Hiệu lực trong 10 phút.`,
      email,
    });
  } catch (error) {
    console.error(`Lỗi gửi Register OTP: ${error.stack}`);
    res.status(503).json({ message: 'Không thể gửi email xác thực OTP. Vui lòng kiểm tra lại địa chỉ email hoặc thử lại sau.' });
  }
};

// ============================================================
// @desc    Xác thực mã OTP Đăng ký
// @route   POST /api/auth/verify-register-otp
// @access  Public
// ============================================================
const verifyRegisterOtp = async (req, res) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      otp: Joi.string().length(6).required().messages({
        'string.length': 'Mã OTP gồm 6 chữ số',
        'any.required': 'Vui lòng nhập mã OTP'
      })
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { email, otp } = req.body;

    const otpRecord = await PasswordResetOtp.findOne({
      sentTo: email,
      isUsed: false,
    }).select('+otpHash');

    if (!otpRecord) {
      return res.status(400).json({ message: 'Yêu cầu xác thực OTP không tồn tại hoặc đã được sử dụng.' });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Mã xác thực OTP đã hết hạn. Vui lòng gửi lại mã mới.' });
    }

    const isOtpValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isOtpValid) {
      otpRecord.failedAttempts += 1;
      await otpRecord.save();
      return res.status(400).json({ message: 'Mã OTP xác thực không chính xác.' });
    }

    otpRecord.isUsed = true;
    await otpRecord.save();

    res.status(200).json({ message: 'Xác thực Email thành công!' });
  } catch (error) {
    console.error(`Lỗi xác thực Register OTP: ${error.stack}`);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ, vui lòng thử lại sau.' });
  }
};


module.exports = {
  loginUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  logoutUser,
  refreshAccessToken,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
  sendRegisterOtp,
  verifyRegisterOtp,
};

