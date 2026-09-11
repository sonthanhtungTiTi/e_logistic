const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema({
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
    enum: ['SELLER', 'ADMIN', 'ORDER_VENDOR_MANAGER', 'CS', 'CUSTOMER_SERVICE', 'OPERATIONS'],
    default: 'SELLER',
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
    trackingCode: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['DELIVERY_DELAY', 'DAMAGED_GOODS', 'LOST_GOODS', 'COD_DISPUTE', 'ADDRESS_CHANGE', 'OTHER'],
      default: 'OTHER',
    },
    priority: {
      type: String,
      required: true,
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
      default: 'NORMAL',
    },
    status: {
      type: String,
      required: true,
      enum: ['OPEN', 'IN_PROGRESS', 'WAITING_SELLER', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Tiêu đề ticket là bắt buộc'],
      trim: true,
    },
    messages: [ticketMessageSchema],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolutionNote: {
      type: String,
      trim: true,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ticketSchema.index({ sellerId: 1, status: 1 });
ticketSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
