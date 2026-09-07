const mongoose = require('mongoose');

const orderLogSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    preStatus: {
      type: String,
      default: null,
    },
    postStatus: {
      type: String,
      required: true,
    },
    actionType: {
      type: String,
      enum: [
        'CREATED',
        'STATUS_CHANGED',
        'STATUS_UPDATED',
        'INFO_UPDATED',
        'CANCELLED',
        'EXCEPTION',
        'PICKED_UP',
        'PICKUP_FAILED',
        'INBOUND_SCAN',
        'OUTBOUND_SCAN',
        'ITEM_ADDED_TO_BAG',     // BUG-05 fix: log đúng khi thêm kiện vào bao
        'BAG_SEALED',            // Legacy — giữ lại tương thích ngược với DB cũ
        'BAG_SEALED_CONFIRMED',  // Tên chuẩn cho sự kiện niêm phong bao thật sự
        'DRIVER_CONFIRMED',
        'DRIVER_REJECTED',
        'FEE_ADJUSTMENT_TRIGGERED',
        'DELIVERY_SUCCESS',
        'DELIVERY_FAILED',
        'RETURNED',
        'AUDIT_SESSION_STARTED',
        'AUDIT_SCAN',
        'AUDIT_SESSION_SUBMITTED',
        'AUDIT_SESSION_APPROVED',
        'INVENTORY_ACTION',
        'SURPLUS_FOUND',
        'LOST_CONFIRMED',
        'LIQUIDATED'
      ],
      required: true,
    },
    trackingCode: { type: String, default: null },
    hubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hub', default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    note: {
      type: String,
    },
    zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', default: null },
    clientOfflineId: { type: String, unique: true, sparse: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('OrderLog', orderLogSchema);
