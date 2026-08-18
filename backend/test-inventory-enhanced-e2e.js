/**
 * E2E Test Suite: 5 Nâng cấp Đắt giá cho Quản lý Tồn kho (UC-19)
 * Chạy: node test-inventory-enhanced-e2e.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');

const Hub = require('./src/models/hub.model');
const Zone = require('./src/models/zone.model');
const Trip = require('./src/models/trip.model');
const Order = require('./src/models/order.model');
const OrderLog = require('./src/models/orderLog.model');
const {
  getSummary,
  getAgingList,
  getTripSuggestions,
  createTripFromStock,
  performBatchAction,
} = require('./src/services/inventoryCore.service');

const results = { pass: 0, fail: 0, cases: [] };
function pass(label) { results.pass++; results.cases.push({ label, ok: true }); console.log(`  ✅ PASS: ${label}`); }
function fail(label, reason) { results.fail++; results.cases.push({ label, ok: false, reason }); console.error(`  ❌ FAIL: ${label}\n         ${reason}`); }

async function run() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 E2E TEST: 5 Nâng cấp Đắt giá cho Quản lý Tồn kho (UC-19)');
  console.log('═══════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI);

  const hubHph = await Hub.findOne({ code: 'HUB_HPH_01' });
  const hubHan = await Hub.findOne({ code: 'HUB_HAN_01' });
  const hubId = hubHph._id;
  const operatorHph = { _id: new mongoose.Types.ObjectId(), hubId };
  const ts = Date.now();

  function makeOrder(trackingCode, extra = {}) {
    return {
      trackingCode,
      status: 'IN_HUB_ORIGIN',
      currentHubId: hubId,
      originHubId: hubId,
      destinationHubId: hubHan._id,
      sellerId: new mongoose.Types.ObjectId(),
      actualWeight: 1,
      chargeableWeight: 1,
      shippingFee: 30000,
      baseFee: 30000,
      hubInboundAt: new Date(),
      pickupAddress: { fullName: 'A', phone: '0981112222', address: '1', ward: '1', district: '1', province: 'Hải Phòng' },
      deliveryAddress: { fullName: 'B', phone: '0983334444', address: '2', ward: '2', district: '2', province: 'Hà Nội' },
      items: [{ name: 'A', quantity: 1, weight: 1 }],
      ...extra,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 1. TEST 1: Sức Chứa Khu Vực (Zone Capacity Utilization & Bottleneck Alert)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('────────────────────────────────────────────────────────');
  console.log('📌 1. Kiểm tra Tỷ lệ Lấp đầy Zone & Cảnh báo Nghẽn Kho (>90%)');
  try {
    const testZone = await Zone.findOneAndUpdate(
      { code: `ZONE-CAP-${ts}` },
      { $set: { code: `ZONE-CAP-${ts}`, name: 'Khu Quá Tải', hubId, zoneType: 'STAGING_TRANSFER', capacity: 10 } },
      { upsert: true, returnDocument: 'after' }
    );

    // Tạo 9 kiện hàng trong zone này (9/10 = 90% -> CRITICAL_OVERCAPACITY)
    const orderPromises = [];
    for (let i = 1; i <= 9; i++) {
      orderPromises.push(Order.create(makeOrder(`CAP-ORD-${i}-${ts}`, { currentZoneId: testZone._id })));
    }
    await Promise.all(orderPromises);

    const summaryRes = await getSummary(hubId.toString());
    const zoneInfo = summaryRes.by_zone.find(z => z.zone_code === `ZONE-CAP-${ts}`);

    assert.ok(zoneInfo, 'Zone phải có trong summary');
    assert.strictEqual(zoneInfo.capacity, 10);
    assert.strictEqual(zoneInfo.current_count, 9);
    assert.strictEqual(zoneInfo.utilization_percent, 90);
    assert.strictEqual(zoneInfo.capacity_status, 'CRITICAL_OVERCAPACITY');

    console.log(`     Zone: ${zoneInfo.zone_name} | Sức chứa: 9/10 (90%) | Cảnh báo: ${zoneInfo.capacity_status} 🚨`);
    pass('1. Tính toán chuẩn xác % lấp đầy và phát cảnh báo nghẽn kho đỏ CRITICAL_OVERCAPACITY');
  } catch (e) { fail('1. Zone capacity utilization', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 2. TEST 2: Vận tốc Nhập/Xuất trong 24h & Tốc độ Giải phóng kho
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 2. Đo lường Vận tốc Nhập/Xuất 24h & Tỷ lệ giải phóng kho');
  try {
    // Ghi 2 Inbound Log và 3 Outbound Log
    await OrderLog.create([
      { orderId: new mongoose.Types.ObjectId(), trackingCode: `LOG-IN1-${ts}`, preStatus: 'PICKED_UP', postStatus: 'IN_HUB_ORIGIN', actionType: 'INBOUND_SCAN', actionBy: operatorHph._id, hubId },
      { orderId: new mongoose.Types.ObjectId(), trackingCode: `LOG-IN2-${ts}`, preStatus: 'PICKED_UP', postStatus: 'IN_HUB_ORIGIN', actionType: 'INBOUND_SCAN', actionBy: operatorHph._id, hubId },
      { orderId: new mongoose.Types.ObjectId(), trackingCode: `LOG-OUT1-${ts}`, preStatus: 'IN_HUB_ORIGIN', postStatus: 'IN_TRANSIT', actionType: 'OUTBOUND_SCAN', actionBy: operatorHph._id, hubId },
      { orderId: new mongoose.Types.ObjectId(), trackingCode: `LOG-OUT2-${ts}`, preStatus: 'IN_HUB_ORIGIN', postStatus: 'IN_TRANSIT', actionType: 'OUTBOUND_SCAN', actionBy: operatorHph._id, hubId },
      { orderId: new mongoose.Types.ObjectId(), trackingCode: `LOG-OUT3-${ts}`, preStatus: 'IN_HUB_ORIGIN', postStatus: 'IN_TRANSIT', actionType: 'DRIVER_CONFIRMED', actionBy: operatorHph._id, hubId },
    ]);

    const summaryRes = await getSummary(hubId.toString());
    const throughput = summaryRes.throughput_24h;

    assert.ok(throughput.inbound_count >= 2, 'Inbound 24h phải >= 2');
    assert.ok(throughput.outbound_count >= 3, 'Outbound 24h phải >= 3');
    assert.ok(throughput.turnover_ratio > 0, 'Turnover ratio phải > 0');

    console.log(`     Nhập 24h: ${throughput.inbound_count} | Xuất 24h: ${throughput.outbound_count} | Tỷ lệ giải phóng: ${throughput.turnover_ratio}%`);
    pass('2. Tính toán vận tốc nhập/xuất 24h và tỷ lệ lưu chuyển kho thành công');
  } catch (e) { fail('2. Throughput & velocity calculation', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 3. TEST 3: Gợi ý Gom Chuyến Xe & Tạo Chuyến Xe 1-Chạm
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 3. Gợi ý Gom Chuyến Xe Thông Minh & Tạo Chuyến Xe 1-Chạm');
  try {
    const sugCode1 = `SUG-ORD1-${ts}`;
    const sugCode2 = `SUG-ORD2-${ts}`;
    await Order.create([
      makeOrder(sugCode1, { destinationHubId: hubHan._id }),
      makeOrder(sugCode2, { destinationHubId: hubHan._id }),
    ]);

    const suggestions = await getTripSuggestions(hubId.toString());
    const hanSug = suggestions.find(s => s.destination_hub_code === 'HUB_HAN_01');

    assert.ok(hanSug, 'Phải có gợi ý chuyến xe đi Hà Nội');
    assert.ok(hanSug.total_items >= 2, 'Số kiện gợi ý phải >= 2');
    assert.ok(hanSug.tracking_codes.includes(sugCode1));

    // 1-Click Tạo chuyến xe
    const tripRes = await createTripFromStock({
      destinationHubId: hubHan._id.toString(),
      trackingCodes: [sugCode1, sugCode2],
      operator: operatorHph,
    });

    assert.ok(tripRes.trip_code.startsWith('TRIP-AUTO-'));
    assert.strictEqual(tripRes.total_planned_items, 2);

    const checkTrip = await Trip.findOne({ tripCode: tripRes.trip_code }).lean();
    assert.strictEqual(checkTrip.status, 'DRAFT');
    assert.strictEqual(checkTrip.plannedTrackingCodes.length, 2);

    console.log(`     Gợi ý gom xe: ${hanSug.destination_hub_name} (${hanSug.total_items} kiện) ➔ Tạo chuyến [${tripRes.trip_code}] thành công`);
    pass('3. Tự động phát hiện hàng gom và tạo chuyến xe 1-chạm thành công');
  } catch (e) { fail('3. Smart trip suggestions', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 4. TEST 4: Xử Lý Tồn Kho Hàng Loạt (Batch OCC Inventory Action)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 4. Xử Lý Tồn Kho Quá Hạn Hàng Loạt (Batch Actions)');
  try {
    const batchCode1 = `BATCH-ORD1-${ts}`;
    const batchCode2 = `BATCH-ORD2-${ts}`;
    await Order.create([
      makeOrder(batchCode1),
      makeOrder(batchCode2),
    ]);

    const batchRes = await performBatchAction({
      trackingCodes: [batchCode1, batchCode2],
      actionType: 'RETURN',
      reason: 'Khách từ chối nhận nhiều lần -> Chuyển hoàn',
      operator: operatorHph,
    });

    assert.strictEqual(batchRes.total, 2);
    assert.strictEqual(batchRes.success_count, 2);
    assert.strictEqual(batchRes.failed_count, 0);

    const [chk1, chk2] = await Promise.all([
      Order.findOne({ trackingCode: batchCode1 }).lean(),
      Order.findOne({ trackingCode: batchCode2 }).lean(),
    ]);

    assert.strictEqual(chk1.status, 'RETURNED_TO_HUB_ORIGIN');
    assert.strictEqual(chk2.status, 'RETURNED_TO_HUB_ORIGIN');

    console.log(`     Đã chuyển hoàn hàng loạt 2/2 kiện: ${batchCode1}, ${batchCode2} ➔ ${chk1.status}`);
    pass('4. Xử lý tồn kho hàng loạt (Batch Actions) thành công với tính nguyên tử OCC');
  } catch (e) { fail('4. Batch inventory action', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 5. TEST 5: Bộ Lọc Đa Tiêu Chí & Tìm Kiếm Thời Gian Thực
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 5. Bộ Lọc Đa Tiêu Chí (Search & Dwell Range)');
  try {
    const searchCode = `SEARCH-UNIQUE-${ts}`;
    await Order.create(makeOrder(searchCode));

    // 5.1 Tìm kiếm theo mã vận đơn
    const searchList = await getAgingList({
      hubId: hubId.toString(),
      search: `SEARCH-UNIQUE-${ts}`,
    });
    assert.strictEqual(searchList.items.length, 1);
    assert.strictEqual(searchList.items[0].tracking_code, searchCode);

    // 5.2 Lọc theo Dwell Range <12h
    const dwellList = await getAgingList({
      hubId: hubId.toString(),
      dwellRange: '<12h',
    });
    assert.ok(dwellList.items.length >= 1);

    console.log(`     Tìm kiếm chính xác: ${searchCode} ➔ Tìm thấy ${searchList.items.length} bản ghi`);
    pass('5. Bộ lọc đa tiêu chí (mã vận đơn, dwell range) hoạt động chính xác');
  } catch (e) { fail('5. Advanced search and filter', e.message); }

  // ─── TỔNG KẾT ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`🏁 KẾT QUẢ CUỐI: ${results.pass} PASS / ${results.fail} FAIL / ${results.pass + results.fail} tổng`);
  if (results.fail > 0) {
    console.log('\n❌ CASE FAIL:');
    results.cases.filter(c => !c.ok).forEach(c => console.log(`   - [${c.label}]: ${c.reason}`));
  } else {
    console.log('\n🎉 TẤT CẢ 5/5 MODULE PASS — 5 CẢI TIẾN TỒN KHO HOẠT ĐỘNG HOÀN HẢO!');
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  await new Promise(r => setTimeout(r, 200));
  await mongoose.disconnect();
  process.exit(results.fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('❌ CRASH:', e.message, e.stack); process.exit(1); });
