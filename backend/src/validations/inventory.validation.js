const Joi = require('joi');

const agingQuerySchema = Joi.object({
  hub_id:             Joi.string().allow(null, '').optional(),
  hubId:              Joi.string().allow(null, '').optional(),
  zone_id:            Joi.string().allow(null, '').optional(),
  zoneId:             Joi.string().allow(null, '').optional(),
  destination_hub_id: Joi.string().allow(null, '').optional(),
  destinationHubId:   Joi.string().allow(null, '').optional(),
  aging_status:       Joi.string().valid('NORMAL', 'WARNING', 'CRITICAL', 'ALL').default('ALL'),
  agingStatus:        Joi.string().valid('NORMAL', 'WARNING', 'CRITICAL', 'ALL').optional(),
  search:             Joi.string().allow(null, '').optional(),
  dwell_range:        Joi.string().valid('<12h', '12-24h', '24-48h', '>48h', 'ALL').default('ALL'),
  dwellRange:         Joi.string().valid('<12h', '12-24h', '24-48h', '>48h', 'ALL').optional(),
  page:               Joi.number().integer().min(1).default(1),
  limit:              Joi.number().integer().min(1).max(200).default(20),
  sort:               Joi.string().valid('dwell_asc', 'dwell_desc', 'status').default('dwell_desc'),
  status:             Joi.string().allow(null, '').optional(),
});

const inventoryActionSchema = Joi.object({
  tracking_code: Joi.string().trim().uppercase().required(),
  trackingCode:  Joi.string().trim().uppercase().optional(),
  action_type:   Joi.string().valid('AI_REROUTE', 'RETURN', 'LIQUIDATE').optional(),
  actionType:    Joi.string().valid('AI_REROUTE', 'RETURN', 'LIQUIDATE').optional(),
  reason:        Joi.string().max(500).allow(null, '').optional(),
}).or('action_type', 'actionType');

const batchInventoryActionSchema = Joi.object({
  tracking_codes: Joi.array().items(Joi.string().trim().uppercase()).min(1).max(200).optional(),
  trackingCodes:  Joi.array().items(Joi.string().trim().uppercase()).min(1).max(200).optional(),
  action_type:    Joi.string().valid('AI_REROUTE', 'RETURN', 'LIQUIDATE').optional(),
  actionType:     Joi.string().valid('AI_REROUTE', 'RETURN', 'LIQUIDATE').optional(),
  reason:         Joi.string().max(500).allow(null, '').optional(),
}).or('tracking_codes', 'trackingCodes').or('action_type', 'actionType');

const createTripFromStockSchema = Joi.object({
  destination_hub_id: Joi.string().hex().length(24).optional(),
  destinationHubId:   Joi.string().hex().length(24).optional(),
  tracking_codes:     Joi.array().items(Joi.string().trim().uppercase()).min(1).max(500).optional(),
  trackingCodes:      Joi.array().items(Joi.string().trim().uppercase()).min(1).max(500).optional(),
  trip_type:          Joi.string().valid('MID_MILE_TRANSFER', 'LAST_MILE_DELIVERY').default('MID_MILE_TRANSFER'),
  tripType:           Joi.string().valid('MID_MILE_TRANSFER', 'LAST_MILE_DELIVERY').optional(),
}).or('destination_hub_id', 'destinationHubId').or('tracking_codes', 'trackingCodes');

module.exports = {
  agingQuerySchema,
  inventoryActionSchema,
  batchInventoryActionSchema,
  createTripFromStockSchema,
};
