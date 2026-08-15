const Joi = require('joi');

const agingQuerySchema = Joi.object({
  hub_id:      Joi.string().allow(null,'').optional(),
  hubId:       Joi.string().allow(null,'').optional(),
  zone_id:     Joi.string().allow(null,'').optional(),
  zoneId:      Joi.string().allow(null,'').optional(),
  aging_status: Joi.string().valid('NORMAL','WARNING','CRITICAL','ALL').default('ALL'),
  agingStatus:  Joi.string().valid('NORMAL','WARNING','CRITICAL','ALL').optional(),
  page:        Joi.number().integer().min(1).default(1),
  limit:       Joi.number().integer().min(1).max(200).default(20),
  sort:        Joi.string().valid('dwell_asc','dwell_desc','status').default('dwell_desc'),
  // Filter by order status
  status:      Joi.string().allow(null,'').optional(),
});

const inventoryActionSchema = Joi.object({
  tracking_code:  Joi.string().trim().uppercase().required(),
  trackingCode:   Joi.string().trim().uppercase().optional(),
  action_type:    Joi.string().valid('AI_REROUTE','RETURN','LIQUIDATE').optional(),
  actionType:     Joi.string().valid('AI_REROUTE','RETURN','LIQUIDATE').optional(),
  reason:         Joi.string().max(500).allow(null,'').optional(),
}).or('action_type','actionType');

module.exports = { agingQuerySchema, inventoryActionSchema };
