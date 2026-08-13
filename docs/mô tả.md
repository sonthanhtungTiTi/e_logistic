Dưới đây là nguyên văn từng hàm từ code thật:

1. Hàm forgotPassword, verifyOtp, resetPassword (từ auth.controller.js)
javascript
// ============================================================
// UC Quên mật khẩu
[ignoring loop detection]

Dưới đây là nguyên văn từng hàm từ code thật (đã được trích xuất trực tiếp từ các file):

1. Hàm forgotPassword, verifyOtp, resetPassword (File: auth.controller.js)
javascript
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
2. Hàm changePassword (File: auth.controller.js)
javascript
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
    // Nếu mật khẩu đúng, reset bộ đếm sai
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    
    // Bước 8 ĐT: Cập nhật mật khẩu mới (pre-save hook sẽ hash)
    user.password = newPassword;
    // Đánh dấu đã đổi mật khẩu (hữu ích cho tài khoản nhân viên mới tạo)
    if (user.mustChangePassword) {
      user.mustChangePassword = false;
    }
    // Ex 8.1 ĐT: Xử lý lỗi hệ thống khi lưu
    try {
      await user.save();
    } catch (saveError) {
      console.error(`[ChangePassword] Lỗi lưu thay đổi: ${saveError.stack}`);
      return res.status(500).json({ message: 'Đổi mật khẩu thất bại. Vui lòng thử lại sau.' });
    }
    // Bước 9 ĐT: Hủy toàn bộ các phiên đăng nhập khác (xóa refreshToken)
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    // Ghi nhận Audit Log
    try {
      await AuthLog.create({
        userId: user._id,
        action: 'PASSWORD_CHANGED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        note: 'Đổi mật khẩu từ trang Hồ sơ cá nhân',
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
3. Hàm updateUserProfile (File: auth.controller.js)
javascript
// ============================================================
// UC Cập nhật hồ sơ cá nhân
// @desc    Chỉnh sửa thông tin cá nhân của chính người dùng đang đăng nhập
// @route   PUT /api/auth/profile
// @access  Private
// ============================================================
const updateUserProfile = async (req, res) => {
  try {
    // Bước 5 ĐT: WHITELIST — chỉ chấp nhận đúng những trường này
    // Không bao giờ nhận: role, isActive, refreshToken, failedLoginAttempts, lockUntil
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
      // Mật khẩu mới (tùy chọn — nếu có mới xử lý ở bước 7)
      newPassword: Joi.string().min(6).optional().messages({
        'string.min': 'Mật khẩu mới phải từ 6 ký tự'
      }),
    });
    // Alt 5.1 ĐT: Dữ liệu sai định dạng
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    // Không có gì để cập nhật
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'Vui lòng cung cấp ít nhất một trường cần cập nhật.' });
    }
    const { fullName, phoneNumber, email, newPassword } = req.body;
    // Lấy user kèm password (để so sánh mật khẩu ở bước 7 nếu cần)
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }
    // Bước 6 ĐT: Kiểm tra trùng lặp Email/SĐT với tài khoản khác
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
    // Bước 7 ĐT: Nếu có đổi mật khẩu — kiểm tra mật khẩu mới không trùng mật khẩu hiện tại
    if (newPassword) {
      const isSame = await user.matchPassword(newPassword);
      if (isSame) {
        // Alt 7.1 ĐT: Mật khẩu mới trùng mật khẩu hiện tại
        return res.status(400).json({ message: 'Mật khẩu không hợp lệ, không được trùng với mật khẩu hiện tại.' });
      }
      // pre-save hook sẽ tự động hash nếu isModified('password')
      user.password = newPassword;
    }
    // Bước 8 ĐT: Áp dụng các thay đổi được phép
    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    // Ex 8.1 ĐT: Lỗi lưu vào CSDL
    // Ex 8.2 ĐT: Race Condition — E11000
    try {
      await user.save();
    } catch (saveError) {
      if (saveError.code === 11000) {
        // Phân tích trường bị trùng để thông báo đúng (Alt 6.1)
        const duplicatedField = Object.keys(saveError.keyPattern)[0];
        const fieldName = duplicatedField === 'email' ? 'Email' : 'Số điện thoại';
        return res.status(400).json({ message: `${fieldName} này đã được sử dụng bởi tài khoản khác.` });
      }
      console.error(`[UpdateProfile] Lỗi lưu hồ sơ: ${saveError.stack}`);
      return res.status(500).json({ message: 'Cập nhật hồ sơ thất bại. Vui lòng thử lại sau.' });
    }
    // Bước 9 ĐT: Thông báo thành công + trả dữ liệu mới
    res.status(200).json({
      message: 'Cập nhật hồ sơ thành công.',
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(`Lỗi cập nhật hồ sơ: ${error.stack}`);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ, vui lòng thử lại sau.' });
  }
};
4. Hàm setUserStatus (File: admin.controller.js)
javascript
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