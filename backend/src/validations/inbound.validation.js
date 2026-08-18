const Joi = require('joi');

// ── Schema cũ (KHÔNG thay đổi) ──────────────────────────────────────────
const singleInboundSchema = Joi.object({
  tracking_code: Joi.string().trim().uppercase().optional(),
  trackingCode: Joi.string().trim().uppercase().optional(),
  package_condition: Joi.string().valid('INTACT', 'DAMAGED', 'TORN_SEAL').default('INTACT'),
  condition: Joi.string().valid('INTACT', 'DAMAGED', 'TORN_SEAL').default('INTACT'),
  note: Joi.string().max(255).allow('', null),
  hub_id: Joi.any().strip(),  // Strip IDOR
  hubId: Joi.any().strip(),
  // Các field mới (optional, backward compatible)
  hub_measured_weight: Joi.number().positive().allow(null).optional(),
  hubMeasuredWeight: Joi.number().positive().allow(null).optional(),
  client_offline_id: Joi.string().max(128).allow(null).optional(),
  clientOfflineId: Joi.string().max(128).allow(null).optional(),
}).or('tracking_code', 'trackingCode');

const batchInboundSchema = Joi.object({
  tracking_codes: Joi.array().items(Joi.string().trim().uppercase()).min(1).max(100).optional(),
  trackingCodes: Joi.array().items(Joi.string().trim().uppercase()).min(1).max(100).optional(),
  package_condition: Joi.string().valid('INTACT', 'DAMAGED').default('INTACT'),
  condition: Joi.string().valid('INTACT', 'DAMAGED').default('INTACT'),
  hub_id: Joi.any().strip(),
  hubId: Joi.any().strip()
}).or('tracking_codes', 'trackingCodes');

// ── Schema mới ───────────────────────────────────────────────────────────
const sealScanSchema = Joi.object({
  seal_code: Joi.string().trim().uppercase().optional(),
  sealCode: Joi.string().trim().uppercase().optional(),
  client_offline_id: Joi.string().max(128).allow(null).optional(),
  clientOfflineId: Joi.string().max(128).allow(null).optional(),
}).or('seal_code', 'sealCode');

const incidentSchema = Joi.object({
  tracking_code: Joi.string().trim().uppercase().optional(),
  trackingCode: Joi.string().trim().uppercase().optional(),
  photo_urls: Joi.array().items(Joi.string().uri()).max(10).default([]),
  photoUrls: Joi.array().items(Joi.string().uri()).max(10).default([]),
  note: Joi.string().max(1000).allow('', null),
}).or('tracking_code', 'trackingCode');

module.exports = { singleInboundSchema, batchInboundSchema, sealScanSchema, incidentSchema };
