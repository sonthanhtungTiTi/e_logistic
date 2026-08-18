const Joi = require('joi');

const openBagSchema = Joi.object({
  seal_code: Joi.string().trim().uppercase().min(3).max(50).optional(),
  sealCode:  Joi.string().trim().uppercase().min(3).max(50).optional(),
  destination_hub_id: Joi.string().hex().length(24).optional(),
  destinationHubId:  Joi.string().hex().length(24).optional(),
  max_capacity: Joi.number().integer().min(1).max(200).default(30),
  maxCapacity:  Joi.number().integer().min(1).max(200).optional(),
  max_weight_kg: Joi.number().positive().max(100).default(25),
  maxWeightKg:  Joi.number().positive().max(100).optional(),
  notes: Joi.string().max(500).allow('', null).optional(),
}).or('seal_code', 'sealCode').or('destination_hub_id', 'destinationHubId');

const addItemToBagSchema = Joi.object({
  seal_code:     Joi.string().trim().uppercase().optional(),
  sealCode:      Joi.string().trim().uppercase().optional(),
  tracking_code: Joi.string().trim().uppercase().optional(),
  trackingCode:  Joi.string().trim().uppercase().optional(),
}).or('seal_code', 'sealCode').or('tracking_code', 'trackingCode');

const removeItemFromBagSchema = Joi.object({
  seal_code:     Joi.string().trim().uppercase().optional(),
  sealCode:      Joi.string().trim().uppercase().optional(),
  tracking_code: Joi.string().trim().uppercase().optional(),
  trackingCode:  Joi.string().trim().uppercase().optional(),
}).or('seal_code', 'sealCode').or('tracking_code', 'trackingCode');

const sealBagSchema = Joi.object({
  seal_code: Joi.string().trim().uppercase().optional(),
  sealCode:  Joi.string().trim().uppercase().optional(),
  notes:     Joi.string().max(500).allow('', null).optional(),
}).or('seal_code', 'sealCode');

module.exports = {
  openBagSchema,
  addItemToBagSchema,
  removeItemFromBagSchema,
  sealBagSchema,
};
