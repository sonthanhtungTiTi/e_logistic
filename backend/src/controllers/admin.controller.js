const User = require('../models/user.model');
const AuthLog = require('../models/authLog.model');
const Joi = require('joi');
const { sendPasswordResetEmail } = require('../services/notification.service');

// Danh sách role hợp lệ trong hệ thống (đồng bộ với user.model.js)
const VALID_ROLES = ['SELLER', 'BUYER', 'DRIVER', 'LINE_HAUL_DRIVER', 'HUB_STAFF', 'HUB_COORDINATOR', 'CS', 'ACCOUNTANT', 'ADMIN'];

// Sinh mật khẩu tạm thời ngẫu nhiên (12 ký tự: chữ hoa + chữ thường + số + ký tự đặc biệt)
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ============================================================
// Bước 2 ĐT: Lấy danh sách người dùng (kèm bộ lọc)
// @desc    Xem danh sách user, lọc theo role và trạng thái
// @route   GET /api/admin/users
// @access  Private/Admin
// ============================================================
const listUsers = async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const users = await User.find(filter)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      total,
      page: Number(page),
      limit: Number(limit),
      users,
    });
  } catch (error) {
    console.error(`[Admin] Lỗi lấy danh sách user: ${error.stack}`);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
};

// ============================================================
// Bước 8-11 ĐT: Tạo tài khoản nội bộ mới
// @desc    Admin tạo tài khoản nhân viên, sinh mật khẩu tạm, gửi Email
// @route   POST /api/admin/users
// @access  Private/Admin
// ============================================================
const createUser = async (req, res) => {
  try {
    // Bước 6 ĐT: Kiểm tra dữ liệu đầy đủ và hợp lệ
    const schema = Joi.object({
      fullName: Joi.string().required().messages({ 'any.required': 'Vui lòng cung cấp họ tên' }),
      email: Joi.string().email().required().messages({
        'string.email': 'Email không đúng định dạng',
        'any.required': 'Vui lòng cung cấp email'
      }),
      phoneNumber: Joi.string().pattern(/^[0-9]{10,11}$/).required().messages({
        'string.pattern.base': 'Số điện thoại không hợp lệ',
        'any.required': 'Vui lòng cung cấp số điện thoại'
      }),
      // role phải thuộc danh sách hợp lệ đã định nghĩa — Bước 6 ĐT
      role: Joi.string().valid(...VALID_ROLES).required().messages({
        'any.only': `Vai trò không hợp lệ. Các vai trò được phép: ${VALID_ROLES.join(', ')}`,
        'any.required': 'Vui lòng cung cấp vai trò'
      }),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { fullName, email, phoneNumber, role } = req.body;

    // Bước 7 ĐT: Kiểm tra Email/SĐT không trùng với tài khoản khác
    const existing = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existing) {
      const dupField = existing.email === email ? 'Email' : 'Số điện thoại';
      return res.status(400).json({ message: `${dupField} này đã được sử dụng bởi tài khoản khác.` });
    }

    // Bước 8 ĐT: Sinh mật khẩu tạm thời ngẫu nhiên + đặt cờ mustChangePassword
    const tempPassword = generateTempPassword();

    // Ex 9.2 ĐT: Bắt lỗi CSDL khi tạo tài khoản
    let user;
    try {
      user = await User.create({
        fullName,
        email,
        phoneNumber,
        password: tempPassword, // pre-save hook tự hash
        role,
        mustChangePassword: true, // Alt 9.1 ĐT: Bắt buộc đổi mật khẩu lần đầu
      });
    } catch (saveError) {
      // Ex 8.2 Race Condition E11000
      if (saveError.code === 11000) {
        const dupField = Object.keys(saveError.keyPattern)[0];
        const fieldName = dupField === 'email' ? 'Email' : 'Số điện thoại';
        return res.status(400).json({ message: `${fieldName} này đã được sử dụng bởi tài khoản khác.` });
      }
      console.error(`[Admin] Lỗi tạo tài khoản: ${saveError.stack}`);
      return res.status(500).json({ message: 'Thao tác thất bại. Vui lòng thử lại sau.' });
    }

    // Bước 10 ĐT: Gửi Email thông tin đăng nhập tạm thời
    // Ex 10.1 ĐT: Lỗi gửi Email → vẫn tạo tài khoản thành công, không rollback
    let emailSent = true;
    try {
      await sendPasswordResetEmail(email, `Mật khẩu tạm thời của bạn: ${tempPassword}\nVui lòng đổi ngay sau khi đăng nhập.`);
    } catch (emailErr) {
      emailSent = false;
      console.error(`[Admin] Không thể gửi Email thông tin đăng nhập: ${emailErr.message}`);
    }

    // Bước 11 ĐT: Ghi Audit Log — actor_id = Admin, target_user_id = user vừa tạo
    try {
      await AuthLog.create({
        userId: req.user._id,        // Actor: Admin thực hiện
        action: 'ADMIN_CREATE_USER',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        note: `Admin tạo tài khoản ${role} cho ${email}. Target: ${user._id}`,
      });
    } catch (logErr) {
      console.error(`[AuthLog] Không thể ghi log tạo tài khoản: ${logErr.message}`);
    }

    res.status(201).json({
      message: `Tạo tài khoản thành công.${emailSent ? ' Email thông tin đăng nhập đã được gửi.' : ' (Cảnh báo: Không thể gửi Email — vui lòng gửi thông tin thủ công.)'}`,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      // Trả về mật khẩu tạm để Admin gửi thủ công nếu cần (chỉ trả 1 lần)
      tempPassword: emailSent ? undefined : tempPassword,
    });
  } catch (error) {
    console.error(`[Admin] Lỗi tạo user: ${error.stack}`);
    res.status(500).json({ message: 'Thao tác thất bại. Vui lòng thử lại sau.' });
  }
};

// ============================================================
// Bước 5-9 ĐT: Chỉnh sửa thông tin tài khoản
// @desc    Admin cập nhật thông tin người dùng bất kỳ
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
// ============================================================
const updateUser = async (req, res) => {
  try {
    // Bước 6 ĐT: Validate dữ liệu + role phải hợp lệ
    const schema = Joi.object({
      fullName: Joi.string().min(2).optional(),
      email: Joi.string().email().optional(),
      phoneNumber: Joi.string().pattern(/^[0-9]{10,11}$/).optional(),
      role: Joi.string().valid(...VALID_ROLES).optional().messages({
        'any.only': `Vai trò không hợp lệ. Các vai trò được phép: ${VALID_ROLES.join(', ')}`
      }),
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }

    const { fullName, email, phoneNumber, role } = req.body;

    // Bước 7 ĐT: Kiểm tra trùng Email/SĐT với tài khoản khác
    if (email && email !== targetUser.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (emailExists) return res.status(400).json({ message: 'Email này đã được sử dụng bởi tài khoản khác.' });
    }
    if (phoneNumber && phoneNumber !== targetUser.phoneNumber) {
      const phoneExists = await User.findOne({ phoneNumber, _id: { $ne: req.params.id } });
      if (phoneExists) return res.status(400).json({ message: 'Số điện thoại này đã được sử dụng bởi tài khoản khác.' });
    }

    if (fullName) targetUser.fullName = fullName;
    if (email) targetUser.email = email;
    if (phoneNumber) targetUser.phoneNumber = phoneNumber;
    if (role) targetUser.role = role;

    // Ex 9.2 ĐT: Lỗi CSDL
    try {
      await targetUser.save();
    } catch (saveError) {
      if (saveError.code === 11000) {
        const dupField = Object.keys(saveError.keyPattern)[0];
        const fieldName = dupField === 'email' ? 'Email' : 'Số điện thoại';
        return res.status(400).json({ message: `${fieldName} này đã được sử dụng bởi tài khoản khác.` });
      }
      console.error(`[Admin] Lỗi cập nhật user: ${saveError.stack}`);
      return res.status(500).json({ message: 'Thao tác thất bại. Vui lòng thử lại sau.' });
    }

    // Bước 11 ĐT: Audit Log
    try {
      await AuthLog.create({
        userId: req.user._id,
        action: 'ADMIN_UPDATE_USER',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        note: `Admin cập nhật tài khoản. Target: ${targetUser._id}`,
      });
    } catch (logErr) {
      console.error(`[AuthLog] Không thể ghi log: ${logErr.message}`);
    }

    res.status(200).json({ message: 'Cập nhật tài khoản thành công.', user: targetUser });
  } catch (error) {
    console.error(`[Admin] Lỗi updateUser: ${error.stack}`);
    res.status(500).json({ message: 'Thao tác thất bại. Vui lòng thử lại sau.' });
  }
};

// ============================================================
// Alt 3.1 / 3.2 / 3.3 ĐT: Khóa / Mở khóa / Vô hiệu hóa tài khoản
// @desc    Admin thay đổi trạng thái tài khoản, xóa Refresh Token nếu khóa
// @route   PATCH /api/admin/users/:id/status
// @access  Private/Admin
// ============================================================
const setUserStatus = async (req, res) => {
  try {
    const { action } = req.body; // 'lock' | 'unlock' | 'deactivate'

    if (!['lock', 'unlock', 'deactivate'].includes(action)) {
      return res.status(400).json({ message: 'Thao tác không hợp lệ. Chỉ chấp nhận: lock, unlock, deactivate.' });
    }

    // Alt 7.2 ĐT: Self-lock prevention — không cho khóa chính mình
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Không thể tự khóa hoặc vô hiệu hóa tài khoản đang đăng nhập.' });
    }

    const targetUser = await User.findById(req.params.id).select('+refreshToken');
    if (!targetUser) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });

    let statusNote = '';

    if (action === 'lock') {
      // Alt 3.1 ĐT: Khóa → isActive = false, xóa refreshToken ngay
      targetUser.isActive = false;
      targetUser.refreshToken = null;
      statusNote = 'Admin khóa tài khoản';
    } else if (action === 'unlock') {
      // Alt 3.2 ĐT: Mở khóa → isActive = true, reset bộ đếm sai
      targetUser.isActive = true;
      targetUser.failedLoginAttempts = 0;
      targetUser.lockUntil = undefined;
      statusNote = 'Admin mở khóa tài khoản';
    } else if (action === 'deactivate') {
      // Alt 3.3 ĐT: Vô hiệu hóa → isActive = false, xóa refreshToken, dữ liệu lịch sử vẫn giữ
      targetUser.isActive = false;
      targetUser.refreshToken = null;
      statusNote = 'Admin vô hiệu hóa tài khoản';
    }

    // Ex 9.2 ĐT: Lỗi CSDL
    try {
      await targetUser.save();
    } catch (saveError) {
      console.error(`[Admin] Lỗi cập nhật trạng thái: ${saveError.stack}`);
      return res.status(500).json({ message: 'Thao tác thất bại. Vui lòng thử lại sau.' });
    }

    // Bước 11 ĐT: Audit Log với actor_id + target_user_id
    try {
      await AuthLog.create({
        userId: req.user._id,           // Actor: Admin
        action: 'ADMIN_STATUS_CHANGE',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        note: `${statusNote}. Target: ${targetUser._id} (${targetUser.email})`,
      });
    } catch (logErr) {
      console.error(`[AuthLog] Không thể ghi log: ${logErr.message}`);
    }

    res.status(200).json({
      message: `${statusNote} thành công.`,
      userId: targetUser._id,
      isActive: targetUser.isActive,
    });
  } catch (error) {
    console.error(`[Admin] Lỗi setUserStatus: ${error.stack}`);
    res.status(500).json({ message: 'Thao tác thất bại. Vui lòng thử lại sau.' });
  }
};

module.exports = { listUsers, createUser, updateUser, setUserStatus };
