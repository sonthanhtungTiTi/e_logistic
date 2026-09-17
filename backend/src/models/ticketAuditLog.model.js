const mongoose = require('mongoose');

const ticketAuditLogSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['CREATE', 'STATUS_CHANGE', 'PRIORITY_OVERRIDE', 'ASSIGN', 'ESCALATE', 'COMPENSATION_PROPOSE', 'COMPENSATION_DECISION', 'AUTO_CLOSE'],
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorRole: {
      type: String,
      default: 'SYSTEM',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TicketAuditLog', ticketAuditLogSchema);
