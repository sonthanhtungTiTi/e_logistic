const mongoose = require('mongoose');
const Trip = require('../models/trip.model');
const { createTripSchema } = require('../validations/outbound.validation');

exports.createTrip = async (req, res) => {
  try {
    const { error, value } = createTripSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });

    const currentHubId = req.user?.hubId || req.user?.hub_id;
    if (!currentHubId) return res.status(403).json({ success: false, message: 'Nhân viên chưa được gán Hub', code: 'HUB_UNASSIGNED' });

    const tripType = value.trip_type || value.tripType;
    const plannedCodes = (value.planned_tracking_codes || value.plannedTrackingCodes || []).map(c => c.toUpperCase());
    const driverId = value.driver_id || value.driverId || null;
    const destHubId = value.destination_hub_id || value.destinationHubId || null;

    const tripCode = `TRIP-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

    const trip = await Trip.create({
      tripCode,
      tripType,
      originHubId: currentHubId,
      destinationHubId: destHubId || undefined,
      driverId: driverId || undefined,
      plannedTrackingCodes: plannedCodes,
      createdBy: req.user._id || req.user.id,
      status: 'DRAFT',
    });

    return res.status(201).json({
      success: true,
      message: `Chuyến xe ${tripCode} đã được tạo`,
      data: {
        trip_code: trip.tripCode, tripCode: trip.tripCode,
        trip_type: trip.tripType, tripType: trip.tripType,
        status: trip.status,
        planned_count: plannedCodes.length, plannedCount: plannedCodes.length,
        origin_hub_id: trip.originHubId, originHubId: trip.originHubId,
        created_at: trip.createdAt, createdAt: trip.createdAt,
      },
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Trip code trùng lặp', code: 'DUPLICATE_TRIP_CODE' });
    return res.status(500).json({ success: false, message: err.message || 'Lỗi tạo chuyến xe', code: 'CREATE_TRIP_ERROR' });
  }
};
