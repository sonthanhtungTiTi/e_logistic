const Joi = require('joi');

const singleInboundSchema = Joi.object({
  tracking_code: Joi.string().trim().uppercase().optional(),
  trackingCode: Joi.string().trim().uppercase().optional(),
  package_condition: Joi.string().valid('INTACT', 'DAMAGED', 'TORN_SEAL').default('INTACT'),
  condition: Joi.string().valid('INTACT', 'DAMAGED', 'TORN_SEAL').default('INTACT'),
  note: Joi.string().max(255).allow('', null),
  hub_id: Joi.any().strip(), // Strip any client-supplied hub_id to prevent IDOR
  hubId: Joi.any().strip()
}).or('tracking_code', 'trackingCode');

const batchInboundSchema = Joi.object({
  tracking_codes: Joi.array().items(Joi.string().trim().uppercase()).min(1).max(100).optional(),
  trackingCodes: Joi.array().items(Joi.string().trim().uppercase()).min(1).max(100).optional(),
  package_condition: Joi.string().valid('INTACT', 'DAMAGED').default('INTACT'),
  condition: Joi.string().valid('INTACT', 'DAMAGED').default('INTACT'),
  hub_id: Joi.any().strip(),
  hubId: Joi.any().strip()
}).or('tracking_codes', 'trackingCodes');

module.exports = { singleInboundSchema, batchInboundSchema };
