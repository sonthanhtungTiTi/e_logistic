const User = require('../models/user.model');
const Order = require('../models/order.model');
const AuthLog = require('../models/authLog.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// @desc    Bước 1: Yêu cầu tự tạm ngưng tài khoản (Kiểm tra các điều kiện ràng buộc)
// @route   POST /api/auth/self-deactivate/request
// @access  Private
const requestSelfDeactivation = async (req, res) => {
  try {
    const sellerId = req.user._id;

    // Check 1: Đơn hàng đang xử lý (chưa hoàn thành / chưa hủy / chưa hoàn)
    let activeOrdersCount = 0;
    try {
      activeOrdersCount = await Order.countDocuments({
        sellerId,
        status: { $nin: ['COMPLETED', 'CANCELLED', 'RETURNED'] },
      });
    } catch (e) {
      console.warn('[SelfDeactivate] Không thể đếm đơn hàng:', e.message);
    }

    if (activeOrdersCount > 0) {
      return res.status(409).json({
        message: `Không thể tạm ngưng tài khoản: Bạn còn ${activeOrdersCount} đơn hàng đang trong quá trình xử lý/giao nhận.`,
        blockingReason: 'ACTIVE_ORDERS',
        count: activeOrdersCount,
      });
    }

    // Check 2: Số dư ví COD còn tồn
    const user = await User.findById(sellerId);
    if (user.walletBalance && user.walletBalance > 0) {
      return res.status(409).json({
        message: `Không thể tạm ngưng tài khoản: Số dư ví COD của bạn còn ${user.walletBalance.toLocaleString('vi-VN')}đ chưa rút hết.`,
        blockingReason: 'PENDING_BALANCE',
        amount: user.walletBalance,
      });
    }

    // Tất cả điều kiện hợp lệ -> Sinh confirmToken tạm thời (TTL 10 phút)
    const tempSecret = process.env.JWT_TEMP_SECRET || process.env.JWT_SECRET || 'temp_secret';
    const confirmToken = jwt.sign(
      { userId: sellerId.toString(), action: 'DEACTIVATE' },
      tempSecret,
      { expiresIn: '10m' }
    );

    res.json({
      message: 'Tài khoản đủ điều kiện tạm ngưng. Vui lòng nhập mật khẩu xác nhận để hoàn tất.',
      confirmToken,
    });
  } catch (error) {
    console.error(`[SelfDeactivate Request Error]:`, error);
    res.status(500).json({ message: 'Không thể thực hiện yêu cầu tạm ngưng tài khoản' });
  }
};

// @desc    Bước 2: Xác thực mật khẩu + Confirm Token ➔ Vô hiệu hóa tài khoản
// @route   POST /api/auth/self-deactivate/confirm
// @access  Private
const confirmSelfDeactivation = async (req, res) => {
  try {
    const { confirmToken, password, reason } = req.body;
    if (!confirmToken || !password) {
      return res.status(400).json({ message: 'Vui lòng cung cấp token xác nhận và mật khẩu.' });
    }

    const tempSecret = process.env.JWT_TEMP_SECRET || process.env.JWT_SECRET || 'temp_secret';
    let decoded;
    try {
      decoded = jwt.verify(confirmToken, tempSecret);
    } catch (e) {
      return res.status(400).json({ message: 'Token xác nhận đã hết hạn hoặc không hợp lệ.' });
    }

    if (decoded.action !== 'DEACTIVATE' || decoded.userId !== req.user._id.toString()) {
      return res.status(400).json({ message: 'Mã xác nhận không khớp với tài khoản hiện tại.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu xác nhận không chính xác.' });
    }

    user.isActive = false;
    user.deactivatedAt = new Date();
    user.deactivationReason = reason || 'SELF_REQUESTED';
    user.refreshToken = undefined;
    await user.save();

    await AuthLog.create({
      userId: user._id,
      action: 'SELF_DEACTIVATED',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      note: `Lý do: ${user.deactivationReason}`,
    });

    res.json({ message: 'Tài khoản đã được tạm ngưng hoạt động thành công.' });
  } catch (error) {
    console.error(`[SelfDeactivate Confirm Error]:`, error);
    res.status(500).json({ message: 'Lỗi khi xác nhận tạm ngưng tài khoản.' });
  }
};

module.exports = {
  requestSelfDeactivation,
  confirmSelfDeactivation,
};
