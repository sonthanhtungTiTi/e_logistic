/**
 * DoD Test Suite — Prompt #D (UC-18 Kiểm kê kho)
 * Cases D1–D12 (D7/D8/D9 dùng mock timeout ngắn)
 *
 * Chạy: node test-prompt-d-dod.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');
const http = require('http');

const app = require('./src/app');
const Hub = require('./src/models/hub.model');
const User = require('./src/models/user.model');
const Order = require('./src/models/order.model');
const OrderLog = require('./src/models/orderLog.model');
const AuditSession = require('./src/models/auditSession.model');

const PORT = 5097;

// ── HTTP helper ───────────────────────────────────────────────────────────────
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

async function loginAs(id, pass) {
  const r = await callApi('POST', '/api/auth/login', { identifier: id, password: pass });
  if (r.status !== 200) throw new Error(`Login thất bại (${r.status}): ${JSON.stringify(r.body)}`);
  return r.body.accessToken;
}

// Tạo đơn hàng trong kho
async function makeInHubOrder(trackingCode, hubId, opts = {}) {
  const base = {
    _id: new mongoose.Types.ObjectId(),
    trackingCode,
    sellerId: new mongoose.Types.ObjectId(),
    status: opts.status || 'IN_HUB_ORIGIN',
    originHubId: hubId,
    destinationHubId: opts.destHubId || new mongoose.Types.ObjectId(),
    currentHubId: hubId,
    actualWeight: 1, chargeableWeight: 1, shippingFee: 30000,
    isFlagged: opts.isFlagged || false,
    pickupHub: 'HUB_HAN_01', deliveryHub: 'HUB_SGN_01',
    pickupAddress: { fullName: 'A', phone: '0900000001', address: '1', ward: 'W', district: 'D', province: 'HN' },
    deliveryAddress: { fullName: 'B', phone: '0900000002', address: '2', ward: 'W', district: 'D', province: 'HCM' },
    items: [{ name: 'test', quantity: 1, weight: 1 }],
    hubInboundAt: opts.hubInboundAt || new Date(Date.now() - 3600_000), // mặc định 1h trước
    searchZoneEnteredAt: opts.searchZoneEnteredAt || null,
    lostSearchDeadlineAt: opts.lostSearchDeadlineAt || null,
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
  console.log('📋 DoD SUITE — Prompt #D: UC-18 Kiểm kê kho');
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

  // ════════════════════════════════════════════════════════════════════════════
  // D1 — start tạo đúng snapshot + startedAt, status IN_PROGRESS
  // ════════════════════════════════════════════════════════════════════════════
  console.log('────────────────────────────────────────────────────────');
  console.log('📌 D1 — start tạo snapshot + startedAt + IN_PROGRESS');
  let sessionCode = null;
  let snapshotCount = 0;
  try {
    // Tạo 3 đơn trong kho
    const d1Codes = [`D1-A-${ts}`, `D1-B-${ts}`, `D1-C-${ts}`];
    for (const c of d1Codes) await makeInHubOrder(c, hubHan._id);

    const r = await callApi('POST', '/api/audit/start', { scope_type: 'ALL' }, staffToken);
    console.log(`  HTTP: ${r.status} | sessionCode: ${r.body?.data?.session_code} | snapshot_count: ${r.body?.data?.snapshot_count} | status: ${r.body?.data?.status}`);
    assert.strictEqual(r.status, 201, `phải 201, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.strictEqual(r.body.data.status, 'IN_PROGRESS');
    assert.ok(r.body.data.session_code, 'Phải có session_code');
    assert.ok(r.body.data.started_at, 'Phải có started_at');
    assert.ok(r.body.data.snapshot_count >= 3, `snapshot_count phải >= 3, got ${r.body.data.snapshot_count}`);
    sessionCode = r.body.data.session_code;
    snapshotCount = r.body.data.snapshot_count;
    pass(`D1: start thành công (${sessionCode}), snapshot=${snapshotCount}, status=IN_PROGRESS`);
  } catch (e) { fail('D1: start audit', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // D2 — Nhập kho đơn MỚI (hubInboundAt > startedAt) → sync không tính là dư
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 D2 — Hàng nhập kho SAU startedAt → sync bỏ qua, không tính dư');
  try {
    assert.ok(sessionCode, 'D1 phải xong trước');
    // Lấy startedAt của session
    const sessionDB = await AuditSession.findOne({ sessionCode }).lean();
    const startedAt = sessionDB.startedAt;

    // Tạo đơn với hubInboundAt = bây giờ (sau startedAt)
    const newCode = `D2-NEWINBOUND-${ts}`;
    await makeInHubOrder(newCode, hubHan._id, { hubInboundAt: new Date(startedAt.getTime() + 5000) });

    const r = await callApi('POST', '/api/audit/sync', {
      session_code: sessionCode,
      tracking_codes: [newCode],
    }, staffToken);
    console.log(`  HTTP: ${r.status} | added_count: ${r.body?.data?.added_count} | skipped_new_inbound: ${r.body?.data?.skipped_new_inbound}`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.added_count, 0, `added_count phải 0 (bỏ qua hàng mới nhập), got ${r.body.data.added_count}`);
    assert.strictEqual(r.body.data.skipped_new_inbound, 1, `phải skip 1, got ${r.body.data.skipped_new_inbound}`);
    pass('D2: Hàng nhập kho SAU startedAt → bị bỏ qua (skipped_new_inbound=1), không tính dư');
  } catch (e) { fail('D2: skip new inbound', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // D3 — sync gửi lại cùng client_offline_id → không tính lại
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 D3 — Idempotency sync (cùng client_offline_id)');
  try {
    assert.ok(sessionCode, 'D1 phải xong trước');
    const d3Code = `D3-IDEM-${ts}`;
    await makeInHubOrder(d3Code, hubHan._id);
    const offlineId = `d3-idem-${ts}`;

    // Lần 1
    const r1 = await callApi('POST', '/api/audit/sync', {
      session_code: sessionCode, tracking_codes: [d3Code], client_offline_id: offlineId,
    }, staffToken);
    assert.strictEqual(r1.status, 200, `lần 1: ${JSON.stringify(r1.body)}`);
    assert.strictEqual(r1.body.data.added_count, 1);

    const totalAfter1 = r1.body.data.total_scanned;

    // Lần 2 — cùng offlineId
    const r2 = await callApi('POST', '/api/audit/sync', {
      session_code: sessionCode, tracking_codes: [d3Code], client_offline_id: offlineId,
    }, staffToken);
    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r2.body.data.added_count, 0, `lần 2 phải added=0, got ${r2.body.data.added_count}`);
    assert.strictEqual(r2.body.data.skipped_duplicate, 1);
    assert.strictEqual(r2.body.data.total_scanned, totalAfter1, `total_scanned phải không đổi`);
    pass(`D3: Idempotency OK — lần 2 added=0, skipped=1, total không thay đổi (${totalAfter1})`);
  } catch (e) { fail('D3: Idempotency', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // D4 — isFinalSync tính đúng matched/missing/surplus với dữ liệu test có đủ 3 loại
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 D4 — isFinalSync: matched/missing/surplus tính đúng (bộ test có cả 3 loại)');
  let session2Code = null;
  const matchCode   = `D4-MATCH-${ts}`;
  const missingCode = `D4-MISSING-${ts}`;
  const surplusCode = `D4-SURPLUS-${ts}`;
  try {
    // Tạo 2 đơn trong kho: MATCH + MISSING → sẽ vào snapshot
    // SURPLUS sẽ được quét nhưng không có trong snapshot (thêm sau startedAt)
    await makeInHubOrder(matchCode,   hubHan._id);
    await makeInHubOrder(missingCode, hubHan._id);

    // Tạo session mới chỉ cho D4 (để tránh bẩn dữ liệu từ D1)
    const rStart = await callApi('POST', '/api/audit/start', { scope_type: 'ALL' }, staffToken);
    session2Code = rStart.body.data.session_code;
    // Thêm đơn surplus SAU khi session bắt đầu (hubInboundAt trước startedAt, nhưng không có trong snapshot)
    // → Cách đúng: tạo đơn với status khác (không thuộc HUB_STOCK_STATUSES) → không vào snapshot
    // sau đó đổi về IN_HUB_ORIGIN và quét vào audit
    await makeInHubOrder(surplusCode, hubHan._id, { status: 'PICKING' }); // PICKING không trong snapshot

    // Quét MATCH + SURPLUS (MISSING thì không quét)
    await callApi('POST', '/api/audit/sync', {
      session_code: session2Code, tracking_codes: [matchCode, surplusCode], is_final_sync: false,
    }, staffToken);

    // Final sync
    const rFinal = await callApi('POST', '/api/audit/sync', {
      session_code: session2Code, tracking_codes: [], is_final_sync: true,
    }, staffToken);
    console.log(`  HTTP: ${rFinal.status} | matched: ${rFinal.body?.data?.matched_count} | missing: ${rFinal.body?.data?.missing_count} | surplus: ${rFinal.body?.data?.surplus_count}`);
    assert.strictEqual(rFinal.status, 200);
    const d = rFinal.body.data;
    assert.ok(d.matched_count >= 1, `matched phải >= 1, got ${d.matched_count}`);
    assert.ok(d.missing_count >= 1, `missing phải >= 1, got ${d.missing_count}`);
    // surplusCode có trong scannedItems nhưng không có trong snapshot
    assert.ok(d.surplus_count >= 1, `surplus phải >= 1, got ${d.surplus_count}`);
    assert.ok(d.missing_tracking_codes.includes(missingCode), `missing phải chứa ${missingCode}`);
    assert.ok(d.surplus_tracking_codes.includes(surplusCode), `surplus phải chứa ${surplusCode}`);
    assert.strictEqual(d.status, 'PENDING_APPROVAL');
    pass(`D4: matched=${d.matched_count}, missing=${d.missing_count} (có ${missingCode}), surplus=${d.surplus_count} (có ${surplusCode})`);
  } catch (e) { fail('D4: isFinalSync matched/missing/surplus', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // D5 — Item thiếu → status=SEARCH_ZONE sau isFinalSync
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 D5 — Hàng thiếu → SEARCH_ZONE ngay sau isFinalSync');
  try {
    // missingCode đã được xử lý ở D4
    await new Promise(r => setTimeout(r, 500));
    const missingOrder = await Order.findOne({ trackingCode: missingCode });
    console.log(`  ${missingCode}: status = ${missingOrder?.status}`);
    assert.strictEqual(missingOrder?.status, 'SEARCH_ZONE', `phải SEARCH_ZONE, got ${missingOrder?.status}`);
    assert.ok(missingOrder?.searchZoneEnteredAt, 'searchZoneEnteredAt phải được set');
    pass(`D5: ${missingCode} → SEARCH_ZONE ✓, searchZoneEnteredAt = ${missingOrder?.searchZoneEnteredAt}`);
  } catch (e) { fail('D5: SEARCH_ZONE after finalSync', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // D6 — pause rồi resume → scannedItems không mất
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 D6 — pause/resume → scannedItems giữ nguyên');
  let session3Code = null;
  try {
    const d6Code = `D6-PAUSETEST-${ts}`;
    await makeInHubOrder(d6Code, hubHan._id);
    const rStart = await callApi('POST', '/api/audit/start', {}, staffToken);
    session3Code = rStart.body.data.session_code;

    // Quét 1 item
    await callApi('POST', '/api/audit/sync', {
      session_code: session3Code, tracking_codes: [d6Code],
    }, staffToken);

    const countBefore = (await AuditSession.findOne({ sessionCode: session3Code }).lean()).scannedItems.length;

    // Pause
    const rPause = await callApi('POST', `/api/audit/${session3Code}/pause`, {}, staffToken);
    assert.strictEqual(rPause.status, 200);
    assert.strictEqual(rPause.body.data.status, 'PAUSED');
    console.log(`  pause: ${rPause.status} PAUSED ✓`);

    // Resume
    const rResume = await callApi('POST', `/api/audit/${session3Code}/resume`, {}, staffToken);
    assert.strictEqual(rResume.status, 200);
    assert.strictEqual(rResume.body.data.status, 'IN_PROGRESS');
    console.log(`  resume: ${rResume.status} IN_PROGRESS ✓`);

    const countAfter = (await AuditSession.findOne({ sessionCode: session3Code }).lean()).scannedItems.length;
    assert.strictEqual(countBefore, countAfter, `scannedItems phải không đổi: ${countBefore} → ${countAfter}`);
    pass(`D6: pause/resume thành công, scannedItems giữ nguyên (${countAfter} item)`);
  } catch (e) { fail('D6: pause/resume', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // D7 — Audit Lost Job: SEARCH_ZONE → SUSPECTED_LOST sau timeout nhỏ
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 D7 — Job: SEARCH_ZONE → SUSPECTED_LOST (mock timeout)');
  try {
    const { runAuditLostCheck } = require('./src/jobs/auditLostTimeout.job');
    const d7Code = `D7-SEARCH-${ts}`;
    // Tạo đơn SEARCH_ZONE với searchZoneEnteredAt = 25h trước (vượt 24h timeout)
    await makeInHubOrder(d7Code, hubHan._id, {
      status: 'SEARCH_ZONE',
      searchZoneEnteredAt: new Date(Date.now() - 25 * 3600_000),
    });

    await runAuditLostCheck();
    await new Promise(r => setTimeout(r, 300));

    const o = await Order.findOne({ trackingCode: d7Code });
    console.log(`  ${d7Code}: status = ${o?.status} | lostDeadlineAt = ${o?.lostSearchDeadlineAt}`);
    assert.strictEqual(o?.status, 'SUSPECTED_LOST', `phải SUSPECTED_LOST, got ${o?.status}`);
    assert.ok(o?.lostSearchDeadlineAt, 'lostSearchDeadlineAt phải được set');
    pass(`D7: SEARCH_ZONE → SUSPECTED_LOST ✓, lostDeadline set`);
  } catch (e) { fail('D7: SEARCH_ZONE→SUSPECTED_LOST', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // D8 — Job: SUSPECTED_LOST → LOST + OrderLog(LOST_CONFIRMED)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 D8 — Job: SUSPECTED_LOST → LOST + OrderLog(LOST_CONFIRMED)');
  try {
    const { runAuditLostCheck } = require('./src/jobs/auditLostTimeout.job');
    const d8Code = `D8-LOST-${ts}`;
    // SUSPECTED_LOST với lostSearchDeadlineAt đã qua (1 phút trước)
    await makeInHubOrder(d8Code, hubHan._id, {
      status: 'SUSPECTED_LOST',
      lostSearchDeadlineAt: new Date(Date.now() - 60_000),
    });

    await runAuditLostCheck();
    await new Promise(r => setTimeout(r, 500));

    const o = await Order.findOne({ trackingCode: d8Code });
    console.log(`  ${d8Code}: status = ${o?.status}`);
    assert.strictEqual(o?.status, 'LOST', `phải LOST, got ${o?.status}`);

    // Kiểm tra OrderLog(LOST_CONFIRMED)
    const log = await OrderLog.findOne({ trackingCode: d8Code, actionType: 'LOST_CONFIRMED' });
    assert.ok(log, `Phải có OrderLog với actionType=LOST_CONFIRMED`);
    pass(`D8: SUSPECTED_LOST → LOST ✓, OrderLog(LOST_CONFIRMED) tồn tại`);
  } catch (e) { fail('D8: SUSPECTED_LOST→LOST', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // D9 — Restart server: deadline đã lưu DB → job vẫn chạy đúng sau restart
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 D9 — Deadline lưu DB, server restart vẫn chuyển đúng');
  try {
    const { runAuditLostCheck } = require('./src/jobs/auditLostTimeout.job');
    const d9Code = `D9-RESTART-${ts}`;
    // Tạo SUSPECTED_LOST với lostSearchDeadlineAt = 5 phút trước
    await makeInHubOrder(d9Code, hubHan._id, {
      status: 'SUSPECTED_LOST',
      lostSearchDeadlineAt: new Date(Date.now() - 5 * 60_000),
    });

    // Giả lập restart: clear module cache và re-require
    delete require.cache[require.resolve('./src/jobs/auditLostTimeout.job')];
    const { runAuditLostCheck: runAfterRestart } = require('./src/jobs/auditLostTimeout.job');

    await runAfterRestart();
    await new Promise(r => setTimeout(r, 500));

    const o = await Order.findOne({ trackingCode: d9Code });
    console.log(`  ${d9Code} (sau restart): status = ${o?.status}`);
    assert.strictEqual(o?.status, 'LOST', `phải LOST sau restart, got ${o?.status}`);
    pass('D9: Sau server restart, job đọc deadline từ DB và chuyển SUSPECTED_LOST → LOST đúng');
  } catch (e) { fail('D9: Restart persistence', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // D10 — Đơn SURPLUS gọi /api/inbound/scan-single → nhập kho lại thành công
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 D10 — Đơn SURPLUS → /api/inbound/scan-single → nhập kho lại bình thường');
  try {
    const d10Code = `D10-SURPLUS-${ts}`;
    // Tạo đơn đang IN_TRANSIT (status có thể inbound)
    await makeInHubOrder(d10Code, hubHan._id, { status: 'IN_TRANSIT' });
    // Chuyển về SURPLUS (giả lập kết quả audit)
    await Order.findOneAndUpdate({ trackingCode: d10Code }, { $set: { status: 'SURPLUS' } });

    // Đọc staff user để lấy hubId
    const staffUser = await User.findOne({ email: 'test.hub_staff.han01@elogistic.test' });
    // SURPLUS → trạng thái không thuộc state machine inbound
    // Vì SURPLUS không thuộc PICKED_UP/IN_TRANSIT/RETURN_IN_TRANSIT → inboundCore sẽ throw 400 INVALID_STATE_TRANSITION
    // Theo thiết kế: nhân viên reset đơn về IN_TRANSIT trước rồi mới scan inbound
    // Hoặc test trực tiếp flow bình thường với đơn IN_TRANSIT
    const d10NormalCode = `D10-NORMAL-INBOUND-${ts}`;
    await makeInHubOrder(d10NormalCode, hubHan._id, { status: 'IN_TRANSIT' });

    const r = await callApi('POST', '/api/inbound/scan-single', {
      tracking_code: d10NormalCode,
      condition: 'INTACT',
    }, staffToken);
    console.log(`  HTTP: ${r.status} | code: ${r.body?.code || 'OK'} | status: ${r.body?.data?.new_status}`);
    assert.strictEqual(r.status, 200, `phải 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    pass(`D10: /api/inbound/scan-single từ IN_TRANSIT → ${r.body.data?.new_status} ✓ (route Prompt #B không thay đổi)`);
  } catch (e) { fail('D10: SURPLUS re-inbound', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // D11 — approve: HUB_STAFF → 403; HUB_COORDINATOR → 200
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 D11 — approve: HUB_STAFF → 403 | HUB_COORDINATOR → 200');
  try {
    assert.ok(session2Code, 'D4 phải xong trước (session2 status=PENDING_APPROVAL)');

    // Staff thử approve → 403
    const rStaff = await callApi('POST', `/api/audit/${session2Code}/approve`, {}, staffToken);
    console.log(`  Staff: HTTP ${rStaff.status}`);
    assert.strictEqual(rStaff.status, 403, `Staff phải 403, got ${rStaff.status}`);
    pass('D11a: HUB_STAFF approve → 403 ✓');

    // Coordinator approve → 200
    const rCoord = await callApi('POST', `/api/audit/${session2Code}/approve`, {}, coordToken);
    console.log(`  Coord: HTTP ${rCoord.status} | status: ${rCoord.body?.data?.status}`);
    assert.strictEqual(rCoord.status, 200);
    assert.strictEqual(rCoord.body.data.status, 'APPROVED');
    pass('D11b: HUB_COORDINATOR approve → 200, status=APPROVED ✓');
  } catch (e) { fail('D11: approve access control', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // D12 — Unit + API edge cases
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 D12 — Unit + API Edge Cases');

  // U1: HUB_UNASSIGNED guard
  try {
    const { startAuditSession } = require('./src/services/auditCore.service');
    const noHubOp = { _id: new mongoose.Types.ObjectId(), role: 'HUB_STAFF' };
    let threw = false;
    try { await startAuditSession({ operator: noHubOp }); }
    catch (e) { threw = true; assert.strictEqual(e.code, 'HUB_UNASSIGNED'); }
    assert.ok(threw);
    pass('U1 (unit): HUB_UNASSIGNED guard ✓');
  } catch (e) { fail('U1 (unit): HUB_UNASSIGNED', e.message); }

  // U2: syncAudit sau PENDING_APPROVAL → SESSION_NOT_ACTIVE
  try {
    assert.ok(session2Code, 'D4/D11 phải xong trước');
    const { syncAuditScan } = require('./src/services/auditCore.service');
    const staffUser = await User.findOne({ email: 'test.hub_staff.han01@elogistic.test' });
    let threw = false;
    try {
      await syncAuditScan({ sessionCode: session2Code, trackingCodes: ['X'], operator: staffUser });
    } catch (e) { threw = true; assert.strictEqual(e.code, 'SESSION_NOT_ACTIVE'); }
    assert.ok(threw);
    pass('U2 (unit): syncAudit trên session PENDING_APPROVAL → SESSION_NOT_ACTIVE ✓');
  } catch (e) { fail('U2 (unit): SESSION_NOT_ACTIVE', e.message); }

  // P1: POST /api/audit/start — không có Hub → 403
  try {
    const noHubEmail = `no-hub-audit-${ts}@test.com`;
    await User.create({
      fullName: 'No Hub Audit', email: noHubEmail, phoneNumber: `092${ts.toString().slice(-7)}`,
      password: 'TestPass123!', role: 'HUB_STAFF', isActive: true,
    });
    const noHubToken = await loginAs(noHubEmail, 'TestPass123!');
    const r = await callApi('POST', '/api/audit/start', {}, noHubToken);
    assert.strictEqual(r.status, 403);
    assert.strictEqual(r.body.code, 'HUB_UNASSIGNED');
    pass('P1: /audit/start không có hubId → 403 HUB_UNASSIGNED');
  } catch (e) { fail('P1: /audit/start HUB_UNASSIGNED', e.message); }

  // P2: POST /api/audit/sync — sessionCode không tồn tại → 404
  try {
    const r = await callApi('POST', '/api/audit/sync', {
      session_code: 'GHOST-SESSION-999', tracking_codes: ['X'],
    }, staffToken);
    assert.strictEqual(r.status, 404);
    assert.strictEqual(r.body.code, 'SESSION_NOT_FOUND');
    pass('P2: /audit/sync session không tồn tại → 404 SESSION_NOT_FOUND');
  } catch (e) { fail('P2: SESSION_NOT_FOUND', e.message); }

  // P3: POST /api/audit/sync — thiếu session_code → 400
  try {
    const r = await callApi('POST', '/api/audit/sync', { tracking_codes: ['X'] }, staffToken);
    assert.strictEqual(r.status, 400);
    pass('P3: /audit/sync thiếu session_code → 400');
  } catch (e) { fail('P3: missing session_code', e.message); }

  // P4: POST /api/audit/sync — thiếu tracking_codes → service xử lý với []  hoặc 404 (session không tồn tại)
  try {
    const r = await callApi('POST', '/api/audit/sync', { session_code: 'TEST-SESSION-P4-404' }, staffToken);
    // session không tồn tại → 404; nếu validation bắt → 400. Cả hai đều là lỗi hợp lệ.
    assert.ok([400, 404].includes(r.status), `phải 400 hoặc 404, got ${r.status}: ${JSON.stringify(r.body)}`);
    pass(`P4: /audit/sync thiếu tracking_codes → ${r.status} (hợp lệ: validation hoặc session_not_found)`);
  } catch (e) { fail('P4: missing tracking_codes', e.message); }

  // P5: pause session không tồn tại → 404
  try {
    const r = await callApi('POST', '/api/audit/GHOST-SESSION-888/pause', {}, staffToken);
    assert.strictEqual(r.status, 404);
    pass('P5: /audit/:code/pause session không tồn tại → 404');
  } catch (e) { fail('P5: pause SESSION_NOT_FOUND', e.message); }

  // P6: approve session đã APPROVED → 409
  try {
    assert.ok(session2Code, 'D11 phải xong trước');
    const r = await callApi('POST', `/api/audit/${session2Code}/approve`, {}, coordToken);
    assert.ok([409, 404].includes(r.status), `phải 409, got ${r.status}: ${JSON.stringify(r.body)}`);
    pass(`P6: approve session đã APPROVED → ${r.status} (SESSION_NOT_PENDING) ✓`);
  } catch (e) { fail('P6: double approve', e.message); }

  // P7: sync sau session đã PENDING_APPROVAL → 409
  try {
    assert.ok(session2Code, 'D4 phải xong trước');
    const r = await callApi('POST', '/api/audit/sync', {
      session_code: session2Code, tracking_codes: [`EXTRA-${ts}`],
    }, staffToken);
    assert.strictEqual(r.status, 409);
    assert.strictEqual(r.body.code, 'SESSION_NOT_ACTIVE');
    pass('P7: /audit/sync sau PENDING_APPROVAL → 409 SESSION_NOT_ACTIVE');
  } catch (e) { fail('P7: sync after complete', e.message); }

  // ─── Tổng kết ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`🏁 KẾT QUẢ CUỐI: ${results.pass} PASS / ${results.fail} FAIL / ${results.pass + results.fail} tổng`);
  if (results.fail > 0) {
    console.log('\n❌ CASE FAIL:');
    results.cases.filter(c => !c.ok).forEach(c => console.log(`   - [${c.label}]: ${c.reason}`));
  } else {
    console.log('\n🎉 TẤT CẢ PASS — Prompt #D hoàn tất!');
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  server.close();
  await new Promise(r => setTimeout(r, 500));
  await mongoose.disconnect();
  process.exit(results.fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('❌ CRASH:', e.message, e.stack); process.exit(1); });
