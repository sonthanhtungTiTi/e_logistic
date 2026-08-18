/**
 * UC-19 Inventory Core Service (Enhanced)
 * Triết lý: atomic riêng lẻ, setImmediate log, không Transaction.
 * Tích hợp: Sức chứa Zone & Cảnh báo Quá tải, Xử lý Hàng loạt, Vận tốc Nhập/Xuất 24h & Gợi ý Gom Chuyến xe.
 */
const mongoose = require('mongoose');
const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');
const Zone = require('../models/zone.model');
const Trip = require('../models/trip.model');
const Hub = require('../models/hub.model');
const { emitInventoryUpdate } = require('../lib/ioSingleton');

const SLA_WARNING_MS  = (Number(process.env.SLA_WARNING_HOURS_DEFAULT)  || 24) * 3600_000;
const SLA_CRITICAL_MS = (Number(process.env.SLA_CRITICAL_HOURS_DEFAULT) || 48) * 3600_000;

function calcAgingStatus(hubInboundAt) {
  if (!hubInboundAt) return 'NORMAL';
  const dwell = Date.now() - new Date(hubInboundAt).getTime();
  if (dwell >= SLA_CRITICAL_MS) return 'CRITICAL';
  if (dwell >= SLA_WARNING_MS)  return 'WARNING';
  return 'NORMAL';
}

function calcDwellMs(hubInboundAt) {
  if (!hubInboundAt) return 0;
  return Math.max(0, Date.now() - new Date(hubInboundAt).getTime());
}

function formatDwell(ms) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

// Điều kiện các status này mới đáng hiện trong tồn kho
const INVENTORY_STATUSES = [
  'INBOUND_HUB','IN_HUB_ORIGIN','IN_SORTING_HUB','SORTING',
  'IN_HUB_DEST','INBOUND_HUB_DEST','SEARCH_ZONE','SUSPECTED_LOST',
  'LOST','SURPLUS','OVERDUE','LIQUIDATED','EXCEPTION_INBOUND',
];

/**
 * Lấy danh sách tồn kho có phân trang + aging_status + bộ lọc nâng cao
 */
async function getAgingList({
  hubId,
  zoneId,
  destinationHubId,
  agingStatus = 'ALL',
  search = null,
  dwellRange = 'ALL',
  page = 1,
  limit = 20,
  sortBy = 'dwell_desc',
  statusFilter = null,
}) {
  const query = {};
  if (hubId) query.currentHubId = new mongoose.Types.ObjectId(hubId);
  if (zoneId) query.currentZoneId = new mongoose.Types.ObjectId(zoneId);
  if (destinationHubId) query.destinationHubId = new mongoose.Types.ObjectId(destinationHubId);
  if (statusFilter) query.status = statusFilter;
  else query.status = { $in: INVENTORY_STATUSES };

  if (search && search.trim()) {
    query.trackingCode = { $regex: search.trim().toUpperCase(), $options: 'i' };
  }

  const skip = (page - 1) * limit;
  const sortMap = { dwell_desc: { hubInboundAt: 1 }, dwell_asc: { hubInboundAt: -1 }, status: { status: 1 } };
  const sortOpt = sortMap[sortBy] || { hubInboundAt: 1 };

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort(sortOpt).skip(skip).limit(limit)
      .populate('currentZoneId', 'code name zoneType')
      .populate('destinationHubId', 'code name province')
      .lean(),
    Order.countDocuments(query),
  ]);

  const items = orders.map(o => {
    const dwellMs = calcDwellMs(o.hubInboundAt);
    const as = calcAgingStatus(o.hubInboundAt);
    return {
      tracking_code: o.trackingCode, trackingCode: o.trackingCode,
      status: o.status,
      hub_inbound_at: o.hubInboundAt, hubInboundAt: o.hubInboundAt,
      dwell_ms: dwellMs, dwellMs,
      dwell_human: formatDwell(dwellMs), dwellHuman: formatDwell(dwellMs),
      aging_status: as, agingStatus: as,
      current_zone: o.currentZoneId || null, currentZone: o.currentZoneId || null,
      destination_hub: o.destinationHubId || null, destinationHub: o.destinationHubId || null,
      goods_value: o.goodsValue || 0, goodsValue: o.goodsValue || 0,
      actual_weight: o.actualWeight || 0, actualWeight: o.actualWeight || 0,
      is_flagged: o.isFlagged, isFlagged: o.isFlagged,
    };
  });

  // Filter by agingStatus & dwellRange sau khi tính
  let filtered = agingStatus === 'ALL' ? items : items.filter(i => i.aging_status === agingStatus);

  if (dwellRange && dwellRange !== 'ALL') {
    filtered = filtered.filter(i => {
      const hours = i.dwell_ms / 3600_000;
      if (dwellRange === '<12h') return hours < 12;
      if (dwellRange === '12-24h') return hours >= 12 && hours < 24;
      if (dwellRange === '24-48h') return hours >= 24 && hours < 48;
      if (dwellRange === '>48h') return hours >= 48;
      return true;
    });
  }

  return {
    items: filtered,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      totalPages: Math.ceil(total / limit),
    },
    sla_thresholds: {
      warning_hours: Number(process.env.SLA_WARNING_HOURS_DEFAULT) || 24,
      critical_hours: Number(process.env.SLA_CRITICAL_HOURS_DEFAULT) || 48,
    },
  };
}

