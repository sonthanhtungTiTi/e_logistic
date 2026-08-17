const mongoose = require('mongoose');

const pickupAddressSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: [true, 'Tên gợi nhớ kho (VD: Kho Hóc Môn) là bắt buộc'],
      trim: true,
    },
    province: {
      type: String,
      required: [true, 'Tỉnh/Thành phố là bắt buộc'],
    },
    district: {
      type: String,
      required: [true, 'Quận/Huyện là bắt buộc'],
    },
    ward: {
      type: String,
      required: [true, 'Phường/Xã là bắt buộc'],
    },
    addressDetail: {
      type: String,
      required: [true, 'Địa chỉ chi tiết số nhà/tên đường là bắt buộc'],
    },
    contactName: {
      type: String,
      default: '',
    },
    contactPhone: {
      type: String,
      default: '',
    },
    latitude: {
      type: Number,
      required: [true, 'Vĩ độ GPS (latitude) là bắt buộc'],
    },
    longitude: {
      type: Number,
      required: [true, 'Kinh độ GPS (longitude) là bắt buộc'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

pickupAddressSchema.index({ sellerId: 1, isDefault: 1 });

module.exports = mongoose.model('PickupAddress', pickupAddressSchema);
