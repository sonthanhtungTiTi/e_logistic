const Kyc = require('../models/kyc.model');
const User = require('../models/user.model');
const KycLog = require('../models/kycLog.model');
const ioSingleton = require('../lib/ioSingleton');

/**
 * Hàm che mờ một phần số CCCD/CMND để bảo vệ PII trong danh sách tổng quan
 * Ví dụ: 079099123456 -> 079099******56
 */
const maskIdNumber = (idNumber) => {
  if (!idNumber) return '';
  const clean = idNumber.trim();
  if (clean.length <= 6) return clean.replace(/.(?=.{2})/g, '*');
  const start = clean.slice(0, 4);
  const end = clean.slice(-2);
  const maskedLength = Math.max(clean.length - 6, 4);
  return `${start}${'*'.repeat(maskedLength)}${end}`;
};

/**
 * Seller nộp hồ sơ KYC (lần đầu hoặc nộp lại)
 * Tuân thủ nghiêm ngặt State Machine & Atomic Update & Whitelist
 */
const submitKyc = async (sellerId, payload, files, meta = {}) => {
  if (!files?.idFrontImage?.[0] || !files?.idBackImage?.[0]) {
    const err = new Error('Vui lòng tải lên đầy đủ 2 mặt ảnh CCCD/CMND (mặt trước và mặt sau)');
    err.statusCode = 400;
    err.code = 'MISSING_REQUIRED_FILES';
    throw err;
  }

  const existingKyc = await Kyc.findOne({ sellerId });

  // Kiểm tra trạng thái hiện tại: chỉ cho phép nộp khi NOT_SUBMITTED hoặc REJECTED
  if (existingKyc) {
    if (existingKyc.status === 'PENDING') {
      const err = new Error('Hồ sơ xác minh KYC của bạn đang được Admin xem xét. Không thể nộp lại lúc này.');
      err.statusCode = 409;
      err.code = 'KYC_ALREADY_SUBMITTED';
      throw err;
    }
    if (existingKyc.status === 'APPROVED') {
      const err = new Error('Tài khoản của bạn đã được xác thực KYC thành công. Hồ sơ đã được bảo vệ và khóa cập nhật.');
      err.statusCode = 409;
      err.code = 'KYC_ALREADY_APPROVED';
      throw err;
    }
  }

  const now = new Date();
  const idFrontFilename = files.idFrontImage[0].filename;
  const idBackFilename = files.idBackImage[0].filename;
  const businessLicenseFilename = files.businessLicenseImage?.[0]?.filename || null;

  // Mass Assignment Protection: Whitelist tuyệt đối
  const whitelistFields = {
    idType: payload.idType || 'CCCD',
    idNumber: payload.idNumber.trim(),
    idFullName: payload.idFullName.trim().toUpperCase(),
    idFrontImageUrl: idFrontFilename,
    idBackImageUrl: idBackFilename,
    businessLicenseImageUrl: businessLicenseFilename,
    status: 'PENDING',
    submittedAt: now,
    rejectionReason: null,
  };

  let kycRecord;
  let oldStatus = 'NOT_SUBMITTED';

  if (!existingKyc) {
    // Tạo mới bản ghi KYC đầu tiên
    kycRecord = await Kyc.create({
      sellerId,
      ...whitelistFields,
      submissionCount: 1,
      history: [],
    });
  } else {
    oldStatus = existingKyc.status;

    // Chụp snapshot trạng thái cũ trước khi ghi đè để bảo toàn history
    const oldSnapshot = {
      status: existingKyc.status,
      idType: existingKyc.idType,
      idNumber: existingKyc.idNumber,
      idFullName: existingKyc.idFullName,
      idFrontImageUrl: existingKyc.idFrontImageUrl,
      idBackImageUrl: existingKyc.idBackImageUrl,
      businessLicenseImageUrl: existingKyc.businessLicenseImageUrl,
      submittedAt: existingKyc.submittedAt,
      reviewedBy: existingKyc.reviewedBy,
      reviewedAt: existingKyc.reviewedAt,
      rejectionReason: existingKyc.rejectionReason,
      recordedAt: now,
    };

    // Atomic update chuyển từ NOT_SUBMITTED hoặc REJECTED -> PENDING
    kycRecord = await Kyc.findOneAndUpdate(
      { sellerId, status: { $in: ['NOT_SUBMITTED', 'REJECTED'] } },
      {
        $set: whitelistFields,
        $inc: { submissionCount: 1 },
        $push: { history: oldSnapshot },
      },
      { returnDocument: 'after' }
    );

    if (!kycRecord) {
      const err = new Error('Không thể chuyển đổi trạng thái hồ sơ KYC (trạng thái đã thay đổi hoặc đang được xử lý)');
      err.statusCode = 409;
      err.code = 'KYC_TRANSITION_FAILED';
      throw err;
    }
  }

  // Cập nhật trạng thái tổng quát trên User Schema
  await User.findByIdAndUpdate(sellerId, {
    kycStatus: 'PENDING',
    kycVerified: false,
  });

  // Ghi Audit Log độc lập
  await KycLog.create({
    kycId: kycRecord._id,
    sellerId,
    actionBy: sellerId,
    action: oldStatus === 'REJECTED' ? 'RESUBMIT' : 'SUBMIT',
    oldStatus,
    newStatus: 'PENDING',
    note: `Seller nộp hồ sơ KYC (lần ${kycRecord.submissionCount})`,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  // Gửi Realtime Notification cho Admin Dashboard & Sidebar
  try {
    const pendingCount = await Kyc.countDocuments({ status: 'PENDING' });
    ioSingleton.emitKycUpdate({
      type: 'NEW_SUBMISSION',
      sellerId,
      shopName: payload.idFullName || 'Seller',
      pendingCount,
      submittedAt: now,
    });
  } catch (emitErr) {
    console.warn('[KYC_EMIT_WARN]', emitErr.message);
  }

  return {
    status: kycRecord.status,
    submittedAt: kycRecord.submittedAt,
    submissionCount: kycRecord.submissionCount,
  };
};

/**
 * Lấy trạng thái KYC của Seller đang đăng nhập
 */
const getKycStatus = async (sellerId) => {
  const kyc = await Kyc.findOne({ sellerId });
  const user = await User.findById(sellerId).select('kycStatus kycVerified fullName companyName phoneNumber');

  if (!kyc) {
    return {
      status: user?.kycStatus || 'NOT_SUBMITTED',
      kycVerified: !!user?.kycVerified,
      submissionCount: 0,
      canResubmit: true,
      data: null,
    };
  }

  return {
    status: kyc.status,
    kycVerified: kyc.status === 'APPROVED',
    idType: kyc.idType,
    idFullName: kyc.idFullName,
    maskedIdNumber: maskIdNumber(kyc.idNumber),
    submittedAt: kyc.submittedAt,
    reviewedAt: kyc.reviewedAt,
    rejectionReason: kyc.rejectionReason,
    submissionCount: kyc.submissionCount,
    canResubmit: ['NOT_SUBMITTED', 'REJECTED'].includes(kyc.status),
    hasBusinessLicense: !!kyc.businessLicenseImageUrl,
    // Trả về URL file nếu là chính chủ (đi qua protected route)
    idFrontImageUrl: `/api/kyc/files/${kyc.idFrontImageUrl}`,
    idBackImageUrl: `/api/kyc/files/${kyc.idBackImageUrl}`,
    businessLicenseImageUrl: kyc.businessLicenseImageUrl
      ? `/api/kyc/files/${kyc.businessLicenseImageUrl}`
      : null,
  };
};

/**
 * Admin/CS lấy danh sách hồ sơ PENDING phân trang (che PII)
 */
const listPendingKyc = async ({ page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;

  const [kycDocs, total] = await Promise.all([
    Kyc.find({ status: 'PENDING' })
      .populate('sellerId', 'fullName companyName phoneNumber email address')
      .sort({ submittedAt: 1 }) // Ưu tiên hồ sơ nộp trước duyệt trước (FIFO)
      .skip(skip)
      .limit(limit)
      .lean(),
    Kyc.countDocuments({ status: 'PENDING' }),
  ]);

  // Tính toán runtime duplicateIdWarning cho từng hồ sơ
  const itemsWithDuplicates = await Promise.all(
    kycDocs.map(async (doc) => {
      const duplicateCount = await Kyc.countDocuments({
        idNumber: doc.idNumber,
        sellerId: { $ne: doc.sellerId?._id || doc.sellerId },
        status: { $in: ['PENDING', 'APPROVED'] },
      });

      return {
        _id: doc._id,
        sellerId: doc.sellerId?._id || doc.sellerId,
        shopName: doc.sellerId?.companyName || doc.sellerId?.fullName || 'Chưa đặt tên Shop',
        sellerFullName: doc.sellerId?.fullName || '',
        phoneNumber: doc.sellerId?.phoneNumber || '',
        email: doc.sellerId?.email || '',
        idType: doc.idType,
        idFullName: doc.idFullName,
        maskedIdNumber: maskIdNumber(doc.idNumber), // Che PII
        submittedAt: doc.submittedAt,
        submissionCount: doc.submissionCount,
        hasBusinessLicense: !!doc.businessLicenseImageUrl,
        duplicateIdWarning: duplicateCount > 0,
        duplicateCount,
      };
    })
  );

  return {
    items: itemsWithDuplicates,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Admin/CS xem chi tiết 1 hồ sơ KYC (hiện đầy đủ số CCCD và ảnh)
 */
const getKycDetail = async (sellerId) => {
  const kyc = await Kyc.findOne({ sellerId })
    .populate('sellerId', 'fullName companyName phoneNumber email address businessType taxCode')
    .populate('reviewedBy', 'fullName email')
    .lean();

  if (!kyc) {
    const err = new Error('Không tìm thấy hồ sơ KYC của người bán này');
    err.statusCode = 404;
    err.code = 'KYC_NOT_FOUND';
    throw err;
  }

  // Kiểm tra trùng lặp số CCCD runtime (trả về danh sách shop trùng để Admin đối chiếu)
  const duplicateRecords = await Kyc.find({
    idNumber: kyc.idNumber,
    sellerId: { $ne: kyc.sellerId?._id || kyc.sellerId },
  })
    .populate('sellerId', 'fullName companyName phoneNumber')
    .select('sellerId status submittedAt reviewedAt')
    .lean();

  return {
    ...kyc,
    idFrontImageUrl: `/api/kyc/files/${kyc.idFrontImageUrl}`,
    idBackImageUrl: `/api/kyc/files/${kyc.idBackImageUrl}`,
    businessLicenseImageUrl: kyc.businessLicenseImageUrl
      ? `/api/kyc/files/${kyc.businessLicenseImageUrl}`
      : null,
    duplicateIdWarning: duplicateRecords.length > 0,
    duplicateShops: duplicateRecords.map((r) => ({
      sellerId: r.sellerId?._id,
      shopName: r.sellerId?.companyName || r.sellerId?.fullName,
      phoneNumber: r.sellerId?.phoneNumber,
      status: r.status,
    })),
  };
};

/**
 * Admin/CS Duyệt hồ sơ KYC (Approve)
 * Atomic update: PENDING -> APPROVED
 */
const approveKyc = async (sellerId, reviewerId, meta = {}) => {
  const now = new Date();

  // Atomic update: Chỉ cho phép duyệt nếu đang ở trạng thái PENDING
  const updatedKyc = await Kyc.findOneAndUpdate(
    { sellerId, status: 'PENDING' },
    {
      $set: {
        status: 'APPROVED',
        reviewedBy: reviewerId,
        reviewedAt: now,
        rejectionReason: null,
      },
    },
    { returnDocument: 'after' }
  );

  if (!updatedKyc) {
    const current = await Kyc.findOne({ sellerId });
    const err = new Error(
      current
        ? `Không thể duyệt hồ sơ vì trạng thái hiện tại là ${current.status} (chỉ có thể duyệt khi PENDING)`
        : 'Không tìm thấy hồ sơ KYC để duyệt'
    );
    err.statusCode = 409;
    err.code = 'KYC_INVALID_STATE';
    throw err;
  }

  // Denormalize kycVerified = true lên User để kyc.middleware.js đọc nhanh O(1)
  await User.findByIdAndUpdate(sellerId, {
    kycStatus: 'APPROVED',
    kycVerified: true,
  });

  // Ghi Audit Log
  await KycLog.create({
    kycId: updatedKyc._id,
    sellerId,
    actionBy: reviewerId,
    action: 'APPROVE',
    oldStatus: 'PENDING',
    newStatus: 'APPROVED',
    note: 'Admin/CS phê duyệt hồ sơ KYC',
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  // Gửi Realtime Notification cập nhật số lượng hồ sơ chờ duyệt
  try {
    const pendingCount = await Kyc.countDocuments({ status: 'PENDING' });
    ioSingleton.emitKycUpdate({
      type: 'APPROVED',
      sellerId,
      pendingCount,
    });
  } catch (emitErr) {
    console.warn('[KYC_EMIT_WARN]', emitErr.message);
  }

  return updatedKyc;
};

/**
 * Admin/CS Từ chối hồ sơ KYC (Reject kèm lý do bắt buộc)
 * Atomic update: PENDING -> REJECTED
 */
const rejectKyc = async (sellerId, reviewerId, reason, meta = {}) => {
  if (!reason || reason.trim().length === 0) {
    const err = new Error('Lý do từ chối hồ sơ là bắt buộc');
    err.statusCode = 400;
    err.code = 'REASON_REQUIRED';
    throw err;
  }

  const now = new Date();

  // Atomic update: Chỉ cho phép từ chối nếu đang ở trạng thái PENDING
  const updatedKyc = await Kyc.findOneAndUpdate(
    { sellerId, status: 'PENDING' },
    {
      $set: {
        status: 'REJECTED',
        reviewedBy: reviewerId,
        reviewedAt: now,
        rejectionReason: reason.trim(),
      },
    },
    { returnDocument: 'after' }
  );

  if (!updatedKyc) {
    const current = await Kyc.findOne({ sellerId });
    const err = new Error(
      current
        ? `Không thể từ chối hồ sơ vì trạng thái hiện tại là ${current.status} (chỉ có thể từ chối khi PENDING)`
        : 'Không tìm thấy hồ sơ KYC để từ chối'
    );
    err.statusCode = 409;
    err.code = 'KYC_INVALID_STATE';
    throw err;
  }

  // Cập nhật User model
  await User.findByIdAndUpdate(sellerId, {
    kycStatus: 'REJECTED',
    kycVerified: false,
  });

  // Ghi Audit Log
  await KycLog.create({
    kycId: updatedKyc._id,
    sellerId,
    actionBy: reviewerId,
    action: 'REJECT',
    oldStatus: 'PENDING',
    newStatus: 'REJECTED',
    reason: reason.trim(),
    note: 'Admin/CS từ chối hồ sơ KYC',
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  // Gửi Realtime Notification cập nhật số lượng hồ sơ chờ duyệt
  try {
    const pendingCount = await Kyc.countDocuments({ status: 'PENDING' });
    ioSingleton.emitKycUpdate({
      type: 'REJECTED',
      sellerId,
      pendingCount,
    });
  } catch (emitErr) {
    console.warn('[KYC_EMIT_WARN]', emitErr.message);
  }

  return updatedKyc;
};

/**
 * Đếm tổng số lượng hồ sơ KYC đang chờ xử lý (PENDING)
 */
const countPendingKyc = async () => {
  return Kyc.countDocuments({ status: 'PENDING' });
};

/**
 * Kiểm tra quyền truy cập file ảnh KYC (Anti-IDOR)
 */
const verifyFileAccess = async (filename, user) => {
  if (!user || !filename) return false;

  // Admin và CS có quyền xem tất cả ảnh KYC để thẩm định
  if (['ADMIN', 'CS'].includes(user.role)) {
    return true;
  }

  // Seller chỉ được xem ảnh thuộc hồ sơ KYC của chính mình
  if (user.role === 'SELLER') {
    const sellerKyc = await Kyc.findOne({
      sellerId: user._id,
      $or: [
        { idFrontImageUrl: filename },
        { idBackImageUrl: filename },
        { businessLicenseImageUrl: filename },
        { 'history.idFrontImageUrl': filename },
        { 'history.idBackImageUrl': filename },
        { 'history.businessLicenseImageUrl': filename },
      ],
    });
    return !!sellerKyc;
  }

  return false;
};

module.exports = {
  submitKyc,
  getKycStatus,
  listPendingKyc,
  countPendingKyc,
  getKycDetail,
  approveKyc,
  rejectKyc,
  verifyFileAccess,
  maskIdNumber,
};
