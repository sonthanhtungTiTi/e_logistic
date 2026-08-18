const mongoose = require('mongoose');

const auditSessionSchema = new mongoose.Schema({
  sessionCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  hubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', required: true, index: true },
  scope: {
    type: { type: String, enum: ['ALL','ZONE','DESTINATION','DATE_RANGE'], default: 'ALL' },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startedAt: { type: Date, default: Date.now },
  snapshotTrackingCodes: { type: [String], default: [] },
  scannedItems: [{
    trackingCode: { type: String },
    scannedAt: { type: Date, default: Date.now },
    clientOfflineId: { type: String, default: null },
  }],
  status: {
    type: String,
    enum: ['IN_PROGRESS','PAUSED','COMPLETED','PENDING_APPROVAL','APPROVED'],
    default: 'IN_PROGRESS',
  },
  pausedAt: { type: Date, default: null },
  resumedAt: { type: Date, default: null },
  result: {
    matchedCount:          { type: Number, default: null },
    missingTrackingCodes:  { type: [String], default: [] },
    surplusTrackingCodes:  { type: [String], default: [] },
    overdueTrackingCodes:  { type: [String], default: [] },
    dispatchedOutboundCodes: { type: [String], default: [] },
    missingTotalValueVnd:  { type: Number, default: 0 },
    misplacedItems: [{
      trackingCode: String,
      expectedZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
      actualZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
      relocated: { type: Boolean, default: false },
    }],
  },
  completedAt:  { type: Date, default: null },
  submittedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt:   { type: Date, default: null },
}, { timestamps: true });

auditSessionSchema.index({ hubId: 1, status: 1 });

module.exports = mongoose.model('AuditSession', auditSessionSchema);
