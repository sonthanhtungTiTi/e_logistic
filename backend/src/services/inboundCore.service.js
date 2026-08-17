const mongoose = require('mongoose');
const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');
const OrderTrackingLog = require('../models/orderTrackingLog.model');
const Zone = require('../models/zone.model');

// Zone type mapping theo next_action
const NEXT_ACTION_TO_ZONE_TYPE = {
  'SORT_FOR_TRANSIT':     'STAGING_TRANSFER',
  'SORT_FOR_NEXT_HUB':   'STAGING_TRANSFER',
  'WAITING_FOR_DELIVERY': 'STAGING_DELIVERY',
  'WAITING_SELLER_RETURN': 'RETURN',
};

const WEIGHT_TOLERANCE_GRAM = Number(process.env.WEIGHT_TOLERANCE_GRAM) || 50;

/**
 * Tìm hoặc tạo Zone phù hợp, tăng currentCount atomic.
 * Trả về ObjectId của Zone, hoặc null nếu lỗi (không làm nổ flow chính).
 */
async function resolveZone(hubId, zoneType) {
  try {
    const code = `${hubId.toString().slice(-6).toUpperCase()}_${zoneType}`;
    const zone = await Zone.findOneAndUpdate(
      { hubId, zoneType, isActive: true },
      { $inc: { currentCount: 1 }, $setOnInsert: { code, name: `${zoneType} - Hub ${hubId}`, hubId, zoneType } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    return zone._id;
  } catch (err) {
    console.error('[ZONE_RESOLVE_ERROR]', err.message);
    return null;
  }
}

/**
 * Xử lý nhập kho nguyên tử cho 1 đơn hàng (UC-16 Inbound Scan)
 * @param {Object} params
 * @param {String}  params.trackingCode
 * @param {Object}  params.operator           - JWT user: { _id, hubId, role }
 * @param {String}  params.condition          - 'INTACT'|'DAMAGED'|'TORN_SEAL'
 * @param {String}  [params.note]
 * @param {Number}  [params.hubMeasuredWeight] - gram, optional
 * @param {String}  [params.clientOfflineId]  - UUID từ client, idempotency key
 */
async function processInboundSingle({
  trackingCode,
  operator,
  condition = 'INTACT',
  note = '',
  hubMeasuredWeight = null,
  clientOfflineId = null,
}) {
  // ── IDEMPOTENCY CHECK ─────────────────────────────────────────────────────
  // Nếu client gửi lại đúng clientOfflineId đã xử lý → trả cached result ngay
  if (clientOfflineId) {
    const existing = await OrderLog.findOne({ clientOfflineId }).lean();
    if (existing && existing.metadata?.cachedResult) {
      return existing.metadata.cachedResult;
    }
  }

  // ── 1. SECURITY: Lấy hubId từ JWT, không từ client ───────────────────────
  const currentHubId = operator?.hubId || operator?.hub_id || operator?.hub;
  if (!currentHubId) {
    throw { status: 403, message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào', code: 'HUB_UNASSIGNED' };
  }

  const cleanTrackingCode = (trackingCode || '').toString().trim().toUpperCase();
  if (!cleanTrackingCode) {
    throw { status: 400, message: 'Mã vận đơn không được để trống', code: 'INVALID_TRACKING_CODE' };
  }

  // ── 2. Tìm đơn hàng ────────────────────────────────────────────────────────
  const order = await Order.findOne({ trackingCode: cleanTrackingCode });
  if (!order) {
    throw {
      status: 404,
      message: `Mã vận đơn ${cleanTrackingCode} không tồn tại trên hệ thống`,
      code: 'ORDER_NOT_FOUND',
    };
  }

  // ── 3. State Machine & Hub Position Matrix ────────────────────────────────
  // So sánh ObjectId với ObjectId — cả hai đã được migrate về Hub thật.
  // KHÔNG dùng pickupHub/deliveryHub (string code như "HUB_HAN_01") vì khác kiểu dữ liệu.
  let nextStatus = null;
  let nextAction = '';

  // Status Enum Matching Matrix
  const currStatus = order.status;

  const hubStr = currentHubId.toString();

  // Tự động gán Kho gốc nếu đơn hàng mới từ Seller chưa có originHubId
  if (!order.originHubId && (currStatus === 'PICKED_UP' || currStatus === 'PICKED')) {
    order.originHubId = currentHubId;
  }

  const isOriginHub = !!(order.originHubId && order.originHubId.toString() === hubStr);
  const isDestHub   = !!(order.destinationHubId && order.destinationHubId.toString() === hubStr);

  if (currStatus === 'PICKED_UP' || currStatus === 'PICKED') {
    // Kiện hàng vừa lấy từ Seller đưa về Hub lần đầu -> Gán Hub này là Kho gốc tiếp nhận
    order.originHubId = currentHubId;
    nextStatus = 'IN_HUB_ORIGIN';
    nextAction = 'SORT_FOR_TRANSIT';
  } else if (currStatus === 'IN_TRANSIT') {
    if (isDestHub) {
      nextStatus = 'IN_HUB_DEST';
      nextAction = 'WAITING_FOR_DELIVERY';
    } else {
      nextStatus = 'IN_SORTING_HUB';
      nextAction = 'SORT_FOR_NEXT_HUB';
    }
  } else if (currStatus === 'RETURN_IN_TRANSIT' || currStatus === 'RETURNING') {
    if (!isOriginHub) {
      throw {
        status: 400,
        message: `Đơn hàng chuyển hoàn phải được nhập tại Kho gốc. Hub hiện tại (${hubStr}) không phải Kho gốc`,
        code: 'INVALID_STATE_TRANSITION',
      };
    }
    nextStatus = 'RETURNED_TO_HUB_ORIGIN';
    nextAction = 'WAITING_SELLER_RETURN';
  } else {
    throw {
      status: 400,
      message: `Đơn hàng đang ở trạng thái [${currStatus}], không hợp lệ để nhập kho tại Hub này`,
      code: 'INVALID_STATE_TRANSITION',
    };
  }

  // ── 4. Xử lý kiện hàng hư hỏng / rách niêm phong ────────────────────────
  const isDamaged = condition === 'DAMAGED' || condition === 'TORN_SEAL';
  const finalStatus = isDamaged ? 'EXCEPTION_INBOUND' : nextStatus;
  const finalNextAction = isDamaged ? 'EXCEPTION_AREA' : nextAction;

  // ── 5. Weight discrepancy check ─────────────────────────────────────────
  let weightDiscrepancyGram = null;
  let flagFeeWarning = order.flagFeeWarning || false;
  if (hubMeasuredWeight !== null && hubMeasuredWeight !== undefined) {
    weightDiscrepancyGram = Math.round(hubMeasuredWeight - (order.actualWeight * 1000));
    if (Math.abs(weightDiscrepancyGram) > WEIGHT_TOLERANCE_GRAM) {
      flagFeeWarning = true;
    }
  }

  // ── 6. needsManualRouting khi không xác định được hub ──────────────────
  const needsManualRouting = !isOriginHub && !isDestHub && !isDamaged
    ? true
    : order.needsManualRouting || false;

  // ── 7. ATOMIC CONDITIONAL UPDATE — OCC chống Race Condition / Double Scan ─
  const atomicSet = {
    status: finalStatus,
    currentHubId: currentHubId,
    originHubId: order.originHubId || currentHubId,
    isFlagged: isDamaged,
    hubInboundAt: new Date(),
    updatedAt: new Date(),
  };
  if (weightDiscrepancyGram !== null) {
    atomicSet.hubMeasuredWeight = hubMeasuredWeight;
    atomicSet.weightDiscrepancyGram = weightDiscrepancyGram;
    atomicSet.flagFeeWarning = flagFeeWarning;
  }
  if (needsManualRouting !== order.needsManualRouting) {
    atomicSet.needsManualRouting = needsManualRouting;
  }

  const updatedOrder = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status }, // OCC: status vẫn khớp
    { $set: atomicSet },
    { returnDocument: 'after', runValidators: true }
  );

  if (!updatedOrder) {
    throw {
      status: 409,
      message: `Xung đột dữ liệu: Kiện hàng ${cleanTrackingCode} vừa được quét ở tiến trình khác!`,
      code: 'RACE_CONDITION_CONFLICT',
    };
  }

  // ── 8. Zone assignment (atomic riêng lẻ, awaited, không Transaction) ────
  let zoneId = null;
  const zoneType = isDamaged ? 'INCIDENT' : NEXT_ACTION_TO_ZONE_TYPE[finalNextAction] || 'STORAGE';
  zoneId = await resolveZone(currentHubId, zoneType);
  if (zoneId) {
    // Atomic riêng lẻ, không cần OCC ở đây
    await Order.updateOne({ _id: order._id }, { $set: { currentZoneId: zoneId } });
  }

  // ── 9. Build result object (trả trước khi async log) ────────────────────
  const result = {
    tracking_code: updatedOrder.trackingCode,
    trackingCode: updatedOrder.trackingCode,
    previous_status: order.status,
    current_status: updatedOrder.status,
    next_action: finalNextAction,
    is_flagged: isDamaged,
    hub_id: currentHubId,
    hubId: currentHubId,
    weight_discrepancy_gram: weightDiscrepancyGram,
    weightDiscrepancyGram,
    needs_manual_routing: needsManualRouting,
    needsManualRouting,
    zone_id: zoneId,
    zoneId,
  };

  // ── 10. Decoupled Async Audit Log (setImmediate — không block response) ─
  setImmediate(async () => {
    try {
      await OrderLog.create({
        orderId: order._id,
        trackingCode: order.trackingCode,
        preStatus: order.status,
        postStatus: finalStatus,
        actionType: 'INBOUND_SCAN',
        actionBy: operator._id || operator.id,
        hubId: currentHubId,
        zoneId: zoneId || undefined,
        clientOfflineId: clientOfflineId || undefined,
        note: note || `Nhập kho tại Hub ${currentHubId} (${condition})`,
        metadata: { condition, nextAction: finalNextAction, isDamaged, weightDiscrepancyGram, cachedResult: result },
      });

      await OrderTrackingLog.create({
        orderId: order._id,
        trackingCode: order.trackingCode,
        eventType: 'HUB_ARRIVED',
        title: isDamaged ? '⚠️ Nhập kho — Phát hiện hư hỏng' : 'Đã nhập kho',
        description: isDamaged
          ? `Kiện hàng bị hư hỏng/rách niêm phong tại kho ${currentHubId}`
          : `Kiện hàng đã nhập kho (${finalNextAction})`,
        hubId: currentHubId,
        timestamp: new Date(),
      });
    } catch (logErr) {
      console.error(`[AUDIT_LOG_ERROR] Ghi log nhập kho thất bại cho đơn ${cleanTrackingCode}:`, logErr.message);
    }
  });

  return result;
}

module.exports = { processInboundSingle };
