const { agingQuerySchema, inventoryActionSchema } = require('../validations/inventory.validation');
const svc = require('../services/inventoryCore.service');

exports.getAging = async (req, res) => {
  try {
    const { error, value } = agingQuerySchema.validate(req.query);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });
    const hubId  = value.hub_id  || value.hubId  || req.user?.hubId?.toString();
    const zoneId = value.zone_id || value.zoneId || null;
    const agingStatus = value.aging_status || value.agingStatus || 'ALL';
    const result = await svc.getAgingList({ hubId, zoneId, agingStatus, page: value.page, limit: value.limit, sortBy: value.sort, statusFilter: value.status || null });
    return res.status(200).json({ success: true, message: 'Danh sách tồn kho', data: result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message, code: err.code || 'INVENTORY_ERROR' });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const hubId = req.query.hub_id || req.query.hubId || req.user?.hubId?.toString();
    if (!hubId) return res.status(400).json({ success: false, message: 'Thiếu hub_id', code: 'MISSING_HUB_ID' });
    const result = await svc.getSummary(hubId);
    return res.status(200).json({ success: true, message: 'Tổng hợp tồn kho', data: result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message, code: err.code || 'INVENTORY_ERROR' });
  }
};

exports.getMovementHistory = async (req, res) => {
  try {
    const trackingCode = (req.params.trackingCode || '').trim().toUpperCase();
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await svc.getMovementHistory({ trackingCode, page, limit });
    return res.status(200).json({ success: true, message: 'Lịch sử di chuyển', data: result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message, code: err.code || 'INVENTORY_ERROR' });
  }
};

exports.exportInventory = async (req, res) => {
  try {
    const hubId = req.query.hub_id || req.query.hubId || req.user?.hubId?.toString();
    const agingStatus = req.query.aging_status || 'ALL';
    const format = (req.query.format || 'json').toLowerCase();
    if (!hubId) return res.status(400).json({ success: false, message: 'Thiếu hub_id', code: 'MISSING_HUB_ID' });
    const result = await svc.exportInventory({ hubId, agingStatus, format });
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=inventory_${hubId}_${Date.now()}.csv`);
      return res.status(200).send(result.content);
    }
    return res.status(200).json({ success: true, message: 'Export tồn kho', data: result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message, code: err.code || 'INVENTORY_ERROR' });
  }
};

exports.performAction = async (req, res) => {
  try {
    const { error, value } = inventoryActionSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });
    const trackingCode = value.tracking_code || value.trackingCode;
    const actionType   = value.action_type   || value.actionType;
    const result = await svc.performAction({ trackingCode, actionType, reason: value.reason, operator: req.user });
    return res.status(200).json({ success: true, message: `Đã thực hiện ${actionType} thành công`, data: result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message, code: err.code || 'INVENTORY_ERROR' });
  }
};
