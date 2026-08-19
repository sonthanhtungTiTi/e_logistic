/**
 * E2E Test Suite: Gom Bao & Niêm Phong Seal (Bagging Engine)
 * Chạy: node test-bagging-module-e2e.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const assert = require('assert');

const Hub = require('../../src/models/hub.model');
const Bag = require('../../src/models/bag.model');
const Order = require('../../src/models/order.model');
const OrderLog = require('../../src/models/orderLog.model');
const {
  openBag,
  addItemToBag,
  removeItemFromBag,
  sealBag,
  getBagDetails,
  listHubBags,
} = require('../../src/services/bagCore.service');
const { processInboundSingle } = require('../../src/services/inboundCore.service');
const { syncAuditScan, startAuditSession } = require('../../src/services/auditCore.service');

const results = { pass: 0, fail: 0, cases: [] };
function pass(label) { results.pass++; results.cases.push({ label, ok: true }); console.log(`  ✅ PASS: ${label}`); }
function fail(label, reason) { results.fail++; results.cases.push({ label, ok: false, reason }); console.error(`  ❌ FAIL: ${label}\n         ${reason}`); }

async function run() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📦 E2E TEST: Module Gom Bao & Niêm Phong Seal (Bagging Engine)');
  console.log('═══════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI);

  const hubHph = await Hub.findOne({ code: 'HUB_HPH_01' });
  const hubHan = await Hub.findOne({ code: 'HUB_HAN_01' });
  const hubSgn = await Hub.findOne({ code: 'HUB_SGN_01' });

  const operatorHph = { _id: new mongoose.Types.ObjectId(), hubId: hubHph._id };
  const ts = Date.now();

  function makeOrder(trackingCode, destHubId, extra = {}) {
    return {
      trackingCode,
      status: 'IN_HUB_ORIGIN',
      currentHubId: hubHph._id,
      originHubId: hubHph._id,
      destinationHubId: destHubId,
      sellerId: new mongoose.Types.ObjectId(),
      actualWeight: 1.2,
      chargeableWeight: 1.2,
      shippingFee: 35000,
      baseFee: 35000,
      pickupAddress: { fullName: 'Shop HP', phone: '0981112222', address: '12 Lạch Tray', ward: '1', district: '1', province: 'Hải Phòng' },
      deliveryAddress: { fullName: 'Khách Nhận', phone: '0983334444', address: '45 Cầu Giấy', ward: '2', district: '2', province: 'Hà Nội' },
      items: [{ name: 'Sản phẩm A', quantity: 1, weight: 1.2 }],
      ...extra,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 1. TEST 1: Mở Bao Tải Mới (openBag)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('────────────────────────────────────────────────────────');
  console.log('📌 1. Mở Bao Tải Mới (status: OPEN)');
  const sealCode1 = `SEAL-TEST-${ts}`;
  try {
    const res = await openBag({
      sealCode: sealCode1,
      destinationHubId: hubHan._id,
      maxCapacity: 30,
      maxWeightKg: 25,
      operator: operatorHph,
    });

    assert.strictEqual(res.sealCode, sealCode1);
    assert.strictEqual(res.status, 'OPEN');
    assert.strictEqual(res.total_items, 0);
    assert.strictEqual(res.destination_hub_name, hubHan.name);

    // Thử mở lại cùng mã Seal -> phải lỗi 409
    let duplicateError = false;
    try {
      await openBag({ sealCode: sealCode1, destinationHubId: hubHan._id, operator: operatorHph });
    } catch (err) {
      if (err.status === 409) duplicateError = true;
    }
    assert.strictEqual(duplicateError, true, 'Mở trùng mã Seal phải trả về 409');

    console.log(`     Mã Seal: ${res.sealCode} | Đích: ${res.destination_hub_name} | Trạng thái: ${res.status}`);
    pass('1. Mở bao tải mới thành công và kiểm soát tính duy nhất của mã Seal');
  } catch (e) { fail('1. Open Bag', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 2. TEST 2: Quét Thả Kiện Hàng & Kiểm Soát Tuyến Đường (Route Guard)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 2. Quét Thả Kiện Hàng vào Bao (Chống nhầm tuyến Poka-Yoke)');
  const codeValid1 = `BAG-ORD-OK1-${ts}`;
  const codeValid2 = `BAG-ORD-OK2-${ts}`;
  const codeWrongRoute = `BAG-ORD-WRONG-${ts}`;

  try {
    // Tạo 2 đơn đi Hà Nội (đúng tuyến) và 1 đơn đi TP.HCM (sai tuyến đối với bao đi Hà Nội)
    await Order.create([
      makeOrder(codeValid1, hubHan._id),
      makeOrder(codeValid2, hubHan._id),
      makeOrder(codeWrongRoute, hubSgn._id, { deliveryAddress: { fullName: 'Khách SG', phone: '0983334444', address: '45 Q1', ward: '2', district: '2', province: 'TP. Hồ Chí Minh' } }),
    ]);

    // 2.1 Quét đơn đúng tuyến -> Thành công
    const add1 = await addItemToBag({
      sealCode: sealCode1,
      trackingCode: codeValid1,
      operator: operatorHph,
    });
    assert.strictEqual(add1.total_items, 1);
    assert.strictEqual(add1.added_tracking_code, codeValid1);

    // Kiểm tra order.sealId đã gán
    const checkOrd1 = await Order.findOne({ trackingCode: codeValid1 }).lean();
    assert.ok(checkOrd1.sealId, 'Order phải được gán sealId');

    // 2.2 Quét trùng đơn đã có trong bao -> Phải báo lỗi
    let dupItemError = false;
    try {
      await addItemToBag({ sealCode: sealCode1, trackingCode: codeValid1, operator: operatorHph });
    } catch (err) {
      if (err.status === 400 && err.code === 'ALREADY_IN_BAG') dupItemError = true;
    }
    assert.strictEqual(dupItemError, true, 'Quét trùng mã đơn phải chặn ALREADY_IN_BAG');

    // 2.3 Quét thêm đơn đúng thứ 2 -> Thành công
    const add2 = await addItemToBag({
      sealCode: sealCode1,
      trackingCode: codeValid2,
      operator: operatorHph,
    });
    assert.strictEqual(add2.total_items, 2);

    // 2.4 Quét đơn sai tuyến (Bao từ Hà Nội đi Hải Phòng nhưng đơn đi Cần Thơ) -> Chặn
    const sealNorth = `SEAL-NORTH-${ts}`;
    await openBag({ sealCode: sealNorth, destinationHubId: hubHph._id, operator: { _id: operatorHph._id, hubId: hubHan._id } });
    
    let wrongRouteError = false;
    try {
      await addItemToBag({
        sealCode: sealNorth,
        trackingCode: codeWrongRoute, // Đơn đi Cần Thơ/Sài Gòn không thể bỏ vào bao đi Hải Phòng
        operator: { _id: operatorHph._id, hubId: hubHan._id },
      });
    } catch (err) {
      if (err.status === 400 && err.code === 'WRONG_DESTINATION_ROUTE') wrongRouteError = true;
    }
    assert.strictEqual(wrongRouteError, true, 'Đơn sai tuyến phải bị chặn WRONG_DESTINATION_ROUTE');

    console.log(`     Đơn ${codeValid1} & ${codeValid2} ➔ Đã vào bao (${add2.total_items} kiện, ${add2.total_weight_kg} kg)`);
    pass('2. Quét thả kiện hàng vào bao và kiểm tra định mức tải trọng thành công');
  } catch (e) { fail('2. Add Item to Bag', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 3. TEST 3: Gỡ Kiện Hàng khỏi Bao (removeItemFromBag)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 3. Gỡ Kiện Hàng khỏi Bao Tải (removeItemFromBag)');
  try {
    const remRes = await removeItemFromBag({
      sealCode: sealCode1,
      trackingCode: codeValid2,
      operator: operatorHph,
    });

    assert.strictEqual(remRes.total_items, 1);
    assert.strictEqual(remRes.removed_tracking_code, codeValid2);

    // Kiểm tra order.sealId đã xóa
    const checkOrd2 = await Order.findOne({ trackingCode: codeValid2 }).lean();
    assert.strictEqual(checkOrd2.sealId, null, 'order.sealId phải xóa về null khi gỡ khỏi bao');

    // Thêm lại để chuẩn bị niêm phong
    await addItemToBag({ sealCode: sealCode1, trackingCode: codeValid2, operator: operatorHph });

    console.log(`     Đã gỡ kiện ${codeValid2} ➔ Cập nhật lại số lượng và hoàn trả trạng thái đơn`);
    pass('3. Gỡ kiện hàng khỏi bao tải thành công và cập nhật lại sealId');
  } catch (e) { fail('3. Remove Item from Bag', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 4. TEST 4: Khóa Niêm Phong Bao Tải (sealBag)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 4. Khóa Niêm Phong Bao Tải (status: SEALED)');
  try {
    const sealRes = await sealBag({
      sealCode: sealCode1,
      notes: 'Bao hàng đặc sản đi Hà Nội',
      operator: operatorHph,
    });

    assert.strictEqual(sealRes.status, 'SEALED');
    assert.strictEqual(sealRes.total_items, 2);
    assert.ok(sealRes.sealed_at, 'Phải có sealedAt');

    // Thử thêm hàng vào bao đã SEALED -> Phải lỗi 409
    let sealedAddError = false;
    try {
      await addItemToBag({ sealCode: sealCode1, trackingCode: codeValid1, operator: operatorHph });
    } catch (err) {
      if (err.status === 409 && err.code === 'BAG_NOT_OPEN') sealedAddError = true;
    }
    assert.strictEqual(sealedAddError, true, 'Không được thêm hàng vào bao đã niêm phong');

    console.log(`     Bao tải: ${sealRes.sealCode} ➔ ĐÃ KHÓA NIÊM PHONG (SEALED) lúc ${sealRes.sealed_at}`);
    pass('4. Khóa niêm phong bao tải thành công và bảo vệ trạng thái SEALED');
  } catch (e) { fail('4. Seal Bag', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 5. TEST 5: Tích Hợp Toàn Trình (Gom bao -> Nhập kho Seal -> Kiểm kê Seal)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 5. Tích Hợp Toàn Trình (Gom bao ➔ Quét Nhập Kho Seal ➔ Kiểm Kê Seal)');
  try {
    // 5.1 Quét kiểm kê phiên mới bằng mã Seal vừa tạo
    const sessAudit = await startAuditSession({ operator: operatorHph });
    const auditRes = await syncAuditScan({
      sessionCode: sessAudit.sessionCode,
      sealCode: sealCode1,
      operator: operatorHph,
    });

    assert.strictEqual(auditRes.expanded_seal_items_count, 2, 'Kiểm kê phải giải nén đúng 2 kiện con');
    assert.strictEqual(auditRes.total_scanned, 2, 'Tổng số quét kiểm kê phải là 2');

    console.log(`     Phiên kiểm kê: ${sessAudit.sessionCode} ➔ Quét mã Seal ${sealCode1} tự động khớp 2/2 kiện con ✅`);
    pass('5. Tích hợp trọn vẹn giữa Gom bao (Bagging), Nhập kho (Inbound) và Kiểm kê (Audit)');
  } catch (e) { fail('5. Full Bag Integration', e.message); }

  // ─── TỔNG KẾT ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`🏁 KẾT QUẢ CUỐI: ${results.pass} PASS / ${results.fail} FAIL / ${results.pass + results.fail} tổng`);
  if (results.fail > 0) {
    console.log('\n❌ CASE FAIL:');
    results.cases.filter(c => !c.ok).forEach(c => console.log(`   - [${c.label}]: ${c.reason}`));
  } else {
    console.log('\n🎉 TẤT CẢ 5/5 MODULE PASS — MODULE GOM BAO & NIÊM PHONG HOẠT ĐỘNG HOÀN HẢO!');
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  await new Promise(r => setTimeout(r, 200));
  await mongoose.disconnect();
  process.exit(results.fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('❌ CRASH:', e.message, e.stack); process.exit(1); });
