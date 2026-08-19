const mongoose = require('mongoose');

const kycDocumentSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: ['BUSINESS_LICENSE', 'ID_CARD_FRONT', 'ID_CARD_BACK', 'TAX_CERTIFICATE'],
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING_KYC', 'VERIFIED_KYC', 'REJECTED_KYC'],
      default: 'PENDING_KYC',
      index: true,
    },
    rejectReason: {
      type: String,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

kycDocumentSchema.index({ sellerId: 1, documentType: 1, status: 1 });

module.exports = mongoose.model('KycDocument', kycDocumentSchema);
