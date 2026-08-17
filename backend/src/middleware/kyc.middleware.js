const requireVerifiedKyc = async (req, res, next) => {
  if (req.user && req.user.role === 'SELLER') {
    if (req.user.kycStatus !== 'VERIFIED_KYC') {
      return res.status(403).json({
        message: 'Shop chưa hoàn tất xác minh KYC, không thể thực hiện thao tác này.',
        kycStatus: req.user.kycStatus || 'NOT_SUBMITTED',
      });
    }
  }
  next();
};

module.exports = { requireVerifiedKyc };
