const mongoose = require('mongoose');

const bagSchema = new mongoose.Schema(
  {
    sealCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    originHubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', required: true, index: true },
    destinationHubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', required: true, index: true },
    status: {
      type: String,
      enum: ['OPEN', 'SEALED', 'IN_TRANSIT', 'ARRIVED', 'BROKEN_SEAL'],
      default: 'OPEN',
      index: true,
    },
    trackingCodes: { type: [String], default: [] },
    totalWeightKg: { type: Number, default: 0 },
    maxCapacity: { type: Number, default: 30 },
    maxWeightKg: { type: Number, default: 25 },
    notes: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sealedAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bag', bagSchema);
