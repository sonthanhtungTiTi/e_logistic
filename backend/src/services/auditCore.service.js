/**
 * UC-18 Audit Core Service
 * Triết lý: atomic riêng lẻ, setImmediate log, không Transaction.
 */
const { emitInventoryUpdate } = require('../lib/ioSingleton');
const mongoose = require('mongoose');
const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');
const AuditSession = require('../models/auditSession.model');

// Các status nghĩa là "hàng đang ở trong kho" — dùng để tạo snapshot
const HUB_STOCK_STATUSES = [
  'IN_HUB_ORIGIN', 'INBOUND_HUB',
  'IN_SORTING_HUB', 'SORTING',
  'IN_HUB_DEST', 'INBOUND_HUB_DEST',
];

/**
 * Bắt đầu phiên kiểm kê — tạo snapshot tại thời điểm startedAt
 */
async function startAuditSession({ operator, scopeType = 'ALL', scopeValue = null }) {
  const hubId = operator?.hubId || operator?.hub_id;
  if (!hubId) throw { status: 403, message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào', code: 'HUB_UNASSIGNED' };

  const startedAt = new Date();

  // Xây dựng query theo scope
  const query = { currentHubId: hubId, status: { $in: HUB_STOCK_STATUSES } };
  if (scopeType === 'ZONE' && scopeValue) query.currentZoneId = new mongoose.Types.ObjectId(scopeValue);
  if (scopeType === 'DESTINATION' && scopeValue) query.destinationHubId = new mongoose.Types.ObjectId(scopeValue);
  if (scopeType === 'DATE_RANGE' && scopeValue?.from) {
    query.createdAt = { $gte: new Date(scopeValue.from), $lte: scopeValue.to ? new Date(scopeValue.to) : new Date() };
  }

  const orders = await Order.find(query, 'trackingCode').lean();
  const snapshotCodes = orders.map(o => o.trackingCode.toUpperCase());

  const sessionCode = `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const session = await AuditSession.create({
    sessionCode,
    hubId,
    scope: { type: scopeType, value: scopeValue },
    startedBy: operator._id || operator.id,
    startedAt,
    snapshotTrackingCodes: snapshotCodes,
    status: 'IN_PROGRESS',
  });

  return {
    session_code: session.sessionCode, sessionCode: session.sessionCode,
    hub_id: hubId, hubId,
    scope_type: scopeType, scopeType,
    snapshot_count: snapshotCodes.length, snapshotCount: snapshotCodes.length,
    started_at: startedAt, startedAt,
    status: session.status,
  };
}

/**
 * Đồng bộ danh sách quét vào phiên kiểm kê.
 * isFinalSync = true → tính kết quả và cập nhật trạng thái đơn hàng.
 */
async function syncAuditScan({ sessionCode, trackingCodes, operator, clientOfflineId = null, isFinalSync = false }) {
  const hubId = operator?.hubId || operator?.hub_id;
  if (!hubId) throw { status: 403, message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào', code: 'HUB_UNASSIGNED' };

  const session = await AuditSession.findOne({ sessionCode: sessionCode.toUpperCase() });
  if (!session) throw { status: 404, message: `Phiên kiểm kê ${sessionCode} không tồn tại`, code: 'SESSION_NOT_FOUND' };
  if (!['IN_PROGRESS', 'PAUSED'].includes(session.status)) {
    throw { status: 409, message: `Phiên kiểm kê đang ở trạng thái [${session.status}], không thể đồng bộ`, code: 'SESSION_NOT_ACTIVE' };
  }

  const codes = (trackingCodes || []).map(c => c.toUpperCase());
  const newItems = [];
  const skippedDuplicate = [];
  const skippedNewInbound = []; // Nhập kho SAU startedAt → bỏ qua

  for (const code of codes) {
    // Idempotency trong phạm vi session: check clientOfflineId trong scannedItems
    if (clientOfflineId) {
      const alreadyInSession = session.scannedItems.some(i => i.clientOfflineId === clientOfflineId && i.trackingCode === code);
      if (alreadyInSession) { skippedDuplicate.push(code); continue; }
    }
    // Nếu đã có trong scannedItems (theo trackingCode)
    if (session.scannedItems.some(i => i.trackingCode === code)) {
      skippedDuplicate.push(code);
      continue;
    }

    // Bỏ qua hàng nhập kho SAU khi phiên bắt đầu (không đưa vào snapshot)
    const order = await Order.findOne({ trackingCode: code }, 'hubInboundAt').lean();
    if (order && order.hubInboundAt && order.hubInboundAt > session.startedAt) {
      skippedNewInbound.push(code);
      continue;
    }

    newItems.push({ trackingCode: code, scannedAt: new Date(), clientOfflineId: clientOfflineId || null });
  }

  // Atomic push vào scannedItems
  if (newItems.length > 0) {
    await AuditSession.findOneAndUpdate(
      { _id: session._id },
      { $push: { scannedItems: { $each: newItems } } }
    );
  }

  if (!isFinalSync) {
    // Tải lại session để có count chính xác
    const updated = await AuditSession.findById(session._id).lean();
    return {
      session_code: session.sessionCode, sessionCode: session.sessionCode,
      added_count: newItems.length, addedCount: newItems.length,
      total_scanned: updated.scannedItems.length, totalScanned: updated.scannedItems.length,
      skipped_duplicate: skippedDuplicate.length, skippedDuplicate: skippedDuplicate.length,
      skipped_new_inbound: skippedNewInbound.length, skippedNewInbound: skippedNewInbound.length,
      is_final: false, isFinal: false,
    };
  }

  // ── FINAL SYNC: Tính kết quả & cập nhật trạng thái ────────────────────────
  const freshSession = await AuditSession.findById(session._id).lean();
  const scannedCodes = new Set(freshSession.scannedItems.map(i => i.trackingCode.toUpperCase()));
  const snapshotSet  = new Set(freshSession.snapshotTrackingCodes.map(c => c.toUpperCase()));

  const missingCodes  = [...snapshotSet].filter(c => !scannedCodes.has(c));  // Có trong snapshot, không quét được
  const surplusCodes  = [...scannedCodes].filter(c => !snapshotSet.has(c));  // Quét được, không có trong snapshot
  const matchedCount  = [...snapshotSet].filter(c => scannedCodes.has(c)).length;

  const now = new Date();

  // Missing → SEARCH_ZONE (atomic OCC)
  for (const code of missingCodes) {
    const o = await Order.findOne({ trackingCode: code }).lean();
    if (!o) continue;
    const updated = await Order.findOneAndUpdate(
      { _id: o._id, status: o.status },
      { $set: { status: 'SEARCH_ZONE', searchZoneEnteredAt: now, updatedAt: now } },
      { returnDocument: 'after' }
    );
    if (!updated) continue; // Race condition — bỏ qua
    setImmediate(async () => {
      try {
        await OrderLog.create({
          orderId: o._id, trackingCode: o.trackingCode,
          preStatus: o.status, postStatus: 'SEARCH_ZONE',
          actionType: 'AUDIT_SCAN',
          actionBy: operator._id || operator.id,
          hubId,
          note: `[Kiểm kê ${sessionCode}] Hàng thiếu → SEARCH_ZONE`,
          metadata: { sessionCode, type: 'MISSING' },
        });
        emitInventoryUpdate(hubId, { type: 'STATUS_CHANGED', trackingCode: o.trackingCode, newStatus: 'SEARCH_ZONE', hubId });
      } catch (e) { console.error('[AUDIT_MISSING_LOG]', e.message); }
    });
  }

  // Surplus → SURPLUS (atomic OCC)
  for (const code of surplusCodes) {
    const o = await Order.findOne({ trackingCode: code }).lean();
    if (!o) continue;
    // Kiểm tra lại: nếu nhập kho SAU startedAt thì không phải surplus thật
    if (o.hubInboundAt && o.hubInboundAt > freshSession.startedAt) continue;
    await Order.findOneAndUpdate(
      { _id: o._id, status: o.status },
      { $set: { status: 'SURPLUS', updatedAt: now } },
      { returnDocument: 'after' }
    );
    setImmediate(async () => {
      try {
        await OrderLog.create({
          orderId: o._id, trackingCode: o.trackingCode,
          preStatus: o.status, postStatus: 'SURPLUS',
          actionType: 'AUDIT_SCAN',
          actionBy: operator._id || operator.id,
          hubId,
          note: `[Kiểm kê ${sessionCode}] Hàng dư → SURPLUS`,
          metadata: { sessionCode, type: 'SURPLUS' },
        });
        emitInventoryUpdate(hubId, { type: 'STATUS_CHANGED', trackingCode: o.trackingCode, newStatus: 'SURPLUS', hubId });
      } catch (e) { console.error('[AUDIT_SURPLUS_LOG]', e.message); }
    });
  }

  // Lưu kết quả vào AuditSession
  const result = {
    matchedCount,
    missingTrackingCodes: missingCodes,
    surplusTrackingCodes: surplusCodes,
    overdueTrackingCodes: [], // TODO: tính overdue theo SLA nếu cần
  };
  await AuditSession.findOneAndUpdate(
    { _id: session._id },
    { $set: { status: 'PENDING_APPROVAL', result, completedAt: now, submittedBy: operator._id || operator.id } }
  );

  return {
    session_code: session.sessionCode, sessionCode: session.sessionCode,
    is_final: true, isFinal: true,
    status: 'PENDING_APPROVAL',
    matched_count: matchedCount, matchedCount,
    missing_count: missingCodes.length, missingCount: missingCodes.length,
    surplus_count: surplusCodes.length, surplusCount: surplusCodes.length,
    missing_tracking_codes: missingCodes, missingTrackingCodes: missingCodes,
    surplus_tracking_codes: surplusCodes, surplusTrackingCodes: surplusCodes,
  };
}

module.exports = { startAuditSession, syncAuditScan };
