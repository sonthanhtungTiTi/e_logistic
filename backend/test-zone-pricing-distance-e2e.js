/**
 * E2E Test Suite: 4-Tier Zone Pricing & GPS Haversine Distance / ETA Engine
 * Chạy: node test-zone-pricing-distance-e2e.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');

const hubRoutingService = require('./src/services/hubRouting.service');
const pricingService = require('./src/services/pricing.service');
const orderService = require('./src/services/order.service');
const Order = require('./src/models/order.model');
const Hub = require('./src/models/hub.model');

const results = { pass: 0, fail: 0, cases: [] };
function pass(label) { results.pass++; results.cases.push({ label, ok: true }); console.log(`  ✅ PASS: ${label}`); }
function fail(label, reason) { results.fail++; results.cases.push({ label, ok: false, reason }); console.error(`  ❌ FAIL: ${label}\n         ${reason}`); }

async function run() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('💰 E2E TEST: 4-Tier Zone Pricing & GPS Haversine Distance / ETA');
  console.log('═══════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI);

  // ════════════════════════════════════════════════════════════════════════════
  // 1. UNIT TEST: 4-Tier Zone Classification
  // ════════════════════════════════════════════════════════════════════════════
  console.log('────────────────────────────────────────────────────────');
  console.log('📌 1. Kiểm tra phân loại 4 Cấp độ Vùng Cước (Zone Tiers)');
  try {
    // 1.1 Nội tỉnh
    const z1 = hubRoutingService.calculateZoneTier('Hà Nội', 'Hà Nội');
    assert.strictEqual(z1.tier, 'INTRA_PROVINCE');
    assert.strictEqual(z1.tierName, 'Nội tỉnh / Thành phố');

    // 1.2 Nội miền (Bắc - Bắc)
    const z2 = hubRoutingService.calculateZoneTier('Hải Phòng', 'Quảng Ninh');
    assert.strictEqual(z2.tier, 'INTRA_REGION');
    assert.strictEqual(z2.tierName, 'Nội miền');

    // 1.3 Cận miền (Bắc - Trung)
    const z3 = hubRoutingService.calculateZoneTier('Hà Nội', 'Đà Nẵng');
    assert.strictEqual(z3.tier, 'NEAR_REGION');

    // 1.4 Cận miền (Trung - Nam)
    const z4 = hubRoutingService.calculateZoneTier('Đà Nẵng', 'TP. Hồ Chí Minh');
    assert.strictEqual(z4.tier, 'NEAR_REGION');

    // 1.5 Liên miền (Bắc - Nam)
    const z5 = hubRoutingService.calculateZoneTier('Hải Phòng', 'Cần Thơ');
    assert.strictEqual(z5.tier, 'INTER_REGION');

    pass('1. Phân loại chuẩn xác 4 Cấp độ Vùng Cước (Nội tỉnh, Nội miền, Cận miền, Liên miền)');
  } catch (e) { fail('1. Zone Tier classification', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 2. UNIT TEST: GPS Haversine Distance & Route Hop Calculation
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 2. Kiểm tra tính Khoảng cách GPS Haversine & ETA đa chặng');
  try {
    // Hà Nội (21.0285, 105.8542) <-> TP.HCM (10.7769, 106.7009)
    // Khoảng cách thực địa đường bộ khoảng ~1400 - 1700 km
    const distHcmHan = hubRoutingService.calculateHaversineKm(21.0285, 105.8542, 10.7769, 106.7009);
    assert.ok(distHcmHan > 1300 && distHcmHan < 1800, `Khoảng cách HN - HCM phải trong khoảng 1300-1800km, got ${distHcmHan}km`);

    // Lộ trình đa chặng: Hải Phòng -> Cần Thơ (HPH -> HAN -> SGN -> VCA)
    const metrics = hubRoutingService.calculateRouteDistanceAndEta('HUB_HPH_01', 'HUB_VCA_01');
    assert.deepStrictEqual(metrics.routePath, ['HUB_HPH_01', 'HUB_HAN_01', 'HUB_SGN_01', 'HUB_VCA_01']);
    assert.strictEqual(metrics.hops.length, 3, 'Phải có 3 chặng xe');
    assert.ok(metrics.totalDistanceKm > 1500, `Tổng quãng đường phải > 1500km, got ${metrics.totalDistanceKm}km`);
    assert.ok(metrics.totalEtaHours >= 30, `Tổng thời gian ETA phải >= 30h, got ${metrics.totalEtaHours}h`);
    assert.ok(metrics.estimatedDeliveryDays >= 2, `Thời gian giao dự kiến >= 2 ngày, got ${metrics.estimatedDeliveryDays} ngày`);

    console.log(`     Lộ trình: ${metrics.routePath.join(' ➔ ')}`);
    console.log(`     Tổng cự ly: ${metrics.totalDistanceKm} km | ETA: ${metrics.totalEtaHours} giờ (~${metrics.estimatedDeliveryDays} ngày)`);
    pass('2. Tính toán cự ly GPS Haversine và ETA đa chặng chuẩn xác');
  } catch (e) { fail('2. GPS Distance and ETA calculation', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 3. INTEGRATION TEST: Báo giá 4 Cấp độ Vùng Cước (Pricing Engine)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 3. Kiểm tra tính cước phí theo 4 Cấp độ Vùng (Pricing Engine)');
  try {
    // 3.1 Nội tỉnh: <= 1kg -> 16.500 đ
    const fee1 = await pricingService.calculateShippingFee({
      actualWeight: 0.5,
      pickupAddress: { province: 'Hà Nội' },
      deliveryAddress: { province: 'Hà Nội' },
    });
    assert.strictEqual(fee1.zoneTier, 'INTRA_PROVINCE');
    assert.strictEqual(fee1.shippingFee, 16500);

    // 3.2 Nội miền: <= 1kg -> 22.000 đ; 2.0kg (+2 nấc 0.5kg) -> 22.000 + 2*6.000 = 34.000 đ
    const fee2 = await pricingService.calculateShippingFee({
      actualWeight: 2.0,
      pickupAddress: { province: 'Hải Phòng' },
      deliveryAddress: { province: 'Quảng Ninh' },
    });
    assert.strictEqual(fee2.zoneTier, 'INTRA_REGION');
    assert.strictEqual(fee2.shippingFee, 34000);

    // 3.3 Cận miền: <= 1kg -> 28.000 đ
    const fee3 = await pricingService.calculateShippingFee({
      actualWeight: 0.8,
      pickupAddress: { province: 'Hà Nội' },
      deliveryAddress: { province: 'Đà Nẵng' },
    });
    assert.strictEqual(fee3.zoneTier, 'NEAR_REGION');
    assert.strictEqual(fee3.shippingFee, 28000);

    // 3.4 Liên miền (Bắc - Nam): <= 1kg -> 35.000 đ; 1.5kg (+1 nấc 0.5kg) -> 35.000 + 8.500 = 43.500 đ
    const fee4 = await pricingService.calculateShippingFee({
      actualWeight: 1.5,
      pickupAddress: { province: 'Hải Phòng' },
      deliveryAddress: { province: 'Cần Thơ' },
    });
    assert.strictEqual(fee4.zoneTier, 'INTER_REGION');
    assert.strictEqual(fee4.shippingFee, 43500);
    assert.ok(fee4.routeDistanceKm > 1500);
    assert.ok(fee4.estimatedDeliveryDays >= 2);

    pass('3. Bảng giá 4 Cấp độ Vùng Cước & phụ trội cân nặng hoạt động chính xác');
  } catch (e) { fail('3. 4-Tier Pricing calculation', e.message); }

  // ════════════════════════════════════════════════════════════════════════════
  // 4. INTEGRATION TEST: Tạo đơn hàng lưu đầy đủ Zone Tier & Distance
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n────────────────────────────────────────────────────────');
  console.log('📌 4. Tạo đơn hàng tự động lưu Zone Tier, Cự ly & Ngày giao dự kiến');
  const ts = Date.now();
  const trackingCode = `ZONE-TEST-${ts}`;
  const sellerId = new mongoose.Types.ObjectId();

  try {
    const res = await orderService.createNewOrder(sellerId, {
      trackingCode,
      pickupAddress: { fullName: 'Shop HP', phone: '0988111222', address: '12 Lạch Tray', ward: 'Lạch Tray', district: 'Ngô Quyền', province: 'Hải Phòng' },
      deliveryAddress: { fullName: 'Khách Cần Thơ', phone: '0988333444', address: '45 30/4', ward: 'An Phú', district: 'Ninh Kiều', province: 'Cần Thơ' },
      items: [{ name: 'Đặc sản Hải Phòng', quantity: 1, weight: 1.2 }],
      actualWeight: 1.2,
    });
    const order = res.order;

    assert.strictEqual(order.zoneTier, 'INTER_REGION', 'Zone tier phải là INTER_REGION');
    assert.ok(order.routeDistanceKm > 1500, `routeDistanceKm phải > 1500, got ${order.routeDistanceKm}`);
    assert.ok(order.estimatedDeliveryDays >= 2, `estimatedDeliveryDays phải >= 2, got ${order.estimatedDeliveryDays}`);

    console.log(`     Đơn hàng: ${order.trackingCode}`);
    console.log(`     Vùng cước: ${order.zoneTier} | Cự ly luân chuyển: ${order.routeDistanceKm} km | Dự kiến: ${order.estimatedDeliveryDays} ngày`);
    pass('4. Đơn hàng lưu thành công zoneTier, routeDistanceKm và estimatedDeliveryDays');
  } catch (e) { fail('4. Create Order with Zone metrics', e.message); }

  // ─── TỔNG KẾT ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`🏁 KẾT QUẢ CUỐI: ${results.pass} PASS / ${results.fail} FAIL / ${results.pass + results.fail} tổng`);
  if (results.fail > 0) {
    console.log('\n❌ CASE FAIL:');
    results.cases.filter(c => !c.ok).forEach(c => console.log(`   - [${c.label}]: ${c.reason}`));
  } else {
    console.log('\n🎉 TẤT CẢ 4/4 MODULE PASS — PHÂN VÙNG CƯỚC & TÍNH KHOẢNG CÁCH HOẠT ĐỘNG HOÀN HẢO!');
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(results.fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('❌ CRASH:', e.message, e.stack); process.exit(1); });
