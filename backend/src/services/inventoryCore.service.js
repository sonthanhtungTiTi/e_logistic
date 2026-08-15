/**
 * UC-19 Inventory Core Service
 * Triết lý: atomic riêng lẻ, setImmediate log, không Transaction.
 */
const mongoose = require('mongoose');
const Order = require('../models/order.model');
const OrderLog = require('../models/orderLog.model');
const Zone = require('../models/zone.model');
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
 * Lấy danh sách tồn kho có phân trang + aging_status
 */
async function getAgingList({ hubId, zoneId, agingStatus = 'ALL', page = 1, limit = 20, sortBy = 'dwell_desc', statusFilter = null }) {
  const query = {};
  if (hubId) query.currentHubId = new mongoose.Types.ObjectId(hubId);
  if (zoneId) query.currentZoneId = new mongoose.Types.ObjectId(zoneId);
  if (statusFilter) query.status = statusFilter;
  else query.status = { $in: INVENTORY_STATUSES };

  const skip = (page - 1) * limit;
  const sortMap = { dwell_desc: { hubInboundAt: 1 }, dwell_asc: { hubInboundAt: -1 }, status: { status: 1 } };
  const sortOpt = sortMap[sortBy] || { hubInboundAt: 1 };

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort(sortOpt).skip(skip).limit(limit)
      .populate('currentZoneId', 'code name zoneType')
      .lean(),
    Order.countDocuments(query),
  ]);

  const now = Date.now();
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
      is_flagged: o.isFlagged, isFlagged: o.isFlagged,
    };
  });

  // Filter by agingStatus sau khi tính (vì DB không có cột này)
  const filtered = agingStatus === 'ALL' ? items : items.filter(i => i.aging_status === agingStatus);

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
 * Tổng hợp tồn kho theo Zone + aging_status cho 1 hub
 */