/**
 * Tổng hợp tồn kho theo Zone + Sức chứa Zone (%) + Vận tốc Nhập/Xuất 24h
 */
async function getSummary(hubId) {
  if (!hubId) throw { status: 400, message: 'Thiếu hub_id', code: 'MISSING_HUB_ID' };

  const hubOId = new mongoose.Types.ObjectId(hubId);

  // 1. Đếm theo status
  const statusGroups = await Order.aggregate([
    { $match: { currentHubId: hubOId, status: { $in: INVENTORY_STATUSES } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // 2. Đếm theo aging_status
  const allOrders = await Order.find(
    { currentHubId: hubOId, status: { $in: INVENTORY_STATUSES } },
    'hubInboundAt goodsValue'
  ).lean();

  const agingCounts = { NORMAL: 0, WARNING: 0, CRITICAL: 0 };
  let totalStockValueVnd = 0;
  for (const o of allOrders) {
    agingCounts[calcAgingStatus(o.hubInboundAt)]++;
    totalStockValueVnd += Number(o.goodsValue) || 0;
  }

  // 3. Zone breakdown kèm Sức chứa & Tỷ lệ lấp đầy
  const rawZoneGroups = await Order.aggregate([
    { $match: { currentHubId: hubOId, currentZoneId: { $ne: null }, status: { $in: INVENTORY_STATUSES } } },
    { $group: { _id: '$currentZoneId', count: { $sum: 1 } } },
    { $lookup: { from: 'zones', localField: '_id', foreignField: '_id', as: 'zone' } },
    { $unwind: { path: '$zone', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        zone_id: '$_id',
        zone_code: '$zone.code',
        zone_name: '$zone.name',
        zone_type: '$zone.zoneType',
        capacity: '$zone.capacity',
        count: 1,
      }
    },
    { $sort: { count: -1 } },
  ]);

  const zoneGroups = rawZoneGroups.map(z => {
    const cap = z.capacity || 200; // Mặc định 200 kiện nếu chưa set
    const utilPercent = Math.min(100, Math.round((z.count / cap) * 100));
    let capStatus = 'NORMAL';
    if (utilPercent >= 90) capStatus = 'CRITICAL_OVERCAPACITY';
    else if (utilPercent >= 75) capStatus = 'WARNING';

    return {
      ...z,
      capacity: cap,
      current_count: z.count,
      utilization_percent: utilPercent,
      capacity_status: capStatus,
    };
  });

  // 4. Vận tốc Nhập - Xuất trong 24h qua (Inventory Throughput & Turnover Ratio)
  const since24h = new Date(Date.now() - 24 * 3600_000);
  const [inbound24h, outbound24h] = await Promise.all([
    OrderLog.countDocuments({ hubId: hubOId, actionType: 'INBOUND_SCAN', createdAt: { $gte: since24h } }),
    OrderLog.countDocuments({ hubId: hubOId, actionType: { $in: ['OUTBOUND_SCAN', 'DRIVER_CONFIRMED'] }, createdAt: { $gte: since24h } }),
  ]);

  const turnoverRatio = inbound24h > 0 ? +((outbound24h / inbound24h) * 100).toFixed(1) : 100;

  return {
    total: allOrders.length,
    total_stock_value_vnd: totalStockValueVnd,
    by_status: statusGroups.map(g => ({ status: g._id, count: g.count })),
    byStatus: statusGroups.map(g => ({ status: g._id, count: g.count })),
    by_aging: agingCounts,
    byAging: agingCounts,
    by_zone: zoneGroups,
    byZone: zoneGroups,
    throughput_24h: {
      inbound_count: inbound24h,
      outbound_count: outbound24h,
      turnover_ratio: turnoverRatio,
      is_velocity_healthy: turnoverRatio >= 90,
    },
    sla_thresholds: {
      warning_hours: Number(process.env.SLA_WARNING_HOURS_DEFAULT) || 24,
      critical_hours: Number(process.env.SLA_CRITICAL_HOURS_DEFAULT) || 48,
    },
  };
}

/**
 * Gợi ý Gom Chuyến Xe từ Hàng Tồn Kho (Smart Trip Suggestions)
 */
async function getTripSuggestions(hubId) {
  if (!hubId) throw { status: 400, message: 'Thiếu hub_id', code: 'MISSING_HUB_ID' };

  const hubOId = new mongoose.Types.ObjectId(hubId);

  // Tìm các đơn đang nằm chờ xuất kho (IN_HUB_ORIGIN hoặc IN_SORTING_HUB) chưa gán Trip
  const stockOrders = await Order.find({
    currentHubId: hubOId,
    status: { $in: ['IN_HUB_ORIGIN', 'IN_SORTING_HUB'] },
    currentTripId: null,
    destinationHubId: { $ne: null, $ne: hubOId },
  })
    .populate('destinationHubId', 'code name province')
    .lean();

  const groupedByDest = {};
  for (const o of stockOrders) {
    const destId = o.destinationHubId?._id?.toString() || 'UNKNOWN';
    if (!groupedByDest[destId]) {
      groupedByDest[destId] = {
        destination_hub_id: o.destinationHubId?._id,
        destination_hub_code: o.destinationHubId?.code || 'DEST',
        destination_hub_name: o.destinationHubId?.name || 'Kho đích',
        destination_province: o.destinationHubId?.province || '',
        total_items: 0,
        total_weight_kg: 0,
        tracking_codes: [],
      };
    }
    groupedByDest[destId].total_items++;
    groupedByDest[destId].total_weight_kg += Number(o.actualWeight) || 1;
    groupedByDest[destId].tracking_codes.push(o.trackingCode);
  }

  const suggestions = Object.values(groupedByDest).map(g => ({
    ...g,
    total_weight_kg: +g.total_weight_kg.toFixed(2),
  })).sort((a, b) => b.total_items - a.total_items);

  return suggestions;
}

/**
 * Tạo Chuyến xe 1-Chạm từ Hàng Tồn Kho
 */
async function createTripFromStock({ destinationHubId, trackingCodes, tripType = 'MID_MILE_TRANSFER', operator }) {
  const currentHubId = operator?.hubId || operator?.hub_id;
  if (!currentHubId) throw { status: 403, message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào', code: 'HUB_UNASSIGNED' };

  const destHub = await Hub.findById(destinationHubId);
  if (!destHub) throw { status: 404, message: 'Kho đích không tồn tại', code: 'DEST_NOT_FOUND' };

  const cleanCodes = (trackingCodes || []).map(c => c.toUpperCase());
  if (cleanCodes.length === 0) throw { status: 400, message: 'Danh sách mã vận đơn không được rỗng', code: 'EMPTY_CODES' };

  const tripCode = `TRIP-AUTO-${Date.now().toString().slice(-6)}`;
  const trip = await Trip.create({
    tripCode,
    tripType: tripType || 'MID_MILE_TRANSFER',
    originHubId: currentHubId,
    destinationHubId: destHub._id,
    plannedTrackingCodes: cleanCodes,
    status: 'DRAFT',
    createdBy: operator._id || operator.id,
  });

  return {
    trip_code: trip.tripCode, tripCode: trip.tripCode,
    destination_hub_name: destHub.name, destinationHubName: destHub.name,
    total_planned_items: cleanCodes.length, totalPlannedItems: cleanCodes.length,
    status: trip.status,
  };
}

/**
 * Lịch sử di chuyển của 1 đơn hàng (từ OrderLog)
 */
async function getMovementHistory({ trackingCode, page = 1, limit = 20 }) {
  const order = await Order.findOne({ trackingCode }, 'status trackingCode hubInboundAt').lean();
  if (!order) throw { status: 404, message: `Mã vận đơn ${trackingCode} không tồn tại`, code: 'ORDER_NOT_FOUND' };

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    OrderLog.find({ trackingCode })
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit)
      .lean(),
    OrderLog.countDocuments({ trackingCode }),
  ]);

  return {
    tracking_code: trackingCode, trackingCode,
    current_status: order.status, currentStatus: order.status,
    dwell_ms: calcDwellMs(order.hubInboundAt), dwellMs: calcDwellMs(order.hubInboundAt),
    dwell_human: formatDwell(calcDwellMs(order.hubInboundAt)),
    aging_status: calcAgingStatus(order.hubInboundAt),
    logs,
    pagination: {
      total, page, limit,
      total_pages: Math.ceil(total / limit),
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Export tồn kho dạng JSON hoặc CSV
 */
async function exportInventory({ hubId, agingStatus = 'ALL', format = 'json' }) {
  if (!hubId) throw { status: 400, message: 'Thiếu hub_id', code: 'MISSING_HUB_ID' };
  const query = { currentHubId: new mongoose.Types.ObjectId(hubId), status: { $in: INVENTORY_STATUSES } };
  const orders = await Order.find(query).lean();

  const rows = orders.map(o => {
    const dwellMs = calcDwellMs(o.hubInboundAt);
    const as = calcAgingStatus(o.hubInboundAt);
    return {
      tracking_code: o.trackingCode,
      status: o.status,
      hub_inbound_at: o.hubInboundAt ? o.hubInboundAt.toISOString() : '',
      dwell_hours: +(dwellMs / 3_600_000).toFixed(2),
      dwell_human: formatDwell(dwellMs),
      aging_status: as,
    };
  }).filter(r => agingStatus === 'ALL' || r.aging_status === agingStatus);

  if (format === 'csv') {
    const header = 'tracking_code,status,hub_inbound_at,dwell_hours,dwell_human,aging_status';
    const csv = [header, ...rows.map(r =>
      `${r.tracking_code},${r.status},${r.hub_inbound_at},${r.dwell_hours},${r.dwell_human},${r.aging_status}`
    )].join('\n');
    return { format: 'csv', content: csv, count: rows.length };
  }
  return { format: 'json', items: rows, count: rows.length };
}

/**
 * Hành động đơn lẻ trên tồn kho: LIQUIDATE | RETURN | AI_REROUTE
 */
async function performAction({ trackingCode, actionType, reason, operator }) {
  const hubId = operator?.hubId || operator?.hub_id;
  if (!hubId) throw { status: 403, message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào', code: 'HUB_UNASSIGNED' };

  const order = await Order.findOne({ trackingCode }).lean();
  if (!order) throw { status: 404, message: `Mã vận đơn ${trackingCode} không tồn tại`, code: 'ORDER_NOT_FOUND' };

  const now = new Date();
  let newStatus = order.status;
  const updateFields = { updatedAt: now };

  if (actionType === 'RETURN') {
    newStatus = 'RETURNED_TO_HUB_ORIGIN';
    updateFields.status = newStatus;
  } else if (actionType === 'LIQUIDATE') {
    newStatus = 'LIQUIDATED';
    updateFields.status = newStatus;
    updateFields.liquidationApprovedBy = operator._id || operator.id;
    updateFields.liquidationApprovedAt = now;
  } else if (actionType === 'AI_REROUTE') {
    updateFields.needsManualRouting = false;
    updateFields.isFlagged = false;
  }

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    { $set: updateFields },
    { returnDocument: 'after' }
  );

  if (!updated) {
    throw { status: 409, message: `Đơn hàng ${trackingCode} vừa bị thay đổi ở tiến trình khác`, code: 'OCC_CONFLICT' };
  }

  setImmediate(async () => {
    try {
      await OrderLog.create({
        orderId: order._id,
        trackingCode: order.trackingCode,
        preStatus: order.status,
        postStatus: newStatus,
        actionType: actionType === 'LIQUIDATE' ? 'LIQUIDATED' : 'INVENTORY_ACTION',
        actionBy: operator._id || operator.id,
        hubId,
        note: reason || `Thao tác tồn kho: ${actionType}`,
        metadata: { actionType, reason, previousStatus: order.status },
      });
      emitInventoryUpdate(hubId, { type: 'STATUS_CHANGED', trackingCode: order.trackingCode, newStatus, hubId });
    } catch (e) {
      console.error('[INVENTORY_ACTION_LOG]', e.message);
    }
  });

  return {
    tracking_code: updated.trackingCode, trackingCode: updated.trackingCode,
    previous_status: order.status, previousStatus: order.status,
    new_status: updated.status, newStatus: updated.status,
    action_type: actionType, actionType,
    updated_at: now, updatedAt: now,
  };
}

/**
 * Xử lý Tồn kho Quá hạn Hàng loạt (Batch Inventory Action)
 */
async function performBatchAction({ trackingCodes, actionType, reason, operator }) {
  const cleanCodes = (trackingCodes || []).map(c => c.toUpperCase());
  if (cleanCodes.length === 0) {
    throw { status: 400, message: 'Danh sách mã vận đơn không được rỗng', code: 'EMPTY_CODES' };
  }

  const results = {
    total: cleanCodes.length,
    success_count: 0,
    failed_count: 0,
    success_items: [],
    failed_items: [],
  };

  const settled = await Promise.allSettled(
    cleanCodes.map(code => performAction({ trackingCode: code, actionType, reason, operator }))
  );

  settled.forEach((outcome, idx) => {
    const code = cleanCodes[idx];
    if (outcome.status === 'fulfilled') {
      results.success_count++;
      results.success_items.push(outcome.value);
    } else {
      results.failed_count++;
      results.failed_items.push({
        tracking_code: code,
        message: outcome.reason?.message || 'Lỗi xử lý',
      });
    }
  });

  return results;
}

module.exports = {
  getAgingList,
  getSummary,
  getTripSuggestions,
  createTripFromStock,
  getMovementHistory,
  exportInventory,
  performAction,
  performBatchAction,
};
