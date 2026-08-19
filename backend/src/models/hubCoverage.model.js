const mongoose = require('mongoose');

const hubCoverageSchema = new mongoose.Schema(
  {
    hubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      required: [true, 'hubId là bắt buộc'],
      index: true,
    },
    province: {
      type: String,
      required: [true, 'Tỉnh/Thành là bắt buộc'],
      trim: true,
    },
    district: {
      type: String,
      required: [true, 'Quận/Huyện là bắt buộc'],
      trim: true,
    },
    ward: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true }
);

// Ràng buộc 1-1: Mỗi khu vực (Tỉnh + Huyện) chỉ do 1 Hub duy nhất phụ trách
hubCoverageSchema.index({ province: 1, district: 1 }, { unique: true });

module.exports = mongoose.model('HubCoverage', hubCoverageSchema);
