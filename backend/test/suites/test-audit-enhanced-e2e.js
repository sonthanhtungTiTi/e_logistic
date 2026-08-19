/**
 * E2E Test Suite: 5 UC-18 Audit Enhancements
 * Chạy: node test-audit-enhanced-e2e.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const assert = require('assert');

const Hub = require('../../src/models/hub.model');
const Zone = require('../../src/models/zone.model');
const Bag = require('../../src/models/bag.model');
const Trip = require('../../src/models/trip.model');
const Order = require('../../src/models/order.model');
const AuditSession = require('../../src/models/auditSession.model');
const { startAuditSession, syncAuditScan } = require('../../src/services/auditCore.service');

const results = { pass: 0, fail: 0, cases: [] };
function pass(label) { results.pass++; results.cases.push({ label, ok: true }); console.log(`  ✅ PASS: ${label}`); }
function fail(label, reason) { results.fail++; results.cases.push({ label, ok: false, reason }); console.error(`  ❌ FAIL: ${label}\n         ${reason}`); }

async function run() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 E2E TEST: 5 Nâng cấp Đắt giá cho Kiểm kê kho (UC-18)');
  console.log('═══════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI);

  const hubHan = await Hub.findOne({ code: 'HUB_HAN_01' });
  const hubId = hubHan._id;
  const operator = { _id: new mongoose.Types.ObjectId(), hubId };
  const ts = Date.now();

  function makeOrder(trackingCode, extra = {}) {
    return {
      trackingCode,
      status: 'IN_HUB_ORIGIN',
      currentHubId: hubId,
      originHubId: hubId,
      destinationHubId: hubId,
      sellerId: new mongoose.Types.ObjectId(),
      actualWeight: 1,
      chargeableWeight: 1,
      shippingFee: 30000,
      baseFee: 30000,
      pickupAddress: { fullName: 'A', phone: '0981112222', address: '1', ward: '1', district: '1', province: 'Hà Nội' },
      deliveryAddress: { fullName: 'B', phone: '0983334444', address: '2', ward: '2', district: '2', province: 'TP.HCM' },
      items: [{ name: 'A', quantity: 1, weight: 1 }],
      ...extra,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 1. TEST 1: Kiểm kê theo Mã Seal Bao Tải (Seal Bag Audit)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('────────────────────────────────────────────────────────');
  console.log('📌 1. Kiểm kê theo Mã Seal Bao tải (Tự động giải nén kiện hàng con)');
  try {
    const sealCode = `SEAL-AUDIT-${ts}`;
    const item1 = `BAG-ITEM1-${ts}`;
    const item2 = `BAG-ITEM2-${ts}`;
    const item3 = `BAG-ITEM3-${ts}`;

    await Order.create([
      makeOrder(item1),
      makeOrder(item2),
      makeOrder(item3),
    ]);

    await Bag.create({
      sealCode,
      originHubId: hubId,
      destinationHubId: new mongoose.Types.ObjectId(),
      status: 'SEALED',
      trackingCodes: [item1, item2, item3],
    });

    const sessionRes = await startAuditSession({ operator });
    const syncRes = await syncAuditScan({
      sessionCode: sessionRes.sessionCode,
      sealCode,
      operator,
    });

    assert.strictEqual(syncRes.expanded_seal_items_count, 3, 'Phải giải nén được 3 đơn từ Seal');
    assert.strictEqual(syncRes.total_scanned, 3, 'Tổng số quét phải là 3');

    console.log(`     Quét 1 mã Seal: ${sealCode} ➔ Tự động giải nén ${syncRes.expanded_seal_items_count} kiện hàng`);
    pass('1. Quét mã Seal tự động giải nén và đánh dấu thành công các kiện hàng con');
  } catch (e) { fail('1. Seal bag bulk audit', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 2. TEST 2: Phát hiện Hàng để sai Khu vực (Misplaced Zone & Auto-Relocate)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 2. Phát hiện Hàng nằm sai Khu vực (Misplaced Zone) & Tự động Cập nhật');
  try {
    const zoneTransfer = await Zone.findOneAndUpdate(
      { code: `ZONE-TF-${ts}` },
      { $set: { code: `ZONE-TF-${ts}`, name: 'Khu Trung Chuyển', hubId, zoneType: 'STAGING_TRANSFER' } },
      { upsert: true, returnDocument: 'after' }
    );
    const zoneDelivery = await Zone.findOneAndUpdate(
      { code: `ZONE-DL-${ts}` },
      { $set: { code: `ZONE-DL-${ts}`, name: 'Khu Phát Hàng', hubId, zoneType: 'STAGING_DELIVERY' } },
      { upsert: true, returnDocument: 'after' }
    );

    const misplacedCode = `MISPLACE-${ts}`;
    const orderMis = await Order.create(makeOrder(misplacedCode, { currentZoneId: zoneTransfer._id }));

    const sessZone = await startAuditSession({ operator, scopeType: 'ZONE', scopeValue: zoneDelivery._id.toString() });

    const syncZone = await syncAuditScan({
      sessionCode: sessZone.sessionCode,
      trackingCodes: [misplacedCode],
      autoRelocateZone: true,
      operator,
    });

    assert.strictEqual(syncZone.misplaced_items.length, 1, 'Phải phát hiện 1 kiện hàng để sai Zone');
    assert.strictEqual(syncZone.misplaced_items[0].relocated, true, 'relocated phải là true');

    const checkOrder = await Order.findById(orderMis._id).lean();
    assert.strictEqual(checkOrder.currentZoneId.toString(), zoneDelivery._id.toString(), 'currentZoneId phải đổi sang Zone Delivery');

    console.log(`     Phát hiện: Kiện ${misplacedCode} ở sai Zone (Đã chuyển sang ${zoneDelivery.name})`);
    pass('2. Phát hiện chính xác hàng nằm sai Zone và tự động cập nhật vị trí thực tế');
  } catch (e) { fail('2. Misplaced Zone detection', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 3. TEST 3: Loại trừ Hàng vừa Xuất kho trong lúc Kiểm kê (Outbound Exclusion)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 3. Tự động Bỏ qua Hàng vừa Xuất kho (Tránh báo động giả mất hàng)');
  try {
    const codeStay = `STAY-${ts}`;
    const codeDispatched = `DISPATCHED-${ts}`;

    await Order.create([
      makeOrder(codeStay),
      makeOrder(codeDispatched),
    ]);

    const sessOut = await startAuditSession({ operator });

    const tripDispatched = await Trip.create({
      tripCode: `TRIP-OUT-${ts}`,
      tripType: 'MID_MILE_TRANSFER',
      originHubId: hubId,
      status: 'CONFIRMED',
      plannedTrackingCodes: [codeDispatched],
    });
    await Order.updateOne({ trackingCode: codeDispatched }, { $set: { status: 'IN_TRANSIT', currentTripId: tripDispatched._id } });

    await syncAuditScan({
      sessionCode: sessOut.sessionCode,
      trackingCodes: [codeStay],
      operator,
    });

    const finalOut = await syncAuditScan({
      sessionCode: sessOut.sessionCode,
      trackingCodes: [],
      isFinalSync: true,
      operator,
    });

    assert.ok(finalOut.dispatched_outbound_codes.includes(codeDispatched), 'codeDispatched phải nằm trong dispatched_outbound_codes');
    assert.ok(!finalOut.missing_tracking_codes.includes(codeDispatched), 'codeDispatched KHÔNG ĐƯỢC nằm trong missing_tracking_codes');

    const chkDis = await Order.findOne({ trackingCode: codeDispatched }).lean();
    assert.strictEqual(chkDis.status, 'IN_TRANSIT', 'Trạng thái đơn xuất kho phải giữ nguyên IN_TRANSIT');

    console.log(`     Hàng đã xuất kho: ${codeDispatched} ➔ Tự động loại trừ khỏi danh sách mất hàng ✅`);
    pass('3. Đơn đã xuất kho trên Trip được loại trừ hợp lệ, không bị chuyển SEARCH_ZONE nhầm');
  } catch (e) { fail('3. Live outbound exclusion', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 4. TEST 4: Tự động Phục hồi Hàng Thất lạc (Lost Item Auto-Recovery Flow)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 4. Tự động Phục hồi Hàng Thất lạc (Lost Item Auto-Recovery)');
  try {
    const lostCode = `LOST-RECOVER-${ts}`;
    const lostOrder = await Order.create(makeOrder(lostCode, {
      status: 'SEARCH_ZONE',
      isFlagged: true,
      lostSearchDeadlineAt: new Date(Date.now() + 86400000),
    }));

    const sessLost = await startAuditSession({ operator });

    const syncRecover = await syncAuditScan({
      sessionCode: sessLost.sessionCode,
      trackingCodes: [lostCode],
      operator,
    });

    assert.strictEqual(syncRecover.recovered_items.length, 1, 'Phải có 1 item được phục hồi');
    assert.strictEqual(syncRecover.recovered_items[0].recoveredStatus, 'IN_HUB_ORIGIN');

    const chkRecovered = await Order.findById(lostOrder._id).lean();
    assert.strictEqual(chkRecovered.status, 'IN_HUB_ORIGIN', 'Status phải phục hồi về IN_HUB_ORIGIN');
    assert.strictEqual(chkRecovered.isFlagged, false, 'isFlagged phải gỡ bỏ (false)');
    assert.strictEqual(chkRecovered.lostSearchDeadlineAt, null, 'lostSearchDeadlineAt phải xóa về null');

    console.log(`     Tìm thấy hàng thất lạc: ${lostCode} ➔ Đã phục hồi về trạng thái bình thường ✅`);
    pass('4. Quét thấy hàng thất lạc tự động gỡ cờ sự cố và phục hồi trạng thái lưu kho');
  } catch (e) { fail('4. Lost item auto-recovery', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 5. TEST 5: Báo cáo Tổng Giá trị Thất thoát Tiền hàng (Loss Valuation)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 5. Báo cáo Tổng Giá trị Thất thoát Tiền hàng (Loss Valuation VND)');
  try {
    const missValCode1 = `MISS-VAL1-${ts}`;
    const missValCode2 = `MISS-VAL2-${ts}`;

    await Order.create([
      makeOrder(missValCode1, { goodsValue: 1500000 }),
      makeOrder(missValCode2, { goodsValue: 2200000 }),
    ]);

    const sessVal = await startAuditSession({ operator });

    const finalVal = await syncAuditScan({
      sessionCode: sessVal.sessionCode,
      trackingCodes: [],
      isFinalSync: true,
      operator,
    });

    assert.ok(finalVal.missing_total_value_vnd >= 3700000, `missing_total_value_vnd phải >= 3.700.000 đ, got ${finalVal.missing_total_value_vnd}`);
    
    const chkSess = await AuditSession.findOne({ sessionCode: sessVal.sessionCode }).lean();
    assert.strictEqual(chkSess.result.missingTotalValueVnd, finalVal.missing_total_value_vnd);

    console.log(`     Tổng giá trị hàng thất thoát được đối soát tự động: ${finalVal.missing_total_value_vnd.toLocaleString('vi-VN')} đ`);
    pass('5. Tính toán chính xác tổng giá trị tiền hàng thất thoát (VND) cho Trưởng kho phê duyệt');
  } catch (e) { fail('5. Loss valuation calculation', e.message); }

  // ─── TỔNG KẾT ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`🏁 KẾT QUẢ CUỐI: ${results.pass} PASS / ${results.fail} FAIL / ${results.pass + results.fail} tổng`);
  if (results.fail > 0) {
    console.log('\n❌ CASE FAIL:');
    results.cases.filter(c => !c.ok).forEach(c => console.log(`   - [${c.label}]: ${c.reason}`));
  } else {
    console.log('\n🎉 TẤT CẢ 5/5 MODULE PASS — 5 NÂNG CẤP KIỂM KÊ HOẠT ĐỘNG HOÀN HẢO!');
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  await new Promise(r => setTimeout(r, 200));
  await mongoose.disconnect();
  process.exit(results.fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('❌ CRASH:', e.message, e.stack); process.exit(1); });
