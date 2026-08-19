const mongoose = require('mongoose');

const hubSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Mã Hub là bắt buộc'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Tên Hub là bắt buộc'],
    },
    address: String,
    ward: String,
    district: String,
    province: String,
    type: {
      type: String,
      enum: ['PICKUP', 'SORTING', 'DELIVERY', 'HYBRID', 'ORIGIN_HUB', 'TRANSIT_HUB', 'DEST_HUB', 'MIXED'],
      default: 'HYBRID',
      required: true,
    },
    coordinates: {
      lat: Number,
      lng: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Hub', hubSchema);
