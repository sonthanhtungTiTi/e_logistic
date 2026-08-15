const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  tripCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  tripType: { type: String, enum: ['MID_MILE_TRANSFER','LAST_MILE_DELIVERY'], required: true },
  originHubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', required: true },
  destinationHubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', default: null },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  plannedTrackingCodes: { type: [String], default: [] },
  scannedItems: [{
    trackingCode: { type: String },
    scannedAt: { type: Date, default: Date.now },
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  shortageTrackingCodes: { type: [String], default: [] },
  status: {
    type: String,
    enum: ['DRAFT','LOCKED_PENDING_DRIVER_CONFIRM','CONFIRMED','REJECTED','DEPARTED','ARRIVED'],
    default: 'DRAFT',
  },
  lockedAt: { type: Date, default: null },
  driverConfirmedAt: { type: Date, default: null },
  driverRejectedAt: { type: Date, default: null },
  rejectReason: { type: String, default: null },
  driverConfirmReminderSentAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

tripSchema.index({ status: 1, lockedAt: 1 });

module.exports = mongoose.model('Trip', tripSchema);
