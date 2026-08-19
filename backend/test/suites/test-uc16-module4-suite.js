/**
 * Test Suite — UC-16 Module 4 (Inbound Hub Expansion)
 * Tests: Idempotency, Weight Discrepancy, needsManualRouting, Zone Mapping, Regression
 *
 * Dùng Hub thật (HUB_HAN_01, HUB_SGN_01) từ DB — không dùng ObjectId inline.
 * User test: test.hub_staff.han01@elogistic.test (tạo bởi migrate-user-hub-repair.js)
 *
 * Chạy: node test-uc16-module4-suite.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const assert = require('assert');
const http = require('http');
const app = require('../../src/app');
const Order = require('../../src/models/order.model');
const OrderLog = require('../../src/models/orderLog.model');
const Zone = require('../../src/models/zone.model');
const Hub = require('../../src/models/hub.model');
const User = require('../../src/models/user.model');

const PORT = 5098;
const BASE_URL = `http://localhost:${PORT}/api`;

// ─── HTTP helper ───────────────────────────────────────────────────────────────
function callApi(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const opts = {
      hostname: '127.0.0.1',
      port: PORT,
      path: path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
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

// ─── Order fixture helper (bypass validators) ─────────────────────────────────
async function makeOrder(overrides) {
  const base = {
    _id: new mongoose.Types.ObjectId(),
    trackingCode: overrides.trackingCode,
    sellerId: new mongoose.Types.ObjectId(),
    status: overrides.status || 'PICKED_UP',
    originHubId: overrides.originHubId || null,
    destinationHubId: overrides.destinationHubId || null,
    currentHubId: null,
    actualWeight: overrides.actualWeight ?? 1,
    chargeableWeight: overrides.chargeableWeight ?? 1,
    shippingFee: 30000,
    needsManualRouting: overrides.needsManualRouting ?? false,
    pickupHub: overrides.pickupHub || 'HUB_HAN_01',
    deliveryHub: overrides.deliveryHub || 'HUB_SGN_01',
    pickupAddress: {
      fullName: 'Test Sender', phone: '0912345678',
      address: '1 Hàng Bài', ward: 'Hàng Bài', district: 'Hoàn Kiếm', province: 'Hà Nội',
    },
    deliveryAddress: {
      fullName: 'Test Receiver', phone: '0987654321',
      address: '2 Lê Lợi', ward: 'Bến Nghé', district: 'Q1', province: 'TP. Hồ Chí Minh',
    },
    items: [{ name: 'Hàng test', quantity: 1, weight: 1 }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await Order.collection.insertOne(base);
  return Order.findById(base._id);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log('===========================================================');
  console.log('🧪 MODULE 4 TEST SUITE — UC-16 Inbound Hub Expansion');
  console.log('===========================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic');
  console.log('✅ MongoDB Connected\n');

  // ── Lấy Hub thật từ DB ────────────────────────────────────────────────────
  const hubHan = await Hub.findOne({ code: 'HUB_HAN_01' }).lean();
  const hubSgn = await Hub.findOne({ code: 'HUB_SGN_01' }).lean();
  if (!hubHan || !hubSgn) {
    console.error('❌ Thiếu Hub HUB_HAN_01 hoặc HUB_SGN_01. Chạy migrate-hub-backfill.js trước.');
    process.exit(1);
  }
  console.log(`🏢 HUB_HAN_01 → ${hubHan._id}`);
  console.log(`🏢 HUB_SGN_01 → ${hubSgn._id}\n`);

  // ── Khởi động server ──────────────────────────────────────────────────────
  const server = http.createServer(app);
  await new Promise((r) => server.listen(PORT, r));
  console.log(`🚀 Server test tại port ${PORT}\n`);

  let passCount = 0;
  let failCount = 0;

  async function loginAs(email, password) {
    const res = await callApi('POST', '/api/auth/login', { identifier: email, password });
    if (res.status !== 200) throw new Error(`Login thất bại: ${JSON.stringify(res.body)}`);
    return res.body.accessToken;
  }

  try {
    // ── Login user HUB_STAFF HAN_01 ─────────────────────────────────────────
    const hanToken = await loginAs('test.hub_staff.han01@elogistic.test', 'TestPass123!');
    console.log('🔑 Login HUB_STAFF HAN_01 thành công\n');

    // ── Login user HUB_STAFF SGN_01 (tạo nếu chưa có) ────────────────────
    let sgnStaff = await User.findOne({ email: 'test.hub_staff.sgn01@elogistic.test' });
    if (!sgnStaff) {
      sgnStaff = await User.create({
        fullName: 'Nhân viên Kho SGN01 (Test)',
        email: 'test.hub_staff.sgn01@elogistic.test',
        phoneNumber: '0900000002',
        password: 'TestPass123!',
        role: 'HUB_STAFF',
        hubId: hubSgn._id,
        isActive: true,
      });
    } else if (sgnStaff.hubId?.toString() !== hubSgn._id.toString()) {
      sgnStaff.hubId = hubSgn._id;
      await sgnStaff.save();
    }
    const sgnToken = await loginAs('test.hub_staff.sgn01@elogistic.test', 'TestPass123!');
    console.log('🔑 Login HUB_STAFF SGN_01 thành công\n');

    // ════════════════════════════════════════════════════════════════════════
    // TEST 1 — Idempotency (gửi cùng client_offline_id 2 lần)
    // ════════════════════════════════════════════════════════════════════════
    console.log('────────────────────────────────────────────────────────');
    console.log('📌 TEST 1 — Idempotency (cùng client_offline_id → không update lần 2)');
    console.log('────────────────────────────────────────────────────────');
    try {
      const t1Code = `M4-IDEM-${Date.now()}`;
      const order1 = await makeOrder({
        trackingCode: t1Code,
        status: 'PICKED_UP',
        originHubId: hubHan._id,
        destinationHubId: hubSgn._id,
      });

      const offlineId = `test-offline-${Date.now()}`;

      // Lần 1: thật
      const r1a = await callApi('POST', '/api/inbound/scan-single',
        { tracking_code: t1Code, client_offline_id: offlineId }, hanToken);
      assert.strictEqual(r1a.status, 200, `Lần 1 phải 200, got ${r1a.status}: ${JSON.stringify(r1a.body)}`);
      assert.strictEqual(r1a.body.data.current_status, 'IN_HUB_ORIGIN');

      // Đợi setImmediate ghi OrderLog
      await new Promise((r) => setTimeout(r, 800));

      const orderAfterFirst = await Order.findById(order1._id).lean();

      // Lần 2: cùng offlineId — phải trả cached result, không update DB
      const r1b = await callApi('POST', '/api/inbound/scan-single',
        { tracking_code: t1Code, client_offline_id: offlineId }, hanToken);
      assert.strictEqual(r1b.status, 200, `Lần 2 phải 200`);

      const orderAfterSecond = await Order.findById(order1._id).lean();

      // updatedAt không được thay đổi
      assert.strictEqual(
        orderAfterFirst.updatedAt.getTime(),
        orderAfterSecond.updatedAt.getTime(),
        'updatedAt phải giống nhau (idempotency)'
      );
      console.log('✅ TEST 1 PASSED: Idempotency hoạt động, updatedAt không thay đổi\n');
      passCount++;
    } catch (e) {
      console.error(`❌ TEST 1 FAILED: ${e.message}\n`);
      failCount++;
    }

    // ════════════════════════════════════════════════════════════════════════
    // TEST 2 — Weight Discrepancy > tolerance → flagFeeWarning = true
    // ════════════════════════════════════════════════════════════════════════
    console.log('────────────────────────────────────────────────────────');
    console.log('📌 TEST 2 — Weight Discrepancy (chênh > 50g → flagFeeWarning)');
    console.log('────────────────────────────────────────────────────────');
    try {
      const t2Code = `M4-WEIGHT-${Date.now()}`;
      await makeOrder({
        trackingCode: t2Code,
        status: 'PICKED_UP',
        originHubId: hubHan._id,
        destinationHubId: hubSgn._id,
        actualWeight: 1.5, // 1500g
      });

      // hub_measured_weight: 1600 gram → discrepancy = 1600 - 1500 = 100g > 50g tolerance
      const r2 = await callApi('POST', '/api/inbound/scan-single',
        { tracking_code: t2Code, hub_measured_weight: 1600 }, hanToken);
      assert.strictEqual(r2.status, 200, `phải 200, got: ${JSON.stringify(r2.body)}`);

      const d2 = r2.body.data;
      assert.strictEqual(d2.weight_discrepancy_gram, 100, 'discrepancy phải là 100g');

      await new Promise((r) => setTimeout(r, 300));
      const order2DB = await Order.findOne({ trackingCode: t2Code }).lean();
      assert.strictEqual(order2DB.weightDiscrepancyGram, 100);
      assert.strictEqual(order2DB.flagFeeWarning, true, 'flagFeeWarning phải true khi > 50g');

      console.log('✅ TEST 2 PASSED: weight_discrepancy_gram=100, flagFeeWarning=true\n');
      passCount++;
    } catch (e) {
      console.error(`❌ TEST 2 FAILED: ${e.message}\n`);
      failCount++;
    }

    // ════════════════════════════════════════════════════════════════════════
    // TEST 3 — needsManualRouting khi cả 2 hub check đều false
    // ════════════════════════════════════════════════════════════════════════
    console.log('────────────────────────────────────────────────────────');
    console.log('📌 TEST 3 — needsManualRouting (đơn IN_TRANSIT không rõ hub đích)');
    console.log('────────────────────────────────────────────────────────');
    try {
      const t3Code = `M4-ROUTE-${Date.now()}`;
      await makeOrder({
        trackingCode: t3Code,
        status: 'IN_TRANSIT',
        originHubId: null,    // không có origin
        destinationHubId: null, // không có destination
      });

      // HAN_01 staff quét — không phải origin, không phải dest → needsManualRouting = true
      const r3 = await callApi('POST', '/api/inbound/scan-single',
        { tracking_code: t3Code }, hanToken);
      assert.strictEqual(r3.status, 200, `phải 200, got: ${JSON.stringify(r3.body)}`);

      const d3 = r3.body.data;
      assert.strictEqual(d3.needs_manual_routing, true, 'needs_manual_routing phải true');
      assert.ok(d3.zone_id, 'zone_id phải có giá trị');

      await new Promise((r) => setTimeout(r, 300));
      const order3DB = await Order.findOne({ trackingCode: t3Code }).lean();
      assert.strictEqual(order3DB.needsManualRouting, true);

      console.log(`✅ TEST 3 PASSED: needs_manual_routing=true, zone_id=${d3.zone_id}\n`);
      passCount++;
    } catch (e) {
      console.error(`❌ TEST 3 FAILED: ${e.message}\n`);
      failCount++;
    }

    // ════════════════════════════════════════════════════════════════════════
    // TEST 4 — Zone Mapping: scan tại destHub → STAGING_DELIVERY
    // ════════════════════════════════════════════════════════════════════════
    console.log('────────────────────────────────────────────────────────');
    console.log('📌 TEST 4 — Zone Mapping (WAITING_FOR_DELIVERY → STAGING_DELIVERY)');
    console.log('────────────────────────────────────────────────────────');
    try {
      const t4Code = `M4-ZONE-${Date.now()}`;
      await makeOrder({
        trackingCode: t4Code,
        status: 'IN_TRANSIT',
        originHubId: hubHan._id,
        destinationHubId: hubSgn._id,
      });

      // SGN_01 staff quét IN_TRANSIT đến SGN → STAGING_DELIVERY
      const r4 = await callApi('POST', '/api/inbound/scan-single',
        { tracking_code: t4Code }, sgnToken);
      assert.strictEqual(r4.status, 200, `phải 200, got: ${JSON.stringify(r4.body)}`);
      assert.strictEqual(r4.body.data.current_status, 'IN_HUB_DEST');
      assert.strictEqual(r4.body.data.next_action, 'WAITING_FOR_DELIVERY');

      const zoneId = r4.body.data.zone_id;
      assert.ok(zoneId, 'zone_id phải tồn tại');

      const zone = await Zone.findById(zoneId).lean();
      assert.ok(zone, 'Zone document phải tồn tại trong DB');
      assert.strictEqual(zone.zoneType, 'STAGING_DELIVERY', `zoneType phải là STAGING_DELIVERY, got: ${zone.zoneType}`);

      console.log(`✅ TEST 4 PASSED: zoneType=STAGING_DELIVERY, zone._id=${zoneId}\n`);
      passCount++;
    } catch (e) {
      console.error(`❌ TEST 4 FAILED: ${e.message}\n`);
      failCount++;
    }

    // ════════════════════════════════════════════════════════════════════════
    // TEST 5 — Regression: scan-single cũ không bị ảnh hưởng
    // ════════════════════════════════════════════════════════════════════════
    console.log('────────────────────────────────────────────────────────');
    console.log('📌 TEST 5 — Regression: scan-single PICKED_UP → IN_HUB_ORIGIN (đúng hub)');
    console.log('────────────────────────────────────────────────────────');
    try {
      const t5Code = `M4-REG-${Date.now()}`;
      await makeOrder({
        trackingCode: t5Code,
        status: 'PICKED_UP',
        originHubId: hubHan._id,
        destinationHubId: hubSgn._id,
      });

      const r5 = await callApi('POST', '/api/inbound/scan-single',
        { tracking_code: t5Code }, hanToken);
      assert.strictEqual(r5.status, 200, `phải 200, got: ${JSON.stringify(r5.body)}`);
      assert.strictEqual(r5.body.data.current_status, 'IN_HUB_ORIGIN');
      assert.strictEqual(r5.body.data.next_action, 'SORT_FOR_TRANSIT');
      assert.strictEqual(r5.body.data.is_flagged, false);

      console.log('✅ TEST 5 PASSED: Scan-single regression OK\n');
      passCount++;
    } catch (e) {
      console.error(`❌ TEST 5 FAILED: ${e.message}\n`);
      failCount++;
    }

  } catch (setupErr) {
    console.error('❌ LỖI SETUP:', setupErr.message);
    failCount++;
  }

  // ── Tổng kết ────────────────────────────────────────────────────────────
  console.log('══════════════════════════════════════════════════════════');
  console.log(`🏁 KẾT QUẢ: ${passCount} PASS / ${failCount} FAIL / 5 tổng`);
  console.log('══════════════════════════════════════════════════════════\n');

  server.close();
  await new Promise((r) => setTimeout(r, 400));
  await mongoose.disconnect();
  process.exit(failCount > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('❌ CRASH:', e.message);
  process.exit(1);
});
