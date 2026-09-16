const AppError = require('../utils/AppError');
const User = require('../models/user.model');

const CS_LEVEL_ORDER = {
  L1: 1,
  L2: 2,
  LEAD: 3,
  ADMIN: 4,
};

/**
 * Middleware enforcing minimum CS Level requirement.
 * Checks user role and csLevel fetched fresh from DB or attached to req.user.
 */
const requireCsLevel = (minLevel = 'L1') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError(401, 'UNAUTHORIZED', 'Bạn cần đăng nhập để thực hiện thao tác này'));
      }

      // Admin bypasses CS level restrictions
      if (req.user.role === 'ADMIN') {
        return next();
      }

      // Must be CS / CUSTOMER_SERVICE
      if (!['CS', 'CUSTOMER_SERVICE'].includes(req.user.role)) {
        return next(new AppError(403, 'FORBIDDEN', 'Thao tác chỉ dành cho nhân viên bộ phận CSKH'));
      }

      // Fetch fresh user from DB to prevent stale JWT claims
      const freshUser = await User.findById(req.user._id).select('csLevel role isActive');
      if (!freshUser || !freshUser.isActive) {
        return next(new AppError(401, 'USER_INACTIVE', 'Tài khoản của bạn đã bị khóa hoặc không tồn tại'));
      }

      const userLevel = freshUser.csLevel || 'L1';
      req.user.csLevel = userLevel;

      const minVal = CS_LEVEL_ORDER[minLevel] || 1;
      const userVal = CS_LEVEL_ORDER[userLevel] || 1;

      if (userVal < minVal) {
        return next(
          new AppError(
            403,
            'INSUFFICIENT_CS_LEVEL',
            `Thao tác yêu cầu cấp độ CS tối thiểu là '${minLevel}', cấp độ hiện tại của bạn là '${userLevel}'`
          )
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  requireCsLevel,
  CS_LEVEL_ORDER,
};
