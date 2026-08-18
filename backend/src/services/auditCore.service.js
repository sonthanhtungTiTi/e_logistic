/**
 * UC-18 Audit Core Service (Enhanced)
 * Triết lý: atomic riêng lẻ, setImmediate log, không Transaction.
 * Tích hợp: Kiểm kê theo Seal, Cảnh báo Hàng sai Zone, Loại trừ Hàng xuất kho, Tự động Phục hồi Hàng thất lạc & Báo cáo Giá trị Thất thoát.
 */
const { emitInventoryUpdate } = require('../lib/ioSingleton');
const mongoose = require('mongoose');
const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');
const AuditSession = require('../models/auditSession.model');
const Bag = require('../models/bag.model');
const Trip = require('../models/trip.model');

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
 * Hỗ trợ quét đơn lẻ, quét theo Seal bao tải, phát hiện sai Zone & phục hồi hàng thất lạc.
 * isFinalSync = true → tính kết quả và cập nhật trạng thái đơn hàng.
 */
async function syncAuditScan({
  sessionCode,
  trackingCodes = [],
  sealCode = null,
  sealCodes = [],
  autoRelocateZone = false,
  operator,
  clientOfflineId = null,
  isFinalSync = false,
}) {
  const hubId = operator?.hubId || operator?.hub_id;
  if (!hubId) throw { status: 403, message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào', code: 'HUB_UNASSIGNED' };

  const session = await AuditSession.findOne({ sessionCode: sessionCode.toUpperCase() });
  if (!session) throw { status: 404, message: `Phiên kiểm kê ${sessionCode} không tồn tại`, code: 'SESSION_NOT_FOUND' };
  if (!['IN_PROGRESS', 'PAUSED'].includes(session.status)) {
    throw { status: 409, message: `Phiên kiểm kê đang ở trạng thái [${session.status}], không thể đồng bộ`, code: 'SESSION_NOT_ACTIVE' };
  }

  // ── 1. GIẢI NÉN MÃ SEAL NẾU CÓ (SEAL BAG AUDIT) ───────────────────────────
  const combinedSealCodes = [
    ...(sealCode ? [sealCode.trim().toUpperCase()] : []),
    ...(Array.isArray(sealCodes) ? sealCodes.map(s => s.trim().toUpperCase()) : []),
  ];

  let expandedSealItemsCount = 0;
  const directCodes = (trackingCodes || []).map(c => c.toUpperCase());
  const allCodesToProcess = [...directCodes];

  if (combinedSealCodes.length > 0) {
    const bags = await Bag.find({ sealCode: { $in: combinedSealCodes } }).lean();
    for (const bag of bags) {
      if (Array.isArray(bag.trackingCodes)) {
        for (const code of bag.trackingCodes) {
          const upperCode = code.toUpperCase();
          if (!allCodesToProcess.includes(upperCode)) {
            allCodesToProcess.push(upperCode);
            expandedSealItemsCount++;
          }
        }
      }
    }
  }

  const newItems = [];
  const skippedDuplicate = [];
  const skippedNewInbound = []; // Nhập kho SAU startedAt → bỏ qua
  const recoveredItems = [];    // Hàng thất lạc tìm thấy lại
  const misplacedItems = [];    // Hàng để sai khu vực Zone

  const now = new Date();

  for (const code of allCodesToProcess) {
    // Idempotency trong phạm vi session
    if (clientOfflineId) {
      const alreadyInSession = session.scannedItems.some(i => i.clientOfflineId === clientOfflineId && i.trackingCode === code);
      if (alreadyInSession) { skippedDuplicate.push(code); continue; }
    }
    if (session.scannedItems.some(i => i.trackingCode === code)) {
      skippedDuplicate.push(code);
      continue;
    }

    const order = await Order.findOne({ trackingCode: code }).lean();

    // Bỏ qua hàng nhập kho SAU khi phiên bắt đầu
    if (order && order.hubInboundAt && order.hubInboundAt > session.startedAt) {
      skippedNewInbound.push(code);
      continue;
    }

    // ── 2. TỰ ĐỘNG PHỤC HỒI HÀNG THẤT LẠC (LOST ITEM RECOVERY) ───────────────
    if (order && (order.status === 'SEARCH_ZONE' || order.status === 'SUSPECTED_LOST')) {
      const isOrigin = !!(order.originHubId && order.originHubId.toString() === hubId.toString());
      const recoveredStatus = isOrigin ? 'IN_HUB_ORIGIN' : 'IN_SORTING_HUB';

      await Order.findOneAndUpdate(
        { _id: order._id, status: order.status },
        {
          $set: {
            status: recoveredStatus,
            isFlagged: false,
            lostSearchDeadlineAt: null,
            searchZoneEnteredAt: null,
            updatedAt: now,
          }
        }
      );

      recoveredItems.push({
        trackingCode: code,
        previousStatus: order.status,
        recoveredStatus,
      });

      setImmediate(async () => {
        try {
          await OrderLog.create({
            orderId: order._id,
            trackingCode: order.trackingCode,
            preStatus: order.status,
            postStatus: recoveredStatus,
            actionType: 'AUDIT_SCAN',
            actionBy: operator._id || operator.id,
            hubId,
            note: `[Kiểm kê ${sessionCode}] 🎉 Đã tìm thấy kiện hàng thất lạc -> Phục hồi sang ${recoveredStatus}`,
            metadata: { sessionCode, type: 'RECOVERED' },
          });
          emitInventoryUpdate(hubId, { type: 'STATUS_CHANGED', trackingCode: order.trackingCode, newStatus: recoveredStatus, hubId });
        } catch (e) { console.error('[AUDIT_RECOVERY_LOG]', e.message); }
      });
    }

    // ── 3. PHÁT HIỆN HÀNG ĐỂ SAI ZONE (MISPLACED ZONE DETECTION) ────────────
    if (order && session.scope?.type === 'ZONE' && session.scope?.value) {
      const expectedZoneIdStr = session.scope.value.toString();
      const currentZoneIdStr = order.currentZoneId ? order.currentZoneId.toString() : null;

      if (currentZoneIdStr && currentZoneIdStr !== expectedZoneIdStr) {
        misplacedItems.push({
          trackingCode: code,
          expectedZoneId: session.scope.value,
          actualZoneId: order.currentZoneId,
          relocated: autoRelocateZone,
        });

        if (autoRelocateZone) {
          await Order.updateOne({ _id: order._id }, { $set: { currentZoneId: new mongoose.Types.ObjectId(session.scope.value) } });
        }
      }
    }

    newItems.push({ trackingCode: code, scannedAt: now, clientOfflineId: clientOfflineId || null });
  }

  // Atomic push vào scannedItems
  if (newItems.length > 0) {
    await AuditSession.findOneAndUpdate(
      { _id: session._id },
      { $push: { scannedItems: { $each: newItems } } }
    );
  }

  if (!isFinalSync) {
    const updated = await AuditSession.findById(session._id).lean();
    return {
      session_code: session.sessionCode, sessionCode: session.sessionCode,
      added_count: newItems.length, addedCount: newItems.length,
      total_scanned: updated.scannedItems.length, totalScanned: updated.scannedItems.length,
      skipped_duplicate: skippedDuplicate.length, skippedDuplicate: skippedDuplicate.length,
      skipped_new_inbound: skippedNewInbound.length, skippedNewInbound: skippedNewInbound.length,
      expanded_seal_items_count: expandedSealItemsCount, expandedSealItemsCount,
      recovered_items: recoveredItems, recoveredItems,
      misplaced_items: misplacedItems, misplacedItems,
      is_final: false, isFinal: false,
    };
  }

  // ── 4. FINAL SYNC: Tính kết quả & Loại trừ hàng đã xuất kho hợp lệ ────────
  const freshSession = await AuditSession.findById(session._id).lean();
  const scannedCodes = new Set(freshSession.scannedItems.map(i => i.trackingCode.toUpperCase()));
  const snapshotSet  = new Set(freshSession.snapshotTrackingCodes.map(c => c.toUpperCase()));

  const rawMissingCodes = [...snapshotSet].filter(c => !scannedCodes.has(c));
  const surplusCodes    = [...scannedCodes].filter(c => !snapshotSet.has(c));
  const matchedCount    = [...snapshotSet].filter(c => scannedCodes.has(c)).length;

  // ── 4.1 LOẠI TRỪ HÀNG VỪA XUẤT KHO TRONG THỜI GIAN KIỂM KÊ ────────────────
  const genuinelyMissingCodes = [];
  const dispatchedOutboundCodes = [];

  for (const code of rawMissingCodes) {
    const o = await Order.findOne({ trackingCode: code }, 'status currentTripId updatedAt goodsValue').lean();
    if (!o) continue;

    // Nếu đơn đã chuyển sang trạng thái đang vận chuyển hoặc giao hàng
    const isDispatchedStatus = ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status);
    let isDispatchedTrip = false;

    if (o.currentTripId) {
      const trip = await Trip.findById(o.currentTripId, 'status updatedAt').lean();
      if (trip && ['CONFIRMED', 'DEPARTED', 'ARRIVED'].includes(trip.status)) {
        isDispatchedTrip = true;
      }
    }

    if (isDispatchedStatus || isDispatchedTrip) {
      dispatchedOutboundCodes.push(code); // Hàng đã xuất kho hợp lệ -> Bỏ qua
    } else {
      genuinelyMissingCodes.push(code);   // Hàng thiếu thực tế
    }
  }

  // ── 4.2 TÍNH TỔNG GIÁ TRỊ THẤT THOÁT TIỀN HÀNG (LOSS VALUATION VND) ───────
  let missingTotalValueVnd = 0;
  for (const code of genuinelyMissingCodes) {
    const o = await Order.findOne({ trackingCode: code }, 'status goodsValue').lean();
    if (!o) continue;
    missingTotalValueVnd += Number(o.goodsValue) || 0;

    // Missing -> SEARCH_ZONE (atomic OCC)
    const updated = await Order.findOneAndUpdate(
      { _id: o._id, status: o.status },
      { $set: { status: 'SEARCH_ZONE', searchZoneEnteredAt: now, updatedAt: now } },
      { returnDocument: 'after' }
    );
    if (!updated) continue;

    setImmediate(async () => {
      try {
        await OrderLog.create({
          orderId: o._id, trackingCode: o.trackingCode,
          preStatus: o.status, postStatus: 'SEARCH_ZONE',
          actionType: 'AUDIT_SCAN',
          actionBy: operator._id || operator.id,
          hubId,
          note: `[Kiểm kê ${sessionCode}] Hàng thiếu -> SEARCH_ZONE`,
          metadata: { sessionCode, type: 'MISSING', goodsValue: o.goodsValue },
        });
        emitInventoryUpdate(hubId, { type: 'STATUS_CHANGED', trackingCode: o.trackingCode, newStatus: 'SEARCH_ZONE', hubId });
      } catch (e) { console.error('[AUDIT_MISSING_LOG]', e.message); }
    });
  }

  // Surplus -> SURPLUS (atomic OCC)
  for (const code of surplusCodes) {
    const o = await Order.findOne({ trackingCode: code }).lean();
    if (!o) continue;
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
          note: `[Kiểm kê ${sessionCode}] Hàng dư -> SURPLUS`,
          metadata: { sessionCode, type: 'SURPLUS' },
        });
        emitInventoryUpdate(hubId, { type: 'STATUS_CHANGED', trackingCode: o.trackingCode, newStatus: 'SURPLUS', hubId });
      } catch (e) { console.error('[AUDIT_SURPLUS_LOG]', e.message); }
    });
  }

  // Lưu kết quả hoàn thiện vào AuditSession
  const result = {
    matchedCount,
    missingTrackingCodes: genuinelyMissingCodes,
    surplusTrackingCodes: surplusCodes,
    dispatchedOutboundCodes,
    missingTotalValueVnd,
    overdueTrackingCodes: [],
    misplacedItems,
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
    missing_count: genuinelyMissingCodes.length, missingCount: genuinelyMissingCodes.length,
    surplus_count: surplusCodes.length, surplusCount: surplusCodes.length,
    dispatched_outbound_count: dispatchedOutboundCodes.length, dispatchedOutboundCount: dispatchedOutboundCodes.length,
    missing_total_value_vnd: missingTotalValueVnd, missingTotalValueVnd,
    missing_tracking_codes: genuinelyMissingCodes, missingTrackingCodes: genuinelyMissingCodes,
    surplus_tracking_codes: surplusCodes, surplusTrackingCodes: surplusCodes,
    dispatched_outbound_codes: dispatchedOutboundCodes, dispatchedOutboundCodes: dispatchedOutboundCodes,
    misplaced_items: misplacedItems, misplacedItems,
    recovered_items: recoveredItems, recoveredItems,
  };
}

module.exports = { startAuditSession, syncAuditScan };
