const mongoose = require('mongoose');

const kycLogSchema = new mongoose.Schema(
  {
    kycId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kyc',
      required: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['SUBMIT', 'APPROVE', 'REJECT', 'RESUBMIT'],
      required: true,
    },
    oldStatus: {
      type: String,
      enum: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'],
      default: null,
    },
    newStatus: {
      type: String,
      enum: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'],
      required: true,
    },
    reason: {
      type: String,
      default: null,
    },
    note: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

kycLogSchema.index({ sellerId: 1, createdAt: -1 });

module.exports = mongoose.model('KycLog', kycLogSchema);
