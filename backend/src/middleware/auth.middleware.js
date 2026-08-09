const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const protect = async (req, res, next) => {
  let token;

  // Lấy token từ header Authorization (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

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

      next();
    } catch (error) {
      console.error('Lỗi xác thực Token:', error);
      res.status(401).json({ message: 'Không được ủy quyền, token không hợp lệ hoặc đã hết hạn' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Không được ủy quyền, không có token' });
  }

};

// Middleware kiểm tra quyền (Role-based access control)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Vai trò ${req.user.role} không có quyền truy cập tính năng này` });
    }
    next();
  };
};

module.exports = { protect, authorize };
