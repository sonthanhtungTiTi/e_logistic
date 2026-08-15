const { driverConfirmSchema } = require('../validations/outbound.validation');
const { processDriverConfirm } = require('../services/outboundCore.service');

exports.driverConfirmTrip = async (req, res) => {
  try {
    const { error, value } = driverConfirmSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });

    const tripCode = (req.params.tripCode || '').toUpperCase();
    const rejectReason = value.reject_reason || value.rejectReason || '';

    const result = await processDriverConfirm({ tripCode, action: value.action, rejectReason, operator: req.user });
    const msg = value.action === 'ACCEPT' ? `Tài xế đã chấp nhận chuyến xe ${tripCode}` : `Tài xế đã từ chối chuyến xe ${tripCode}`;
    return res.status(200).json({ success: true, message: msg, data: result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Lỗi xác nhận chuyến', code: err.code || 'DRIVER_CONFIRM_ERROR' });
  }
};
