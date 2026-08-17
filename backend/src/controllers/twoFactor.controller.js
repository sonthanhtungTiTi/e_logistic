const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const AuthLog = require('../models/authLog.model');

// Helper sinh Access & Refresh token giống auth.controller.js
const generateAccessToken = (id) => {
  return jwt.sign({ id, type: 'access' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
};
const generateRefreshToken = (id) => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  return jwt.sign({ id, type: 'refresh' }, secret, { expiresIn: '7d' });
};

// @desc    Bước 1: Sinh Secret 2FA và Mã QR (Chưa kích hoạt 2FA)
// @route   POST /api/auth/2fa/setup
// @access  Private
const setupTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const secret = speakeasy.generateSecret({
      name: `E-Logistic Platform (${user.email})`,
    });

    user.twoFactorSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      qrCodeUrl,
      manualEntryKey: secret.base32,
    });
  } catch (error) {
    console.error(`[2FA Setup Error]:`, error);
    res.status(500).json({ message: 'Không thể thiết lập 2FA.' });
  }
};

// @desc    Bước 2: Xác nhận mã 6 số từ app Authenticator ➔ Kích hoạt 2FA + cấp Backup codes
// @route   POST /api/auth/2fa/verify-enable
// @access  Private
const verifyAndEnableTwoFactor = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Vui lòng nhập mã 6 số từ ứng dụng xác thực Authenticator' });

    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ message: 'Chưa thực hiện khởi tạo bí danh 2FA' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1, // Cho phép lệch ±30 giây
    });

    if (!verified) {
      return res.status(400).json({ message: 'Mã xác thực 2FA không chính xác' });
    }

    // Sinh 10 Mã dự phòng (Backup Codes)
    const backupCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));
    const hashedCodes = await Promise.all(backupCodes.map((code) => bcrypt.hash(code, 10)));

    user.twoFactorEnabled = true;
    user.twoFactorBackupCodes = hashedCodes;
    await user.save();

    await AuthLog.create({
      userId: user._id,
      action: '2FA_ENABLED',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    // Trả backup codes 1 LẦN DUY NHẤT để Seller sao lưu
    res.json({
      message: 'Kích hoạt Bảo mật 2 lớp (2FA) thành công!',
      backupCodes,
    });
  } catch (error) {
    console.error(`[2FA Enable Error]:`, error);
    res.status(500).json({ message: 'Lỗi kích hoạt 2FA' });
  }
};

// @desc    Bước 3: Xác thực 2FA / Backup code ở luồng đăng nhập (với Temp Token)
// @route   POST /api/auth/2fa/login-step2
// @access  Public (với tempToken)
const loginStep2_verifyTotp = async (req, res) => {
  try {
    const { tempToken, totpCode } = req.body;
    if (!tempToken || !totpCode) {
      return res.status(400).json({ message: 'Thiếu Temp Token hoặc Mã TOTP' });
    }

    const tempSecret = process.env.JWT_TEMP_SECRET || process.env.JWT_SECRET || 'temp_secret';
    let decoded;
    try {
      decoded = jwt.verify(tempToken, tempSecret);
    } catch (err) {
      return res.status(401).json({ message: 'Phiên xác thực 2FA đã hết hạn. Vui lòng đăng nhập lại từ đầu.' });
    }

    const user = await User.findById(decoded.userId).select('+twoFactorSecret +twoFactorBackupCodes');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    let verified = false;

    // Kiểm tra mã TOTP ứng dụng
    if (user.twoFactorSecret) {
      verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: totpCode,
        window: 1,
      });
    }

    // Nếu không khớp TOTP, kiểm tra xem có phải Mã dự phòng (Backup Code) không
    if (!verified && user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
      for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
        const isBackupMatch = await bcrypt.compare(totpCode, user.twoFactorBackupCodes[i]);
        if (isBackupMatch) {
          verified = true;
          // Xóa mã dự phòng đã dùng (chỉ được dùng 1 lần)
          user.twoFactorBackupCodes.splice(i, 1);
          await user.save();
          break;
        }
      }
    }

    if (!verified) {
      return res.status(401).json({ message: 'Mã xác thực 2FA hoặc Mã dự phòng không đúng.' });
    }

    // Đăng nhập thành công ➔ Sinh JWT Access & Refresh Token chính thức
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    await AuthLog.create({
      userId: user._id,
      action: 'LOGIN_2FA_SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error(`[2FA Login Error]:`, error);
    res.status(500).json({ message: 'Lỗi máy chủ khi xác thực 2FA' });
  }
};

// @desc    Tắt bảo mật 2FA
// @route   POST /api/auth/2fa/disable
// @access  Private
const disableTwoFactor = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Vui lòng nhập mật khẩu xác nhận để tắt 2FA' });

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Mật khẩu không đúng' });

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = [];
    await user.save();

    await AuthLog.create({
      userId: user._id,
      action: '2FA_DISABLED',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Đã tắt Bảo mật 2 lớp (2FA) thành công.' });
  } catch (error) {
    console.error(`[2FA Disable Error]:`, error);
    res.status(500).json({ message: 'Không thể tắt 2FA' });
  }
};

module.exports = {
  setupTwoFactor,
  verifyAndEnableTwoFactor,
  loginStep2_verifyTotp,
  disableTwoFactor,
};
