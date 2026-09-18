const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema(
  {
    entryCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['COMPENSATION', 'FEE_REFUND', 'ADJUSTMENT'],
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['CREDIT', 'DEBIT'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: function (v) {
          return Number.isInteger(v) && v > 0;
        },
        message: 'Số tiền bút toán phải là số nguyên dương (đơn vị Đồng)',
      },
    },
    currency: {
      type: String,
      default: 'VND',
    },
    walletOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      default: null,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    compensationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Compensation',
      default: null,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    collection: 'ledger_entries',
  }
);

// Bất biến Append-Only: Cấm tuyệt đối mọi hành vi sửa đổi hoặc xoá bút toán sổ cái kế toán
const forbidMutation = function () {
  if (this.getOptions && this.getOptions().bypassAppendOnlyCheck) {
    return;
  }
  throw new Error('LedgerEntry is append-only, mutation forbidden');
};

ledgerEntrySchema.pre('updateOne', forbidMutation);
ledgerEntrySchema.pre('updateMany', forbidMutation);
ledgerEntrySchema.pre('findOneAndUpdate', forbidMutation);
ledgerEntrySchema.pre('deleteOne', forbidMutation);
ledgerEntrySchema.pre('deleteMany', forbidMutation);
ledgerEntrySchema.pre('findOneAndDelete', forbidMutation);

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
