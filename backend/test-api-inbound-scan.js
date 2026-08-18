/**
 * API Integration Test — POST /api/inbound/scan-single
 * Xác nhận UC-16 hoạt động đúng sau migrate:
 *   - User HUB_STAFF thuộc HUB_HAN_01 quét đơn PICKED_UP có originHubId = HUB_HAN_01
 *   - Kỳ vọng: 200 OK, current_status = IN_HUB_ORIGIN, next_action = SORT_FOR_TRANSIT
 */
require('dotenv').config();
const mongoose = require('mongoose');
require('./src/models/hub.model');
require('./src/models/user.model');
require('./src/models/order.model');

const http = require('http');
const app = require('./src/app');

const PORT = 5099;
const BASE = `http://localhost:${PORT}/api`;

async function callApi(method, path, body, token) {
  const url = new URL(BASE + path);
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };
    const req = http.request(opts, res => {
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

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e-logistics');
  console.log('✅ MongoDB kết nối\n');

  const Hub   = mongoose.model('Hub');
  const Order = mongoose.model('Order');

  // 1. Lấy Hub HAN_01
  const han01 = await Hub.findOne({ code: 'HUB_HAN_01' }).lean();
  if (!han01) { console.error('❌ Không tìm thấy HUB_HAN_01'); process.exit(1); }
  console.log(`🏢 Hub: ${han01.code} → ${han01._id}`);

  // 2. Tìm đơn PICKED_UP có originHubId = HAN_01
  let testOrder = await Order.findOne({
    status: 'PICKED_UP',
    originHubId: han01._id
  }).lean();

  // 3. Nếu không có, tạo đơn test mới với đúng status và originHubId
  if (!testOrder) {
    console.log('⚠️  Không có đơn PICKED_UP + HUB_HAN_01. Tạo đơn test mới...');
    const fakeSellerIdRef = new mongoose.Types.ObjectId();
    const trackCode = `ELG-API-TEST-${Date.now()}`;
    testOrder = await Order.create({
      trackingCode: trackCode,
      sellerId: fakeSellerIdRef,
      status: 'PICKED_UP',
      originHubId: han01._id,
      destinationHubId: (await Hub.findOne({ code: 'HUB_SGN_01' }).lean())?._id,
      pickupHub: 'HUB_HAN_01',
      deliveryHub: 'HUB_SGN_01',
      pickupAddress:   { fullName: 'Test Sender', phone: '0912345678', address: '1 Hàng Bài', ward: 'Hàng Bài', district: 'Hoàn Kiếm', province: 'Hà Nội' },
      deliveryAddress: { fullName: 'Test Recv',   phone: '0987654321', address: '2 Lê Lợi',  ward: 'Bến Nghé', district: 'Q1',         province: 'TP. Hồ Chí Minh' },
      items: [{ name: 'Hàng test', quantity: 1, weight: 1 }],
      actualWeight: 1,
      chargeableWeight: 1,
      shippingFee: 30000
    });
    console.log(`   ✅ Đã tạo đơn test: ${testOrder.trackingCode}\n`);
  } else {
    console.log(`📦 Đơn test: ${testOrder.trackingCode} | originHubId: ${testOrder.originHubId}\n`);
  }

  // 4. Khởi động server
  const server = http.createServer(app);
  await new Promise(r => server.listen(PORT, r));
  console.log(`🚀 Server test lắng nghe tại port ${PORT}\n`);

  // 5. Login để lấy token
  console.log('🔐 Step 1: Login user HUB_STAFF HAN_01...');
  const loginRes = await callApi('POST', '/auth/login', {
    identifier: 'test.hub_staff.han01@elogistic.test',
    password: 'TestPass123!'
  });
  console.log(`   Status: ${loginRes.status}`);
  if (loginRes.status !== 200 || !loginRes.body.accessToken) {
    console.error('❌ Login thất bại:', JSON.stringify(loginRes.body));
    server.close(); await mongoose.disconnect(); process.exit(1);
  }
  const token = loginRes.body.accessToken;
  console.log('   ✅ Login thành công, có token\n');

  // 6. Gọi API scan-single
  console.log(`📡 Step 2: POST /api/inbound/scan-single với đơn ${testOrder.trackingCode}...`);
  const scanRes = await callApi('POST', '/inbound/scan-single', {
    tracking_code: testOrder.trackingCode,
    package_condition: 'INTACT'
  }, token);

  console.log(`   HTTP Status : ${scanRes.status}`);
  console.log(`   Response    : ${JSON.stringify(scanRes.body, null, 2)}`);

  if (scanRes.status === 200 && scanRes.body.success) {
    const d = scanRes.body.data;
    console.log('\n✅✅✅ UC-16 INBOUND HOẠT ĐỘNG ĐÚNG ✅✅✅');
    console.log(`   current_status : ${d.current_status}  (mong đợi: IN_HUB_ORIGIN)`);
    console.log(`   next_action    : ${d.next_action}  (mong đợi: SORT_FOR_TRANSIT)`);
    console.log(`   is_flagged     : ${d.is_flagged}  (mong đợi: false)`);
    const pass = d.current_status === 'IN_HUB_ORIGIN' && d.next_action === 'SORT_FOR_TRANSIT' && d.is_flagged === false;
    console.log(`\n   KỊCH BẢN TEST: ${pass ? '✅ PASS' : '❌ FAIL — giá trị không đúng kỳ vọng'}`);
  } else {
    console.error('\n❌ API trả lỗi — isOriginHub vẫn đang sai hoặc lỗi khác:');
    console.error(JSON.stringify(scanRes.body, null, 2));
  }

  server.close();
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => { console.error('❌ CRASH:', e.message); process.exit(1); });
