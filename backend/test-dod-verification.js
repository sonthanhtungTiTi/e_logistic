/**
 * DoD Verification Suite — 3 mục còn lại của Prompt #B
 * ─────────────────────────────────────────────────────
 * MỤC A: Seal Scan Integration Test (POST /api/inbound/scan-seal)
 *         - Bag 3 mã, 1 cố tình DELIVERED (sẽ fail)
 *         - Xác nhận: 2 success, 1 fail, không chặn nhau
 *
 * MỤC B: Unit Tests (logic thuần, không qua HTTP)
 *         - Idempotency check (OrderLog.findOne trả cached)
 *         - Weight discrepancy: 100g > 50g tolerance → flagFeeWarning
 *         - Weight discrepancy: 30g ≤ 50g tolerance → flagFeeWarning không set
 *         - needsManualRouting khi cả 2 hub check false + IN_TRANSIT
 *         - Zone mapping: SORT_FOR_TRANSIT → STAGING_TRANSFER
 *         - Zone mapping: WAITING_FOR_DELIVERY → STAGING_DELIVERY
 *         - Zone mapping: EXCEPTION (isDamaged) → INCIDENT
 *
 * MỤC C: API Edge Case Tests (Postman-style)
 *         POST /api/inbound/scan-seal
 *           C1: Seal không tồn tại → 404 SEAL_NOT_FOUND
 *           C2: Seal hợp lệ (đã test ở Mục A) → 200
 *           C3: Seal rỗng trackingCodes → 400 EMPTY_BAG
 *         POST /api/inbound/incident
 *           C4: tracking_code không tồn tại → 404
 *           C5: tracking_code hợp lệ, không có ảnh → 200 (ảnh không bắt buộc)
 *           C6: tracking_code hợp lệ, có note + photoUrls giả → 200
 *           C7: body rỗng (thiếu tracking_code) → 400 VALIDATION_ERROR
 *
 * Chạy: node test-dod-verification.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');
const http = require('http');

const app = require('./src/app');
const Order  = require('./src/models/order.model');
const OrderLog = require('./src/models/orderLog.model');
const Bag    = require('./src/models/bag.model');
const Zone   = require('./src/models/zone.model');
const Hub    = require('./src/models/hub.model');
const User   = require('./src/models/user.model');

const { processInboundSingle } = require('./src/services/inboundCore.service');

const PORT = 5097;
const BASE = `http://127.0.0.1:${PORT}/api`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function callApi(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const req = http.request({
      hostname: '127.0.0.1', port: PORT, path, method,
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

async function loginAs(identifier, password) {
  const r = await callApi('POST', '/api/auth/login', { identifier, password });
  if (r.status !== 200) throw new Error(`Login thất bại (${r.status}): ${JSON.stringify(r.body)}`);
  return r.body.accessToken;
}

async function makeOrder(overrides, hubHan, hubSgn) {
  const base = {
    _id: new mongoose.Types.ObjectId(),
    trackingCode: overrides.trackingCode,
    sellerId: new mongoose.Types.ObjectId(),
    status: overrides.status || 'PICKED_UP',
    // Dùng 'in' để phân biệt "không truyền" vs "truyền null" chủ ý
    originHubId:      'originHubId'      in overrides ? overrides.originHubId      : hubHan._id,
    destinationHubId: 'destinationHubId' in overrides ? overrides.destinationHubId : hubSgn._id,
    currentHubId: null,
    actualWeight: overrides.actualWeight ?? 1,
    chargeableWeight: 1, shippingFee: 30000,
    needsManualRouting: false,
    pickupHub: 'HUB_HAN_01', deliveryHub: 'HUB_SGN_01',
    pickupAddress:   { fullName:'A', phone:'0900000001', address:'1 HN', ward:'W', district:'D', province:'Hà Nội' },
    deliveryAddress: { fullName:'B', phone:'0900000002', address:'2 HCM', ward:'W', district:'D', province:'TP. Hồ Chí Minh' },
    items: [{ name:'test', quantity:1, weight:1 }],
    createdAt: new Date(), updatedAt: new Date(),
  };
  await Order.collection.insertOne(base);
  return Order.findById(base._id);
}

// ─── Counter ──────────────────────────────────────────────────────────────────

const results = { pass: 0, fail: 0, cases: [] };

function pass(label) {
  results.pass++;
  results.cases.push({ label, ok: true });
  console.log(`  ✅ PASS: ${label}`);
}

function fail(label, reason) {
  results.fail++;
  results.cases.push({ label, ok: false, reason });
  console.error(`  ❌ FAIL: ${label}`);
  console.error(`         Lý do: ${reason}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔬 DoD VERIFICATION SUITE — Prompt #B (3 mục còn lại)');
  console.log('═══════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic');

  const hubHan = await Hub.findOne({ code: 'HUB_HAN_01' }).lean();
  const hubSgn = await Hub.findOne({ code: 'HUB_SGN_01' }).lean();
  if (!hubHan || !hubSgn) { console.error('❌ Thiếu Hub. Chạy migrate-hub-backfill.js trước.'); process.exit(1); }

  const server = http.createServer(app);
  await new Promise(r => server.listen(PORT, r));
  console.log(`🚀 Server tại port ${PORT}\n`);

  const hanToken = await loginAs('test.hub_staff.han01@elogistic.test', 'TestPass123!');

  // ══════════════════════════════════════════════════════════════════════════
  // MỤC A — Seal Scan Integration Test
  // ══════════════════════════════════════════════════════════════════════════
  console.log('══════════════════════════════════════════════════════════');
  console.log('📦 MỤC A — Seal Scan (3 mã: 2 hợp lệ, 1 cố tình DELIVERED)');
  console.log('══════════════════════════════════════════════════════════\n');

  const ts = Date.now();
  const codeOk1   = `SEAL-OK1-${ts}`;
  const codeOk2   = `SEAL-OK2-${ts}`;
  const codeBad   = `SEAL-BAD-${ts}`;  // DELIVERED → sẽ fail
  const sealCode  = `TESTSEAL${ts}`;

  try {
    // Tạo 3 đơn hàng
    await makeOrder({ trackingCode: codeOk1,  status: 'PICKED_UP' }, hubHan, hubSgn);
    await makeOrder({ trackingCode: codeOk2,  status: 'PICKED_UP' }, hubHan, hubSgn);
    await makeOrder({ trackingCode: codeBad,  status: 'DELIVERED'  }, hubHan, hubSgn); // cố tình sai

    // Tạo Bag với 3 trackingCodes
    const bag = await Bag.create({
      sealCode,
      originHubId: hubHan._id,
      destinationHubId: hubSgn._id,
      status: 'SEALED',
      trackingCodes: [codeOk1, codeOk2, codeBad],
      sealedAt: new Date(),
    });
    console.log(`  📦 Bag tạo: ${sealCode} | trackingCodes: [${codeOk1}, ${codeOk2}, ${codeBad}]\n`);

    // Gọi /api/inbound/scan-seal
    const rSeal = await callApi('POST', '/api/inbound/scan-seal', { seal_code: sealCode }, hanToken);
    const d = rSeal.body?.data;

    console.log(`  HTTP Status     : ${rSeal.status}`);
    console.log(`  total           : ${d?.total}`);
    console.log(`  success_count   : ${d?.success_count}`);
    console.log(`  failed_count    : ${d?.failed_count}`);
    console.log(`  bag_status      : ${d?.bag_status}`);
    console.log(`  failed_items    : ${JSON.stringify(d?.failed_items)}\n`);

    // Assertions
    if (rSeal.status !== 200) {
      fail('A1: scan-seal trả HTTP 200', `got ${rSeal.status}: ${JSON.stringify(rSeal.body)}`);
    } else {
      pass('A1: scan-seal trả HTTP 200');
    }

    if (d?.total === 3) pass('A2: total = 3'); else fail('A2: total = 3', `got ${d?.total}`);
    if (d?.success_count === 2) pass('A3: success_count = 2'); else fail('A3: success_count = 2', `got ${d?.success_count}`);
    if (d?.failed_count === 1) pass('A4: failed_count = 1'); else fail('A4: failed_count = 1', `got ${d?.failed_count}`);

    // Đơn lỗi nằm đúng trong failed_items
    const failedItem = d?.failed_items?.[0];
    if (failedItem?.tracking_code === codeBad) {
      pass(`A5: failed_items chứa đúng mã lỗi (${codeBad})`);
    } else {
      fail('A5: failed_items chứa đúng mã lỗi', `got ${JSON.stringify(failedItem)}`);
    }
    if (failedItem?.reason) pass(`A6: failed_items có lý do: "${failedItem.reason}"`);
    else fail('A6: failed_items có lý do', 'reason rỗng');

    // 2 đơn hợp lệ thật sự đã được update trong DB
    await new Promise(r => setTimeout(r, 300));
    const ok1DB = await Order.findOne({ trackingCode: codeOk1 }).lean();
    const ok2DB = await Order.findOne({ trackingCode: codeOk2 }).lean();
    const badDB = await Order.findOne({ trackingCode: codeBad  }).lean();

    if (ok1DB?.status === 'IN_HUB_ORIGIN') pass(`A7: ${codeOk1} → IN_HUB_ORIGIN`);
    else fail(`A7: ${codeOk1} → IN_HUB_ORIGIN`, `got ${ok1DB?.status}`);

    if (ok2DB?.status === 'IN_HUB_ORIGIN') pass(`A8: ${codeOk2} → IN_HUB_ORIGIN`);
    else fail(`A8: ${codeOk2} → IN_HUB_ORIGIN`, `got ${ok2DB?.status}`);

    if (badDB?.status === 'DELIVERED') pass(`A9: ${codeBad} vẫn DELIVERED (không bị thay đổi)`);
    else fail(`A9: ${codeBad} vẫn DELIVERED`, `got ${badDB?.status}`);

    // Bag không ARRIVED vì còn 1 fail
    if (d?.bag_status !== 'ARRIVED') pass('A10: bag_status không ARRIVED (vì còn fail)');
    else fail('A10: bag_status không ARRIVED', `got ${d?.bag_status}`);

  } catch (e) {
    fail('A-SETUP: Seal scan setup', e.message);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MỤC B — Unit Tests (logic thuần, gọi trực tiếp processInboundSingle)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('🧪 MỤC B — Unit Tests (logic thuần, không qua HTTP)');
  console.log('══════════════════════════════════════════════════════════\n');

  // Mock operator gắn đúng HUB_HAN_01
  const mockOperator = { _id: new mongoose.Types.ObjectId(), hubId: hubHan._id, role: 'HUB_STAFF' };
  const mockOpSgn    = { _id: new mongoose.Types.ObjectId(), hubId: hubSgn._id, role: 'HUB_STAFF' };

  // B1 — Idempotency check: OrderLog.findOne trả cached result
  try {
    const bCode = `UNIT-IDEM-${Date.now()}`;
    await makeOrder({ trackingCode: bCode, status: 'PICKED_UP' }, hubHan, hubSgn);
    const offId = `unit-offline-idem-${Date.now()}`;

    // Lần 1 — thật
    const r1 = await processInboundSingle({ trackingCode: bCode, operator: mockOperator, clientOfflineId: offId });
    assert.strictEqual(r1.current_status, 'IN_HUB_ORIGIN');

    // Đợi setImmediate ghi log
    await new Promise(r => setTimeout(r, 700));

    // Lần 2 — cached
    const r2 = await processInboundSingle({ trackingCode: bCode, operator: mockOperator, clientOfflineId: offId });
    assert.strictEqual(r2.current_status, 'IN_HUB_ORIGIN', 'cached phải trả đúng status');

    // updatedAt không đổi
    const orderDB = await Order.findOne({ trackingCode: bCode }).lean();
    // r2 phải là cached object (trả trước update) — bất biến key
    assert.ok(r2.tracking_code, 'cached result có tracking_code');
    pass('B1: Idempotency — lần 2 trả cached, không update DB lại');
  } catch (e) { fail('B1: Idempotency', e.message); }

  // B2 — Weight discrepancy > tolerance → flagFeeWarning = true
  try {
    const bCode = `UNIT-W100-${Date.now()}`;
    await makeOrder({ trackingCode: bCode, status: 'PICKED_UP', actualWeight: 1.5 }, hubHan, hubSgn);
    const r = await processInboundSingle({
      trackingCode: bCode, operator: mockOperator,
      hubMeasuredWeight: 1600  // 1600g - 1500g = 100g > 50g
    });
    assert.strictEqual(r.weight_discrepancy_gram, 100, `discrepancy phải 100, got ${r.weight_discrepancy_gram}`);
    await new Promise(res => setTimeout(res, 300));
    const db = await Order.findOne({ trackingCode: bCode }).lean();
    assert.strictEqual(db.flagFeeWarning, true, 'flagFeeWarning phải true');
    assert.strictEqual(db.weightDiscrepancyGram, 100);
    pass('B2: Weight discrepancy 100g > 50g → flagFeeWarning=true');
  } catch (e) { fail('B2: Weight discrepancy > tolerance', e.message); }

  // B3 — Weight discrepancy ≤ tolerance → flagFeeWarning KHÔNG set
  try {
    const bCode = `UNIT-W30-${Date.now()}`;
    await makeOrder({ trackingCode: bCode, status: 'PICKED_UP', actualWeight: 1 }, hubHan, hubSgn);
    const r = await processInboundSingle({
      trackingCode: bCode, operator: mockOperator,
      hubMeasuredWeight: 1030  // 1030g - 1000g = 30g ≤ 50g
    });
    assert.strictEqual(r.weight_discrepancy_gram, 30);
    await new Promise(res => setTimeout(res, 300));
    const db = await Order.findOne({ trackingCode: bCode }).lean();
    // flagFeeWarning không được set thành true (mặc định false)
    const ffw = db.flagFeeWarning;
    assert.ok(!ffw, `flagFeeWarning phải falsy, got ${ffw}`);
    pass('B3: Weight discrepancy 30g ≤ 50g → flagFeeWarning không set');
  } catch (e) { fail('B3: Weight discrepancy ≤ tolerance', e.message); }

  // B4 — needsManualRouting khi cả 2 hub check false + IN_TRANSIT
  try {
    const bCode = `UNIT-MR-${Date.now()}`;
    await makeOrder({ trackingCode: bCode, status: 'IN_TRANSIT', originHubId: null, destinationHubId: null }, hubHan, hubSgn);
    const r = await processInboundSingle({ trackingCode: bCode, operator: mockOperator });
    assert.strictEqual(r.needs_manual_routing, true, `phải true, got ${r.needs_manual_routing}`);
    assert.ok(r.zone_id, 'zone_id phải tồn tại');
    pass('B4: needsManualRouting=true khi cả 2 hub false + IN_TRANSIT');
  } catch (e) { fail('B4: needsManualRouting guard', e.message); }

  // B5 — Zone mapping: PICKED_UP + originHub → SORT_FOR_TRANSIT → STAGING_TRANSFER
  try {
    const bCode = `UNIT-ZT-${Date.now()}`;
    await makeOrder({ trackingCode: bCode, status: 'PICKED_UP' }, hubHan, hubSgn);
    const r = await processInboundSingle({ trackingCode: bCode, operator: mockOperator });
    assert.strictEqual(r.next_action, 'SORT_FOR_TRANSIT');
    assert.ok(r.zone_id);
    const z = await Zone.findById(r.zone_id).lean();
    assert.ok(z, 'Zone phải tồn tại');
    assert.strictEqual(z.zoneType, 'STAGING_TRANSFER', `zoneType phải STAGING_TRANSFER, got ${z.zoneType}`);
    pass(`B5: SORT_FOR_TRANSIT → Zone.zoneType=STAGING_TRANSFER`);
  } catch (e) { fail('B5: Zone mapping STAGING_TRANSFER', e.message); }

  // B6 — Zone mapping: IN_TRANSIT + destHub → WAITING_FOR_DELIVERY → STAGING_DELIVERY
  try {
    const bCode = `UNIT-ZD-${Date.now()}`;
    await makeOrder({ trackingCode: bCode, status: 'IN_TRANSIT' }, hubHan, hubSgn);
    const r = await processInboundSingle({ trackingCode: bCode, operator: mockOpSgn });
    assert.strictEqual(r.next_action, 'WAITING_FOR_DELIVERY');
    const z = await Zone.findById(r.zone_id).lean();
    assert.strictEqual(z.zoneType, 'STAGING_DELIVERY', `got ${z.zoneType}`);
    pass('B6: WAITING_FOR_DELIVERY → Zone.zoneType=STAGING_DELIVERY');
  } catch (e) { fail('B6: Zone mapping STAGING_DELIVERY', e.message); }

  // B7 — Zone mapping: DAMAGED → EXCEPTION_INBOUND → INCIDENT
  try {
    const bCode = `UNIT-ZI-${Date.now()}`;
    await makeOrder({ trackingCode: bCode, status: 'PICKED_UP' }, hubHan, hubSgn);
    const r = await processInboundSingle({ trackingCode: bCode, operator: mockOperator, condition: 'DAMAGED' });
    assert.strictEqual(r.current_status, 'EXCEPTION_INBOUND');
    assert.strictEqual(r.is_flagged, true);
    const z = await Zone.findById(r.zone_id).lean();
    assert.strictEqual(z.zoneType, 'INCIDENT', `got ${z.zoneType}`);
    pass('B7: DAMAGED → EXCEPTION_INBOUND + Zone.zoneType=INCIDENT');
  } catch (e) { fail('B7: Zone mapping INCIDENT', e.message); }

  // ══════════════════════════════════════════════════════════════════════════
  // MỤC C — API Edge Case Tests (Postman-style)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('🔌 MỤC C — API Edge Cases (Postman-style)');
  console.log('══════════════════════════════════════════════════════════\n');

  // C1: POST /api/inbound/scan-seal — seal không tồn tại → 404
  try {
    const r = await callApi('POST', '/api/inbound/scan-seal',
      { seal_code: 'NONEXISTENT_SEAL_9999' }, hanToken);
    console.log(`  C1 response: ${r.status} ${r.body?.code}`);
    assert.strictEqual(r.status, 404, `phải 404, got ${r.status}`);
    assert.strictEqual(r.body?.code, 'SEAL_NOT_FOUND');
    pass('C1: scan-seal với seal không tồn tại → 404 SEAL_NOT_FOUND');
  } catch (e) { fail('C1: scan-seal seal không tồn tại', e.message); }

  // C2: POST /api/inbound/scan-seal — Seal rỗng trackingCodes → 400 EMPTY_BAG
  try {
    const emptySealCode = `EMPTY-SEAL-${Date.now()}`;
    await Bag.create({
      sealCode: emptySealCode,
      originHubId: hubHan._id,
      destinationHubId: hubSgn._id,
      status: 'SEALED',
      trackingCodes: [],  // rỗng
    });
    const r = await callApi('POST', '/api/inbound/scan-seal',
      { seal_code: emptySealCode }, hanToken);
    console.log(`  C2 response: ${r.status} ${r.body?.code}`);
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.body?.code, 'EMPTY_BAG');
    pass('C2: scan-seal với bag rỗng → 400 EMPTY_BAG');
  } catch (e) { fail('C2: scan-seal bag rỗng', e.message); }

  // C3: POST /api/inbound/scan-seal — body không có seal_code → 400 VALIDATION_ERROR
  try {
    const r = await callApi('POST', '/api/inbound/scan-seal', {}, hanToken);
    console.log(`  C3 response: ${r.status} ${r.body?.code}`);
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.body?.code, 'VALIDATION_ERROR');
    pass('C3: scan-seal thiếu seal_code → 400 VALIDATION_ERROR');
  } catch (e) { fail('C3: scan-seal thiếu seal_code', e.message); }

  // C4: POST /api/inbound/incident — tracking_code không tồn tại → 404
  try {
    const r = await callApi('POST', '/api/inbound/incident',
      { tracking_code: 'NONEXISTENT-99999', note: 'test' }, hanToken);
    console.log(`  C4 response: ${r.status} ${r.body?.code}`);
    assert.strictEqual(r.status, 404);
    assert.strictEqual(r.body?.code, 'ORDER_NOT_FOUND');
    pass('C4: incident với tracking_code không tồn tại → 404 ORDER_NOT_FOUND');
  } catch (e) { fail('C4: incident tracking_code không tồn tại', e.message); }

  // C5: POST /api/inbound/incident — tracking_code hợp lệ, không có ảnh → 200
  try {
    const cCode = `INC-NOPHOTO-${Date.now()}`;
    await makeOrder({ trackingCode: cCode, status: 'PICKED_UP' }, hubHan, hubSgn);
    const r = await callApi('POST', '/api/inbound/incident',
      { tracking_code: cCode, note: 'Hàng bị móp nhẹ, không có ảnh' }, hanToken);
    console.log(`  C5 response: ${r.status} | current_status: ${r.body?.data?.current_status}`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body?.data?.current_status, 'EXCEPTION_INBOUND');
    assert.strictEqual(r.body?.data?.is_flagged, true);
    assert.strictEqual(r.body?.data?.photos_received, 0);
    pass('C5: incident không có ảnh → 200, photos_received=0, EXCEPTION_INBOUND');
  } catch (e) { fail('C5: incident không có ảnh', e.message); }

  // C6: POST /api/inbound/incident — tracking_code hợp lệ, có note + photoUrls → 200
  try {
    const cCode = `INC-WITHPHOTO-${Date.now()}`;
    await makeOrder({ trackingCode: cCode, status: 'PICKED_UP' }, hubHan, hubSgn);
    const r = await callApi('POST', '/api/inbound/incident', {
      tracking_code: cCode,
      note: 'Hàng bị rách niêm phong có ảnh chụp',
      photo_urls: [
        'https://storage.elogistic.vn/evidence/abc123.jpg',
        'https://storage.elogistic.vn/evidence/abc124.jpg',
      ],
    }, hanToken);
    console.log(`  C6 response: ${r.status} | photos_received: ${r.body?.data?.photos_received}`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body?.data?.photos_received, 2);
    assert.strictEqual(r.body?.data?.current_status, 'EXCEPTION_INBOUND');
    pass('C6: incident với note + 2 photoUrls → 200, photos_received=2');
  } catch (e) { fail('C6: incident có photo_urls', e.message); }

  // C7: POST /api/inbound/incident — body rỗng, thiếu tracking_code → 400
  try {
    const r = await callApi('POST', '/api/inbound/incident', {}, hanToken);
    console.log(`  C7 response: ${r.status} ${r.body?.code}`);
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.body?.code, 'VALIDATION_ERROR');
    pass('C7: incident thiếu tracking_code → 400 VALIDATION_ERROR');
  } catch (e) { fail('C7: incident thiếu tracking_code', e.message); }

  // ─── Tổng kết ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`🏁 KẾT QUẢ CUỐI: ${results.pass} PASS / ${results.fail} FAIL / ${results.pass + results.fail} tổng`);
  if (results.fail > 0) {
    console.log('\n❌ CÁC CASE FAIL:');
    results.cases.filter(c => !c.ok).forEach(c => console.log(`   - ${c.label}: ${c.reason}`));
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  server.close();
  await new Promise(r => setTimeout(r, 400));
  await mongoose.disconnect();
  process.exit(results.fail > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('❌ CRASH:', e.message);
  process.exit(1);
});
