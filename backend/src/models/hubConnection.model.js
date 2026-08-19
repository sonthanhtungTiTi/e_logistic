const mongoose = require('mongoose');

const hubConnectionSchema = new mongoose.Schema(
  {
    fromHubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      required: [true, 'fromHubId là bắt buộc'],
      index: true,
    },
    toHubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      required: [true, 'toHubId là bắt buộc'],
      index: true,
    },
    transitTimeHours: {
      type: Number,
      required: [true, 'Thời gian vận chuyển transitTimeHours là bắt buộc'],
      min: [0.1, 'Thời gian vận chuyển phải lớn hơn 0'],
    },
    cost: {
      type: Number,
      default: 0,
      min: [0, 'Chi phí không được âm'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    cutoffTime: {
      type: String,
      default: null, // "HH:mm"
    },
  },
  { timestamps: true }
);

// Đồ thị có hướng duy nhất từ fromHubId -> toHubId
hubConnectionSchema.index({ fromHubId: 1, toHubId: 1 }, { unique: true });

module.exports = mongoose.model('HubConnection', hubConnectionSchema);
