const mongoose = require('mongoose');

const geozoneSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Mã Geozone là bắt buộc'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Tên Cụm khu phố/Tuyến đường là bắt buộc'],
      trim: true,
    },
    hubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      required: [true, 'Bưu cục quản lý (hubId) là bắt buộc'],
      index: true,
    },
    province: {
      type: String,
      required: [true, 'Tỉnh/Thành phố là bắt buộc'],
      trim: true,
    },
    district: {
      type: String,
      required: [true, 'Quận/Huyện là bắt buộc'],
      trim: true,
    },
    ward: {
      type: String,
      required: [true, 'Phường/Xã là bắt buộc'],
      trim: true,
    },
    subZones: {
      type: [String],
      default: [], // Ví dụ: ['Khu phố 1', 'Khu phố 2', 'Tuyến đường CMT8']
    },
    neighborGeozoneIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Geozone',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

geozoneSchema.index({ hubId: 1, province: 1, district: 1, ward: 1 });

module.exports = mongoose.model('Geozone', geozoneSchema);
