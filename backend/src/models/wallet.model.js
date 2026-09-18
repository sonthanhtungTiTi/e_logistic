const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Số dư ví không được âm'],
      validate: {
        validator: Number.isInteger,
        message: 'Số dư ví phải là số nguyên (đơn vị Đồng)',
      },
    },
    currency: {
      type: String,
      default: 'VND',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'wallets',
  }
);

module.exports = mongoose.model('Wallet', walletSchema);
