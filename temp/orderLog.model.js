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
      enum: [
        'CREATED',
        'STATUS_CHANGED',
        'STATUS_UPDATED',
        'INFO_UPDATED',
        'CANCELLED',
        'EXCEPTION',
        'PICKED_UP',
        'PICKUP_FAILED',
        'INBOUND_SCAN'
      ],
      required: true,
    },
    trackingCode: { type: String, default: null },
    hubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    note: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('OrderLog', orderLogSchema);
