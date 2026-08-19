// migrate-legacy-orders-route.js — Tối ưu hóa cực đại với In-Memory Graph Caching & Bulk Write
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./src/config/db');
const Order = require('./src/models/order.model');
const Hub = require('./src/models/hub.model');
const HubCoverage = require('./src/models/hubCoverage.model');
const HubConnection = require('./src/models/hubConnection.model');
const { resolveHubRouting } = require('./src/services/hubRouting.service');

async function migrateLegacyOrders() {
  await connectDB();
  console.log('⚡ Bắt đầu Migration siêu tốc với In-Memory Cache...');

  const filter = {
    $or: [
      { routeNodes: { $exists: false } },
      { routeNodes: { $size: 0 } },
      { routeNodes: null }
    ]
  };

  const legacyOrders = await Order.find(filter).lean();
  console.log(`📦 Tìm thấy ${legacyOrders.length} đơn hàng cũ cần migrate routeNodes.`);

  if (legacyOrders.length === 0) {
    console.log('✅ Tất cả đơn hàng đã có routeNodes.');
    return { total: 0, updatedCount: 0 };
  }

  // Pre-load tất cả Hubs, Coverages, Connections vào bộ nhớ
  const hubs = await Hub.find({}).lean();
  const coverages = await HubCoverage.find({}).populate('hubId').lean();
  const connections = await HubConnection.find({ isActive: true }).lean();

  const hubMapByCode = new Map(hubs.map(h => [h.code, h]));

  // Build Dijkstra graph in memory
  const graph = {};
  for (const conn of connections) {
    const from = conn.fromHubId.toString();
    const to = conn.toHubId.toString();
    if (!graph[from]) graph[from] = [];
    graph[from].push({ to, weight: conn.transitTimeHours });
  }

  function getHubIdByAddress(province, district) {
    if (!province) return hubs[0]?._id;
    const cleanProv = province.replace(/^(Tỉnh|Thành phố|TP\.?)\s+/i, '').trim().toLowerCase();
    const cleanDist = (district || '').trim().toLowerCase();

    // Matching coverage
    const matchedCov = coverages.find(c => {
      const pMatch = c.province.toLowerCase().includes(cleanProv) || cleanProv.includes(c.province.toLowerCase());
      const dMatch = cleanDist && (c.district.toLowerCase().includes(cleanDist) || cleanDist.includes(c.district.toLowerCase()));
      return pMatch && (dMatch || !c.district);
    });

    if (matchedCov && matchedCov.hubId) {
      return matchedCov.hubId._id || matchedCov.hubId;
    }

    const legacy = resolveHubRouting(province);
    const fallbackHub = hubMapByCode.get(legacy.hubCode) || hubs[0];
    return fallbackHub ? fallbackHub._id : hubs[0]?._id;
  }

  function solveDijkstra(fromId, toId) {
    const fStr = fromId.toString();
    const tStr = toId.toString();
    if (fStr === tStr) return [fStr];

    const distances = { [fStr]: 0 };
    const previous = {};
    const visited = new Set();
    const queue = new Set([fStr]);

    while (queue.size > 0) {
      let current = null;
      let currentDist = Infinity;
      for (const node of queue) {
        if ((distances[node] ?? Infinity) < currentDist) {
          currentDist = distances[node];
          current = node;
        }
      }
      if (current === null) break;
      queue.delete(current);
      visited.add(current);

      if (current === tStr) break;

      const neighbors = graph[current] || [];
      for (const { to, weight } of neighbors) {
        if (visited.has(to)) continue;
        const newDist = distances[current] + weight;
        if (newDist < (distances[to] ?? Infinity)) {
          distances[to] = newDist;
          previous[to] = current;
          queue.add(to);
        }
      }
    }

    if (!(tStr in distances)) {
      return [fStr, tStr];
    }

    const path = [];
    let n = tStr;
    while (n !== undefined) {
      path.unshift(n);
      n = previous[n];
    }
    return path;
  }

  const bulkOps = [];
  let skippedCount = 0;

  for (const order of legacyOrders) {
    const pickupHubId = getHubIdByAddress(order.pickupAddress?.province, order.pickupAddress?.district);
    const delivHubId = getHubIdByAddress(order.deliveryAddress?.province, order.deliveryAddress?.district);

    if (pickupHubId && delivHubId) {
      const path = solveDijkstra(pickupHubId, delivHubId);
      const routeNodes = path.map((hId, idx) => ({
        hubId: hId,
        hubType: idx === 0 ? 'PICKUP' : (idx === path.length - 1 ? 'DELIVERY' : 'SORTING'),
        sequenceIndex: idx,
        status: order.status === 'DELIVERED' ? 'ARRIVED' : 'PENDING',
        arrivedAt: order.status === 'DELIVERED' ? (order.updatedAt || new Date()) : null
      }));

      let currentRouteIndex = 0;
      if (order.status === 'DELIVERED') {
        currentRouteIndex = Math.max(0, routeNodes.length - 1);
      } else if (['IN_TRANSIT', 'IN_SORTING_HUB', 'IN_HUB_DEST'].includes(order.status)) {
        currentRouteIndex = Math.min(1, routeNodes.length - 1);
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: order._id },
          update: { $set: { routeNodes, currentRouteIndex } }
        }
      });
    } else {
      skippedCount++;
    }
  }

  if (bulkOps.length > 0) {
    const bulkRes = await Order.bulkWrite(bulkOps);
    console.log(`✅ Migration siêu tốc hoàn tất! Đã cập nhật ${bulkRes.modifiedCount} đơn hàng. Bỏ qua: ${skippedCount} đơn.`);
    return { total: legacyOrders.length, updatedCount: bulkRes.modifiedCount, skippedCount };
  }

  console.log(`✅ Không có đơn hàng nào được cập nhật.`);
  return { total: legacyOrders.length, updatedCount: 0, skippedCount };
}

module.exports = migrateLegacyOrders;

if (require.main === module) {
  migrateLegacyOrders().then(() => process.exit(0)).catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  });
}
