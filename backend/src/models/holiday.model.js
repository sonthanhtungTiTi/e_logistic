const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Ngày nghỉ lễ là bắt buộc'],
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Tên ngày lễ là bắt buộc'],
      trim: true,
    },
    isRecurringYearly: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Holiday', holidaySchema);
