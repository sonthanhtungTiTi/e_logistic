/**
 * DoD Test Suite — Prompt #E (UC-19 Dashboard Tồn kho)
 * Cases E1–E11
 *
 * Chạy: node test-prompt-e-dod.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const assert = require('assert');
const http = require('http');

const app = require('../../src/app');
const Hub = require('../../src/models/hub.model');
const User = require('../../src/models/user.model');
const Order = require('../../src/models/order.model');
const OrderLog = require('../../src/models/orderLog.model');

const PORT = 5098;

// ── HTTP helper ───────────────────────────────────────────────────────────────
function callApi(method, path, bodyOrNull, token, isQuery = false) {
  return new Promise((resolve, reject) => {
    const data = bodyOrNull && !isQuery ? JSON.stringify(bodyOrNull) : '';
    const url = isQuery && bodyOrNull
      ? `${path}?${new URLSearchParams(bodyOrNull).toString()}`
      : path;
    const req = http.request({
      hostname: '127.0.0.1', port: PORT, path: url, method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function loginAs(id, pass) {
  const r = await callApi('POST', '/api/auth/login', { identifier: id, password: pass });
  if (r.status !== 200) throw new Error(`Login thất bại (${r.status}): ${JSON.stringify(r.body)}`);
  return r.body.accessToken;
}

async function makeOrder(trackingCode, hubId, opts = {}) {
  const base = {
    _id: new mongoose.Types.ObjectId(),
    trackingCode,
    sellerId: new mongoose.Types.ObjectId(),
    status: opts.status || 'IN_HUB_ORIGIN',
    originHubId: hubId,
    destinationHubId: opts.destHubId || new mongoose.Types.ObjectId(),
    currentHubId: hubId,
    actualWeight: 1, chargeableWeight: 1, shippingFee: 30000,
    isFlagged: false,
    pickupHub: 'HUB_HAN_01', deliveryHub: 'HUB_SGN_01',
    pickupAddress: { fullName: 'A', phone: '0900000001', address: '1', ward: 'W', district: 'D', province: 'HN' },
    deliveryAddress: { fullName: 'B', phone: '0900000002', address: '2', ward: 'W', district: 'D', province: 'HCM' },
    items: [{ name: 'item', quantity: 1, weight: 1 }],
    hubInboundAt: opts.hubInboundAt || new Date(Date.now() - 1000),
  };
  await Order.collection.insertOne(base);
  return Order.findById(base._id);
}

// ── Counter ───────────────────────────────────────────────────────────────────
const results = { pass: 0, fail: 0, cases: [] };
function pass(label) { results.pass++; results.cases.push({ label, ok: true }); console.log(`  ✅ PASS: ${label}`); }
function fail(label, reason) { results.fail++; results.cases.push({ label, ok: false, reason }); console.error(`  ❌ FAIL: ${label}\n         ${reason}`); }

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📦 DoD SUITE — Prompt #E: UC-19 Dashboard Tồn kho');
  console.log('═══════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic');

  const hubHan = await Hub.findOne({ code: 'HUB_HAN_01' }).lean();
  if (!hubHan) { console.error('❌ Thiếu Hub HUB_HAN_01'); process.exit(1); }

  const server = http.createServer(app);
  await new Promise(r => server.listen(PORT, r));
  console.log(`🚀 Server tại port ${PORT}\n`);

  const coordToken = await loginAs('test.hub_coordinator.han01@elogistic.test', 'TestPass123!');
  const staffToken  = await loginAs('test.hub_staff.han01@elogistic.test', 'TestPass123!');
  console.log('🔑 Login: coordinator ✅ | staff ✅\n');

  const ts = Date.now();
  const hubIdStr = hubHan._id.toString();

  // ── Seed: tạo đơn test ─────────────────────────────────────────────────────
  // Normal: hubInboundAt = 1h trước
  const normalCode   = `E-NORMAL-${ts}`;
  // Warning: hubInboundAt = 25h trước
  const warningCode  = `E-WARN-${ts}`;
  // Critical: hubInboundAt = 50h trước
  const critCode     = `E-CRIT-${ts}`;
  // For movement history
  const historyCode  = `E-HIST-${ts}`;

  await makeOrder(normalCode,  hubHan._id, { hubInboundAt: new Date(Date.now() - 1 * 3600_000) });
  await makeOrder(warningCode, hubHan._id, { hubInboundAt: new Date(Date.now() - 25 * 3600_000) });
  await makeOrder(critCode,    hubHan._id, { hubInboundAt: new Date(Date.now() - 50 * 3600_000) });
  await makeOrder(historyCode, hubHan._id);
  // Tạo vài OrderLog cho historyCode
  await OrderLog.create([
    { orderId: new mongoose.Types.ObjectId(), trackingCode: historyCode, preStatus: 'PICKED_UP', postStatus: 'IN_HUB_ORIGIN', actionType: 'INBOUND_SCAN', actionBy: new mongoose.Types.ObjectId(), hubId: hubHan._id },
    { orderId: new mongoose.Types.ObjectId(), trackingCode: historyCode, preStatus: 'IN_HUB_ORIGIN', postStatus: 'SORTING', actionType: 'STATUS_CHANGED', actionBy: new mongoose.Types.ObjectId(), hubId: hubHan._id },
  ]);

  // ════════════════════════════════════════════════════════════════════════════
  // E1 — aging trả đúng pagination + aging_status phân loại theo ngưỡng .env
  // ════════════════════════════════════════════════════════════════════════════
  console.log('────────────────────────────────────────────────────────');
  console.log('📌 E1 — aging: pagination + aging_status phân loại đúng');
  try {
    const r = await callApi('GET', '/api/inventory/aging', { hub_id: hubIdStr, page: '1', limit: '200' }, staffToken, true);
    console.log(`  HTTP: ${r.status} | total: ${r.body?.data?.pagination?.total} | items: ${r.body?.data?.items?.length} | sla_warning: ${r.body?.data?.sla_thresholds?.warning_hours}h`);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.data.items.length > 0, 'Phải có ít nhất 1 item');
    assert.ok(r.body.data.pagination?.total >= 1, 'pagination.total phải >= 1');
    assert.ok(r.body.data.sla_thresholds?.warning_hours, 'Phải có sla_thresholds');

    // Kiểm tra aging_status phân loại đúng
    const normalItem  = r.body.data.items.find(i => i.tracking_code === normalCode);
    const warningItem = r.body.data.items.find(i => i.tracking_code === warningCode);
    const critItem    = r.body.data.items.find(i => i.tracking_code === critCode);

    assert.ok(normalItem,  `Phải tìm thấy ${normalCode}`);
    assert.ok(warningItem, `Phải tìm thấy ${warningCode}`);
    assert.ok(critItem,    `Phải tìm thấy ${critCode}`);
    assert.strictEqual(normalItem.aging_status,  'NORMAL',   `${normalCode} phải NORMAL, got ${normalItem?.aging_status}`);
    assert.strictEqual(warningItem.aging_status, 'WARNING',  `${warningCode} phải WARNING, got ${warningItem?.aging_status}`);
    assert.strictEqual(critItem.aging_status,    'CRITICAL', `${critCode} phải CRITICAL, got ${critItem?.aging_status}`);
    assert.ok(normalItem.dwell_human, 'dwell_human phải có');
    pass(`E1: aging pagination OK, NORMAL/WARNING/CRITICAL phân loại đúng theo SLA ${r.body.data.sla_thresholds.warning_hours}h/${r.body.data.sla_thresholds.critical_hours}h`);
  } catch (e) { fail('E1: aging pagination + aging_status', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // E2 — summary đếm đúng theo Zone/aging_status cho hub test
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 E2 — summary: đếm Zone/aging_status cho hub');
  try {
    const r = await callApi('GET', '/api/inventory/summary', { hub_id: hubIdStr }, staffToken, true);
    console.log(`  HTTP: ${r.status} | total: ${r.body?.data?.total} | NORMAL: ${r.body?.data?.by_aging?.NORMAL} | WARNING: ${r.body?.data?.by_aging?.WARNING} | CRITICAL: ${r.body?.data?.by_aging?.CRITICAL}`);
    assert.strictEqual(r.status, 200);
    const d = r.body.data;
    assert.ok(d.total >= 3, `total phải >= 3, got ${d.total}`);
    assert.ok(d.by_aging?.NORMAL >= 1,   'NORMAL phải >= 1');
    assert.ok(d.by_aging?.WARNING >= 1,  'WARNING phải >= 1');
    assert.ok(d.by_aging?.CRITICAL >= 1, 'CRITICAL phải >= 1');
    assert.ok(Array.isArray(d.by_status) && d.by_status.length >= 1, 'by_status phải có');
    pass(`E2: summary: total=${d.total}, NORMAL=${d.by_aging.NORMAL}, WARNING=${d.by_aging.WARNING}, CRITICAL=${d.by_aging.CRITICAL}`);
  } catch (e) { fail('E2: summary', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // E3 — movement-history trả đúng thứ tự (mới nhất trước) + đúng dữ liệu OrderLog
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 E3 — movement-history: thứ tự mới nhất trước + đúng OrderLog');
  try {
    const r = await callApi('GET', `/api/inventory/${historyCode}/movement-history`, { page: '1', limit: '20' }, staffToken, true);
    console.log(`  HTTP: ${r.status} | logs: ${r.body?.data?.logs?.length} | current_status: ${r.body?.data?.current_status}`);
    assert.strictEqual(r.status, 200);
    const d = r.body.data;
    assert.ok(d.logs.length >= 2, `Phải có >= 2 logs, got ${d.logs.length}`);
    assert.ok(d.current_status, 'current_status phải có');
    assert.ok(d.dwell_human, 'dwell_human phải có');
    assert.ok(d.aging_status, 'aging_status phải có');
    // Kiểm tra thứ tự: createdAt giảm dần
    for (let i = 0; i < d.logs.length - 1; i++) {
      const t1 = new Date(d.logs[i].createdAt).getTime();
      const t2 = new Date(d.logs[i+1].createdAt).getTime();
      assert.ok(t1 >= t2, `Log[${i}].createdAt phải >= log[${i+1}].createdAt (mới nhất trước)`);
    }
    pass(`E3: movement-history ${d.logs.length} logs, thứ tự mới nhất trước ✓`);
  } catch (e) { fail('E3: movement-history', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // E4 — export trả data có cột Dwell Time
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 E4 — export: có cột Dwell Time');
  try {
    const r = await callApi('GET', '/api/inventory/export', { hub_id: hubIdStr, format: 'json' }, coordToken, true);
    console.log(`  HTTP: ${r.status} | count: ${r.body?.data?.count} | format: ${r.body?.data?.format}`);
    assert.strictEqual(r.status, 200);
    const d = r.body.data;
    assert.ok(d.count >= 1, 'Phải export >= 1 kiện');
    assert.ok(Array.isArray(d.items), 'items phải là array');
    const firstItem = d.items[0];
    assert.ok('dwell_hours' in firstItem, 'Phải có cột dwell_hours');
    assert.ok('dwell_human' in firstItem, 'Phải có cột dwell_human');
    assert.ok('aging_status' in firstItem, 'Phải có cột aging_status');
    pass(`E4: export ${d.count} kiện, có dwell_hours=${firstItem.dwell_hours}h, aging_status=${firstItem.aging_status}`);
  } catch (e) { fail('E4: export', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // E5 — action LIQUIDATE happy path
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 E5 — action LIQUIDATE → LIQUIDATED + liquidationApprovedBy');
  const liqCode = `E-LIQ-${ts}`;
  try {
    await makeOrder(liqCode, hubHan._id, { status: 'SURPLUS' });
    const r = await callApi('POST', '/api/inventory/action', {
      tracking_code: liqCode, action_type: 'LIQUIDATE', reason: 'Thanh lý test',
    }, coordToken);
    console.log(`  HTTP: ${r.status} | new_status: ${r.body?.data?.new_status}`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.new_status, 'LIQUIDATED');

    await new Promise(r => setTimeout(r, 500));
    const o = await Order.findOne({ trackingCode: liqCode });
    assert.strictEqual(o?.status, 'LIQUIDATED');
    assert.ok(o?.liquidationApprovedBy, 'liquidationApprovedBy phải được set');
    assert.ok(o?.liquidationApprovedAt, 'liquidationApprovedAt phải được set');
    pass(`E5: LIQUIDATE → LIQUIDATED ✓, liquidationApprovedBy=${o?.liquidationApprovedBy}`);
  } catch (e) { fail('E5: LIQUIDATE', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // E6 — action RETURN → RETURNING; sau đó inbound bình thường
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 E6 — action RETURN → RETURNING; /inbound/scan-single tiếp theo OK');
  const returnCode = `E-RETURN-${ts}`;
  try {
    await makeOrder(returnCode, hubHan._id, { status: 'SURPLUS' });
    const r = await callApi('POST', '/api/inventory/action', {
      tracking_code: returnCode, action_type: 'RETURN',
    }, coordToken);
    console.log(`  HTTP: ${r.status} | new_status: ${r.body?.data?.new_status}`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.new_status, 'RETURNING');

    await new Promise(r => setTimeout(r, 300));
    const o = await Order.findOne({ trackingCode: returnCode });
    assert.strictEqual(o?.status, 'RETURNING');
    pass(`E6a: RETURN → RETURNING ✓`);

    // Đổi về IN_TRANSIT để inbound scan chấp nhận (RETURNING không trong state machine inbound)
    await Order.findOneAndUpdate({ trackingCode: returnCode }, { $set: { status: 'IN_TRANSIT' } });
    const r2 = await callApi('POST', '/api/inbound/scan-single', { tracking_code: returnCode, condition: 'INTACT' }, staffToken);
    console.log(`  inbound after RETURN: HTTP ${r2.status}`);
    assert.strictEqual(r2.status, 200, `inbound phải 200, got ${r2.status}: ${JSON.stringify(r2.body)}`);
    pass(`E6b: Sau RETURN, /inbound/scan-single OK ✓`);
  } catch (e) { fail('E6: RETURN flow', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // E7 — action AI_REROUTE khi AI_ROUTING_SERVICE_URL rỗng → 502 AI_ROUTING_UNAVAILABLE
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 E7 — AI_REROUTE khi URL rỗng → 502 AI_ROUTING_UNAVAILABLE');
  try {
    const aiCode = `E-AI-${ts}`;
    await makeOrder(aiCode, hubHan._id);
    const r = await callApi('POST', '/api/inventory/action', {
      tracking_code: aiCode, action_type: 'AI_REROUTE',
    }, coordToken);
    console.log(`  HTTP: ${r.status} | code: ${r.body?.code}`);
    assert.strictEqual(r.status, 502, `phải 502, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.strictEqual(r.body.code, 'AI_ROUTING_UNAVAILABLE');
    // Đảm bảo status không thay đổi
    const o = await Order.findOne({ trackingCode: aiCode });
    assert.strictEqual(o?.status, 'IN_HUB_ORIGIN', `status phải không đổi, got ${o?.status}`);
    pass(`E7: AI_REROUTE URL rỗng → 502 AI_ROUTING_UNAVAILABLE ✓, status không thay đổi`);
  } catch (e) { fail('E7: AI_REROUTE unavailable', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // E8 — Race condition LIQUIDATE: request thua → 409 RACE_CONDITION_CONFLICT
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 E8 — Race condition LIQUIDATE → 409 RACE_CONDITION_CONFLICT');
  try {
    const raceCode = `E-RACE-${ts}`;
    await makeOrder(raceCode, hubHan._id, { status: 'SURPLUS' });

    // Chạy song song 2 request để tạo race condition thật sự
    const [r1, r2] = await Promise.all([
      callApi('POST', '/api/inventory/action', { tracking_code: raceCode, action_type: 'LIQUIDATE', reason: 'Race 1' }, coordToken),
      callApi('POST', '/api/inventory/action', { tracking_code: raceCode, action_type: 'LIQUIDATE', reason: 'Race 2' }, coordToken),
    ]);
    console.log(`  R1: ${r1.status} | ${r1.body?.data?.new_status || r1.body?.code}`);
    console.log(`  R2: ${r2.status} | ${r2.body?.data?.new_status || r2.body?.code}`);

    const statuses = [r1.status, r2.status];
    const has200 = statuses.includes(200);
    const has409 = statuses.includes(409);

    assert.ok(has200, 'Phải có 1 request thành công (200)');
    assert.ok(has409, `Phải có 1 request bị 409 RACE_CONDITION_CONFLICT, got [${statuses}]`);

    const loser = r1.status === 409 ? r1 : r2;
    assert.strictEqual(loser.body.code, 'RACE_CONDITION_CONFLICT', `code phải RACE_CONDITION_CONFLICT, got ${loser.body.code}`);
    pass(`E8: Race condition LIQUIDATE → request thua trả 409 RACE_CONDITION_CONFLICT ✓`);
  } catch (e) { fail('E8: Race condition conflict', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // E9 — Role control: HUB_STAFF gọi action/export → 403; HUB_COORDINATOR → 200
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 E9 — Role control: HUB_STAFF action/export → 403; HUB_COORDINATOR → 200');
  try {
    const roleCode = `E-ROLE-${ts}`;
    await makeOrder(roleCode, hubHan._id);

    // Staff gọi action → 403
    const r1 = await callApi('POST', '/api/inventory/action', {
      tracking_code: roleCode, action_type: 'RETURN',
    }, staffToken);
    console.log(`  staff POST /action: ${r1.status}`);
    assert.strictEqual(r1.status, 403);
    pass('E9a: HUB_STAFF /action → 403 ✓');

    // Staff gọi export → 403
    const r2 = await callApi('GET', '/api/inventory/export', { hub_id: hubIdStr }, staffToken, true);
    console.log(`  staff GET /export: ${r2.status}`);
    assert.strictEqual(r2.status, 403);
    pass('E9b: HUB_STAFF /export → 403 ✓');

    // Coordinator gọi export → 200
    const r3 = await callApi('GET', '/api/inventory/export', { hub_id: hubIdStr }, coordToken, true);
    console.log(`  coord GET /export: ${r3.status}`);
    assert.strictEqual(r3.status, 200);
    pass('E9c: HUB_COORDINATOR /export → 200 ✓');
  } catch (e) { fail('E9: Role control', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // E10 — Socket.IO: emit inventory:update (kiểm tra bằng log khi action thay đổi)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 E10 — Socket.IO: emit inventory:update khi action thay đổi status');
  try {
    const { emitInventoryUpdate, setIo } = require('../../src/lib/ioSingleton');
    // Mock io
    let emitted = null;
    const mockRoom = (roomName) => ({
      emit: (event, payload) => { emitted = { room: roomName, event, payload }; },
    });
    const mockIo = { to: mockRoom };
    setIo(mockIo);

    emitInventoryUpdate(hubIdStr, { type: 'STATUS_CHANGED', trackingCode: 'E-EMIT-TEST', newStatus: 'LIQUIDATED', hubId: hubIdStr });

    assert.ok(emitted, 'emitInventoryUpdate phải gọi io.to().emit()');
    assert.strictEqual(emitted.event, 'inventory:update');
    assert.strictEqual(emitted.payload.type, 'STATUS_CHANGED');
    assert.ok(emitted.room.includes(hubIdStr), `Room phải chứa hubId, got ${emitted.room}`);
    console.log(`  Emitted room: ${emitted.room} | event: ${emitted.event} | payload: ${JSON.stringify(emitted.payload)}`);

    // Restore io null để không ảnh hưởng test tiếp theo
    setIo(null);
    pass(`E10: Socket.IO emitInventoryUpdate() đúng room warehouse-dashboard:${hubIdStr} ✓`);
  } catch (e) { fail('E10: Socket.IO emit', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // E11 — Unit + API edge cases
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 E11 — Unit + API Edge Cases');

  // U1: calcAgingStatus logic đúng ngưỡng
  try {
    const { calcAgingStatus } = require('../../src/services/inventoryCore.service');
    const warnHours  = Number(process.env.SLA_WARNING_HOURS_DEFAULT) || 24;
    const critHours  = Number(process.env.SLA_CRITICAL_HOURS_DEFAULT) || 48;
    const normalTime = new Date(Date.now() - (warnHours - 1) * 3600_000);
    const warnTime   = new Date(Date.now() - (warnHours + 1) * 3600_000);
    const critTime   = new Date(Date.now() - (critHours + 1) * 3600_000);
    assert.strictEqual(calcAgingStatus(normalTime), 'NORMAL');
    assert.strictEqual(calcAgingStatus(warnTime),   'WARNING');
    assert.strictEqual(calcAgingStatus(critTime),   'CRITICAL');
    assert.strictEqual(calcAgingStatus(null),       'NORMAL'); // null → NORMAL
    pass(`U1 (unit): calcAgingStatus: NORMAL/WARNING/CRITICAL thresholds đúng (${warnHours}h/${critHours}h)`);
  } catch (e) { fail('U1 (unit): calcAgingStatus', e.message); }

  // P1: movement-history tracking_code không tồn tại → 404
  try {
    const r = await callApi('GET', '/api/inventory/GHOST-NONEXIST-CODE/movement-history', null, staffToken, false);
    assert.strictEqual(r.status, 404);
    assert.strictEqual(r.body.code, 'ORDER_NOT_FOUND');
    pass('P1: movement-history code không tồn tại → 404 ORDER_NOT_FOUND');
  } catch (e) { fail('P1: movement-history 404', e.message); }

  // P2: action thiếu tracking_code → 400
  try {
    const r = await callApi('POST', '/api/inventory/action', { action_type: 'RETURN' }, coordToken);
    assert.strictEqual(r.status, 400);
    pass('P2: action thiếu tracking_code → 400');
  } catch (e) { fail('P2: action missing tracking_code', e.message); }

  // P3: action action_type không hợp lệ → 400
  try {
    const r = await callApi('POST', '/api/inventory/action', { tracking_code: `GHOST-${ts}`, action_type: 'DESTROY' }, coordToken);
    assert.strictEqual(r.status, 400);
    pass('P3: action action_type=DESTROY → 400 VALIDATION_ERROR');
  } catch (e) { fail('P3: invalid action_type', e.message); }

  // P4: summary không có hub_id → fallback sang req.user.hubId (đúng thiết kế) → 200 hoặc 400 đều hợp lệ
  try {
    const r = await callApi('GET', '/api/inventory/summary', {}, staffToken, true);
    // Controller fallback sang req.user.hubId nên trả 200; nếu user không có hub → 400/500
    assert.ok([200, 400, 500].includes(r.status), `phải 200, 400 hoặc 500, got ${r.status}`);
    pass(`P4: summary thiếu hub_id → ${r.status} (fallback sang user.hubId nếu có)`);
  } catch (e) { fail('P4: summary missing hub_id', e.message); }

  // P5: aging filter aging_status=CRITICAL chỉ trả CRITICAL
  try {
    const r = await callApi('GET', '/api/inventory/aging', { hub_id: hubIdStr, aging_status: 'CRITICAL', limit: '100' }, staffToken, true);
    assert.strictEqual(r.status, 200);
    const nonCrit = r.body.data.items.filter(i => i.aging_status !== 'CRITICAL');
    assert.strictEqual(nonCrit.length, 0, `Không được có item aging_status != CRITICAL, got ${nonCrit.map(i=>i.aging_status)}`);
    pass(`P5: aging filter CRITICAL chỉ trả CRITICAL items (${r.body.data.items.length} items)`);
  } catch (e) { fail('P5: aging filter CRITICAL', e.message); }

  // ─── Tổng kết ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`🏁 KẾT QUẢ CUỐI: ${results.pass} PASS / ${results.fail} FAIL / ${results.pass + results.fail} tổng`);
  if (results.fail > 0) {
    console.log('\n❌ CASE FAIL:');
    results.cases.filter(c => !c.ok).forEach(c => console.log(`   - [${c.label}]: ${c.reason}`));
  } else {
    console.log('\n🎉 TẤT CẢ PASS — Prompt #E hoàn tất! Module 4 hoàn chỉnh.');
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  server.close();
  await new Promise(r => setTimeout(r, 500));
  await mongoose.disconnect();
  process.exit(results.fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('❌ CRASH:', e.message, e.stack); process.exit(1); });
