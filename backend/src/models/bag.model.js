const mongoose = require('mongoose');

const bagSchema = new mongoose.Schema(
  {
    sealCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    originHubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', required: true, index: true },
    destinationHubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', required: true, index: true },
    status: {
      type: String,
      enum: ['OPEN', 'SEALED', 'IN_TRANSIT', 'ARRIVED', 'BROKEN_SEAL'],
      default: 'OPEN',
    },
    trackingCodes: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sealedAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bag', bagSchema);
