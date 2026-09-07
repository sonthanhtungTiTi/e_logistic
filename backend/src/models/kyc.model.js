const mongoose = require('mongoose');

const kycHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'],
      required: true,
    },
    idType: {
      type: String,
      enum: ['CCCD', 'CMND', 'PASSPORT'],
    },
    idNumber: String,
    idFullName: String,
    idFrontImageUrl: String,
    idBackImageUrl: String,
    businessLicenseImageUrl: String,
    submittedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: Date,
    rejectionReason: String,
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const kycSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'NOT_SUBMITTED',
    },
    idType: {
      type: String,
      enum: ['CCCD', 'CMND', 'PASSPORT'],
      default: 'CCCD',
    },
    idNumber: {
      type: String,
      trim: true,
    },
    idFullName: {
      type: String,
      trim: true,
    },
    idFrontImageUrl: {
      type: String,
      trim: true,
    },
    idBackImageUrl: {
      type: String,
      trim: true,
    },
    businessLicenseImageUrl: {
      type: String,
      trim: true,
      default: null,
    },
    submittedAt: {
      type: Date,
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
    rejectionReason: {
      type: String,
      default: null,
    },
    submissionCount: {
      type: Number,
      default: 0,
    },
    history: [kycHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Tối ưu truy vấn
kycSchema.index({ status: 1, submittedAt: -1 });
kycSchema.index({ idNumber: 1 });

module.exports = mongoose.model('Kyc', kycSchema);
