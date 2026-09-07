const mongoose = require('mongoose');
const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');
const OrderTrackingLog = require('../models/orderTrackingLog.model');
const Trip = require('../models/trip.model');
const Bag = require('../models/bag.model');

/**
 * Quét xuất kho 1 trackingCode vào Trip.
 * Được gọi cả khi quét đơn lẻ lẫn khi dùng seal.
 */
async function processOutboundScan({ tripCode, trackingCode, operator, clientOfflineId = null }) {
  // ─ IDEMPOTENCY CHECK ─────────────────────────────────────────────────
  if (clientOfflineId) {
    const hit = await OrderLog.findOne({ clientOfflineId }).lean();
    if (hit && hit.metadata?.cachedResult) return hit.metadata.cachedResult;
  }

  // ─ GUARD: operator phải thuộc Hub ─────────────────────────────────────
  const currentHubId = operator?.hubId || operator?.hub_id;
  if (!currentHubId) throw { status: 403, message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào', code: 'HUB_UNASSIGNED' };

  const cleanCode = (trackingCode || '').trim().toUpperCase();
  if (!cleanCode) throw { status: 400, message: 'Mã vận đơn không được để trống', code: 'INVALID_TRACKING_CODE' };

  // ─ Lấy Trip ─────────────────────────────────────────────────────────────────
  const trip = await Trip.findOne({ tripCode: (tripCode || '').toUpperCase() });
  if (!trip) throw { status: 404, message: `Chuyến xe ${tripCode} không tồn tại`, code: 'TRIP_NOT_FOUND' };
  if (!['DRAFT', 'PLANNING', 'REJECTED'].includes(trip.status)) {
    throw { status: 409, message: `Chuyến xe đang ở trạng thái [${trip.status}], không thể quét thêm`, code: 'TRIP_NOT_EDITABLE' };
  }

  // Khởi động lại Trip từ REJECTED về DRAFT khi scan lại
  if (trip.status === 'REJECTED') {
    await Trip.updateOne({ _id: trip._id }, { $set: { status: 'DRAFT', driverRejectedAt: null, rejectReason: null } });
  }

  // ─ Kiểm tra trong plannedTrackingCodes ────────────────────────────────────────
  const planned = trip.plannedTrackingCodes.map(c => c.toUpperCase());
  if (!planned.includes(cleanCode)) {
    throw { status: 409, message: 'Kiện hàng không thuộc chuyến xe này', code: 'ITEM_NOT_IN_TRIP' };
  }

  // ─ Kiểm tra Order không bị khóa ─────────────────────────────────────────
  const order = await Order.findOne({ trackingCode: cleanCode });
  if (!order) throw { status: 404, message: `Vận đơn ${cleanCode} không tồn tại`, code: 'ORDER_NOT_FOUND' };
  if (order.isFlagged || order.status === 'EXCEPTION_INBOUND') {
    throw { status: 422, message: 'Hàng đang bị khóa, không được xuất kho', code: 'ITEM_LOCKED' };
  }

  // ─ Đánh dấu đã quét trong Trip (atomic $addToSet tránh trùng) ────────────────
  const alreadyScanned = trip.scannedItems.some(i => i.trackingCode === cleanCode);
  if (!alreadyScanned) {
    await Trip.findOneAndUpdate(
      { _id: trip._id },
      { $addToSet: { scannedItems: { trackingCode: cleanCode, scannedAt: new Date(), scannedBy: operator._id || operator.id } } }
    );
  }

  const result = {
    tracking_code: cleanCode, trackingCode: cleanCode,
    trip_code: trip.tripCode, tripCode: trip.tripCode,
    trip_status: trip.status, tripStatus: trip.status,
    already_scanned: alreadyScanned, alreadyScanned,
    message: alreadyScanned ? 'Kiện hàng đã được quét trước đó' : 'Quét xuất kho thành công',
  };

  // ─ Async log ────────────────────────────────────────────────────────────────
  if (!alreadyScanned) {
    setImmediate(async () => {
      try {
        await OrderLog.create({
          orderId: order._id, trackingCode: order.trackingCode,
          preStatus: order.status, postStatus: order.status,
          actionType: 'OUTBOUND_SCAN',
          actionBy: operator._id || operator.id,
          hubId: currentHubId,
          clientOfflineId: clientOfflineId || undefined,
          note: `Xuất kho vào Trip ${trip.tripCode}`,
          metadata: { tripCode: trip.tripCode, tripType: trip.tripType, cachedResult: result },
        });
      } catch (e) { console.error('[OUTBOUND_SCAN_LOG_ERROR]', e.message); }
    });
  }

  return result;
}

/**
 * Commit Trip: khóa chuyến xe, xử lý shortage, chuyển trạng thái.
 */
async function commitTrip({ tripCode, isShortage, operator }) {
  const currentHubId = operator?.hubId || operator?.hub_id;
  if (!currentHubId) throw { status: 403, message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào', code: 'HUB_UNASSIGNED' };

  const trip = await Trip.findOne({ tripCode: (tripCode || '').toUpperCase() });
  if (!trip) throw { status: 404, message: `Chuyến xe ${tripCode} không tồn tại`, code: 'TRIP_NOT_FOUND' };
  if (!['DRAFT', 'PLANNING'].includes(trip.status)) {
    throw { status: 409, message: `Chuyến xe đang ở trạng thái [${trip.status}], không thể commit`, code: 'TRIP_NOT_EDITABLE' };
  }

  const scannedCodes = trip.scannedItems.map(i => i.trackingCode.toUpperCase());
  const plannedCodes = trip.plannedTrackingCodes.map(c => c.toUpperCase());
  const shortageCodes = plannedCodes.filter(c => !scannedCodes.includes(c));

  const shortageResults = [];
  if (isShortage && shortageCodes.length > 0) {
    // Atomic OCC cho từng đơn còn thiếu
    for (const code of shortageCodes) {
      const o = await Order.findOne({ trackingCode: code }).lean();
      if (!o) continue;
      const updated = await Order.findOneAndUpdate(
        { _id: o._id, status: o.status },
        { $set: { status: 'SEARCH_ZONE', updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      if (!updated) {
        shortageResults.push({ code, error: 'RACE_CONDITION_CONFLICT' });
      } else {
        shortageResults.push({ code, newStatus: 'SEARCH_ZONE' });
        // Async log
        setImmediate(async () => {
          try {
            await OrderLog.create({
              orderId: o._id, trackingCode: o.trackingCode,
              preStatus: o.status, postStatus: 'SEARCH_ZONE',
              actionType: 'STATUS_CHANGED',
              actionBy: operator._id || operator.id,
              hubId: currentHubId,
              note: `Shortage trong Trip ${tripCode} — đưa vào SEARCH_ZONE`,
              metadata: { tripCode },
            });
          } catch (e) { console.error('[SHORTAGE_LOG_ERROR]', e.message); }
        });
      }
    }
  }

  // Commit Trip
  const updatedTrip = await Trip.findOneAndUpdate(
    { _id: trip._id, status: { $in: ['DRAFT', 'PLANNING'] } }, // OCC
    {
      $set: { status: 'LOCKED_PENDING_DRIVER_CONFIRM', lockedAt: new Date() },
      ...(isShortage && shortageCodes.length ? { $push: { shortageTrackingCodes: { $each: shortageCodes } } } : {}),
    },
    { returnDocument: 'after' }
  );
  if (!updatedTrip) throw { status: 409, message: 'Xung đột dữ liệu khi commit chuyến xe', code: 'RACE_CONDITION_CONFLICT' };

  return {
    trip_code: updatedTrip.tripCode, tripCode: updatedTrip.tripCode,
    status: updatedTrip.status, trip_status: updatedTrip.status,
    locked_at: updatedTrip.lockedAt, lockedAt: updatedTrip.lockedAt,
    scanned_count: scannedCodes.length, scannedCount: scannedCodes.length,
    shortage_count: shortageCodes.length, shortageCount: shortageCodes.length,
    shortage_codes: shortageCodes, shortageCodes,
    shortage_results: shortageResults,
  };
}

/**
 * Xử lý xác nhận tài xế (ACCEPT / REJECT)
 */
async function processDriverConfirm({ tripCode, action, rejectReason, operator }) {
  const trip = await Trip.findOne({ tripCode: (tripCode || '').toUpperCase() });
  if (!trip) throw { status: 404, message: `Chuyến xe ${tripCode} không tồn tại`, code: 'TRIP_NOT_FOUND' };
  if (trip.status !== 'LOCKED_PENDING_DRIVER_CONFIRM') {
    throw { status: 409, message: `Chuyến xe đang ở trạng thái [${trip.status}], không thể xác nhận`, code: 'TRIP_NOT_PENDING_CONFIRM' };
  }

  if (action === 'REJECT') {
    await Trip.findOneAndUpdate(
      { _id: trip._id, status: 'LOCKED_PENDING_DRIVER_CONFIRM' },
      { $set: { status: 'REJECTED', rejectReason: rejectReason || '', driverRejectedAt: new Date() } }
    );

    // Rollback: Gỡ currentTripId và đảm bảo các đơn hàng đã quét quay lại trạng thái staging an toàn
    const scannedCodes = trip.scannedItems.map(i => i.trackingCode.toUpperCase());
    if (scannedCodes.length > 0) {
      await Order.updateMany(
        { trackingCode: { $in: scannedCodes } },
        { $set: { currentTripId: null, updatedAt: new Date() } }
      );
    }

    // Rollback các đơn hàng bị đánh dấu SEARCH_ZONE do shortage trong chuyến này
    if (trip.shortageTrackingCodes && trip.shortageTrackingCodes.length > 0) {
      for (const shortCode of trip.shortageTrackingCodes) {
        const orderShort = await Order.findOne({ trackingCode: shortCode.toUpperCase() });
        if (orderShort && orderShort.status === 'SEARCH_ZONE') {
          // BUG-03 review: Logic đúng — tên biến gây hiểu nhầm nhưng intent chính xác:
          // trip.originHubId = Hub nơi chuyến xe XuẤT PHÁT.
          // isOrigin: Hub xuất phát là Hub GỐC của đơn → rollback về IN_HUB_ORIGIN (chờ gom bao đi tiếp)
          // isDest:   Hub xuất phát là Hub ĐÍCH của đơn → đây là LAST_MILE_DELIVERY trip → rollback về IN_HUB_DEST
          const isOrigin = !!(orderShort.originHubId && orderShort.originHubId.toString() === trip.originHubId?.toString());
          const isDest   = !!(orderShort.destinationHubId && orderShort.destinationHubId.toString() === trip.originHubId?.toString());
          const rollbackStatus = isDest ? 'IN_HUB_DEST' : isOrigin ? 'IN_HUB_ORIGIN' : 'IN_SORTING_HUB';

          await Order.updateOne(
            { _id: orderShort._id },
            { $set: { status: rollbackStatus, currentTripId: null, searchZoneEnteredAt: null, updatedAt: new Date() } }
          );
        }
      }
    }

    // Async log khi REJECT
    setImmediate(async () => {
      try {
        for (const item of trip.scannedItems) {
          const o = await Order.findOne({ trackingCode: item.trackingCode }).lean();
          if (!o) continue;
          await OrderLog.create({
            orderId: o._id, trackingCode: o.trackingCode,
            preStatus: o.status, postStatus: o.status,
            actionType: 'DRIVER_REJECTED',
            actionBy: operator._id || operator.id,
            note: `Tài xế từ chối nhận chuyến xe ${trip.tripCode}: ${rejectReason || 'Không có lý do'}`,
            metadata: { tripCode: trip.tripCode, rejectReason },
          });
        }
      } catch (e) { console.error('[DRIVER_REJECT_LOG_ERROR]', e.message); }
    });

    return {
      trip_code: trip.tripCode, tripCode: trip.tripCode,
      action: 'REJECT', status: 'REJECTED',
      reject_reason: rejectReason || '', rejectReason: rejectReason || '',
      message: `Tài xế đã từ chối chuyến xe [${trip.tripCode}], toàn bộ kiện hàng đã được rollback về khu vực chờ.`
    };
  }

  // ACCEPT: cập nhật từng Order trong scannedItems
  const newOrderStatus = trip.tripType === 'LAST_MILE_DELIVERY' ? 'OUT_FOR_DELIVERY' : 'IN_TRANSIT';
  const confirmResults = [];

  for (const item of trip.scannedItems) {
    const o = await Order.findOne({ trackingCode: item.trackingCode }).lean();
    if (!o) { confirmResults.push({ code: item.trackingCode, error: 'NOT_FOUND' }); continue; }

    const atomicSet = { status: newOrderStatus, currentTripId: trip._id, updatedAt: new Date() };

    // ── THÊM MỚI BƯỚC 9: Cập nhật node status = DEPARTED ──
    // BUG-02 fixed: Chỉ đánh dấu DEPARTED khi currentRouteIndex > 0 (nghĩa là đơn đã có ít nhất
    // 1 lần inbound scan và đã ARRIVED tại node trước đó). Nếu index = 0 thì chưa có node nào
    // hoàn tất ARRIVED → không đánh dấu để tránh corrupt route timeline.
    if (o.routeNodes && o.routeNodes.length > 0 && o.currentRouteIndex > 0) {
      const nodeIdxToUpdate = o.currentRouteIndex - 1;
      if (o.routeNodes[nodeIdxToUpdate]) {
        atomicSet[`routeNodes.${nodeIdxToUpdate}.status`] = 'DEPARTED';
        atomicSet[`routeNodes.${nodeIdxToUpdate}.departedAt`] = new Date();
      }
    }

    const updated = await Order.findOneAndUpdate(
      { _id: o._id, status: o.status }, // OCC
      { $set: atomicSet },
      { returnDocument: 'after' }
    );
    if (!updated) {
      confirmResults.push({ code: item.trackingCode, error: 'RACE_CONDITION_CONFLICT' });
    } else {
      confirmResults.push({ code: item.trackingCode, newStatus: newOrderStatus });
    }
  }

  // Commit Trip CONFIRMED
  await Trip.findOneAndUpdate(
    { _id: trip._id, status: 'LOCKED_PENDING_DRIVER_CONFIRM' }, // OCC
    { $set: { status: 'CONFIRMED', driverConfirmedAt: new Date() } }
  );

  // Async audit log (setImmediate)
  setImmediate(async () => {
    try {
      for (const item of trip.scannedItems) {
        const o = await Order.findOne({ trackingCode: item.trackingCode }).lean();
        if (!o) continue;
        await OrderLog.create({
          orderId: o._id, trackingCode: o.trackingCode,
          preStatus: o.status, postStatus: newOrderStatus,
          actionType: 'DRIVER_CONFIRMED',
          actionBy: operator._id || operator.id,
          note: `Tài xế xác nhận chuyến xe ${trip.tripCode}`,
          metadata: { tripCode: trip.tripCode, tripType: trip.tripType },
        });
        await OrderTrackingLog.create({
          orderId: o._id, trackingCode: o.trackingCode,
          eventType: 'HUB_DEPARTED',
          title: trip.tripType === 'LAST_MILE_DELIVERY' ? 'Đang giao hàng' : 'Đang vận chuyển',
          description: `Xuất kho và bàn giao tài xế (${trip.tripCode})`,
          timestamp: new Date(),
        });
      }
    } catch (e) { console.error('[DRIVER_CONFIRM_LOG_ERROR]', e.message); }
  });

  return {
    trip_code: trip.tripCode, tripCode: trip.tripCode,
    action: 'ACCEPT', status: 'CONFIRMED',
    new_order_status: newOrderStatus, newOrderStatus,
    items_confirmed: confirmResults.filter(r => r.newStatus).length,
    items_error: confirmResults.filter(r => r.error).length,
    results: confirmResults,
  };
}

module.exports = { processOutboundScan, commitTrip, processDriverConfirm };
