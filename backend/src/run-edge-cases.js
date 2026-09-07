/**
 * EDGE-CASE E2E TEST v2 — 19 BIẾN THỂ (đã sửa tất cả bugs từ lần chạy đầu)
 * Fixes:
 *   - quote: thêm pickupAddress/deliveryAddress (bug backend đã fix)
 *   - province name: dùng 'Hà Nội' / 'Cần Thơ' (normalizeProvince sẽ uppercase)
 *   - bags/add-item: bỏ clientOfflineId (không có trong schema)
 *   - 3A: approve đơn trước khi verify-scan
 *   - 5A: dùng orderId sau khi đơn về READY_TO_PICK rồi inbound mới add vào bao
 *   - 10B: parse triggeredReturnProcess từ đúng vị trí response
 */

'use strict';
require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');

const BASE = 'http://localhost:5000/api';
const TS   = Date.now();
const SEP  = '═'.repeat(68);
let PASS = 0, FAIL = 0;

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const url = new URL(BASE + path);
    const opts = {
      hostname: url.hostname, port: Number(url.port) || 5000,
      path: url.pathname + url.search, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token   ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const r = http.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

function ok(label, condition, detail = '') {
  const icon = condition ? '  ✅ PASS' : '  ❌ FAIL';
  if (condition) PASS++; else FAIL++;
  console.log(`${icon}: ${label}${detail ? ' — ' + detail : ''}`);
  if (!condition && detail) console.log(`         ↳ ${detail}`);
}

function section(title) {
  console.log(`\n${SEP}`);
  console.log(`🧪 ${title}`);
  console.log(SEP);
}

async function login(email, label) {
  const r = await req('POST', '/auth/login', { identifier: email, password: 'TestPassword123!' });
  const token = r.body?.accessToken || r.body?.data?.accessToken;
  ok(`Login ${label}`, r.status === 200 && !!token, token ? `role=${r.body?.role}` : `HTTP ${r.status}`);
  return token;
}

let SystemConfig, Order;
async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  SystemConfig = mongoose.model('SystemConfig2', new mongoose.Schema({ key: String, value: mongoose.Schema.Types.Mixed }, { strict: false }), 'systemconfigs');
  Order        = mongoose.model('OrderEdge2',    new mongoose.Schema({}, { strict: false }), 'orders');
  console.log('  📡 MongoDB connected');
}
async function setConfig(key, value)  { await SystemConfig.findOneAndUpdate({ key }, { key, value }, { upsert: true }); }
async function resetConfig(key)       { await SystemConfig.deleteOne({ key }); }

// Địa chỉ chuẩn — normalizeProvince sẽ uppercase, cần tên đúng
const ADDR_HAN = (name) => ({ fullName: name, phone: '0912000001', address: '1 Hoàn Kiếm', ward: 'Hàng Bài',   district: 'Hoàn Kiếm', province: 'Hà Nội' });
const ADDR_VCA = (name) => ({ fullName: name, phone: '0987000001', address: '1 Ninh Kiều', ward: 'Tân An',      district: 'Ninh Kiều', province: 'Cần Thơ' });
const ADDR_SGN = (name) => ({ fullName: name, phone: '0987000002', address: '1 Lê Duẩn',   ward: 'Bến Nghé',   district: 'Quận 1',    province: 'TP. Hồ Chí Minh' });

