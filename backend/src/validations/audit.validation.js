const Joi = require('joi');

const startAuditSchema = Joi.object({
  scope_type: Joi.string().valid('ALL','ZONE','DESTINATION','DATE_RANGE').default('ALL'),
  scopeType:  Joi.string().valid('ALL','ZONE','DESTINATION','DATE_RANGE').optional(),
  scope_value: Joi.alternatives().try(Joi.string(), Joi.object()).allow(null,'').optional(),
  scopeValue:  Joi.alternatives().try(Joi.string(), Joi.object()).allow(null,'').optional(),
});

const syncAuditSchema = Joi.object({
  session_code:     Joi.string().trim().uppercase().optional(),
  sessionCode:      Joi.string().trim().uppercase().optional(),
  // tracking_codes có thể rỗng khi is_final_sync=true (chỉ tính kết quả, không thêm mã)
  tracking_codes:   Joi.array().items(Joi.string().trim().uppercase()).min(0).max(500).optional(),
  trackingCodes:    Joi.array().items(Joi.string().trim().uppercase()).min(0).max(500).optional(),
  seal_code:        Joi.string().trim().uppercase().allow(null,'').optional(),
  sealCode:         Joi.string().trim().uppercase().allow(null,'').optional(),
  seal_codes:       Joi.array().items(Joi.string().trim().uppercase()).max(50).optional(),
  sealCodes:        Joi.array().items(Joi.string().trim().uppercase()).max(50).optional(),
  auto_relocate_zone: Joi.boolean().default(false),
  autoRelocateZone:   Joi.boolean().optional(),
  client_offline_id: Joi.string().max(128).allow(null,'').optional(),
  clientOfflineId:   Joi.string().max(128).allow(null,'').optional(),
  is_final_sync:    Joi.boolean().default(false),
  isFinalSync:      Joi.boolean().optional(),
}).or('session_code','sessionCode');

const approveAuditSchema = Joi.object({
  note: Joi.string().max(500).allow(null,'').optional(),
});

module.exports = { startAuditSchema, syncAuditSchema, approveAuditSchema };
