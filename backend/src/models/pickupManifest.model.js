const mongoose = require('mongoose');

const pickupManifestSchema = new mongoose.Schema(
  {
    manifestCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    shipperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],
    totalCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['OPEN', 'PROCESSING', 'COMPLETED', 'CANCELLED'],
      default: 'OPEN',
      index: true,
    },
    signatureImageUrl: {
      type: String,
      default: null,
    },
    proofPhotoUrls: [
      {
        type: String,
      },
    ],
    clientOfflineId: {
      type: String,
      sparse: true,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PickupManifest', pickupManifestSchema);
