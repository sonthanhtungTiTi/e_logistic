const {
  openBagSchema,
  addItemToBagSchema,
  removeItemFromBagSchema,
  sealBagSchema,
} = require('../validations/bag.validation');
const {
  openBag,
  addItemToBag,
  removeItemFromBag,
  sealBag,
  getBagDetails,
  listHubBags,
} = require('../services/bagCore.service');

/**
 * Mở một bao tải mới
 * POST /api/bags/open
 */
exports.openBag = async (req, res) => {
  try {
    const { error, value } = openBagSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });
    }

    const sealCode = value.seal_code || value.sealCode;
    const destinationHubId = value.destination_hub_id || value.destinationHubId;
    const maxCapacity = value.max_capacity || value.maxCapacity;
    const maxWeightKg = value.max_weight_kg || value.maxWeightKg;

    const result = await openBag({
      sealCode,
      destinationHubId,
      maxCapacity,
      maxWeightKg,
      notes: value.notes,
      operator: req.user,
    });

    return res.status(201).json({
      success: true,
      message: `Đã mở bao tải mới [${result.sealCode}]`,
      data: result,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Lỗi hệ thống khi mở bao tải',
      code: err.code || 'BAG_ERROR',
    });
  }
};

/**
 * Quét thêm một kiện hàng vào bao tải
 * POST /api/bags/add-item
 */
exports.addItem = async (req, res) => {
  try {
    const { error, value } = addItemToBagSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });
    }

    const sealCode = value.seal_code || value.sealCode;
    const trackingCode = value.tracking_code || value.trackingCode;

    const result = await addItemToBag({
      sealCode,
      trackingCode,
      operator: req.user,
    });

    return res.status(200).json({
      success: true,
      message: `Đã thêm kiện [${result.added_tracking_code}] vào bao tải [${result.seal_code}]`,
      data: result,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Lỗi khi thêm kiện hàng vào bao tải',
      code: err.code || 'BAG_ERROR',
    });
  }
};

/**
 * Xóa một kiện hàng khỏi bao tải
 * POST /api/bags/remove-item
 */
exports.removeItem = async (req, res) => {
  try {
    const { error, value } = removeItemFromBagSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });
    }

    const sealCode = value.seal_code || value.sealCode;
    const trackingCode = value.tracking_code || value.trackingCode;

    const result = await removeItemFromBag({
      sealCode,
      trackingCode,
      operator: req.user,
    });

    return res.status(200).json({
      success: true,
      message: `Đã xóa kiện [${result.removed_tracking_code}] khỏi bao tải [${result.seal_code}]`,
      data: result,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Lỗi khi xóa kiện hàng khỏi bao tải',
      code: err.code || 'BAG_ERROR',
    });
  }
};

/**
 * Khóa Niêm Phong bao tải
 * POST /api/bags/seal
 */
exports.sealBag = async (req, res) => {
  try {
    const { error, value } = sealBagSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });
    }

    const sealCode = value.seal_code || value.sealCode;

    const result = await sealBag({
      sealCode,
      notes: value.notes,
      operator: req.user,
    });

    return res.status(200).json({
      success: true,
      message: `Bao tải [${result.seal_code}] đã được niêm phong với ${result.total_items} kiện hàng`,
      data: result,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Lỗi khi niêm phong bao tải',
      code: err.code || 'BAG_ERROR',
    });
  }
};

/**
 * Lấy chi tiết thông tin bao tải
 * GET /api/bags/:sealCode
 */
exports.getBag = async (req, res) => {
  try {
    const sealCode = req.params.sealCode;
    const result = await getBagDetails({ sealCode });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Lỗi khi truy vấn thông tin bao tải',
      code: err.code || 'BAG_ERROR',
    });
  }
};

/**
 * Lấy danh sách bao tải trong Hub
 * GET /api/bags
 */
exports.listBags = async (req, res) => {
  try {
    const status = req.query.status || null;
    const result = await listHubBags({ operator: req.user, status });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Lỗi khi lấy danh sách bao tải',
      code: err.code || 'BAG_ERROR',
    });
  }
};
