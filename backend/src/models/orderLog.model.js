const mongoose = require('mongoose');

const orderLogSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    preStatus: {
      type: String,
      default: null,
    },
    postStatus: {
      type: String,
      required: true,
    },
    actionType: {
      type: String,
      enum: ['CREATED', 'STATUS_CHANGED', 'INFO_UPDATED', 'CANCELLED', 'EXCEPTION'],
      required: true,
    },
    note: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('OrderLog', orderLogSchema);
