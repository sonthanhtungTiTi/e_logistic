const mongoose = require('mongoose');

const compensationSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    walletOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: function (v) {
          return Number.isInteger(v) && v > 0;
        },
        message: 'Số tiền bồi thường phải là số nguyên dương (đơn vị Đồng)',
      },
    },
    currency: {
      type: String,
      default: 'VND',
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    evidence: {
      type: [String],
      default: [],
    },
    state: {
      type: String,
      enum: ['NONE', 'PROPOSED', 'APPROVED', 'REJECTED', 'PAID', 'FAILED'],
      default: 'PROPOSED',
      index: true,
    },
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    proposedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectReason: {
      type: String,
      default: null,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ledgerEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerEntry',
      default: null,
    },
    requires2FA: {
      type: Boolean,
      default: false,
    },
    autoApproved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'compensations',
  }
);

compensationSchema.index({ ticketId: 1, state: 1 });
compensationSchema.index({ orderId: 1, state: 1 });
compensationSchema.index({ proposedBy: 1, proposedAt: -1 });

module.exports = mongoose.model('Compensation', compensationSchema);
