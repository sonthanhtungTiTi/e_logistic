const path = require('path');
const fs = require('fs');
const kycService = require('../services/kyc.service');
const { submitKycSchema, rejectKycSchema } = require('../validations/kyc.validation');
const { KYC_UPLOAD_DIR } = require('../middleware/upload.middleware');

// @desc    Seller nộp hồ sơ KYC (CCCD 2 mặt + GPKD tùy chọn)
// @route   POST /api/seller/kyc/submit
// @access  Private (SELLER)
const submitKyc = async (req, res, next) => {
  try {
    const { error, value } = submitKycSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: error.details.map((d) => d.message).join('; '),
      });
    }

    const meta = {
      ipAddress: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
    };

    const result = await kycService.submitKyc(req.user._id, value, req.files, meta);

    return res.status(201).json({
      success: true,
      message: 'Nộp hồ sơ xác minh KYC thành công. Đang chờ Admin phê duyệt.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Seller xem trạng thái hồ sơ KYC
// @route   GET /api/seller/kyc/status
// @access  Private (SELLER)
const getKycStatus = async (req, res, next) => {
  try {
    const result = await kycService.getKycStatus(req.user._id);
    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin trạng thái KYC thành công',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin/CS xem danh sách hồ sơ KYC đang PENDING (che PII)
// @route   GET /api/admin/kyc/pending
// @access  Private (ADMIN, CS)
const listPendingKyc = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const result = await kycService.listPendingKyc({ page, limit });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách hồ sơ KYC chờ duyệt thành công',
      data: result.items,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin/CS lấy số lượng hồ sơ KYC đang chờ duyệt (realtime count)
// @route   GET /api/admin/kyc/pending-count
// @access  Private (ADMIN, CS)
const getPendingKycCount = async (req, res, next) => {
  try {
    const count = await kycService.countPendingKyc();
    return res.status(200).json({
      success: true,
      count,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin/CS xem chi tiết 1 hồ sơ KYC (hiện đầy đủ số CCCD và ảnh)
// @route   GET /api/admin/kyc/:sellerId
// @access  Private (ADMIN, CS)
const getKycDetail = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const result = await kycService.getKycDetail(sellerId);

    return res.status(200).json({
      success: true,
      message: 'Lấy chi tiết hồ sơ KYC thành công',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin/CS Duyệt hồ sơ KYC
// @route   POST /api/admin/kyc/:sellerId/approve
// @access  Private (ADMIN, CS)
const approveKyc = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const meta = {
      ipAddress: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
    };

    const result = await kycService.approveKyc(sellerId, req.user._id, meta);

    return res.status(200).json({
      success: true,
      message: 'Duyệt hồ sơ KYC thành công. Tài khoản Seller đã được kích hoạt tính năng tạo đơn hàng.',
      data: {
        sellerId: result.sellerId,
        status: result.status,
        reviewedAt: result.reviewedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin/CS Từ chối hồ sơ KYC (kèm lý do)
// @route   POST /api/admin/kyc/:sellerId/reject
// @access  Private (ADMIN, CS)
const rejectKyc = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const { error, value } = rejectKycSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: error.details[0].message,
      });
    }

    const meta = {
      ipAddress: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
    };

    const result = await kycService.rejectKyc(sellerId, req.user._id, value.reason, meta);

    return res.status(200).json({
      success: true,
      message: 'Đã từ chối hồ sơ KYC.',
      data: {
        sellerId: result.sellerId,
        status: result.status,
        rejectionReason: result.rejectionReason,
        reviewedAt: result.reviewedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Truy xuất file ảnh KYC an toàn chống IDOR
// @route   GET /api/kyc/files/:filename
// @access  Private (Chỉ Seller sở hữu ảnh HOẶC Admin/CS)
const getKycFile = async (req, res, next) => {
  try {
    const { filename } = req.params;

    // Ngăn chặn path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(KYC_UPLOAD_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        code: 'FILE_NOT_FOUND',
        message: 'Không tìm thấy tệp tin tài liệu KYC',
      });
    }

    // Kiểm tra quyền truy cập chống IDOR
    const hasAccess = await kycService.verifyFileAccess(safeFilename, req.user);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        code: 'ACCESS_DENIED',
        message: 'Bạn không có quyền xem hoặc tải tài liệu của người khác',
      });
    }

    // Set Cache-Control private để ngăn chặn proxy/CDN cache dữ liệu nhạy cảm
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitKyc,
  submitKycDocument: submitKyc,
  getKycStatus,
  listPendingKyc,
  getPendingKycCount,
  getKycDetail,
  approveKyc,
  reviewKycDocument: approveKyc,
  rejectKyc,
  getKycFile,
};
