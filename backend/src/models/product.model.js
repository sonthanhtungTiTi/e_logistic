const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Tên sản phẩm không được để trống'],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    weightKg: {
      type: Number,
      required: [true, 'Khối lượng sản phẩm không được để trống'],
      min: [0.01, 'Khối lượng phải lớn hơn 0 kg'],
      default: 0.5,
    },
    dimensions: {
      length: { type: Number, default: 10, min: 1 },
      width: { type: Number, default: 10, min: 1 },
      height: { type: Number, default: 10, min: 1 },
    },
    priceVnd: {
      type: Number,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      trim: true,
      default: 'Chung',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ sellerId: 1, sku: 1 });
productSchema.index({ sellerId: 1, name: 'text' });

module.exports = mongoose.model('Product', productSchema);
