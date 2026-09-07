const mongoose = require('mongoose');

const custodyTransferLogSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: false,
      index: true,
    },
    trackingCode: {
      type: String,
      required: false,
      index: true,
    },
    transferType: {
      type: String,
      required: true,
      enum: [
        'SELLER_TO_SHIPPER',
        'SHIPPER_TO_ORIGIN_HUB',
        'ORIGIN_HUB_TO_LINEHAUL',
        'LINEHAUL_TO_DEST_HUB',
        'DEST_HUB_TO_SHIPPER',
        'SHIPPER_TO_BUYER',
        'SHIPPER_RETURN_TO_HUB',
        'HUB_RETURN_TO_SELLER',
      ],
      index: true,
    },
    fromActor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, required: true },
      name: { type: String, required: true },
      phone: { type: String },
    },
    fromHubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      default: null,
      index: true,
    },
    toActor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, required: true },
      name: { type: String, required: true },
      phone: { type: String },
    },
    toHubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      default: null,
      index: true,
    },
    handoverCode: {
      type: String,
      default: null, // Mã phiên bàn giao / Seal Code / Trip Code
    },
    measuredWeightKg: {
      type: Number,
      default: null,
    },
    packageCondition: {
      type: String,
      enum: ['INTACT', 'DAMAGED', 'TORN_SEAL', 'WRONG_LABEL', 'OTHER'],
      default: 'INTACT',
    },
    conditionNote: {
      type: String,
      default: '',
    },
    signatureUrl: {
      type: String,
      default: null,
    },
    evidencePhotos: {
      type: [String],
      default: [],
    },
    gpsLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      accuracy: { type: Number, default: null },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'custody_transfer_logs',
  }
);

custodyTransferLogSchema.index({ orderId: 1, timestamp: -1 });
custodyTransferLogSchema.index({ trackingCode: 1, timestamp: -1 });
custodyTransferLogSchema.index({ fromHubId: 1, toHubId: 1 });

module.exports = mongoose.model('CustodyTransferLog', custodyTransferLogSchema);
