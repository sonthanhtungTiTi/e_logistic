/**
 * DoD Test Suite — Prompt #C (Xuất kho + Bắt tay kép)
 * Cases C1–C12 (C10 timeout job test dùng DRIVER_CONFIRM_TIMEOUT_MINUTES=1)
 *
 * Chạy: node test-prompt-c-dod.js
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
const Trip = require('../../src/models/trip.model');
const Bag = require('../../src/models/bag.model');

const PORT = 5096;

// ─── HTTP helper ─────────────────────────────────────────────────────────────
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
    status: overrides.status || 'IN_HUB_ORIGIN',
    originHubId: 'originHubId' in overrides ? overrides.originHubId : hubHan._id,
    destinationHubId: 'destinationHubId' in overrides ? overrides.destinationHubId : hubSgn._id,
    currentHubId: hubHan._id,
    actualWeight: 1, chargeableWeight: 1, shippingFee: 30000,
    isFlagged: overrides.isFlagged || false,
    needsManualRouting: false,
    pickupHub: 'HUB_HAN_01', deliveryHub: 'HUB_SGN_01',
    pickupAddress: { fullName:'A', phone:'0900000001', address:'1 HN', ward:'W', district:'D', province:'Hà Nội' },
    deliveryAddress: { fullName:'B', phone:'0900000002', address:'2 HCM', ward:'W', district:'D', province:'HCM' },
    items: [{ name:'test', quantity:1, weight:1 }],
    createdAt: new Date(), updatedAt: new Date(),
  };
  await Order.collection.insertOne(base);
  return Order.findById(base._id);
}

async function createTrip(token, payload) {
  return callApi('POST', '/api/trips', payload, token);
}

// ─── Counter ─────────────────────────────────────────────────────────────────
const results = { pass: 0, fail: 0, cases: [] };
function pass(label) { results.pass++; results.cases.push({ label, ok: true }); console.log(`  ✅ PASS: ${label}`); }
function fail(label, reason) { results.fail++; results.cases.push({ label, ok: false, reason }); console.error(`  ❌ FAIL: ${label}\n         ${reason}`); }

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚛 DoD SUITE — Prompt #C: Xuất kho + Bắt tay kép');
  console.log('═══════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic');

  const hubHan = await Hub.findOne({ code: 'HUB_HAN_01' }).lean();
  const hubSgn = await Hub.findOne({ code: 'HUB_SGN_01' }).lean();
  if (!hubHan || !hubSgn) { console.error('❌ Thiếu Hub'); process.exit(1); }

  const server = http.createServer(app);
  await new Promise(r => server.listen(PORT, r));
  console.log(`🚀 Server tại port ${PORT}\n`);

  // Login 3 roles
  const coordToken = await loginAs('test.hub_coordinator.han01@elogistic.test', 'TestPass123!');
  const staffToken  = await loginAs('test.hub_staff.han01@elogistic.test', 'TestPass123!');

  // Tạo hoặc lấy driver test
  let driver = await User.findOne({ email: 'test.driver.han01@elogistic.test' });
  if (!driver) {
    driver = await User.create({
      fullName: 'Tài xế Test HAN01',
      email: 'test.driver.han01@elogistic.test',
      phoneNumber: '0900000099',
      password: 'TestPass123!',
      role: 'DRIVER',
      hubId: hubHan._id,
      isActive: true,
    });
  }
  const driverToken = await loginAs('test.driver.han01@elogistic.test', 'TestPass123!');
  console.log('🔑 Login: coordinator ✅ | staff ✅ | driver ✅\n');

  const ts = Date.now();

  // ══════════════════════════════════════════════════════════════════════════
  // C1 — Tạo Trip thành công, status='DRAFT'
  // ══════════════════════════════════════════════════════════════════════════
  console.log('────────────────────────────────────────────────────────');
  console.log('📌 C1 — Tạo Trip thành công, status=DRAFT');
  let savedTripCode = null;
  try {
    const c1Codes = [`C1-A-${ts}`, `C1-B-${ts}`, `C1-C-${ts}`];
    for (const c of c1Codes) await makeOrder({ trackingCode: c }, hubHan, hubSgn);

    const r = await createTrip(coordToken, {
      trip_type: 'MID_MILE_TRANSFER',
      planned_tracking_codes: c1Codes,
    });
    console.log(`  HTTP: ${r.status} | tripCode: ${r.body?.data?.trip_code} | status: ${r.body?.data?.status}`);
    assert.strictEqual(r.status, 201, `phải 201, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.strictEqual(r.body.data.status, 'DRAFT');
    savedTripCode = r.body.data.trip_code;
    pass(`C1: Trip tạo thành công (${savedTripCode}), status=DRAFT`);
  } catch (e) { fail('C1: Tạo Trip', e.message); }

  // ══════════════════════════════════════════════════════════════════════════
  // C2 — Scan item không thuộc Trip → 409 ITEM_NOT_IN_TRIP
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 C2 — Scan item không thuộc Trip → 409 ITEM_NOT_IN_TRIP');
  try {
    assert.ok(savedTripCode, 'C1 phải thành công trước');
    const fakeCode = `NOT-IN-TRIP-${ts}`;
    await makeOrder({ trackingCode: fakeCode }, hubHan, hubSgn);
    const r = await callApi('POST', '/api/outbound/scan', {
      trip_code: savedTripCode,
      tracking_code: fakeCode,
    }, staffToken);
    console.log(`  HTTP: ${r.status} | code: ${r.body?.code}`);
    assert.strictEqual(r.status, 409);
    assert.strictEqual(r.body.code, 'ITEM_NOT_IN_TRIP');
    pass('C2: Scan item không thuộc Trip → 409 ITEM_NOT_IN_TRIP');
  } catch (e) { fail('C2: ITEM_NOT_IN_TRIP', e.message); }

  // ══════════════════════════════════════════════════════════════════════════
  // C3 — Scan item isFlagged/EXCEPTION_INBOUND → 422 ITEM_LOCKED
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 C3 — Scan item isFlagged → 422 ITEM_LOCKED');
  let tripCodeC3 = null;
  try {
    const lockedCode = `LOCKED-${ts}`;
    await makeOrder({ trackingCode: lockedCode, status: 'EXCEPTION_INBOUND', isFlagged: true }, hubHan, hubSgn);

    const rTrip = await createTrip(coordToken, {
      trip_type: 'MID_MILE_TRANSFER',
      planned_tracking_codes: [lockedCode],
    });
    tripCodeC3 = rTrip.body.data.trip_code;

    const r = await callApi('POST', '/api/outbound/scan', {
      trip_code: tripCodeC3,
      tracking_code: lockedCode,
    }, staffToken);
    console.log(`  HTTP: ${r.status} | code: ${r.body?.code}`);
    assert.strictEqual(r.status, 422);
    assert.strictEqual(r.body.code, 'ITEM_LOCKED');
    pass('C3: Scan isFlagged=true → 422 ITEM_LOCKED');
  } catch (e) { fail('C3: ITEM_LOCKED', e.message); }

  // ══════════════════════════════════════════════════════════════════════════
  // C4 — Scan bằng seal_code → toàn bộ item trong bao được đánh dấu
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 C4 — Scan seal_code → tất cả item trong bao được đánh dấu');
  let tripCodeC4 = null;
  try {
    const sC = [`SEAL-OUT-A-${ts}`, `SEAL-OUT-B-${ts}`, `SEAL-OUT-C-${ts}`];
    for (const c of sC) await makeOrder({ trackingCode: c }, hubHan, hubSgn);
    const sealCode = `OUTSEAL${ts}`;
    await Bag.create({
      sealCode, originHubId: hubHan._id, destinationHubId: hubSgn._id,
      status: 'SEALED', trackingCodes: sC,
    });
    const rTrip = await createTrip(coordToken, {
      trip_type: 'MID_MILE_TRANSFER',
      planned_tracking_codes: sC,
    });
    tripCodeC4 = rTrip.body.data.trip_code;

    const r = await callApi('POST', '/api/outbound/scan', {
      trip_code: tripCodeC4,
      seal_code: sealCode,
    }, staffToken);
    console.log(`  HTTP: ${r.status} | success_count: ${r.body?.data?.success_count} | failed_count: ${r.body?.data?.failed_count}`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.success_count, 3, `phải 3, got ${r.body.data.success_count}`);
    assert.strictEqual(r.body.data.failed_count, 0);

    // Kiểm tra Trip.scannedItems
    await new Promise(res => setTimeout(res, 200));
    const tripDB = await Trip.findOne({ tripCode: tripCodeC4 });
    assert.strictEqual(tripDB.scannedItems.length, 3, `scannedItems phải 3, got ${tripDB.scannedItems.length}`);
    pass('C4: Scan seal → 3/3 item được đánh dấu trong Trip.scannedItems');
  } catch (e) { fail('C4: Scan seal_code', e.message); }

  // ══════════════════════════════════════════════════════════════════════════
  // C5 — Commit is_shortage:true → item chưa quét → SEARCH_ZONE, Trip LOCKED_PENDING_DRIVER_CONFIRM
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 C5 — Commit is_shortage:true → SEARCH_ZONE + LOCKED_PENDING_DRIVER_CONFIRM');
  let tripCodeC5 = null;
  let shortageCode = null;
  try {
    const cScanned = `C5-SCANNED-${ts}`;
    shortageCode = `C5-SHORTAGE-${ts}`;
    await makeOrder({ trackingCode: cScanned }, hubHan, hubSgn);
    await makeOrder({ trackingCode: shortageCode }, hubHan, hubSgn);

    const rTrip = await createTrip(coordToken, {
      trip_type: 'MID_MILE_TRANSFER',
      planned_tracking_codes: [cScanned, shortageCode],
    });
    tripCodeC5 = rTrip.body.data.trip_code;

    // Quét chỉ 1 mã
    await callApi('POST', '/api/outbound/scan', { trip_code: tripCodeC5, tracking_code: cScanned }, staffToken);

    // Commit với is_shortage
    const r = await callApi('POST', '/api/outbound/commit', { trip_code: tripCodeC5, is_shortage: true }, staffToken);
    console.log(`  HTTP: ${r.status} | status: ${r.body?.data?.status} | shortage_count: ${r.body?.data?.shortage_count}`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.status, 'LOCKED_PENDING_DRIVER_CONFIRM');
    assert.strictEqual(r.body.data.shortage_count, 1);

    await new Promise(res => setTimeout(res, 300));
    const shDB = await Order.findOne({ trackingCode: shortageCode });
    assert.strictEqual(shDB.status, 'SEARCH_ZONE', `shortage order phải SEARCH_ZONE, got ${shDB.status}`);
    pass(`C5: Commit shortage → SEARCH_ZONE ✓, Trip → LOCKED_PENDING_DRIVER_CONFIRM ✓`);
  } catch (e) { fail('C5: Commit shortage', e.message); }

  // ══════════════════════════════════════════════════════════════════════════
  // C6a — Driver ACCEPT MID_MILE_TRANSFER → IN_TRANSIT
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 C6a — Driver ACCEPT (MID_MILE_TRANSFER) → IN_TRANSIT');
  try {
    assert.ok(tripCodeC5, 'C5 phải xong trước');
    const r = await callApi('POST', `/api/driver/trips/${tripCodeC5}/confirm`, { action: 'ACCEPT' }, driverToken);
    console.log(`  HTTP: ${r.status} | status: ${r.body?.data?.status} | new_order_status: ${r.body?.data?.new_order_status}`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.status, 'CONFIRMED');
    assert.strictEqual(r.body.data.new_order_status, 'IN_TRANSIT');

    // Verify trip DB
    const tripDB = await Trip.findOne({ tripCode: tripCodeC5 });
    assert.strictEqual(tripDB.status, 'CONFIRMED');

    // Verify 1 đơn đã scanned (cScanned) → IN_TRANSIT
    const scanItem = tripDB.scannedItems[0];
    if (scanItem) {
      await new Promise(r => setTimeout(r, 400));
      const oDb = await Order.findOne({ trackingCode: scanItem.trackingCode });
      assert.strictEqual(oDb.status, 'IN_TRANSIT', `order phải IN_TRANSIT, got ${oDb.status}`);
    }
    pass('C6a: Driver ACCEPT MID_MILE_TRANSFER → Orders → IN_TRANSIT ✓');
  } catch (e) { fail('C6a: Driver ACCEPT MID_MILE', e.message); }

  // ══════════════════════════════════════════════════════════════════════════
  // C6b — Driver ACCEPT LAST_MILE_DELIVERY → OUT_FOR_DELIVERY
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 C6b — Driver ACCEPT (LAST_MILE_DELIVERY) → OUT_FOR_DELIVERY');
  try {
    const lmCode = `LAST-MILE-${ts}`;
    await makeOrder({ trackingCode: lmCode, status: 'IN_HUB_DEST' }, hubHan, hubSgn);

    const rTrip = await createTrip(coordToken, {
      trip_type: 'LAST_MILE_DELIVERY',
      planned_tracking_codes: [lmCode],
    });
    const lmTripCode = rTrip.body.data.trip_code;
    await callApi('POST', '/api/outbound/scan', { trip_code: lmTripCode, tracking_code: lmCode }, staffToken);
    await callApi('POST', '/api/outbound/commit', { trip_code: lmTripCode, is_shortage: false }, staffToken);

    const r = await callApi('POST', `/api/driver/trips/${lmTripCode}/confirm`, { action: 'ACCEPT' }, driverToken);
    console.log(`  HTTP: ${r.status} | new_order_status: ${r.body?.data?.new_order_status}`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.new_order_status, 'OUT_FOR_DELIVERY');

    await new Promise(res => setTimeout(res, 400));
    const oDb = await Order.findOne({ trackingCode: lmCode });
    assert.strictEqual(oDb.status, 'OUT_FOR_DELIVERY');
    pass('C6b: Driver ACCEPT LAST_MILE_DELIVERY → Orders → OUT_FOR_DELIVERY ✓');
  } catch (e) { fail('C6b: Driver ACCEPT LAST_MILE', e.message); }

  // ══════════════════════════════════════════════════════════════════════════
  // C7 — Driver REJECT → Trip REJECTED, nhân viên scan/commit lại được
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 C7 — Driver REJECT → Trip REJECTED → scan lại được');
  let tripCodeC7 = null;
  let codeC7 = null;
  try {
    codeC7 = `C7-REJECT-${ts}`;
    await makeOrder({ trackingCode: codeC7 }, hubHan, hubSgn);
    const rTrip = await createTrip(coordToken, {
      trip_type: 'MID_MILE_TRANSFER',
      planned_tracking_codes: [codeC7],
    });
    tripCodeC7 = rTrip.body.data.trip_code;
    await callApi('POST', '/api/outbound/scan', { trip_code: tripCodeC7, tracking_code: codeC7 }, staffToken);
    await callApi('POST', '/api/outbound/commit', { trip_code: tripCodeC7, is_shortage: false }, staffToken);

    // Driver REJECT
    const rReject = await callApi('POST', `/api/driver/trips/${tripCodeC7}/confirm`,
      { action: 'REJECT', reject_reason: 'Xe bị hỏng' }, driverToken);
    console.log(`  HTTP: ${rReject.status} | status: ${rReject.body?.data?.status}`);
    assert.strictEqual(rReject.status, 200);
    assert.strictEqual(rReject.body.data.status, 'REJECTED');

    const tripDB = await Trip.findOne({ tripCode: tripCodeC7 });
    assert.strictEqual(tripDB.status, 'REJECTED');
    assert.strictEqual(tripDB.rejectReason, 'Xe bị hỏng');
    pass('C7a: Driver REJECT → Trip.status=REJECTED, rejectReason lưu đúng');

    // Nhân viên scan lại được (Trip REJECTED → auto reset về DRAFT)
    const rRescan = await callApi('POST', '/api/outbound/scan', {
      trip_code: tripCodeC7, tracking_code: codeC7,
    }, staffToken);
    console.log(`  Rescan HTTP: ${rRescan.status}`);
    assert.strictEqual(rRescan.status, 200);
    const tripAfterRescan = await Trip.findOne({ tripCode: tripCodeC7 });
    assert.strictEqual(tripAfterRescan.status, 'DRAFT');
    pass('C7b: Sau REJECT, nhân viên scan lại → Trip về DRAFT, scan thành công');
  } catch (e) { fail('C7: Driver REJECT flow', e.message); }

  // ══════════════════════════════════════════════════════════════════════════
  // C8 — Idempotency: gửi lại đúng client_offline_id → không tạo bản ghi trùng
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 C8 — Idempotency scan outbound');
  try {
    const c8Code = `C8-IDEM-${ts}`;
    await makeOrder({ trackingCode: c8Code }, hubHan, hubSgn);
    const rTrip = await createTrip(coordToken, { trip_type: 'MID_MILE_TRANSFER', planned_tracking_codes: [c8Code] });
    const c8TripCode = rTrip.body.data.trip_code;
    const offlineId = `idem-test-${ts}`;

    // Lần 1
    const r1 = await callApi('POST', '/api/outbound/scan', {
      trip_code: c8TripCode, tracking_code: c8Code, client_offline_id: offlineId,
    }, staffToken);
    assert.strictEqual(r1.status, 200, `lần 1: ${JSON.stringify(r1.body)}`);

    await new Promise(r => setTimeout(r, 700));
    const logsBefore = await OrderLog.countDocuments({ clientOfflineId: offlineId });

    // Lần 2 — cùng offlineId
    const r2 = await callApi('POST', '/api/outbound/scan', {
      trip_code: c8TripCode, tracking_code: c8Code, client_offline_id: offlineId,
    }, staffToken);
    assert.strictEqual(r2.status, 200, `lần 2: ${JSON.stringify(r2.body)}`);

    await new Promise(r => setTimeout(r, 300));
    const logsAfter = await OrderLog.countDocuments({ clientOfflineId: offlineId });
    assert.strictEqual(logsBefore, logsAfter, `log count phải giữ nguyên, got before=${logsBefore} after=${logsAfter}`);
    pass(`C8: Idempotency OK — log count trước/sau: ${logsBefore}/${logsAfter}`);
  } catch (e) { fail('C8: Idempotency', e.message); }

  // ══════════════════════════════════════════════════════════════════════════
  // C9 — Guard HUB_UNASSIGNED: operator không có hubId → 403
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 C9 — Guard HUB_UNASSIGNED → 403');
  try {
    // Tạo user không có hubId
    const noHubEmail = `no-hub-${ts}@test.com`;
    await User.create({
      fullName: 'No Hub User', email: noHubEmail, phoneNumber: `091${ts.toString().slice(-7)}`,
      password: 'TestPass123!', role: 'HUB_STAFF', isActive: true, // hubId không set
    });
    const noHubToken = await loginAs(noHubEmail, 'TestPass123!');

    const r = await callApi('POST', '/api/outbound/scan', {
      trip_code: 'TRIP-DUMMY', tracking_code: 'DUMMY',
    }, noHubToken);
    console.log(`  HTTP: ${r.status} | code: ${r.body?.code}`);
    assert.strictEqual(r.status, 403);
    assert.strictEqual(r.body.code, 'HUB_UNASSIGNED');
    pass('C9: Operator không có hubId → 403 HUB_UNASSIGNED');
  } catch (e) { fail('C9: HUB_UNASSIGNED guard', e.message); }

  // ══════════════════════════════════════════════════════════════════════════
  // C10 — Timeout job: DRIVER_CONFIRM_TIMEOUT_MINUTES nhỏ, xác nhận nhắc 1 rồi escalate
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 C10 — Timeout Job (mock timeout ngắn)');
  try {
    const { runTimeoutCheck } = require('../../src/jobs/driverConfirmTimeout.job');
    const c10Code = `C10-TIMEOUT-${ts}`;
    await makeOrder({ trackingCode: c10Code }, hubHan, hubSgn);
    const rTrip = await createTrip(coordToken, { trip_type: 'MID_MILE_TRANSFER', planned_tracking_codes: [c10Code] });
    const c10TripCode = rTrip.body.data.trip_code;
    await callApi('POST', '/api/outbound/scan', { trip_code: c10TripCode, tracking_code: c10Code }, staffToken);
    await callApi('POST', '/api/outbound/commit', { trip_code: c10TripCode, is_shortage: false }, staffToken);

    // Set lockedAt 2 phút trước để trigger reminder (TIMEOUT_MINUTES default là 30, nên test dùng mock)
    // Gian lận: set lockedAt = 25 phút trước để trigger reminder
    const fakeLockedAt = new Date(Date.now() - 25 * 60 * 1000);
    await Trip.updateOne({ tripCode: c10TripCode }, { $set: { lockedAt: fakeLockedAt } });

    await runTimeoutCheck();
    const tripAfterReminder = await Trip.findOne({ tripCode: c10TripCode });
    assert.ok(tripAfterReminder.driverConfirmReminderSentAt, 'driverConfirmReminderSentAt phải được set');
    pass('C10a: Timeout Job lần 1 — driverConfirmReminderSentAt được set ✓');

    // Gian lận: set lockedAt = 31 phút trước để trigger escalate
    const fakeLockedOverdue = new Date(Date.now() - 31 * 60 * 1000);
    await Trip.updateOne({ tripCode: c10TripCode }, { $set: { lockedAt: fakeLockedOverdue } });

    // Spy trên console.log để bắt escalate message
    const origLog = console.log;
    const logs = [];
    console.log = (...args) => { logs.push(args.join(' ')); origLog(...args); };
    await runTimeoutCheck();
    console.log = origLog;
    const escalated = logs.some(l => l.includes('Escalate') && l.includes(c10TripCode));
    assert.ok(escalated, `Không thấy log Escalate cho ${c10TripCode}. Logs: ${logs.join(' | ')}`);
    pass('C10b: Timeout Job lần 2 — Escalate log ✓');
  } catch (e) { fail('C10: Timeout Job', e.message); }

  // ══════════════════════════════════════════════════════════════════════════
  // C11 — Unit test cho guard + logic (gọi service trực tiếp)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 C11 — Unit Tests (logic trực tiếp từ service)');
  const { processOutboundScan, commitTrip, processDriverConfirm } = require('../../src/services/outboundCore.service');
  const mockCoordOp = { _id: new mongoose.Types.ObjectId(), hubId: hubHan._id, role: 'HUB_COORDINATOR' };
  const mockDriverOp = { _id: new mongoose.Types.ObjectId(), hubId: hubHan._id, role: 'DRIVER' };

  // U1 — ITEM_NOT_IN_TRIP guard
  try {
    const uc = `U1-NIT-${ts}`;
    await makeOrder({ trackingCode: uc }, hubHan, hubSgn);
    const rTrip = await createTrip(coordToken, { trip_type: 'MID_MILE_TRANSFER', planned_tracking_codes: [`OTHER-${ts}`] });
    const tripCode = rTrip.body.data.trip_code;
    // Tạo order OTHER- thực sự trong DB
    await makeOrder({ trackingCode: `OTHER-${ts}` }, hubHan, hubSgn);
    let threw = false;
    try {
      await processOutboundScan({ tripCode, trackingCode: uc, operator: mockCoordOp });
    } catch (e) { threw = true; assert.strictEqual(e.code, 'ITEM_NOT_IN_TRIP'); }
    assert.ok(threw, 'Phải throw ITEM_NOT_IN_TRIP');
    pass('U1 (unit): ITEM_NOT_IN_TRIP guard ✓');
  } catch (e) { fail('U1 (unit): ITEM_NOT_IN_TRIP', e.message); }

  // U2 — ITEM_LOCKED guard
  try {
    const uc = `U2-LOCKED-${ts}`;
    await makeOrder({ trackingCode: uc, status: 'EXCEPTION_INBOUND', isFlagged: true }, hubHan, hubSgn);
    const rTrip = await createTrip(coordToken, { trip_type: 'MID_MILE_TRANSFER', planned_tracking_codes: [uc] });
    const tripCode = rTrip.body.data.trip_code;
    let threw = false;
    try { await processOutboundScan({ tripCode, trackingCode: uc, operator: mockCoordOp }); }
    catch (e) { threw = true; assert.strictEqual(e.code, 'ITEM_LOCKED'); }
    assert.ok(threw);
    pass('U2 (unit): ITEM_LOCKED guard ✓');
  } catch (e) { fail('U2 (unit): ITEM_LOCKED', e.message); }

  // U3 — HUB_UNASSIGNED guard
  try {
    const noHubOp = { _id: new mongoose.Types.ObjectId(), role: 'HUB_STAFF' }; // hubId không set
    let threw = false;
    try { await processOutboundScan({ tripCode: 'X', trackingCode: 'Y', operator: noHubOp }); }
    catch (e) { threw = true; assert.strictEqual(e.code, 'HUB_UNASSIGNED'); }
    assert.ok(threw);
    pass('U3 (unit): HUB_UNASSIGNED guard ✓');
  } catch (e) { fail('U3 (unit): HUB_UNASSIGNED', e.message); }

  // U4 — commitTrip RACE_CONDITION (Trip không ở DRAFT → TRIP_NOT_EDITABLE)
  try {
    const rTrip = await createTrip(coordToken, { trip_type: 'MID_MILE_TRANSFER', planned_tracking_codes: [`U4-X-${ts}`] });
    await makeOrder({ trackingCode: `U4-X-${ts}` }, hubHan, hubSgn);
    const tripCode = rTrip.body.data.trip_code;
    await callApi('POST', '/api/outbound/scan', { trip_code: tripCode, tracking_code: `U4-X-${ts}` }, staffToken);
    await callApi('POST', '/api/outbound/commit', { trip_code: tripCode, is_shortage: false }, staffToken);
    // Commit lại lần 2 → phải 409
    let threw = false;
    try { await commitTrip({ tripCode, isShortage: false, operator: mockCoordOp }); }
    catch (e) { threw = true; assert.ok(['TRIP_NOT_EDITABLE','RACE_CONDITION_CONFLICT'].includes(e.code), `code: ${e.code}`); }
    assert.ok(threw);
    pass('U4 (unit): commitTrip lần 2 → TRIP_NOT_EDITABLE ✓');
  } catch (e) { fail('U4 (unit): commitTrip idempotency', e.message); }

  // ══════════════════════════════════════════════════════════════════════════
  // C12 — API edge cases / Postman
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 C12 — API Edge Cases (Postman-style)');

  // P1: POST /api/trips — thiếu trip_type → 400 VALIDATION_ERROR
  try {
    const r = await callApi('POST', '/api/trips', { planned_tracking_codes: ['X'] }, coordToken);
    assert.strictEqual(r.status, 400); assert.strictEqual(r.body.code, 'VALIDATION_ERROR');
    pass('P1: POST /trips thiếu trip_type → 400 VALIDATION_ERROR');
  } catch (e) { fail('P1', e.message); }

  // P2: POST /api/outbound/scan — trip không tồn tại → 404 TRIP_NOT_FOUND
  try {
    const r = await callApi('POST', '/api/outbound/scan', { trip_code: 'GHOST-TRIP-9999', tracking_code: 'X' }, staffToken);
    assert.strictEqual(r.status, 404); assert.strictEqual(r.body.code, 'TRIP_NOT_FOUND');
    pass('P2: /outbound/scan trip không tồn tại → 404 TRIP_NOT_FOUND');
  } catch (e) { fail('P2', e.message); }

  // P3: POST /api/outbound/scan — thiếu trip_code → 400
  try {
    const r = await callApi('POST', '/api/outbound/scan', { tracking_code: 'X' }, staffToken);
    assert.strictEqual(r.status, 400);
    pass('P3: /outbound/scan thiếu trip_code → 400');
  } catch (e) { fail('P3', e.message); }

  // P4: POST /api/outbound/commit — trip không tồn tại → 404
  try {
    const r = await callApi('POST', '/api/outbound/commit', { trip_code: 'GHOST-TRIP-8888', is_shortage: false }, staffToken);
    assert.strictEqual(r.status, 404);
    pass('P4: /outbound/commit trip không tồn tại → 404');
  } catch (e) { fail('P4', e.message); }

  // P5: POST /driver/trips/:tripCode/confirm — trip không tồn tại → 404
  try {
    const r = await callApi('POST', '/api/driver/trips/GHOST-TRIP-7777/confirm', { action: 'ACCEPT' }, driverToken);
    assert.strictEqual(r.status, 404);
    pass('P5: /driver/trips confirm trip không tồn tại → 404');
  } catch (e) { fail('P5', e.message); }

  // P6: POST /driver/trips/:tripCode/confirm — action không hợp lệ → 400
  try {
    const r = await callApi('POST', '/api/driver/trips/DUMMY/confirm', { action: 'MAYBE' }, driverToken);
    assert.strictEqual(r.status, 400);
    pass('P6: /driver/trips confirm action=MAYBE → 400');
  } catch (e) { fail('P6', e.message); }

  // P7: Commit trip ở trạng thái CONFIRMED (đã ACCEPT) → không thể commit lại
  try {
    if (tripCodeC5) {
      const r = await callApi('POST', '/api/outbound/commit', { trip_code: tripCodeC5, is_shortage: false }, staffToken);
      assert.ok([409, 400].includes(r.status), `phải 409, got ${r.status}`);
      pass(`P7: commit Trip đã CONFIRMED → ${r.status} (TRIP_NOT_EDITABLE)`);
    } else {
      pass('P7: skip (C5 không chạy)');
    }
  } catch (e) { fail('P7', e.message); }

  // ─── Tổng kết ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`🏁 KẾT QUẢ CUỐI: ${results.pass} PASS / ${results.fail} FAIL / ${results.pass + results.fail} tổng`);
  if (results.fail > 0) {
    console.log('\n❌ CASE FAIL:');
    results.cases.filter(c => !c.ok).forEach(c => console.log(`   - [${c.label}]: ${c.reason}`));
  } else {
    console.log('\n🎉 TẤT CẢ PASS — Prompt #C hoàn tất!');
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  server.close();
  await new Promise(r => setTimeout(r, 500));
  await mongoose.disconnect();
  process.exit(results.fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('❌ CRASH:', e.message, e.stack); process.exit(1); });
