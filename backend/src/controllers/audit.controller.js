const AuditSession = require('../models/auditSession.model');
const { startAuditSchema, syncAuditSchema, approveAuditSchema } = require('../validations/audit.validation');
const { startAuditSession, syncAuditScan } = require('../services/auditCore.service');

// POST /api/audit/start
exports.startAudit = async (req, res) => {
  try {
    const { error, value } = startAuditSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });
    const scopeType  = value.scope_type  || value.scopeType  || 'ALL';
    const scopeValue = value.scope_value || value.scopeValue || null;
    const result = await startAuditSession({ operator: req.user, scopeType, scopeValue });
    return res.status(201).json({ success: true, message: 'Phiên kiểm kê đã được tạo', data: result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message, code: err.code || 'AUDIT_ERROR' });
  }
};

// POST /api/audit/sync
exports.syncAudit = async (req, res) => {
  try {
    const { error, value } = syncAuditSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message, code: 'VALIDATION_ERROR' });
    const sessionCode     = value.session_code     || value.sessionCode;
    const trackingCodes   = value.tracking_codes   || value.trackingCodes || [];
    const sealCode        = value.seal_code        || value.sealCode      || null;
    const sealCodes       = value.seal_codes       || value.sealCodes     || [];
    const autoRelocateZone = value.auto_relocate_zone ?? value.autoRelocateZone ?? false;
    const clientOfflineId = value.client_offline_id || value.clientOfflineId || null;
    const isFinalSync     = value.is_final_sync    || value.isFinalSync    || false;
    const result = await syncAuditScan({
      sessionCode,
      trackingCodes,
      sealCode,
      sealCodes,
      autoRelocateZone,
      operator: req.user,
      clientOfflineId,
      isFinalSync,
    });
    const msg = isFinalSync ? 'Phiên kiểm kê hoàn tất, chờ phê duyệt' : `Đã đồng bộ ${result.added_count} mã`;
    return res.status(200).json({ success: true, message: msg, data: result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message, code: err.code || 'AUDIT_ERROR' });
  }
};

// POST /api/audit/:sessionCode/pause
exports.pauseAudit = async (req, res) => {
  try {
    const sessionCode = (req.params.sessionCode || '').toUpperCase();
    const session = await AuditSession.findOne({ sessionCode });
    if (!session) return res.status(404).json({ success: false, message: `Phiên ${sessionCode} không tồn tại`, code: 'SESSION_NOT_FOUND' });
    if (session.status !== 'IN_PROGRESS') return res.status(409).json({ success: false, message: `Phiên không ở trạng thái IN_PROGRESS`, code: 'SESSION_NOT_ACTIVE' });
    await AuditSession.findOneAndUpdate({ _id: session._id }, { $set: { status: 'PAUSED', pausedAt: new Date() } });
    return res.status(200).json({ success: true, message: 'Phiên kiểm kê đã tạm dừng', data: { session_code: sessionCode, status: 'PAUSED', scanned_count: session.scannedItems.length } });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message, code: err.code || 'AUDIT_ERROR' });
  }
};

// POST /api/audit/:sessionCode/resume
exports.resumeAudit = async (req, res) => {
  try {
    const sessionCode = (req.params.sessionCode || '').toUpperCase();
    const session = await AuditSession.findOne({ sessionCode });
    if (!session) return res.status(404).json({ success: false, message: `Phiên ${sessionCode} không tồn tại`, code: 'SESSION_NOT_FOUND' });
    if (session.status !== 'PAUSED') return res.status(409).json({ success: false, message: `Phiên không ở trạng thái PAUSED`, code: 'SESSION_NOT_PAUSED' });
    await AuditSession.findOneAndUpdate({ _id: session._id }, { $set: { status: 'IN_PROGRESS', resumedAt: new Date() } });
    return res.status(200).json({ success: true, message: 'Phiên kiểm kê đã tiếp tục', data: { session_code: sessionCode, status: 'IN_PROGRESS', scanned_count: session.scannedItems.length } });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message, code: err.code || 'AUDIT_ERROR' });
  }
};

// POST /api/audit/:sessionCode/submit (alias finalSync qua param)
exports.submitAudit = async (req, res) => {
  try {
    const sessionCode = (req.params.sessionCode || '').toUpperCase();
    const result = await syncAuditScan({
      sessionCode,
      trackingCodes: [],  // submit không cần thêm mã mới
      operator: req.user,
      isFinalSync: true,
    });
    return res.status(200).json({ success: true, message: 'Phiên kiểm kê hoàn tất, chờ phê duyệt', data: result });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message, code: err.code || 'AUDIT_ERROR' });
  }
};

// POST /api/audit/:sessionCode/approve — chỉ HUB_COORDINATOR/ADMIN
exports.approveAudit = async (req, res) => {
  try {
    const sessionCode = (req.params.sessionCode || '').toUpperCase();
    const session = await AuditSession.findOne({ sessionCode });
    if (!session) return res.status(404).json({ success: false, message: `Phiên ${sessionCode} không tồn tại`, code: 'SESSION_NOT_FOUND' });
    if (session.status !== 'PENDING_APPROVAL') return res.status(409).json({ success: false, message: `Phiên chưa ở trạng thái PENDING_APPROVAL`, code: 'SESSION_NOT_PENDING' });
    const now = new Date();
    const updated = await AuditSession.findOneAndUpdate(
      { _id: session._id, status: 'PENDING_APPROVAL' },
      { $set: { status: 'APPROVED', approvedBy: req.user._id || req.user.id, approvedAt: now } },
      { returnDocument: 'after' }
    );
    return res.status(200).json({
      success: true,
      message: `Phiên kiểm kê ${sessionCode} đã được phê duyệt`,
      data: { session_code: sessionCode, status: 'APPROVED', approved_at: now, approved_by: req.user._id || req.user.id },
    });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message, code: err.code || 'AUDIT_ERROR' });
  }
};
