/**
 * End-to-End Test Suite: 3-Tier Regional Master Routing & Multi-Hop Lifecycle
 * Chạy: node test-hub-routing-e2e.js
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
const Zone = require('../../src/models/zone.model');
const hubRoutingService = require('../../src/services/hubRouting.service');
const orderService = require('../../src/services/order.service');
const { processInboundSingle } = require('../../src/services/inboundCore.service');
const { processOutboundScan, commitTrip, processDriverConfirm } = require('../../src/services/outboundCore.service');

const PORT = 5099;

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

// ── Counter ───────────────────────────────────────────────────────────────────
const results = { pass: 0, fail: 0, cases: [] };
function pass(label) { results.pass++; results.cases.push({ label, ok: true }); console.log(`  ✅ PASS: ${label}`); }
function fail(label, reason) { results.fail++; results.cases.push({ label, ok: false, reason }); console.error(`  ❌ FAIL: ${label}\n         ${reason}`); }

async function run() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🌐 E2E TEST: 3-Tier Regional Master Routing & Multi-Hop Lifecycle');
  console.log('═══════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI);

  const server = http.createServer(app);
  await new Promise(r => server.listen(PORT, r));
  console.log(`🚀 Test Server tại port ${PORT}\n`);

  // Đảm bảo các Hub cần thiết tồn tại trong DB
  const requiredHubs = [
    { code: 'HUB_HAN_01', name: 'Bưu cục Trung tâm Hà Nội', province: 'HÀ NỘI', type: 'ORIGIN_HUB' },
    { code: 'HUB_DAD_01', name: 'Bưu cục Đà Nẵng', province: 'ĐÀ NẴNG', type: 'MIXED' },
    { code: 'HUB_SGN_01', name: 'Bưu cục Trung tâm TP.HCM', province: 'TP. HỒ CHÍ MINH', type: 'DEST_HUB' },
    { code: 'HUB_HPH_01', name: 'Bưu cục Hải Phòng', province: 'HẢI PHÒNG', type: 'MIXED' },
    { code: 'HUB_VCA_01', name: 'Bưu cục Cần Thơ', province: 'CẦN THƠ', type: 'MIXED' },
    { code: 'HUB_BDG_01', name: 'Bưu cục Bình Dương', province: 'BÌNH DƯƠNG', type: 'MIXED' },
    { code: 'HUB_DNI_01', name: 'Bưu cục Đồng Nai', province: 'ĐỒNG NAI', type: 'MIXED' },
  ];

  const hubMap = {};
  for (const h of requiredHubs) {
    const doc = await Hub.findOneAndUpdate(
      { code: h.code },
      { $set: h },
      { upsert: true, returnDocument: 'after' }
    );
    hubMap[h.code] = doc;
  }
  console.log('🏢 Master & Provincial Hubs verified in DB.\n');

  const ts = Date.now();

  // ════════════════════════════════════════════════════════════════════════════
  // 1. UNIT TEST: Province to Hub Resolution
  // ════════════════════════════════════════════════════════════════════════════
  console.log('────────────────────────────────────────────────────────');
  console.log('📌 1. Kiểm tra phân giải 63 Tỉnh/Thành về 3 Miền');
  try {
    const r1 = hubRoutingService.resolveHubRouting('Tỉnh Hải Phòng');
    assert.strictEqual(r1.hubCode, 'HUB_HPH_01');
    assert.strictEqual(r1.region, 'NORTH');

    const r2 = hubRoutingService.resolveHubRouting('Thành phố Cần Thơ');
    assert.strictEqual(r2.hubCode, 'HUB_VCA_01');
    assert.strictEqual(r2.region, 'SOUTH');

    const r3 = hubRoutingService.resolveHubRouting('Quảng Ninh');
    assert.strictEqual(r3.hubCode, 'HUB_HAN_01');
    assert.strictEqual(r3.region, 'NORTH');

    const r4 = hubRoutingService.resolveHubRouting('Thừa Thiên Huế');
    assert.strictEqual(r4.hubCode, 'HUB_DAD_01');
    assert.strictEqual(r4.region, 'CENTRAL');

    const r5 = hubRoutingService.resolveHubRouting('Cà Mau');
    assert.strictEqual(r5.hubCode, 'HUB_SGN_01');
    assert.strictEqual(r5.region, 'SOUTH');

    const r6 = hubRoutingService.resolveHubRouting('Bình Dương');
    assert.strictEqual(r6.hubCode, 'HUB_BDG_01');
    assert.strictEqual(r6.region, 'SOUTH');

    pass('1. Phân giải đúng các tỉnh thành đại diện 3 Miền Bắc - Trung - Nam');
  } catch (e) { fail('1. Province resolution', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 2. UNIT TEST: Route Path Calculation
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 2. Kiểm tra tính toán Lộ trình Hub-and-Spoke (Route Path)');
  try {
    // Hải Phòng -> Cần Thơ: HPH -> HAN -> SGN -> VCA
    const pathInter = hubRoutingService.calculateRoutePath('HUB_HPH_01', 'HUB_VCA_01');
    assert.deepStrictEqual(pathInter, ['HUB_HPH_01', 'HUB_HAN_01', 'HUB_SGN_01', 'HUB_VCA_01']);

    // Hải Phòng -> Hà Nội: HPH -> HAN
    const pathIntra = hubRoutingService.calculateRoutePath('HUB_HPH_01', 'HUB_HAN_01');
    assert.deepStrictEqual(pathIntra, ['HUB_HPH_01', 'HUB_HAN_01']);

    // Hà Nội -> Đà Nẵng: HAN -> DAD
    const pathNorthCentral = hubRoutingService.calculateRoutePath('HUB_HAN_01', 'HUB_DAD_01');
    assert.deepStrictEqual(pathNorthCentral, ['HUB_HAN_01', 'HUB_DAD_01']);

    // Next Hop test
    const next1 = hubRoutingService.getNextHopHub('HUB_HPH_01', 'HUB_VCA_01');
    assert.strictEqual(next1, 'HUB_HAN_01');

    const next2 = hubRoutingService.getNextHopHub('HUB_HAN_01', 'HUB_VCA_01', 'HUB_HPH_01');
    assert.strictEqual(next2, 'HUB_SGN_01');

    const next3 = hubRoutingService.getNextHopHub('HUB_SGN_01', 'HUB_VCA_01', 'HUB_HPH_01');
    assert.strictEqual(next3, 'HUB_VCA_01');

    const next4 = hubRoutingService.getNextHopHub('HUB_VCA_01', 'HUB_VCA_01');
    assert.strictEqual(next4, null); // Arrived

    pass('2. Lộ trình Hub-and-Spoke và Next Hop tính toán chính xác');
  } catch (e) { fail('2. Route Path calculation', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 3. INTEGRATION TEST: Tạo đơn tự động nhận diện Kho Gốc & Kho Đích
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 3. Tạo đơn tự động gán Kho Gốc (Hải Phòng) & Kho Đích (Cần Thơ)');
  const interTrackingCode = `E2E-INTER-${ts}`;
  let interOrder = null;
  const sellerId = new mongoose.Types.ObjectId();
  const operatorDummy = { _id: new mongoose.Types.ObjectId(), hubId: hubMap['HUB_HPH_01']._id };

  try {
    const res = await orderService.createNewOrder(sellerId, {
      trackingCode: interTrackingCode,
      pickupAddress: { fullName: 'Shop HP', phone: '0988000001', address: '12 Lạch Tray', ward: 'Lạch Tray', district: 'Ngô Quyền', province: 'Hải Phòng' },
      deliveryAddress: { fullName: 'Khách Cần Thơ', phone: '0988000002', address: '45 30/4', ward: 'An Phú', district: 'Ninh Kiều', province: 'Cần Thơ' },
      items: [{ name: 'Áo thun', quantity: 2, weight: 0.5 }],
      actualWeight: 0.5,
    });
    interOrder = res.order;

    assert.strictEqual(interOrder.originHubId.toString(), hubMap['HUB_HPH_01']._id.toString(), 'Kho gốc phải là HUB_HPH_01');
    assert.strictEqual(interOrder.destinationHubId.toString(), hubMap['HUB_VCA_01']._id.toString(), 'Kho đích phải là HUB_VCA_01');
    pass(`3. Tạo đơn thành công: Kho gốc = HUB_HPH_01, Kho đích = HUB_VCA_01`);
  } catch (e) { fail('3. Create Order automatic hub routing', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 4. FULL MULTI-HOP LIFECYCLE: Hải Phòng -> Hà Nội -> TP.HCM -> Cần Thơ
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 4. Vòng đời toàn trình 4 Chặng (Hải Phòng -> Hà Nội -> TP.HCM -> Cần Thơ)');
  try {
    // ── Bước 4.1: Shipper gom hàng về Bưu cục Hải Phòng ───────────────────────
    await Order.updateOne({ _id: interOrder._id }, { $set: { status: 'PICKED_UP' } });
    const opHPH = { _id: new mongoose.Types.ObjectId(), hubId: hubMap['HUB_HPH_01']._id };
    
    const inb1 = await processInboundSingle({
      trackingCode: interTrackingCode,
      operator: opHPH,
      condition: 'INTACT',
    });
    assert.strictEqual(inb1.current_status, 'IN_HUB_ORIGIN', 'Tại HP phải là IN_HUB_ORIGIN');
    assert.strictEqual(inb1.is_origin_hub, true);
    assert.strictEqual(inb1.is_dest_hub, false);
    assert.strictEqual(inb1.next_action, 'SORT_FOR_TRANSIT');
    console.log('  [Chặng 1] Nhập kho Hải Phòng: IN_HUB_ORIGIN ✅');

    // ── Bước 4.2: Xuất kho Hải Phòng lên Kho Tổng Hà Nội ────────────────────
    const trip1Code = `TRIP-HPH-HAN-${ts}`;
    const trip1 = await Trip.create({
      tripCode: trip1Code,
      tripType: 'MID_MILE_TRANSFER',
      originHubId: hubMap['HUB_HPH_01']._id,
      destinationHubId: hubMap['HUB_HAN_01']._id,
      plannedTrackingCodes: [interTrackingCode],
      status: 'DRAFT',
    });
    await processOutboundScan({ tripCode: trip1Code, trackingCode: interTrackingCode, operator: opHPH });
    await commitTrip({ tripCode: trip1Code, isShortage: false, operator: opHPH });
    await processDriverConfirm({ tripCode: trip1Code, action: 'ACCEPT', operator: { _id: new mongoose.Types.ObjectId() } });
    
    let chkOrder = await Order.findOne({ trackingCode: interTrackingCode });
    assert.strictEqual(chkOrder.status, 'IN_TRANSIT');
    console.log('  [Chặng 1 -> 2] Xuất kho Hải Phòng -> Xe chạy: IN_TRANSIT ✅');

    // ── Bước 4.3: Nhập kho tại Kho Tổng Hà Nội (HUB_HAN_01) ──────────────────
    const opHAN = { _id: new mongoose.Types.ObjectId(), hubId: hubMap['HUB_HAN_01']._id };
    const inb2 = await processInboundSingle({
      trackingCode: interTrackingCode,
      operator: opHAN,
      condition: 'INTACT',
    });
    assert.strictEqual(inb2.current_status, 'IN_SORTING_HUB', 'Tại Kho Tổng HN phải là IN_SORTING_HUB');
    assert.strictEqual(inb2.is_dest_hub, false);
    assert.strictEqual(inb2.next_action, 'SORT_FOR_NEXT_HUB');
    console.log('  [Chặng 2] Nhập Kho Tổng Hà Nội: IN_SORTING_HUB (nhận diện trung chuyển) ✅');

    // ── Bước 4.4: Xuất kho Hà Nội -> Xe đường trục (Linehaul) vào TP.HCM ────
    const trip2Code = `TRIP-HAN-SGN-${ts}`;
    await Trip.create({
      tripCode: trip2Code,
      tripType: 'MID_MILE_TRANSFER',
      originHubId: hubMap['HUB_HAN_01']._id,
      destinationHubId: hubMap['HUB_SGN_01']._id,
      plannedTrackingCodes: [interTrackingCode],
      status: 'DRAFT',
    });
    await processOutboundScan({ tripCode: trip2Code, trackingCode: interTrackingCode, operator: opHAN });
    await commitTrip({ tripCode: trip2Code, isShortage: false, operator: opHAN });
    await processDriverConfirm({ tripCode: trip2Code, action: 'ACCEPT', operator: { _id: new mongoose.Types.ObjectId() } });

    chkOrder = await Order.findOne({ trackingCode: interTrackingCode });
    assert.strictEqual(chkOrder.status, 'IN_TRANSIT');
    console.log('  [Chặng 2 -> 3] Xe đường trục Bắc - Nam xuất bến: IN_TRANSIT ✅');

    // ── Bước 4.5: Nhập kho tại Kho Tổng TP.HCM (HUB_SGN_01) ─────────────────
    const opSGN = { _id: new mongoose.Types.ObjectId(), hubId: hubMap['HUB_SGN_01']._id };
    const inb3 = await processInboundSingle({
      trackingCode: interTrackingCode,
      operator: opSGN,
      condition: 'INTACT',
    });
    assert.strictEqual(inb3.current_status, 'IN_SORTING_HUB', 'Tại Kho Tổng HCM phải là IN_SORTING_HUB');
    assert.strictEqual(inb3.is_dest_hub, false);
    assert.strictEqual(inb3.next_action, 'SORT_FOR_NEXT_HUB');
    console.log('  [Chặng 3] Nhập Kho Tổng TP.HCM: IN_SORTING_HUB (nhận diện trung chuyển) ✅');

    // ── Bước 4.6: Xuất kho TP.HCM về Bưu cục đích Cần Thơ (HUB_VCA_01) ───────
    const trip3Code = `TRIP-SGN-VCA-${ts}`;
    await Trip.create({
      tripCode: trip3Code,
      tripType: 'MID_MILE_TRANSFER',
      originHubId: hubMap['HUB_SGN_01']._id,
      destinationHubId: hubMap['HUB_VCA_01']._id,
      plannedTrackingCodes: [interTrackingCode],
      status: 'DRAFT',
    });
    await processOutboundScan({ tripCode: trip3Code, trackingCode: interTrackingCode, operator: opSGN });
    await commitTrip({ tripCode: trip3Code, isShortage: false, operator: opSGN });
    await processDriverConfirm({ tripCode: trip3Code, action: 'ACCEPT', operator: { _id: new mongoose.Types.ObjectId() } });

    chkOrder = await Order.findOne({ trackingCode: interTrackingCode });
    assert.strictEqual(chkOrder.status, 'IN_TRANSIT');
    console.log('  [Chặng 3 -> 4] Xe trung chuyển HCM -> Cần Thơ: IN_TRANSIT ✅');

    // ── Bước 4.7: Nhập kho tại Bưu cục đích Cần Thơ (HUB_VCA_01) ─────────────
    const opVCA = { _id: new mongoose.Types.ObjectId(), hubId: hubMap['HUB_VCA_01']._id };
    const inb4 = await processInboundSingle({
      trackingCode: interTrackingCode,
      operator: opVCA,
      condition: 'INTACT',
    });
    assert.strictEqual(inb4.current_status, 'IN_HUB_DEST', 'Tại Cần Thơ phải nhận diện là IN_HUB_DEST');
    assert.strictEqual(inb4.is_dest_hub, true, 'is_dest_hub phải là true');
    assert.strictEqual(inb4.next_action, 'WAITING_FOR_DELIVERY', 'next_action phải là WAITING_FOR_DELIVERY');
    console.log('  [Chặng 4] Nhập Bưu cục Cần Thơ: IN_HUB_DEST (ĐÃ ĐẾN KHO ĐÍCH THÀNH CÔNG!) ✅');

    // ── Bước 4.8: Xuất kho giao hàng chặng cuối cho Shipper (LAST_MILE) ──────
    const tripLastCode = `TRIP-DELIVERY-VCA-${ts}`;
    await Trip.create({
      tripCode: tripLastCode,
      tripType: 'LAST_MILE_DELIVERY',
      originHubId: hubMap['HUB_VCA_01']._id,
      driverId: new mongoose.Types.ObjectId(),
      plannedTrackingCodes: [interTrackingCode],
      status: 'DRAFT',
    });
    await processOutboundScan({ tripCode: tripLastCode, trackingCode: interTrackingCode, operator: opVCA });
    await commitTrip({ tripCode: tripLastCode, isShortage: false, operator: opVCA });
    await processDriverConfirm({ tripCode: tripLastCode, action: 'ACCEPT', operator: { _id: new mongoose.Types.ObjectId() } });

    chkOrder = await Order.findOne({ trackingCode: interTrackingCode });
    assert.strictEqual(chkOrder.status, 'OUT_FOR_DELIVERY', 'Chuyến Last-mile confirm -> OUT_FOR_DELIVERY');
    console.log('  [Giao hàng] Bàn giao Shipper Cần Thơ: OUT_FOR_DELIVERY ✅');

    pass('4. Vòng đời toàn trình Liên miền (Hải Phòng -> Hà Nội -> TP.HCM -> Cần Thơ) hoàn hảo');
  } catch (e) { fail('4. Full multi-hop lifecycle', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 5. INTRA-REGIONAL LIFECYCLE: Hải Phòng -> Hà Nội (Nội miền)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 5. Vòng đời Nội miền (Hải Phòng -> Hà Nội)');
  const intraTrackingCode = `E2E-INTRA-${ts}`;
  try {
    const res = await orderService.createNewOrder(sellerId, {
      trackingCode: intraTrackingCode,
      pickupAddress: { fullName: 'Shop HP', phone: '0988000001', address: '12 Lạch Tray', ward: 'Lạch Tray', district: 'Ngô Quyền', province: 'Hải Phòng' },
      deliveryAddress: { fullName: 'Khách Hà Nội', phone: '0988000003', address: '99 Cầu Giấy', ward: 'Quan Hoa', district: 'Cầu Giấy', province: 'Hà Nội' },
      items: [{ name: 'Sách', quantity: 1, weight: 0.3 }],
      actualWeight: 0.3,
    });
    const intraOrder = res.order;

    assert.strictEqual(intraOrder.originHubId.toString(), hubMap['HUB_HPH_01']._id.toString());
    assert.strictEqual(intraOrder.destinationHubId.toString(), hubMap['HUB_HAN_01']._id.toString());

    const opIntraHPH = { _id: new mongoose.Types.ObjectId(), hubId: hubMap['HUB_HPH_01']._id };
    const opIntraHAN = { _id: new mongoose.Types.ObjectId(), hubId: hubMap['HUB_HAN_01']._id };

    // Inbound HP
    await Order.updateOne({ _id: intraOrder._id }, { $set: { status: 'PICKED_UP' } });
    await processInboundSingle({ trackingCode: intraTrackingCode, operator: opIntraHPH });

    // Outbound HP -> HAN
    const tripHpHan = `TRIP-INTRA-${ts}`;
    await Trip.create({
      tripCode: tripHpHan, tripType: 'MID_MILE_TRANSFER',
      originHubId: hubMap['HUB_HPH_01']._id, destinationHubId: hubMap['HUB_HAN_01']._id,
      plannedTrackingCodes: [intraTrackingCode], status: 'DRAFT'
    });
    await processOutboundScan({ tripCode: tripHpHan, trackingCode: intraTrackingCode, operator: opIntraHPH });
    await commitTrip({ tripCode: tripHpHan, isShortage: false, operator: opIntraHPH });
    await processDriverConfirm({ tripCode: tripHpHan, action: 'ACCEPT', operator: { _id: new mongoose.Types.ObjectId() } });

    // Inbound HAN -> Phải nhận diện ngay là IN_HUB_DEST vì đích là Hà Nội
    const inbHan = await processInboundSingle({ trackingCode: intraTrackingCode, operator: opIntraHAN });
    assert.strictEqual(inbHan.current_status, 'IN_HUB_DEST', 'Đến Hà Nội phải là IN_HUB_DEST ngay');
    assert.strictEqual(inbHan.is_dest_hub, true);
    assert.strictEqual(inbHan.next_action, 'WAITING_FOR_DELIVERY');

    pass('5. Đơn nội miền Hải Phòng -> Hà Nội nhận diện đúng Kho đích ngay khi tới Hà Nội');
  } catch (e) { fail('5. Intra-regional lifecycle', e.message); }

  // ─── TỔNG KẾT ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`🏁 KẾT QUẢ CUỐI: ${results.pass} PASS / ${results.fail} FAIL / ${results.pass + results.fail} tổng`);
  if (results.fail > 0) {
    console.log('\n❌ CASE FAIL:');
    results.cases.filter(c => !c.ok).forEach(c => console.log(`   - [${c.label}]: ${c.reason}`));
  } else {
    console.log('\n🎉 TẤT CẢ 5/5 MODULE PASS — HỆ THỐNG ĐỊNH TUYẾN 3 KHO TỔNG HOẠT ĐỘNG HOÀN HẢO!');
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  server.close();
  await new Promise(r => setTimeout(r, 500));
  await mongoose.disconnect();
  process.exit(results.fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('❌ CRASH:', e.message, e.stack); process.exit(1); });
