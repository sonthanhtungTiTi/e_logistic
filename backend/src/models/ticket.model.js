const mongoose = require('mongoose');

const ticketMessageEmbeddedSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderName: {
    type: String,
    required: true,
    trim: true,
  },
  senderRole: {
    type: String,
    required: true,
    default: 'SELLER',
  },
  visibility: {
    type: String,
    enum: ['PUBLIC', 'INTERNAL'],
    default: 'PUBLIC',
  },
  message: {
    type: String,
    required: [true, 'Nội dung tin nhắn không được để trống'],
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ticketSchema = new mongoose.Schema(
  {
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    requesterRole: {
      type: String,
      enum: ['SELLER', 'BUYER', 'ADMIN', 'CS'],
      default: 'SELLER',
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    trackingCode: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    orderTrackingCode: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'DELIVERY_DELAY',
        'DAMAGED_GOODS',
        'LOST_GOODS',
        'COD_DISPUTE',
        'ADDRESS_CHANGE',
        'FEE_DISPUTE',
        'PICKUP_FAIL',
        'OTHER',
      ],
      default: 'OTHER',
      index: true,
    },
    subCategory: {
      type: String,
      default: '',
    },
    priority: {
      type: String,
      required: true,
      enum: ['P1', 'P2', 'P3', 'P4', 'LOW', 'NORMAL', 'HIGH', 'URGENT'],
      default: 'P3',
      index: true,
    },
    channel: {
      type: String,
      enum: ['WEB', 'HOTLINE', 'EMAIL', 'ZALO'],
      default: 'WEB',
    },
    status: {
      type: String,
      required: true,
      enum: [
        'NEW',
        'ASSIGNED',
        'IN_PROGRESS',
        'WAITING_USER',
        'ESCALATED',
        'PENDING_REFUND',
        'RESOLVED',
        'CLOSED',
        'REOPENED',
        'OPEN',
        'WAITING_SELLER',
      ],
      default: 'NEW',
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Tiêu đề ticket là bắt buộc'],
      trim: true,
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    watcherIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    msgSeq: {
      type: Number,
      default: 0,
    },
    sla: {
      firstResponseDueAt: { type: Date, default: null },
      firstRespondedAt: { type: Date, default: null },
      resolutionDueAt: { type: Date, default: null },
      resolvedAt: { type: Date, default: null },
      breachedFirstResponse: { type: Boolean, default: false },
      breachedResolution: { type: Boolean, default: false },
      warnedFirstResponse: { type: Boolean, default: false },
      warnedResolution: { type: Boolean, default: false },
      pausedMs: { type: Number, default: 0 },
      pauseStartedAt: { type: Date, default: null },
    },
    compensation: {
      proposedAmount: { type: Number, default: 0 },
      proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      proposedAt: { type: Date, default: null },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      approvedAt: { type: Date, default: null },
      rejectReason: { type: String, default: '' },
      idempotencyKey: { type: String, default: null },
      ledgerEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerEntry', default: null },
      state: {
        type: String,
        enum: ['NONE', 'PROPOSED', 'APPROVED', 'REJECTED', 'PAID', 'FAILED'],
        default: 'NONE',
      },
    },
    attachments: [
      {
        url: { type: String, required: true },
        mime: { type: String },
        sizeBytes: { type: Number },
        sha256: { type: String },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    csat: {
      score: { type: Number, default: null },
      comment: { type: String, default: '' },
      submittedAt: { type: Date, default: null },
      jti: { type: String, default: null },
    },
    tags: [{ type: String }],
    mergedIntoTicketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null },
    closedReason: { type: String, default: '' },
    resolutionNote: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    messages: [ticketMessageEmbeddedSchema], // Parallel backward compatibility for sprint 1
  },
  {
    timestamps: true,
  }
);

// Indexes
ticketSchema.index({ sellerId: 1, status: 1 });
ticketSchema.index({ status: 1, priority: 1, 'sla.resolutionDueAt': 1 });
ticketSchema.index({ assigneeId: 1, status: 1 });
ticketSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
