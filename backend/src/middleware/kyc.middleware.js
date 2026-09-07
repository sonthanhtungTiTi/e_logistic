const requireVerifiedKyc = (req, res, next) => {
  if (req.user && req.user.role === 'SELLER') {
    const isVerified =
      req.user.kycVerified === true ||
      req.user.kycStatus === 'APPROVED' ||
      req.user.kycStatus === 'VERIFIED_KYC';

    if (!isVerified) {
      return res.status(403).json({
        success: false,
        code: 'KYC_REQUIRED',
        message: 'Cần hoàn tất xác minh KYC trước khi tạo đơn',
        kycStatus: req.user.kycStatus || 'NOT_SUBMITTED',
      });
    }
  }
  next();
};

module.exports = { requireVerifiedKyc };