async function getSummary(hubId) {
  if (!hubId) throw { status: 400, message: 'Thiếu hub_id', code: 'MISSING_HUB_ID' };

  const hubOId = new mongoose.Types.ObjectId(hubId);

  // Đếm theo status
  const statusGroups = await Order.aggregate([
    { $match: { currentHubId: hubOId, status: { $in: INVENTORY_STATUSES } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Đếm theo aging_status (phải tính runtime)
  const now = Date.now();
  const allOrders = await Order.find(
    { currentHubId: hubOId, status: { $in: INVENTORY_STATUSES } },
    'hubInboundAt'
  ).lean();

  const agingCounts = { NORMAL: 0, WARNING: 0, CRITICAL: 0 };
  for (const o of allOrders) {
    agingCounts[calcAgingStatus(o.hubInboundAt)]++;
  }

  // Zone breakdown
  const zoneGroups = await Order.aggregate([
    { $match: { currentHubId: hubOId, currentZoneId: { $ne: null }, status: { $in: INVENTORY_STATUSES } } },
    { $group: { _id: '$currentZoneId', count: { $sum: 1 } } },
    { $lookup: { from: 'zones', localField: '_id', foreignField: '_id', as: 'zone' } },
    { $unwind: { path: '$zone', preserveNullAndEmptyArrays: true } },
    { $project: { zone_code: '$zone.code', zone_name: '$zone.name', zone_type: '$zone.zoneType', count: 1 } },
    { $sort: { count: -1 } },
  ]);

  return {
    total: allOrders.length,
    by_status: statusGroups.map(g => ({ status: g._id, count: g.count })),
    byStatus: statusGroups.map(g => ({ status: g._id, count: g.count })),
    by_aging: agingCounts,
    byAging: agingCounts,
    by_zone: zoneGroups,
    byZone: zoneGroups,
    sla_thresholds: {
      warning_hours: Number(process.env.SLA_WARNING_HOURS_DEFAULT) || 24,
      critical_hours: Number(process.env.SLA_CRITICAL_HOURS_DEFAULT) || 48,
    },
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
    require('../models/orderLog.model').find({ trackingCode })
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit)
      .lean(),
    require('../models/orderLog.model').countDocuments({ trackingCode }),
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
 * Export tồn kho dạng JSON (frontend chuyển CSV nếu muốn)
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
 * Hành động trên tồn kho: LIQUIDATE | RETURN | AI_REROUTE
 */
async function performAction({ trackingCode, actionType, reason, operator }) {
  const hubId = operator?.hubId || operator?.hub_id;
  if (!hubId) throw { status: 403, message: 'Nhân viên chưa được gán vào Bưu cục/Kho nào', code: 'HUB_UNASSIGNED' };

  const order = await Order.findOne({ trackingCode }).lean();
  if (!order) throw { status: 404, message: `Mã vận đơn ${trackingCode} không tồn tại`, code: 'ORDER_NOT_FOUND' };

  const operatorId = operator._id || operator.id;
  const now = new Date();

  if (actionType === 'LIQUIDATE') {
    // Reload fresh status cho OCC thật sự (tránh dùng snapshot cũ từ findOne trước)
    const freshOrder = await Order.findById(order._id, 'status updatedAt').lean();
    if (!freshOrder) throw { status: 404, message: 'Không tìm thấy đơn hàng', code: 'ORDER_NOT_FOUND' };
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: freshOrder.status }, // OCC với status fresh
      { $set: { status: 'LIQUIDATED', liquidationApprovedBy: operatorId, liquidationApprovedAt: now, updatedAt: now } },
      { returnDocument: 'after' }
    );
    if (!updated || updated.status !== 'LIQUIDATED') {
      const current = await Order.findById(order._id, 'updatedAt').lean();
      const conflictTime = current?.updatedAt ? current.updatedAt.toLocaleString('vi-VN') : 'vừa rồi';
      throw { status: 409, code: 'RACE_CONDITION_CONFLICT', message: `Kiện hàng này vừa được xuất kho lúc ${conflictTime}, không thể thao tác` };
    }
    setImmediate(async () => {
      try {
        await OrderLog.create({
          orderId: order._id, trackingCode, preStatus: order.status, postStatus: 'LIQUIDATED',
          actionType: 'LIQUIDATED', actionBy: operatorId, hubId, note: reason || 'Thanh lý tồn kho',
        });
        emitInventoryUpdate(hubId, { type: 'STATUS_CHANGED', trackingCode, newStatus: 'LIQUIDATED', hubId });
      } catch (e) { console.error('[LIQUIDATE_LOG]', e.message); }
    });
    return { tracking_code: trackingCode, trackingCode, new_status: 'LIQUIDATED', newStatus: 'LIQUIDATED', action: 'LIQUIDATE', approved_at: now };
  }

  if (actionType === 'RETURN') {
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      { $set: { status: 'RETURNING', updatedAt: now } },
      { returnDocument: 'after' }
    );
    if (!updated) throw { status: 409, code: 'RACE_CONDITION_CONFLICT', message: 'Xung đột trạng thái, vui lòng tải lại' };
    setImmediate(async () => {
      try {
        await OrderLog.create({
          orderId: order._id, trackingCode, preStatus: order.status, postStatus: 'RETURNING',
          actionType: 'STATUS_CHANGED', actionBy: operatorId, hubId, note: reason || 'Hoàn trả tồn kho',
        });
        emitInventoryUpdate(hubId, { type: 'STATUS_CHANGED', trackingCode, newStatus: 'RETURNING', hubId });
      } catch (e) { console.error('[RETURN_LOG]', e.message); }
    });
    return { tracking_code: trackingCode, trackingCode, new_status: 'RETURNING', newStatus: 'RETURNING', action: 'RETURN' };
  }

  if (actionType === 'AI_REROUTE') {
    const aiUrl = process.env.AI_ROUTING_SERVICE_URL;
    if (!aiUrl || !aiUrl.trim()) {
      throw { status: 502, code: 'AI_ROUTING_UNAVAILABLE', message: 'Không thể kết nối dịch vụ AI xếp tuyến, vui lòng thử lại hoặc xử lý thủ công' };
    }
    // Thử gọi AI service với AbortController timeout 5s
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
      const res = await fetch(aiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingCode, order }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`AI service HTTP ${res.status}`);
      const aiResult = await res.json();
      return { tracking_code: trackingCode, trackingCode, action: 'AI_REROUTE', ai_result: aiResult };
    } catch (err) {
      clearTimeout(timeout);
      throw { status: 502, code: 'AI_ROUTING_UNAVAILABLE', message: 'Không thể kết nối dịch vụ AI xếp tuyến, vui lòng thử lại hoặc xử lý thủ công' };
    }
  }

  throw { status: 400, message: `action_type không hợp lệ: ${actionType}`, code: 'INVALID_ACTION_TYPE' };
}

module.exports = { getAgingList, getSummary, getMovementHistory, exportInventory, performAction, calcAgingStatus };
