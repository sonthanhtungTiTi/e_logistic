const SystemConfig = require('../models/systemConfig.model');

// Cấu hình bảng giá mặc định chuẩn ban đầu
const DEFAULT_PRICING_CONFIG = {
  volumetricDivisor: 5000,
  zones: {
    INTRA_PROVINCE: {
      name: 'Nội tỉnh',
      baseFee: 16500,
      extraWeightFee: 5000,
      baseWeightKg: 1.0,
      stepKg: 0.5,
    },
    INTRA_REGION: {
      name: 'Nội miền',
      baseFee: 22000,
      extraWeightFee: 6000,
      baseWeightKg: 1.0,
      stepKg: 0.5,
    },
    NEAR_REGION: {
      name: 'Cận miền',
      baseFee: 28000,
      extraWeightFee: 7000,
      baseWeightKg: 1.0,
      stepKg: 0.5,
    },
    INTER_REGION: {
      name: 'Liên miền (Bắc - Nam)',
      baseFee: 35000,
      extraWeightFee: 8500,
      baseWeightKg: 1.0,
      stepKg: 0.5,
    },
  },
  insurance: {
    threshold: 1000000,
    rate: 0.005, // 0.5%
  },
  riskThresholds: {
    feeWarning: 500000,
    codWarning: 10000000,
  },
};

const DEFAULT_VOUCHERS = [
  { code: 'FREESHIP15', description: 'Miễn giảm 15.000 đ cước giao hàng', discountType: 'FIXED', value: 15000, active: true },
  { code: 'ELOG50', description: 'Giảm 50% cước (tối đa 50.000 đ)', discountType: 'PERCENT', value: 0.5, maxDiscount: 50000, active: true },
  { code: 'WELCOME10', description: 'Tặng 10.000 đ cho khách hàng mới', discountType: 'FIXED', value: 10000, active: true },
  { code: 'EXPIRED2025', description: 'Mã khuyến mãi mùa cũ (Hết hạn)', discountType: 'FIXED', value: 20000, active: false },
];

// In-memory cache
let cachedPricingConfig = null;
let cachedVouchers = null;

// Khởi tạo preload từ DB
const preloadConfig = async () => {
  try {
    const [p, v] = await Promise.all([
      SystemConfig.findOne({ key: 'SHIPPING_PRICING_CONFIG' }),
      SystemConfig.findOne({ key: 'PROMOTION_VOUCHERS' }),
    ]);
    if (p && p.value) cachedPricingConfig = p.value;
    if (v && Array.isArray(v.value)) cachedVouchers = v.value;
  } catch (e) {}
};
setTimeout(preloadConfig, 1000);

exports.getSyncConfig = () => cachedPricingConfig || DEFAULT_PRICING_CONFIG;
exports.getSyncVouchers = () => cachedVouchers || DEFAULT_VOUCHERS;

// Lấy config pricing đang hoạt động
exports.getActivePricingConfig = async () => {
  if (cachedPricingConfig) return cachedPricingConfig;
  await preloadConfig();
  return cachedPricingConfig || DEFAULT_PRICING_CONFIG;
};

// Lấy danh sách vouchers đang hoạt động
exports.getActiveVouchers = async () => {
  if (cachedVouchers) return cachedVouchers;
  try {
    const doc = await SystemConfig.findOne({ key: 'PROMOTION_VOUCHERS' });
    if (doc && Array.isArray(doc.value)) {
      cachedVouchers = doc.value;
      return cachedVouchers;
    }
  } catch (err) {
    console.warn('Lỗi đọc PROMOTION_VOUCHERS từ DB, dùng danh sách fallback mặc định:', err.message);
  }
  return DEFAULT_VOUCHERS;
};

// @desc    Lấy cấu hình bảng giá và danh sách voucher
// @route   GET /api/admin/pricing-config
// @access  Private (Admin)
exports.getPricingAndVouchers = async (req, res) => {
  try {
    let [pricingDoc, vouchersDoc] = await Promise.all([
      SystemConfig.findOne({ key: 'SHIPPING_PRICING_CONFIG' }),
      SystemConfig.findOne({ key: 'PROMOTION_VOUCHERS' }),
    ]);

    const pricing = pricingDoc ? pricingDoc.value : DEFAULT_PRICING_CONFIG;
    const vouchers = vouchersDoc ? vouchersDoc.value : DEFAULT_VOUCHERS;

    res.status(200).json({
      success: true,
      data: {
        pricing,
        vouchers,
      },
    });
  } catch (error) {
    console.error('Lỗi getPricingAndVouchers:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy cấu hình bảng giá',
      error: error.message,
    });
  }
};

