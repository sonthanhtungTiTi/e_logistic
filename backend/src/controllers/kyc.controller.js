const KycDocument = require('../models/kyc.model');
const User = require('../models/user.model');
const Joi = require('joi');
const mongoose = require('mongoose');

// @desc    Seller nộp hồ sơ KYC
// @route   POST /api/kyc/submit
// @access  Private (SELLER)
const submitKycDocument = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const schema = Joi.object({
      documentType: Joi.string()
        .valid('BUSINESS_LICENSE', 'ID_CARD_FRONT', 'ID_CARD_BACK', 'TAX_CERTIFICATE')
        .required()
        .messages({ 'any.required': 'Vui lòng chọn loại giấy tờ KYC' }),
      fileUrl: Joi.string().required().messages({ 'any.required': 'Vui lòng tải lên tài liệu / ảnh giấy tờ' }),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      await session.abortTransaction();
      return res.status(400).json({ message: error.details[0].message });
    }

    const { documentType, fileUrl } = req.body;
    const sellerId = req.user._id;

    // Kiểm tra xem đang có bản ghi PENDING cho loại giấy tờ này không
    const existingPending = await KycDocument.findOne({
      sellerId,
      documentType,
      status: 'PENDING_KYC',
    }).session(session);

    if (existingPending) {
      await session.abortTransaction();
      return res.status(409).json({ message: 'Giấy tờ loại này đang chờ Admin duyệt. Không thể nộp lại lúc này.' });
    }

    const doc = await KycDocument.create(
      [
        {
          sellerId,
          documentType,
          fileUrl,
          status: 'PENDING_KYC',
          submittedAt: new Date(),
        },
      ],
      { session }
    );

    // Cập nhật trạng thái tổng quát trên User Schema (denormalized fast check)
    await User.findByIdAndUpdate(sellerId, { kycStatus: 'PENDING_KYC' }, { session });

    await session.commitTransaction();
    res.status(201).json(doc[0]);
  } catch (err) {
    await session.abortTransaction();
    console.error(`[KYC] Lỗi nộp hồ sơ KYC:`, err);
    res.status(500).json({ message: 'Lỗi máy chủ khi nộp hồ sơ KYC' });
  } finally {
    session.endSession();
  }
};

// @desc    Lấy trạng thái và danh sách tài liệu KYC của Seller
// @route   GET /api/kyc/status
// @access  Private (SELLER)
const getKycStatus = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const documents = await KycDocument.find({ sellerId }).sort({ createdAt: -1 });
    const user = await User.findById(sellerId).select('kycStatus companyName taxCode');

    res.json({
      kycStatus: user?.kycStatus || 'NOT_SUBMITTED',
      documents,
    });
  } catch (err) {
    console.error(`[KYC] Lỗi lấy trạng thái KYC:`, err);
    res.status(500).json({ message: 'Không thể lấy thông tin KYC.' });
  }
};

// @desc    Admin duyệt hoặc từ chối tài liệu KYC (Admin workflow)
// @route   PATCH /api/kyc/review/:docId
// @access  Private (ADMIN)
const reviewKycDocument = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { docId } = req.params;
    const { decision, rejectReason } = req.body;

    if (!['VERIFIED_KYC', 'REJECTED_KYC'].includes(decision)) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Quyết định duyệt phải là VERIFIED_KYC hoặc REJECTED_KYC' });
    }

    if (decision === 'REJECTED_KYC' && (!rejectReason || rejectReason.trim() === '')) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Vui lòng cung cấp lý do từ chối hồ sơ' });
    }

    const doc = await KycDocument.findByIdAndUpdate(
      docId,
      {
        status: decision,
        rejectReason: decision === 'REJECTED_KYC' ? rejectReason : null,
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      },
      { new: true, session }
    );

    if (!doc) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Không tìm thấy tài liệu KYC' });
    }

    if (decision === 'VERIFIED_KYC') {
      const requiredTypes = ['BUSINESS_LICENSE', 'ID_CARD_FRONT', 'ID_CARD_BACK'];
      const verifiedDocs = await KycDocument.find({
        sellerId: doc.sellerId,
        documentType: { $in: requiredTypes },
        status: 'VERIFIED_KYC',
      }).session(session);

      const allVerified = requiredTypes.every((t) => verifiedDocs.some((d) => d.documentType === t));
      if (allVerified) {
        await User.findByIdAndUpdate(doc.sellerId, { kycStatus: 'VERIFIED_KYC' }, { session });
      }
    } else {
      await User.findByIdAndUpdate(doc.sellerId, { kycStatus: 'REJECTED_KYC' }, { session });
    }

    await session.commitTransaction();
    res.json({ message: 'Duyện hồ sơ KYC thành công', document: doc });
  } catch (err) {
    await session.abortTransaction();
    console.error(`[KYC Admin] Lỗi duyệt hồ sơ KYC:`, err);
    res.status(500).json({ message: 'Lỗi khi xử lý duyệt hồ sơ KYC' });
  } finally {
    session.endSession();
  }
};

module.exports = {
  submitKycDocument,
  getKycStatus,
  reviewKycDocument,
};
