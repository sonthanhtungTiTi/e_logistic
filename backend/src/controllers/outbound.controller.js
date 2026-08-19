const Bag = require('../models/bag.model');
const Trip = require('../models/trip.model');
const { outboundScanSchema, commitTripSchema, createTripSchema, driverConfirmSchema } = require('../validations/outbound.validation');
const { processOutboundScan, commitTrip, processDriverConfirm } = require('../services/outboundCore.service');

exports.createTrip = async (req, res) => {
  try {
    const { error, value } = createTripSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });

    const currentHubId = req.user?.hubId || req.user?.hub_id;
    if (!currentHubId) return res.status(403).json({ success: false, message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào', code: 'HUB_UNASSIGNED' });

    const destHubId = value.destination_hub_id || value.destinationHubId || null;
    const tripType = value.trip_type || value.tripType || 'MID_MILE_TRANSFER';
    const planned = value.planned_tracking_codes || value.plannedTrackingCodes || [];

    const tripCode = `TRIP-${Date.now().toString().slice(-6)}`;
    const trip = await Trip.create({
      tripCode,
      tripType,
      originHubId: currentHubId,
      destinationHubId: destHubId,
      plannedTrackingCodes: planned.map(c => c.toUpperCase()),
      status: 'DRAFT',
      createdBy: req.user?._id || req.user?.id,
    });

    return res.status(201).json({
      success: true,
      message: `Tạo chuyến xe ${trip.tripCode} thành công`,
      data: {
        trip_code: trip.tripCode,
        tripCode: trip.tripCode,
        trip_type: trip.tripType,
        status: trip.status,
        planned_count: trip.plannedTrackingCodes.length,
      },
    });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Lỗi tạo chuyến xe', code: err.code || 'CREATE_TRIP_ERROR' });
  }
};

exports.listTrips = async (req, res) => {
  try {
    const currentHubId = req.user?.hubId || req.user?.hub_id;
    const query = currentHubId ? { originHubId: currentHubId } : {};
    const trips = await Trip.find(query)
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('destinationHubId', 'code name')
      .lean();
    return res.status(200).json({ success: true, message: 'Danh sách chuyến xe', data: trips });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

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

exports.driverConfirmOutbound = async (req, res) => {
  try {
    const { error, value } = driverConfirmSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });
    const tripCode = req.params.tripCode || req.body.trip_code || req.body.tripCode;
    const result = await processDriverConfirm({
      tripCode,
      action: value.action,
      rejectReason: value.reject_reason || value.rejectReason,
      operator: req.user,
    });
    return res.status(200).json({ success: true, message: 'Xác nhận chuyến xe thành công', data: result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || 'Lỗi xác nhận tài xế', code: err.code || 'DRIVER_CONFIRM_ERROR' });
  }
};
