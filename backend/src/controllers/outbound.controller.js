const Bag = require('../models/bag.model');
const { outboundScanSchema, commitTripSchema } = require('../validations/outbound.validation');
const { processOutboundScan, commitTrip } = require('../services/outboundCore.service');

exports.scanOutbound = async (req, res) => {
  try {
    const { error, value } = outboundScanSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });

    const tripCode = value.trip_code || value.tripCode;
    const sealCode = value.seal_code || value.sealCode || null;
    const clientOfflineId = value.client_offline_id || value.clientOfflineId || null;

    // Scan theo Seal
    if (sealCode) {
      const bag = await Bag.findOne({ sealCode: sealCode.toUpperCase() });
      if (!bag) return res.status(404).json({ success: false, message: `Seal ${sealCode} không tồn tại`, code: 'SEAL_NOT_FOUND' });
      if (!bag.trackingCodes || bag.trackingCodes.length === 0)
        return res.status(400).json({ success: false, message: 'Bao tải rỗng', code: 'EMPTY_BAG' });

      const results = { seal_code: sealCode, total: bag.trackingCodes.length, success_count: 0, failed_count: 0, success_items: [], failed_items: [] };
      const settled = await Promise.allSettled(
        bag.trackingCodes.map((code, idx) =>
          processOutboundScan({
            tripCode, trackingCode: code, operator: req.user,
            clientOfflineId: clientOfflineId ? `${clientOfflineId}_${idx}` : null,
          })
        )
      );
      settled.forEach((r, i) => {
        if (r.status === 'fulfilled') { results.success_count++; results.success_items.push(r.value); }
        else { results.failed_count++; results.failed_items.push({ tracking_code: bag.trackingCodes[i], reason: r.reason.message, code: r.reason.code }); }
      });
      return res.status(200).json({ success: true, message: `Seal ${sealCode}: ${results.success_count}/${results.total} thành công`, data: results });
    }

    // Scan đơn lẻ
    const trackingCode = value.tracking_code || value.trackingCode;
    if (!trackingCode) return res.status(400).json({ success: false, message: 'Cần tracking_code hoặc seal_code', code: 'VALIDATION_ERROR' });

    const result = await processOutboundScan({ tripCode, trackingCode, operator: req.user, clientOfflineId });
    return res.status(200).json({ success: true, message: result.message, data: result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Lỗi xuất kho', code: err.code || 'OUTBOUND_ERROR' });
  }
};

exports.commitOutbound = async (req, res) => {
  try {
    const { error, value } = commitTripSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });
    const tripCode = value.trip_code || value.tripCode;
    const isShortage = value.is_shortage || value.isShortage || false;
    const result = await commitTrip({ tripCode, isShortage, operator: req.user });
    return res.status(200).json({ success: true, message: `Chuyến xe ${tripCode} đã được khóa và chờ tài xế xác nhận`, data: result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Lỗi commit', code: err.code || 'COMMIT_ERROR' });
  }
};
