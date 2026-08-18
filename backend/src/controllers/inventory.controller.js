const {
  agingQuerySchema,
  inventoryActionSchema,
  batchInventoryActionSchema,
  createTripFromStockSchema,
} = require('../validations/inventory.validation');
const svc = require('../services/inventoryCore.service');

exports.getAging = async (req, res) => {
  try {
    const { error, value } = agingQuerySchema.validate(req.query);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });
    const hubId  = value.hub_id  || value.hubId  || req.user?.hubId?.toString();
    const zoneId = value.zone_id || value.zoneId || null;
    const destinationHubId = value.destination_hub_id || value.destinationHubId || null;
    const agingStatus = value.aging_status || value.agingStatus || 'ALL';
    const search = value.search || null;
    const dwellRange = value.dwell_range || value.dwellRange || 'ALL';

    const result = await svc.getAgingList({
      hubId,
      zoneId,
      destinationHubId,
      agingStatus,
      search,
      dwellRange,
      page: value.page,
      limit: value.limit,
      sortBy: value.sort,
      statusFilter: value.status || null,
    });
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

exports.getTripSuggestions = async (req, res) => {
  try {
    const hubId = req.query.hub_id || req.query.hubId || req.user?.hubId?.toString();
    if (!hubId) return res.status(400).json({ success: false, message: 'Thiếu hub_id', code: 'MISSING_HUB_ID' });
    const result = await svc.getTripSuggestions(hubId);
    return res.status(200).json({ success: true, message: 'Gợi ý chuyến xe từ tồn kho', data: result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message, code: err.code || 'INVENTORY_ERROR' });
  }
};

exports.createTripFromStock = async (req, res) => {
  try {
    const { error, value } = createTripFromStockSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });

    const destinationHubId = value.destination_hub_id || value.destinationHubId;
    const trackingCodes    = value.tracking_codes    || value.trackingCodes;
    const tripType         = value.trip_type         || value.tripType || 'MID_MILE_TRANSFER';

    const result = await svc.createTripFromStock({
      destinationHubId,
      trackingCodes,
      tripType,
      operator: req.user,
    });
    return res.status(201).json({ success: true, message: `Đã tạo chuyến xe [${result.trip_code}] thành công`, data: result });
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

exports.performBatchAction = async (req, res) => {
  try {
    const { error, value } = batchInventoryActionSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });
    const trackingCodes = value.tracking_codes || value.trackingCodes;
    const actionType    = value.action_type    || value.actionType;
    const result = await svc.performBatchAction({ trackingCodes, actionType, reason: value.reason, operator: req.user });
    return res.status(200).json({ success: true, message: `Đã xử lý lô ${result.total} kiện (${result.success_count} thành công)`, data: result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message, code: err.code || 'INVENTORY_ERROR' });
  }
};