// Full pipeline → đơn về OUT_FOR_DELIVERY
async function buildOrderToOFD(sellerT, shipHanT, staffHanT, staffSgnT, staffVcaT, driverT, shipVcaT, ADM) {
  const ts2 = Date.now();
  let r = await req('POST', '/orders', {
    pickupAddress:   ADDR_HAN(`OFD-${ts2}`),
    deliveryAddress: ADDR_VCA(`OFD-rcv-${ts2}`),
    items: [{ name: `OFD-${ts2}`, quantity: 1, weight: 1.0 }],
    actualWeight: 1.0, dimensions: { length: 20, width: 15, height: 10 },
    isCod: true, codAmount: 150000, goodsValue: 200000,
  }, sellerT);
  const order = r.body?.data?.order || r.body?.order || r.body?.data || r.body;
  const orderId = order?._id; const trackingCode = order?.trackingCode;
  if (!orderId) { console.log('  ⚠️  Không tạo được đơn OFD'); return null; }
  const destHubId = order?.destinationHubId;

  if (order?.status === 'PENDING_VERIFICATION') await req('POST', `/orders/${orderId}/approve`, {}, ADM);

  await req('POST', `/orders/shipper/${orderId}/verify-scan`, { trackingCode }, shipHanT);
  await req('POST', `/orders/shipper/${orderId}/confirm-pickup`, {
    trackingCode, scannedCode: trackingCode,
    signatureImageUrl: 'https://cdn.test/sig.jpg', parcelImageUrl: 'https://cdn.test/parcel.jpg',
    gpsLat: 21.03, gpsLng: 105.85, actualWeight: 1.0, clientOfflineId: `pu-ofd-${ts2}`,
  }, shipHanT);
  await req('POST', '/inbound/scan-single', { trackingCode, condition: 'INTACT', hubMeasuredWeight: 1000, clientOfflineId: `ib-han-ofd-${ts2}` }, staffHanT);

  const sc = `SEAL-OFD-${ts2}`;
  await req('POST', '/bags/open',     { seal_code: sc, destination_hub_id: destHubId }, staffHanT);
  await req('POST', '/bags/add-item', { seal_code: sc, tracking_code: trackingCode }, staffHanT);
  await req('POST', '/bags/seal',     { seal_code: sc }, staffHanT);

  r = await req('POST', '/outbound/trips', { trip_type: 'MID_MILE_TRANSFER', destination_hub_id: destHubId, planned_tracking_codes: [trackingCode] }, staffHanT);
  const tc1 = (r.body?.data || r.body)?.trip_code;
  await req('POST', '/outbound/scan',          { trip_code: tc1, tracking_code: trackingCode, client_offline_id: `ob1-ofd-${ts2}` }, staffHanT);
  await req('POST', '/outbound/commit',        { trip_code: tc1 }, staffHanT);
  await req('POST', '/outbound/driver-confirm',{ trip_code: tc1, action: 'ACCEPT' }, driverT);

  await req('POST', '/inbound/scan-single', { trackingCode, condition: 'INTACT', hubMeasuredWeight: 1000, clientOfflineId: `ib-sgn-ofd-${ts2}` }, staffSgnT);

  r = await req('POST', '/outbound/trips', { trip_type: 'MID_MILE_TRANSFER', destination_hub_id: destHubId, planned_tracking_codes: [trackingCode] }, staffSgnT);
  const tc2 = (r.body?.data || r.body)?.trip_code;
  await req('POST', '/outbound/scan',          { trip_code: tc2, tracking_code: trackingCode, client_offline_id: `ob2-ofd-${ts2}` }, staffSgnT);
  await req('POST', '/outbound/commit',        { trip_code: tc2 }, staffSgnT);
  await req('POST', '/outbound/driver-confirm',{ trip_code: tc2, action: 'ACCEPT' }, driverT);

  await req('POST', '/inbound/scan-single', { trackingCode, condition: 'INTACT', hubMeasuredWeight: 1000, clientOfflineId: `ib-vca-ofd-${ts2}` }, staffVcaT);

  r = await req('POST', '/outbound/trips', { trip_type: 'LAST_MILE_DELIVERY', planned_tracking_codes: [trackingCode] }, staffVcaT);
  const tc3 = (r.body?.data || r.body)?.trip_code;
  await req('POST', '/outbound/scan',          { trip_code: tc3, tracking_code: trackingCode, client_offline_id: `ob3-ofd-${ts2}` }, staffVcaT);
  await req('POST', '/outbound/commit',        { trip_code: tc3 }, staffVcaT);
  await req('POST', '/outbound/driver-confirm',{ trip_code: tc3, action: 'ACCEPT' }, shipVcaT);

  return { orderId, trackingCode };
}

// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n${SEP}`);
  console.log('🧪 EDGE-CASE E2E TEST v2 — 19 BIẾN THỂ');
  console.log(`🕐 ${new Date().toLocaleString('vi-VN')}`);
  console.log(SEP);

  await connectDB();

  section('ĐĂNG NHẬP');
  const sellerT   = await login('seller.e2e@test.local',      'SELLER');
  const shipHanT  = await login('shipper.han@test.local',     'SHIPPER HAN');
  const staffHanT = await login('staff.han@test.local',       'HUB_STAFF HAN');
  const staffSgnT = await login('staff.sgn@test.local',       'HUB_STAFF SGN');
  const staffVcaT = await login('staff.vca@test.local',       'HUB_STAFF VCA');
  const driverT   = await login('driver.linehaul@test.local', 'DRIVER');
  const shipVcaT  = await login('shipper.vca@test.local',     'SHIPPER VCA');
  const admT      = await login('admin@test.local',           'ADMIN');
  const ADM       = admT;

  // ── 1A: COD anomaly ─────────────────────────────────────────────────────────
  section('1A — COD bất thường: COD > 2× khai giá → flagCodAnomaly');
  {
    let r = await req('POST', '/orders/quote', {
      pickupAddress: ADDR_HAN('Q1A'), deliveryAddress: ADDR_VCA('R1A'),
      actualWeight: 1.0, isCod: true, codAmount: 500000, goodsValue: 200000,
    }, sellerT);
    ok('Quote OK', r.status === 200, `HTTP ${r.status}`);
    const q = r.body?.data || r.body;
    ok('flagCodAnomaly=true trong quote', q?.flagCodAnomaly === true, `flagCodAnomaly=${q?.flagCodAnomaly}`);
    console.log(`  📊 shippingFee=${q?.shippingFee} | flagCodAnomaly=${q?.flagCodAnomaly}`);

    r = await req('POST', '/orders', {
      pickupAddress: ADDR_HAN('Sender1A'), deliveryAddress: ADDR_VCA('Rcv1A'),
      items: [{ name: '1A', quantity: 1, weight: 1.0 }], actualWeight: 1.0,
      isCod: true, codAmount: 500000, goodsValue: 200000,
    }, sellerT);
    const o = r.body?.data?.order || r.body?.order || r.body?.data || r.body;
    ok('Đơn COD anomaly → PENDING_VERIFICATION', o?.status === 'PENDING_VERIFICATION', o?.status);
    console.log(`  📋 riskFlags=${JSON.stringify(o?.riskFlags)} | flagCodAnomaly=${o?.flagCodAnomaly}`);
  }

  // ── 1B: HIGH_COD_VALUE ───────────────────────────────────────────────────────
  section('1B — COD vượt ngưỡng 10 triệu → HIGH_COD_VALUE');
  {
    const r = await req('POST', '/orders', {
      pickupAddress: ADDR_HAN('Sender1B'), deliveryAddress: ADDR_VCA('Rcv1B'),
      items: [{ name: '1B', quantity: 1, weight: 1.0 }], actualWeight: 1.0,
      isCod: true, codAmount: 12000000, goodsValue: 15000000,
    }, sellerT);
    const o = r.body?.data?.order || r.body?.order || r.body?.data || r.body;
    ok('Đơn COD>10tr → PENDING_VERIFICATION', o?.status === 'PENDING_VERIFICATION', o?.status);
    ok('riskFlags có HIGH_COD_VALUE', (o?.riskFlags||[]).includes('HIGH_COD_VALUE'), JSON.stringify(o?.riskFlags));
  }

  // ── 1C: HIGH_DECLARED_VALUE + phí bảo hiểm ──────────────────────────────────
  section('1C — Khai giá > 20 triệu → HIGH_DECLARED_VALUE + phí BH 0.5%');
  {
    let r = await req('POST', '/orders/quote', {
      pickupAddress: ADDR_HAN('Q1C'), deliveryAddress: ADDR_VCA('R1C'),
      actualWeight: 1.0, goodsValue: 25000000,
    }, sellerT);
    ok('Quote OK', r.status === 200, `HTTP ${r.status}`);
    const q = r.body?.data || r.body;
    const expectedIns = Math.round(25000000 * 0.005);
    ok(`insuranceFee = 0.5%×25tr = ${expectedIns.toLocaleString('vi-VN')}đ`, q?.insuranceFee === expectedIns, `insuranceFee=${q?.insuranceFee}`);
    console.log(`  📊 baseFee=${q?.baseFee} | insuranceFee=${q?.insuranceFee} | total=${q?.shippingFee}`);

    r = await req('POST', '/orders', {
      pickupAddress: ADDR_HAN('Sender1C'), deliveryAddress: ADDR_VCA('Rcv1C'),
      items: [{ name: '1C', quantity: 1, weight: 1.0 }], actualWeight: 1.0, goodsValue: 25000000,
    }, sellerT);
    const o = r.body?.data?.order || r.body?.order || r.body?.data || r.body;
    ok('Đơn khai giá>20tr → PENDING_VERIFICATION', o?.status === 'PENDING_VERIFICATION', o?.status);
    ok('riskFlags có HIGH_DECLARED_VALUE', (o?.riskFlags||[]).includes('HIGH_DECLARED_VALUE'), JSON.stringify(o?.riskFlags));
  }

  // ── 1D: OVERWEIGHT_MOTORCYCLE ────────────────────────────────────────────────
  section('1D — Hàng nặng >20kg → OVERWEIGHT_MOTORCYCLE');
  {
    const r = await req('POST', '/orders', {
      pickupAddress: ADDR_HAN('Sender1D'), deliveryAddress: ADDR_VCA('Rcv1D'),
      items: [{ name: '1D', quantity: 1, weight: 22 }], actualWeight: 22,
      dimensions: { length: 50, width: 40, height: 30 },
    }, sellerT);
    const o = r.body?.data?.order || r.body?.order || r.body?.data || r.body;
    ok('Đơn >20kg → PENDING_VERIFICATION', o?.status === 'PENDING_VERIFICATION', o?.status);
    ok('riskFlags có OVERWEIGHT_MOTORCYCLE', (o?.riskFlags||[]).includes('OVERWEIGHT_MOTORCYCLE'), JSON.stringify(o?.riskFlags));
    console.log(`  📊 chargeableWeight=${o?.chargeableWeight} | riskFlags=${JSON.stringify(o?.riskFlags)}`);
  }

  // ── 1E: OVERSIZED_DIMENSION ──────────────────────────────────────────────────
  section('1E — Hàng cồng kềnh: cạnh >80cm → OVERSIZED_DIMENSION');
  {
    // vol = 90×40×30/5000 = 21.6kg (<25, chỉ OVERSIZED_DIMENSION)
    const r = await req('POST', '/orders', {
      pickupAddress: ADDR_HAN('Sender1E'), deliveryAddress: ADDR_VCA('Rcv1E'),
      items: [{ name: '1E', quantity: 1, weight: 5 }], actualWeight: 5,
      dimensions: { length: 90, width: 40, height: 30 },
    }, sellerT);
    const o = r.body?.data?.order || r.body?.order || r.body?.data || r.body;
    ok('Đơn dim>80cm → PENDING_VERIFICATION', o?.status === 'PENDING_VERIFICATION', o?.status);
    ok('riskFlags có OVERSIZED_DIMENSION', (o?.riskFlags||[]).includes('OVERSIZED_DIMENSION'), JSON.stringify(o?.riskFlags));
    console.log(`  📊 chargeableWeight=${o?.chargeableWeight} (vol=21.6kg, actual=5kg) → max(21.6,5)=21.6→22`);
  }

  // ── 1E2: OVERSIZED_VOLUMETRIC ────────────────────────────────────────────────
  section('1E2 — Hàng cồng kềnh: volumetric >25kg → OVERSIZED_VOLUMETRIC');
  {
    // vol = 100×50×30/5000 = 30kg (>25)
    const r = await req('POST', '/orders', {
      pickupAddress: ADDR_HAN('Sender1E2'), deliveryAddress: ADDR_VCA('Rcv1E2'),
      items: [{ name: '1E2', quantity: 1, weight: 3 }], actualWeight: 3,
      dimensions: { length: 100, width: 50, height: 30 },
    }, sellerT);
    const o = r.body?.data?.order || r.body?.order || r.body?.data || r.body;
    ok('Đơn vol>25kg → PENDING_VERIFICATION', o?.status === 'PENDING_VERIFICATION', o?.status);
    const flags = o?.riskFlags || [];
    ok('riskFlags có OVERSIZED_VOLUMETRIC', flags.includes('OVERSIZED_VOLUMETRIC'), JSON.stringify(flags));
    console.log(`  📊 vol=100×50×30/5000=30kg | chargeableWeight=${o?.chargeableWeight}`);
  }

  // ── 1F: OUTSIDE_SERVICE_AREA ─────────────────────────────────────────────────
  section('1F — Địa chỉ ngoài vùng phục vụ → OUTSIDE_SERVICE_AREA');
  {
    const r = await req('POST', '/orders/quote', {
      pickupAddress: ADDR_HAN('Q1F'),
      deliveryAddress: { fullName: 'Test', phone: '0912000001', address: '1 Kim Tân', ward: 'Kim Tân', district: 'Thành phố Lào Cai', province: 'Lào Cai' },
      actualWeight: 1.0,
    }, sellerT);
    ok('Quote tỉnh ngoài vùng → 422', r.status === 422, `HTTP ${r.status}`);
    ok('Error code OUTSIDE_SERVICE_AREA', r.body?.code === 'OUTSIDE_SERVICE_AREA', `code=${r.body?.code}`);
    console.log(`  📋 ${r.body?.message}`);
  }

  // ── 1H: Discount codes ───────────────────────────────────────────────────────
  section('1H — Mã giảm giá: ELOG50 (hợp lệ) & EXPIRED2025 (hết hạn)');
  {
    // ELOG50: giảm 50% cước base, tối đa 50,000đ
    let r = await req('POST', '/orders/quote', {
      pickupAddress: ADDR_HAN('Q1H'), deliveryAddress: ADDR_VCA('R1H'),
      actualWeight: 1.0, discountCode: 'ELOG50',
    }, sellerT);
    ok('ELOG50 → quote 200', r.status === 200, `HTTP ${r.status}`);
    const q1 = r.body?.data || r.body;
    ok('discountAmount > 0', (q1?.discountAmount || 0) > 0, `discount=${q1?.discountAmount}`);
    console.log(`  📊 ELOG50: baseFee=${q1?.baseFee} | discount=${q1?.discountAmount} | final=${q1?.shippingFee}`);

    // FREESHIP15: giảm cố định 15,000đ
    r = await req('POST', '/orders/quote', {
      pickupAddress: ADDR_HAN('Q1H2'), deliveryAddress: ADDR_VCA('R1H2'),
      actualWeight: 1.0, discountCode: 'FREESHIP15',
    }, sellerT);
    const q2 = r.body?.data || r.body;
    ok('FREESHIP15: discountAmount = 15,000đ', q2?.discountAmount === 15000, `discount=${q2?.discountAmount}`);

    // EXPIRED2025: hết hạn
    r = await req('POST', '/orders/quote', {
      pickupAddress: ADDR_HAN('Q1H3'), deliveryAddress: ADDR_VCA('R1H3'),
      actualWeight: 1.0, discountCode: 'EXPIRED2025',
    }, sellerT);
    ok('EXPIRED2025 → quote 200 (vẫn trả báo giá)', r.status === 200, `HTTP ${r.status}`);
    const q3 = r.body?.data || r.body;
    ok('discountError trả về khi mã hết hạn', !!q3?.discountError, `discountError="${q3?.discountError}"`);
    ok('discountAmount = 0 khi mã hết hạn', (q3?.discountAmount || 0) === 0, `discount=${q3?.discountAmount}`);
    console.log(`  📋 discountError: "${q3?.discountError}"`);
  }

  // ── 2A: Admin cancel ─────────────────────────────────────────────────────────
  section('2A — Admin TỪ CHỐI (cancel) đơn hàng');
  {
    let r = await req('POST', '/orders', {
      pickupAddress: ADDR_HAN('Sender2A'), deliveryAddress: ADDR_VCA('Rcv2A'),
      items: [{ name: '2A', quantity: 1, weight: 1.0 }], actualWeight: 1.0,
    }, sellerT);
    const o = r.body?.data?.order || r.body?.order || r.body?.data || r.body;
    const oid = o?._id;
    ok('Tạo đơn test cancel', [200,201].includes(r.status) && !!oid, `HTTP ${r.status}`);
    if (oid) {
      r = await req('DELETE', `/orders/${oid}/cancel`, { reason: 'Admin từ chối: kiểm tra edge case 2A' }, ADM);
      ok('Admin hủy đơn → 200', r.status === 200, `HTTP ${r.status} — ${r.body?.message}`);
      r = await req('GET', `/orders/${oid}`, null, ADM);
      const s = r.body?.data?.status || r.body?.status;
      ok('Đơn → CANCELLED', s === 'CANCELLED', `status=${s}`);
    }
  }

  // ── 3A: Lệch cân >15% khi lấy hàng ─────────────────────────────────────────
  section('3A — Lệch cân >15% khi lấy hàng (3.5 vs 2.5kg khai báo = 40%)');
  {
    let r = await req('POST', '/orders', {
      pickupAddress: ADDR_HAN('Sender3A'), deliveryAddress: ADDR_VCA('Rcv3A'),
      items: [{ name: '3A', quantity: 1, weight: 2.5 }], actualWeight: 2.5, goodsValue: 300000,
    }, sellerT);
    const o = r.body?.data?.order || r.body?.order || r.body?.data || r.body;
    const oid = o?._id; const tc = o?.trackingCode;
    ok('Tạo đơn 3A', !!oid, `HTTP ${r.status} status=${o?.status}`);
    if (oid) {
      // Approve nếu cần (seller chưa KYC sẽ luôn PENDING_VERIFICATION)
      if (o.status !== 'READY_TO_PICK') {
        r = await req('POST', `/orders/${oid}/approve`, {}, ADM);
        ok('Admin approve đơn 3A', r.status === 200, `HTTP ${r.status}`);
      }
      await req('POST', `/orders/shipper/${oid}/verify-scan`, { trackingCode: tc }, shipHanT);
      r = await req('POST', `/orders/shipper/${oid}/confirm-pickup`, {
        trackingCode: tc, scannedCode: tc,
        signatureImageUrl: 'https://cdn.test/sig.jpg',
        gpsLat: 21.03, gpsLng: 105.85,
        actualWeight: 3.5,  // 40% lệch so với 2.5 khai
        clientOfflineId: `pu-3a-${TS}`,
      }, shipHanT);
      const pu = r.body?.data || r.body;
      const puO = pu?.order || pu;
      console.log(`  📊 Pickup 3A: HTTP ${r.status} | status=${puO?.status} | discrepancy=${puO?.weightDiscrepancy}`);
      ok('Pickup lệch cân 40% được xử lý (200)', r.status === 200, `HTTP ${r.status}`);
      const isHandled = ['PICKED_UP', 'SUSPENDED_RISK_REVIEW'].includes(puO?.status);
      ok('Đơn lệch cân ghi nhận đúng trạng thái', isHandled, `status=${puO?.status}`);
    }
  }

  // ── 5A: Poka-yoke sai tuyến ──────────────────────────────────────────────────
  section('5A — Poka-yoke: kiện HAN→SGN thêm vào bao HAN→VCA → từ chối');
  {
    const vcaHubId = '6a8016bd2c43f32e6cd53dbe';

    // Tạo đơn HAN → SGN, approve và pickup + inbound
    let r = await req('POST', '/orders', {
      pickupAddress: ADDR_HAN('Sender5A'), deliveryAddress: ADDR_SGN('Rcv5A'),
      items: [{ name: '5A', quantity: 1, weight: 1.0 }], actualWeight: 1.0,
    }, sellerT);
    const oSgn = r.body?.data?.order || r.body?.order || r.body?.data || r.body;
    const tcSgn = oSgn?.trackingCode;
    ok('Tạo đơn HAN→SGN', !!oSgn?._id, `HTTP ${r.status} status=${oSgn?.status}`);

    if (oSgn?._id) {
      if (oSgn.status !== 'READY_TO_PICK') await req('POST', `/orders/${oSgn._id}/approve`, {}, ADM);
      await req('POST', `/orders/shipper/${oSgn._id}/verify-scan`, { trackingCode: tcSgn }, shipHanT);
      await req('POST', `/orders/shipper/${oSgn._id}/confirm-pickup`, {
        trackingCode: tcSgn, scannedCode: tcSgn, signatureImageUrl: 'https://cdn.test/sig.jpg',
        gpsLat: 21.03, gpsLng: 105.85, actualWeight: 1.0, clientOfflineId: `pu-5a-${TS}`,
      }, shipHanT);
      // Nhập kho HAN
      r = await req('POST', '/inbound/scan-single', { trackingCode: tcSgn, condition: 'INTACT', hubMeasuredWeight: 1000, clientOfflineId: `ib-5a-${TS}` }, staffHanT);
      console.log(`  📊 Inbound 5A: ${r.status} status=${(r.body?.data||r.body)?.current_status}`);

      // Mở bao đích VCA
      const sc5a = `SEAL-5A-${TS}`;
      r = await req('POST', '/bags/open', { seal_code: sc5a, destination_hub_id: vcaHubId }, staffHanT);
      ok('Tạo bao VCA', [200,201].includes(r.status), `HTTP ${r.status}`);

      // Thêm kiện SGN vào bao VCA → PHẢI TỪ CHỐI (route mismatch)
      r = await req('POST', '/bags/add-item', {
        seal_code: sc5a,
        tracking_code: tcSgn,   // ← KHÔNG có clientOfflineId
      }, staffHanT);
      console.log(`  🚦 Poka-yoke (đúng): HTTP ${r.status} — ${r.body?.message}`);
      ok('Poka-yoke ROUTE MISMATCH → 4xx từ chối', r.status >= 400, `HTTP ${r.status} msg="${r.body?.message}"`);
    }
  }

  // ── 6A: Driver REJECT ────────────────────────────────────────────────────────
  section('6A — Driver TỪ CHỐI chuyến (action: REJECT)');
  {
    let r = await req('POST', '/orders', {
      pickupAddress: ADDR_HAN('Sender6A'), deliveryAddress: ADDR_VCA('Rcv6A'),
      items: [{ name: '6A', quantity: 1, weight: 1.0 }], actualWeight: 1.0,
    }, sellerT);
    const o = r.body?.data?.order || r.body?.order || r.body?.data || r.body;
    const oid = o?._id; const tc = o?.trackingCode; const dHub = o?.destinationHubId;
    if (oid) {
      if (o.status !== 'READY_TO_PICK') await req('POST', `/orders/${oid}/approve`, {}, ADM);
      await req('POST', `/orders/shipper/${oid}/verify-scan`, { trackingCode: tc }, shipHanT);
      await req('POST', `/orders/shipper/${oid}/confirm-pickup`, { trackingCode: tc, scannedCode: tc, signatureImageUrl: 'https://cdn.test/sig.jpg', gpsLat: 21.03, gpsLng: 105.85, actualWeight: 1.0, clientOfflineId: `pu-6a-${TS}` }, shipHanT);
      await req('POST', '/inbound/scan-single', { trackingCode: tc, condition: 'INTACT', hubMeasuredWeight: 1000, clientOfflineId: `ib-6a-${TS}` }, staffHanT);
      const sc6 = `SEAL-6A-${TS}`;
      await req('POST', '/bags/open',     { seal_code: sc6, destination_hub_id: dHub }, staffHanT);
      await req('POST', '/bags/add-item', { seal_code: sc6, tracking_code: tc }, staffHanT);
      await req('POST', '/bags/seal',     { seal_code: sc6 }, staffHanT);
      r = await req('POST', '/outbound/trips', { trip_type: 'MID_MILE_TRANSFER', destination_hub_id: dHub, planned_tracking_codes: [tc] }, staffHanT);
      const tripCode = (r.body?.data || r.body)?.trip_code;
      await req('POST', '/outbound/scan',   { trip_code: tripCode, tracking_code: tc, client_offline_id: `ob-6a-${TS}` }, staffHanT);
      r = await req('POST', '/outbound/commit', { trip_code: tripCode }, staffHanT);
      ok('Trip LOCKED', r.status === 200, `HTTP ${r.status}`);
      console.log(`  📌 Trip code: ${tripCode}`);

      r = await req('POST', '/outbound/driver-confirm', { trip_code: tripCode, action: 'REJECT', reject_reason: 'Xe hỏng — test edge case 6A' }, driverT);
      console.log(`  🚦 Driver REJECT: HTTP ${r.status} — ${r.body?.message}`);
      ok('Driver REJECT → 200', r.status === 200, `HTTP ${r.status}`);
      const rData = r.body?.data || r.body;
      const tripStatus = rData?.status || rData?.tripStatus;
      ok('Trip → REJECTED', tripStatus === 'REJECTED', `tripStatus=${tripStatus}`);
    }
  }

  // ── 10B: 3 lần thất bại → DELIVERY_FAILED_PENDING_RETURN ────────────────────
  section('10B — Giao thất bại 3 lần → DELIVERY_FAILED_PENDING_RETURN');
  {
    console.log('  ⚙️  Bypass cooldown: MIN_MINUTES_BETWEEN_FAILURE_REPORTS = 0');
    await setConfig('MIN_MINUTES_BETWEEN_FAILURE_REPORTS', 0);

    const res10b = await buildOrderToOFD(sellerT, shipHanT, staffHanT, staffSgnT, staffVcaT, driverT, shipVcaT, ADM);
    if (res10b) {
      const { orderId: oid } = res10b;
      await req('PATCH', `/orders/${oid}/status`, { status: 'DELIVERING' }, ADM);

      for (let i = 1; i <= 3; i++) {
        let r = await req('POST', `/orders/${oid}/delivery-failure`, {
          reasonGroup: 'CANNOT_CONTACT', contactAttempts: 3,
          note: `Fail ${i}/3 test 10B`, clientOfflineId: `f${i}-10b-${TS}`,
        }, shipVcaT);
        ok(`Fail lần ${i} → 200`, r.status === 200, `HTTP ${r.status}`);
        const raw = r.body?.data || r.body;
        const order = raw?.order || raw;
        const failCount = order?.deliveryFailureCount;
        const status = order?.status;
        console.log(`  📊 Sau fail ${i}: status=${status} | count=${failCount}`);
        if (i < 3) {
          ok(`Sau fail ${i} → PENDING_REDELIVERY`, status === 'PENDING_REDELIVERY', `status=${status}`);
          // Reset về DELIVERING cho lần tiếp
          await req('PATCH', `/orders/${oid}/status`, { status: 'DELIVERING' }, ADM);
        } else {
          ok('Sau fail 3 → DELIVERY_FAILED_PENDING_RETURN', status === 'DELIVERY_FAILED_PENDING_RETURN', `status=${status}`);
          // triggeredReturnProcess có thể ở root hoặc raw
          const triggered = raw?.triggeredReturnProcess ?? order?.triggeredReturnProcess;
          console.log(`  📊 triggeredReturnProcess: ${triggered} | raw keys: ${Object.keys(raw||{}).join(',')}`);
          ok('triggeredReturnProcess = true', triggered === true, `triggered=${triggered}`);
        }
      }
    }

    await resetConfig('MIN_MINUTES_BETWEEN_FAILURE_REPORTS');
    console.log('  ⚙️  Khôi phục: xóa config MIN_MINUTES_BETWEEN_FAILURE_REPORTS');
  }

  // ── 10C: WRONG_ADDRESS thiếu contactAttempts ─────────────────────────────────
  section('10C — WRONG_ADDRESS thiếu contactAttempts → 400');
  {
    const res10c = await buildOrderToOFD(sellerT, shipHanT, staffHanT, staffSgnT, staffVcaT, driverT, shipVcaT, ADM);
    if (res10c) {
      const { orderId: oid } = res10c;
      await req('PATCH', `/orders/${oid}/status`, { status: 'DELIVERING' }, ADM);

      let r = await req('POST', `/orders/${oid}/delivery-failure`, {
        reasonGroup: 'WRONG_ADDRESS', note: 'Sai địa chỉ — THIẾU contactAttempts', clientOfflineId: `10c1-${TS}`,
      }, shipVcaT);
      console.log(`  🚦 Thiếu contactAttempts: HTTP ${r.status} — ${r.body?.message}`);
      ok('WRONG_ADDRESS thiếu contactAttempts → 400', r.status === 400, `HTTP ${r.status}`);

      await setConfig('MIN_MINUTES_BETWEEN_FAILURE_REPORTS', 0);
      r = await req('POST', `/orders/${oid}/delivery-failure`, {
        reasonGroup: 'WRONG_ADDRESS', contactAttempts: 2,
        note: 'Sai địa chỉ — đầy đủ param', clientOfflineId: `10c2-${TS}`,
      }, shipVcaT);
      ok('WRONG_ADDRESS đầy đủ contactAttempts → 200', r.status === 200, `HTTP ${r.status}`);
      await resetConfig('MIN_MINUTES_BETWEEN_FAILURE_REPORTS');
    }
  }

  // ── 10D: Anti-fraud cooldown 30 phút ─────────────────────────────────────────
  section('10D — Anti-fraud: báo thất bại liên tiếp < 30 phút → 429');
  {
    await resetConfig('MIN_MINUTES_BETWEEN_FAILURE_REPORTS');

    const res10d = await buildOrderToOFD(sellerT, shipHanT, staffHanT, staffSgnT, staffVcaT, driverT, shipVcaT, ADM);
    if (res10d) {
      const { orderId: oid } = res10d;
      await req('PATCH', `/orders/${oid}/status`, { status: 'DELIVERING' }, ADM);

      let r = await req('POST', `/orders/${oid}/delivery-failure`, {
        reasonGroup: 'CANNOT_CONTACT', contactAttempts: 3,
        note: 'Anti-fraud lần 1', clientOfflineId: `10d1-${TS}`,
      }, shipVcaT);
      ok('Lần 1 → 200', r.status === 200, `HTTP ${r.status}`);

      await req('PATCH', `/orders/${oid}/status`, { status: 'DELIVERING' }, ADM);

      r = await req('POST', `/orders/${oid}/delivery-failure`, {
        reasonGroup: 'CANNOT_CONTACT', contactAttempts: 3,
        note: 'Anti-fraud lần 2 ngay sau', clientOfflineId: `10d2-${TS}`,
      }, shipVcaT);
      console.log(`  🚦 Lần 2 ngay sau: HTTP ${r.status} — ${r.body?.message} | minutesRemaining=${r.body?.minutesRemaining}`);
      ok('Báo thất bại liên tiếp < 30 phút → 429', r.status === 429, `HTTP ${r.status}`);
      ok('minutesRemaining > 0', (r.body?.minutesRemaining || 0) > 0, `minutesRemaining=${r.body?.minutesRemaining}`);
    }
  }

  // ── 10E: CUSTOMER_REFUSED thiếu ảnh ─────────────────────────────────────────
  section('10E — CUSTOMER_REFUSED: thiếu ảnh minh chứng → 400');
  {
    const res10e = await buildOrderToOFD(sellerT, shipHanT, staffHanT, staffSgnT, staffVcaT, driverT, shipVcaT, ADM);
    if (res10e) {
      const { orderId: oid } = res10e;
      await req('PATCH', `/orders/${oid}/status`, { status: 'DELIVERING' }, ADM);

      let r = await req('POST', `/orders/${oid}/delivery-failure`, {
        reasonGroup: 'CUSTOMER_REFUSED', contactAttempts: 1,
        note: 'Khách từ chối — THIẾU ảnh', clientOfflineId: `10e1-${TS}`,
      }, shipVcaT);
      console.log(`  🚦 Thiếu ảnh: HTTP ${r.status} — ${r.body?.message}`);
      ok('CUSTOMER_REFUSED thiếu ảnh → 400', r.status === 400, `HTTP ${r.status}`);

      await setConfig('MIN_MINUTES_BETWEEN_FAILURE_REPORTS', 0);
      r = await req('POST', `/orders/${oid}/delivery-failure`, {
        reasonGroup: 'CUSTOMER_REFUSED', contactAttempts: 1,
        proofImageUrls: ['https://cdn.test/proof.jpg'],
        note: 'Khách từ chối — có ảnh', clientOfflineId: `10e2-${TS}`,
      }, shipVcaT);
      ok('CUSTOMER_REFUSED có ảnh → 200', r.status === 200, `HTTP ${r.status}`);
      await resetConfig('MIN_MINUTES_BETWEEN_FAILURE_REPORTS');
    }
  }

  // ── 11A: Tracking code không tồn tại ─────────────────────────────────────────
  section('11A — Tra cứu tracking code không tồn tại → 404');
  {
    const r = await req('GET', '/orders/track/ELG-VN-00000000', null, null);
    ok('Track không tồn tại → 404', r.status === 404, `HTTP ${r.status} — ${r.body?.message}`);
  }

  // ── TỔNG KẾT ─────────────────────────────────────────────────────────────────
  await mongoose.disconnect();
  console.log(`\n${SEP}`);
  console.log('🏁 EDGE-CASE TEST v2 HOÀN THÀNH');
  console.log(`\n    ✅ ${PASS} PASS  |  ❌ ${FAIL} FAIL  |  Tổng: ${PASS+FAIL}`);
  console.log(SEP + '\n');
}

main().catch(e => {
  console.error('❌ Fatal:', e.message);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
