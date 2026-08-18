const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String },
    hubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', required: true, index: true },
    zoneType: {
      type: String,
      enum: ['STAGING_TRANSFER', 'STAGING_DELIVERY', 'INCIDENT', 'SEARCH', 'RETURN', 'OVERDUE', 'STORAGE'],
      required: true,
    },
    capacity: { type: Number, default: null },
    currentCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

zoneSchema.index({ hubId: 1, zoneType: 1 });

module.exports = mongoose.model('Zone', zoneSchema);
