const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const protect = async (req, res, next) => {
  let token;

  // Lấy token từ header Authorization (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
        return res.status(401).json({ message: 'Không được ủy quyền, token không hợp lệ hoặc chưa đăng nhập' });
      }

      if (!process.env.JWT_SECRET) {
        throw new Error('Thiếu cấu hình JWT_SECRET trong biến môi trường');
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Chống nhầm lẫn: Không cho phép dùng Refresh Token thay cho Access Token
      if (decoded.type && decoded.type !== 'access') {
        return res.status(401).json({ message: 'Không được ủy quyền, yêu cầu Access Token hợp lệ' });
      }

      // Gán user vào request (Không lấy password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Tài khoản không tồn tại.' });
      }

      // Hậu điều kiện ĐT (Quản lý người dùng): Nếu Admin vừa khóa/vô hiệu hóa tài khoản,
      // access token cũ bị từ chối ngay lập tức ở lần gọi API kế tiếp.
      if (!req.user.isActive) {
        return res.status(403).json({ message: 'Tài khoản đã bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ quản trị viên.' });
      }

      return next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.' });
      }
      console.error('Lỗi xác thực Token:', error);
      return res.status(401).json({ message: 'Không được ủy quyền, token không hợp lệ hoặc đã hết hạn' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Không được ủy quyền, không có token' });
  }
};

// Middleware xác định Seller ID hiệu lực (cho tài khoản chính lẫn tài khoản phụ sub-account)
const resolveSellerContext = (req, res, next) => {
  if (req.user) {
    req.effectiveSellerId = req.user.parentSellerId || req.user._id;
  }
  next();
};

// Middleware kiểm tra quyền cụ thể của tài khoản phụ
const requirePermission = (permission) => {
  return (req, res, next) => {
    // Tài khoản Seller gốc (không phải sub-account) luôn có full quyền
    if (!req.user.parentSellerId) return next();

    if (!req.user.subAccountPermissions || !req.user.subAccountPermissions.includes(permission)) {
      return res.status(403).json({ message: `Tài khoản phụ không có quyền thực hiện thao tác: ${permission}` });
    }
    next();
  };
};

module.exports = { protect, authorize, resolveSellerContext, requirePermission };

