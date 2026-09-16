const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    seq: {
      type: Number,
      required: true,
    },
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
      index: true,
    },
    body: {
      type: String,
      required: [true, 'Nội dung tin nhắn không được để trống'],
      trim: true,
    },
    attachments: [
      {
        url: { type: String, required: true },
        mime: { type: String },
        sizeBytes: { type: Number },
        sha256: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    clientMsgId: {
      type: String,
      default: null,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ticketMessageSchema.index({ ticketId: 1, seq: 1 }, { unique: true });
ticketMessageSchema.index(
  { ticketId: 1, clientMsgId: 1 },
  { unique: true, partialFilterExpression: { clientMsgId: { $type: 'string' } } }
);

module.exports = mongoose.model('TicketMessage', ticketMessageSchema);
