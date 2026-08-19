const Joi = require('joi');

const createTripSchema = Joi.object({
  trip_type: Joi.string().valid('MID_MILE_TRANSFER','LAST_MILE_DELIVERY').optional(),
  tripType: Joi.string().valid('MID_MILE_TRANSFER','LAST_MILE_DELIVERY').optional(),
  origin_hub_id: Joi.string().optional(),
  originHubId: Joi.string().optional(),
  destination_hub_id: Joi.string().allow(null,'').optional(),
  destinationHubId: Joi.string().allow(null,'').optional(),
  driver_id: Joi.string().allow(null,'').optional(),
  driverId: Joi.string().allow(null,'').optional(),
  planned_tracking_codes: Joi.array().items(Joi.string().trim().uppercase()).min(1).max(500).optional(),
  plannedTrackingCodes: Joi.array().items(Joi.string().trim().uppercase()).min(1).max(500).optional(),
}).or('trip_type','tripType').or('planned_tracking_codes','plannedTrackingCodes');

const outboundScanSchema = Joi.object({
  trip_code: Joi.string().trim().uppercase().optional(),
  tripCode: Joi.string().trim().uppercase().optional(),
  tracking_code: Joi.string().trim().uppercase().optional(),
  trackingCode: Joi.string().trim().uppercase().optional(),
  seal_code: Joi.string().trim().uppercase().optional(),
  sealCode: Joi.string().trim().uppercase().optional(),
  client_offline_id: Joi.string().max(128).allow(null,'').optional(),
  clientOfflineId: Joi.string().max(128).allow(null,'').optional(),
}).or('trip_code','tripCode');

const commitTripSchema = Joi.object({
  trip_code: Joi.string().trim().uppercase().optional(),
  tripCode: Joi.string().trim().uppercase().optional(),
  is_shortage: Joi.boolean().default(false),
  isShortage: Joi.boolean().default(false),
}).or('trip_code','tripCode');

const driverConfirmSchema = Joi.object({
  trip_code: Joi.string().trim().uppercase().optional(),
  tripCode: Joi.string().trim().uppercase().optional(),
  action: Joi.string().valid('ACCEPT', 'REJECT').required(),
  reject_reason: Joi.string().max(500).allow(null, '').optional(),
  rejectReason: Joi.string().max(500).allow(null, '').optional(),
});

module.exports = { createTripSchema, outboundScanSchema, commitTripSchema, driverConfirmSchema };
