const mongoose = require('mongoose');

const pickupConfirmationSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    shipperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Bằng chứng pháp lý - Tách riêng để bảo toàn dữ liệu bất biến khi Order thay đổi
    signatureImageUrl: { type: String, required: true },
    proofPhotoUrls: [{ type: String }, { default: [] }],

    // GPS đối soát hiện trường
    gpsLat: { type: Number, default: null },
    gpsLng: { type: Number, default: null },
    gpsMissing: { type: Boolean, default: false },

    // Khối lượng thực tế & Phụ thu cước phí
    actualWeight: { type: Number, default: null },
    weightDiscrepancy: { type: Boolean, default: false },
    surchargeFee: { type: Number, default: 0 },

    confirmedAt: { type: Date, default: Date.now },

    // Chống trùng khi App gửi lại do mất mạng (Unique Sparse Index)
    clientOfflineId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PickupConfirmation', pickupConfirmationSchema);