// @desc    Cập nhật cấu hình bảng giá phí ship
// @route   PUT /api/admin/pricing-config
// @access  Private (Admin)
exports.updatePricingConfig = async (req, res) => {
  try {
    const newConfig = req.body;
    if (!newConfig || !newConfig.zones) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu cấu hình bảng giá không hợp lệ',
      });
    }

    const doc = await SystemConfig.findOneAndUpdate(
      { key: 'SHIPPING_PRICING_CONFIG' },
      {
        value: newConfig,
        description: 'Bảng giá cước vận chuyển theo khu vực & trọng lượng quy đổi',
      },
      { upsert: true, new: true }
    );

    cachedPricingConfig = doc.value;

    res.status(200).json({
      success: true,
      message: 'Đã lưu cấu hình bảng giá cước thành công!',
      data: doc.value,
    });
  } catch (error) {
    console.error('Lỗi updatePricingConfig:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật bảng giá',
      error: error.message,
    });
  }
};

// @desc    Thêm hoặc sửa mã voucher giảm giá
// @route   POST /api/admin/vouchers
// @access  Private (Admin)
exports.saveVoucher = async (req, res) => {
  try {
    const { code, description, discountType, value, maxDiscount, active } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mã voucher (code) là bắt buộc',
      });
    }

    const upperCode = code.trim().toUpperCase();

    let doc = await SystemConfig.findOne({ key: 'PROMOTION_VOUCHERS' });
    let vouchers = doc && Array.isArray(doc.value) ? [...doc.value] : [...DEFAULT_VOUCHERS];

    const existingIndex = vouchers.findIndex((v) => v.code === upperCode);
    const newVoucher = {
      code: upperCode,
      description: description || '',
      discountType: discountType || 'FIXED',
      value: Number(value) || 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
      active: active !== undefined ? Boolean(active) : true,
    };

    if (existingIndex >= 0) {
      vouchers[existingIndex] = newVoucher;
    } else {
      vouchers.push(newVoucher);
    }

    doc = await SystemConfig.findOneAndUpdate(
      { key: 'PROMOTION_VOUCHERS' },
      { value: vouchers, description: 'Danh sách mã voucher khuyến mãi hệ thống' },
      { upsert: true, new: true }
    );

    cachedVouchers = doc.value;

    res.status(200).json({
      success: true,
      message: existingIndex >= 0 ? `Đã cập nhật mã voucher ${upperCode}` : `Đã tạo voucher mới ${upperCode}`,
      data: vouchers,
    });
  } catch (error) {
    console.error('Lỗi saveVoucher:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lưu mã voucher',
      error: error.message,
    });
  }
};

// @desc    Xóa mã voucher giảm giá
// @route   DELETE /api/admin/vouchers/:code
// @access  Private (Admin)
exports.deleteVoucher = async (req, res) => {
  try {
    const codeToDelete = req.params.code.trim().toUpperCase();

    let doc = await SystemConfig.findOne({ key: 'PROMOTION_VOUCHERS' });
    let vouchers = doc && Array.isArray(doc.value) ? [...doc.value] : [...DEFAULT_VOUCHERS];

    const filtered = vouchers.filter((v) => v.code !== codeToDelete);

    doc = await SystemConfig.findOneAndUpdate(
      { key: 'PROMOTION_VOUCHERS' },
      { value: filtered, description: 'Danh sách mã voucher khuyến mãi hệ thống' },
      { upsert: true, new: true }
    );

    cachedVouchers = doc.value;

    res.status(200).json({
      success: true,
      message: `Đã xóa mã voucher ${codeToDelete}`,
      data: filtered,
    });
  } catch (error) {
    console.error('Lỗi deleteVoucher:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể xóa voucher',
      error: error.message,
    });
  }
};
