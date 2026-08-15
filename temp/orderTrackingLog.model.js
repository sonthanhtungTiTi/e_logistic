const mongoose = require('mongoose');

const orderTrackingLogSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    trackingCode: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'SELLER_PREPARED',
        'READY_TO_PICK',
        'PICKED_UP',
        'HUB_ARRIVED',
        'HUB_DEPARTED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'FAILED',
        'CANCELLED'
      ],
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    locationName: {
      type: String,
      default: null,
    },
    hubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      default: null,
    },
    driverInfo: {
      name: String,
      phone: String,
      hotline: { type: String, default: '19001088' },
      avatar: String,
    },
    podImageUrl: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'order_tracking_logs',
  }
);

// Indexes
orderTrackingLogSchema.index({ orderId: 1, timestamp: -1 });
orderTrackingLogSchema.index({ trackingCode: 1, timestamp: -1 });

module.exports = mongoose.model('OrderTrackingLog', orderTrackingLogSchema);
