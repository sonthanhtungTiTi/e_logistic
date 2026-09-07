/**
 * E2E TEST SUITE — Kiến Trúc v2.6 (3 Quản Lý & Tách 2 Vai Trò Vận Chuyển)
 * ──────────────────────────────────────────────────────────────────────────
 * Kiểm thử toàn diện trên dữ liệu thực tế (Real Database & Real HTTP Server):
 * 1. Single-Pass Exclusion Filter (Auto Approval vs Pending Verification vs Suspended Risk)
 * 2. Dispatch Engine (Scoring, Pickup/Delivery Quotas, Spillover Routing, Escalation)
 * 3. Chain of Custody (Legal Transfer Logs, Hub ID tracking)
 * 4. Line-haul Tripping & Sealed Bagging
 * 5. Vendor Ops, Local Dispatch, Linehaul Dispatch API endpoints
 */

require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');
const assert = require('assert');

const app = require('../../src/app');
const User = require('../../src/models/user.model');
const Order = require('../../src/models/order.model');
const Hub = require('../../src/models/hub.model');
const Geozone = require('../../src/models/geozone.model');
const Bag = require('../../src/models/bag.model');
const Trip = require('../../src/models/trip.model');
const CustodyTransferLog = require('../../src/models/custodyTransferLog.model');

const autoApprovalService = require('../../src/services/autoApproval.service');
const dispatchEngineService = require('../../src/services/dispatchEngine.service');

let PORT = 0;

// ── Colors ──────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};
const pass = (msg) => console.log(`${C.green}✅ PASS${C.reset} ${msg}`);
const fail = (msg, err) => console.log(`${C.red}❌ FAIL${C.reset} ${msg}\n       ${C.dim}→ ${err}${C.reset}`);
const section = (msg) => console.log(`\n${C.bold}${C.yellow}▶ ${msg}${C.reset}`);

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const isPayloadMethod = ['POST', 'PUT', 'PATCH'].includes(method) && body;
    const data = isPayloadMethod ? JSON.stringify(body) : '';
    const headers = {
      ...(isPayloadMethod ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const opts = {
      hostname: '127.0.0.1',
      port: PORT,
      path,
      method,
      headers,
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    if (isPayloadMethod) req.write(data);
    req.end();
  });
}

async function run() {
  let server;
  let testCount = 0;
  let passCount = 0;

  console.log(`\n${C.bold}${C.cyan}══════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}${C.cyan} 🧪 E2E SUITE — 3 QUẢN LÝ & PHÂN TÁCH 2 VAI TRÒ VẬN CHUYỂN (v2.6)${C.reset}`);
  console.log(`${C.bold}${C.cyan}══════════════════════════════════════════════════════════════════════${C.reset}\n`);

  try {
    // 1. Connect Mongo
    const mongoUri = process.env.MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    console.log(`${C.green}ℹ MongoDB connected:${C.reset} ${mongoose.connection.host}`);

    // 2. Start HTTP Server on random port
    server = http.createServer(app);
    await new Promise((res) => server.listen(0, res));
    PORT = server.address().port;
    console.log(`${C.green}ℹ Server listening on dynamic port:${C.reset} ${PORT}\n`);

    // 3. Seed test Hubs, Geozones, Users
    const testHub = await Hub.findOneAndUpdate(
      { code: 'HUB_TEST_V26' },
      {
        name: 'Kho Test v2.6',
        code: 'HUB_TEST_V26',
        address: '123 Đường Tân Bình, P. 12, Q. Tân Bình, TP.HCM',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận Tân Bình',
        ward: 'Phường 12',
        location: { type: 'Point', coordinates: [106.65, 10.79] },
        status: 'ACTIVE',
      },
      { upsert: true, returnDocument: 'after' }
    );

    const testDestHub = await Hub.findOneAndUpdate(
      { code: 'HUB_TEST_DAD_V26' },
      {
        name: 'Kho Test Đà Nẵng v2.6',
        code: 'HUB_TEST_DAD_V26',
        address: '456 Nguyễn Văn Linh, Hải Châu, Đà Nẵng',
        province: 'Đà Nẵng',
        district: 'Hải Châu',
        ward: 'Thạch Thang',
        location: { type: 'Point', coordinates: [108.21, 16.06] },
        status: 'ACTIVE',
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Seed Geozones
    const zoneNeighbor = await Geozone.findOneAndUpdate(
      { code: 'ZONE-TB-TEST-02' },
      {
        name: 'Cụm Tuyến Phường 13 - Tân Bình',
        code: 'ZONE-TB-TEST-02',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận Tân Bình',
        ward: 'Phường 13',
        hubId: testHub._id,
        subZones: ['Khu phố 4', 'Khu phố 5'],
        status: 'ACTIVE',
      },
      { upsert: true, returnDocument: 'after' }
    );

    const zoneMain = await Geozone.findOneAndUpdate(
      { code: 'ZONE-TB-TEST-01' },
      {
        name: 'Cụm Tuyến Phường 12 - Tân Bình',
        code: 'ZONE-TB-TEST-01',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận Tân Bình',
        ward: 'Phường 12',
        hubId: testHub._id,
        subZones: ['Khu phố 1', 'Khu phố 2', 'Khu phố 3'],
        neighborGeozoneIds: [zoneNeighbor._id],
        status: 'ACTIVE',
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Seed Admin, Manager, Shippers, Drivers
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'secret';

    const testAdmin = await User.findOneAndUpdate(
      { phoneNumber: '0900000001' },
      { fullName: 'Admin Test', role: 'ADMIN', phoneNumber: '0900000001', email: 'admin_test_v26@elogistic.vn', kycStatus: 'VERIFIED_KYC', password: 'hash' },
      { upsert: true, returnDocument: 'after' }
    );
    const adminToken = jwt.sign({ id: testAdmin._id, role: 'ADMIN' }, secret, { expiresIn: '1h' });

    const testVendorMgr = await User.findOneAndUpdate(
      { phoneNumber: '0900000002' },
      { fullName: 'Vendor Manager Test', role: 'ORDER_VENDOR_MANAGER', phoneNumber: '0900000002', email: 'vendormgr_test_v26@elogistic.vn', kycStatus: 'VERIFIED_KYC', password: 'hash' },
      { upsert: true, returnDocument: 'after' }
    );
    const vendorMgrToken = jwt.sign({ id: testVendorMgr._id, role: 'ORDER_VENDOR_MANAGER' }, secret, { expiresIn: '1h' });

    const testDispatcher = await User.findOneAndUpdate(
      { phoneNumber: '0900000003' },
      { fullName: 'Last-Mile Dispatcher Test', role: 'LAST_MILE_DISPATCHER', phoneNumber: '0900000003', email: 'dispatcher_test_v26@elogistic.vn', password: 'hash' },
      { upsert: true, returnDocument: 'after' }
    );
    const dispatcherToken = jwt.sign({ id: testDispatcher._id, role: 'LAST_MILE_DISPATCHER' }, secret, { expiresIn: '1h' });

    const testShipper1 = await User.findOneAndUpdate(
      { phoneNumber: '0900000011' },
      {
        fullName: 'Shipper 1 (Đang Rảnh)',
        role: 'LOCAL_SHIPPER',
        phoneNumber: '0900000011',
        email: 'shipper1_test_v26@elogistic.vn',
        password: 'hash',
        activeGeozoneId: zoneMain._id,
        isWorking: true,
        pickupQuota: { max: 25, current: 2 },
        deliveryQuota: { max: 35, current: 5 },
        acceptanceRate: 98,
        dispatchRejectionCount: 0,
        maxWeightCapacityKg: 45,
        currentWeightKg: 5,
        currentLocation: { type: 'Point', coordinates: [106.651, 10.791] },
      },
      { upsert: true, returnDocument: 'after' }
    );

    const testShipper2 = await User.findOneAndUpdate(
      { phoneNumber: '0900000012' },
      {
        fullName: 'Shipper 2 (Gần Đầy Tải)',
        role: 'LOCAL_SHIPPER',
        phoneNumber: '0900000012',
        email: 'shipper2_test_v26@elogistic.vn',
        password: 'hash',
        activeGeozoneId: zoneMain._id,
        isWorking: true,
        pickupQuota: { max: 25, current: 24 }, // Gần chạm 25
        deliveryQuota: { max: 35, current: 30 },
        acceptanceRate: 70,
        dispatchRejectionCount: 3,
        maxWeightCapacityKg: 45,
        currentWeightKg: 40,
        currentLocation: { type: 'Point', coordinates: [106.655, 10.795] },
      },
      { upsert: true, returnDocument: 'after' }
    );

    const testLineHaulDriver = await User.findOneAndUpdate(
      { phoneNumber: '0900000021' },
      {
        fullName: 'Tài Xế Xe Tải Tuyến',
        role: 'LINE_HAUL_DRIVER',
        phoneNumber: '0900000021',
        email: 'linehaul_driver_test_v26@elogistic.vn',
        password: 'hash',
        isWorking: true,
        vehicleInfo: { licensePlate: '51C-999.88', vehicleType: 'Xe tải 8 tấn' },
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Helper to create valid Order
    const createTestOrder = async (overrides = {}) => {
      const code = `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      return await Order.create({
        trackingCode: code,
        sellerId: testAdmin._id,
        status: 'READY_TO_PICK',
        pickupGeozoneId: zoneMain._id,
        deliveryGeozoneId: zoneNeighbor._id,
        pickupAddress: {
          fullName: 'Shop Dược An Bình',
          phone: '0901234567',
          address: '10 Hoàng Hoa Thám',
          ward: 'Phường 12',
          district: 'Quận Tân Bình',
          province: 'TP. Hồ Chí Minh',
          coordinates: { lat: 10.791, lng: 106.651 },
        },
        deliveryAddress: {
          fullName: 'Khách Lê Mai',
          phone: '0988776655',
          address: '45 Nguyễn Huệ',
          ward: 'Phường Bến Nghé',
          district: 'Quận 1',
          province: 'TP. Hồ Chí Minh',
          coordinates: { lat: 10.776, lng: 106.700 },
        },
        items: [{ name: 'Sản phẩm Test', quantity: 1, weight: 2.0 }],
        actualWeight: 2.0,
        chargeableWeight: 2.0,
        shippingFee: 25000,
        ...overrides,
      });
    };

    // =========================================================================
    // SECTION 1: SINGLE-PASS EXCLUSION FILTER & AUTO APPROVAL
    // =========================================================================
    section('1. KIỂM THỬ SINGLE-PASS EXCLUSION FILTER (AUTO APPROVAL)');

    // Test 1.1: Standard small package -> Must AUTO-APPROVE -> READY_TO_PICK
    testCount++;
    try {
      const evaluation = await autoApprovalService.evaluateOrderApproval(
        {
          codAmount: 250000,
          goodsValue: 250000,
          actualWeight: 2.0,
          dimensions: { length: 20, width: 15, height: 10 },
        },
        testAdmin._id
      );
      assert.strictEqual(evaluation.autoApproved, true);
      assert.strictEqual(evaluation.status, 'READY_TO_PICK');
      pass('TC-1.1: Đơn hàng chuẩn (2kg, COD 250k) tự động pass duyệt -> READY_TO_PICK');
      passCount++;
    } catch (e) {
      fail('TC-1.1: Đơn hàng chuẩn tự động pass', e);
    }

    // Test 1.2: Bulky package (>80cm max dimension) -> Must BLOCK -> PENDING_VERIFICATION
    testCount++;
    try {
      const evaluation = await autoApprovalService.evaluateOrderApproval(
        {
          codAmount: 300000,
          goodsValue: 300000,
          actualWeight: 15.0,
          dimensions: { length: 150, width: 10, height: 10 }, // 150cm > 80cm
        },
        testAdmin._id
      );
      assert.strictEqual(evaluation.autoApproved, false);
      assert.strictEqual(evaluation.status, 'PENDING_VERIFICATION');
      assert.ok(evaluation.riskFlags.includes('OVERSIZED_DIMENSION'));
      pass('TC-1.2: Đơn cồng kềnh (dài 150cm) bị chặn duyệt thủ công -> PENDING_VERIFICATION');
      passCount++;
    } catch (e) {
      fail('TC-1.2: Đơn cồng kềnh bị chặn', e);
    }

    // Test 1.3: High COD (>10,000,000 VND) -> Must BLOCK
    testCount++;
    try {
      const evaluation = await autoApprovalService.evaluateOrderApproval(
        {
          codAmount: 15000000,
          goodsValue: 15000000,
          actualWeight: 1.0,
          dimensions: { length: 10, width: 10, height: 10 },
        },
        testAdmin._id
      );
      assert.strictEqual(evaluation.autoApproved, false);
      assert.strictEqual(evaluation.status, 'PENDING_VERIFICATION');
      assert.ok(evaluation.riskFlags.includes('HIGH_COD_VALUE'));
      pass('TC-1.3: Đơn COD cao (15 triệu) bị chặn rủi ro tài chính -> PENDING_VERIFICATION');
      passCount++;
    } catch (e) {
      fail('TC-1.3: Đơn COD cao bị chặn', e);
    }

    // Test 1.4: Post-Approval Deviation Check (Actual weight 35kg vs Declared 2kg) -> Revoke to SUSPENDED_RISK_REVIEW
    testCount++;
    try {
      const orderToRevoke = await createTestOrder({
        status: 'READY_TO_PICK',
        autoApproved: true,
        actualWeight: 2.0,
      });

      const checkResult = autoApprovalService.checkPostApprovalDeviation(orderToRevoke, {
        measuredWeight: 35.0,
        measuredMaxDimension: 20,
      });

      assert.strictEqual(checkResult.isSuspended, true);
      assert.strictEqual(checkResult.newStatus, 'SUSPENDED_RISK_REVIEW');
      pass('TC-1.4: Phát hiện sai lệch thực tế (35kg vs 2kg) tự động thu hồi -> SUSPENDED_RISK_REVIEW');
      passCount++;
    } catch (e) {
      fail('TC-1.4: Thu hồi sai lệch thực tế', e);
    }

    // =========================================================================
    // SECTION 2: DISPATCH ENGINE & LOAD BALANCING
    // =========================================================================
    section('2. KIỂM THỬ DISPATCH ENGINE & TẢI TRỌNG SHIPPER');

    // Test 2.1: Dispatch scoring formula (Shipper 1 vs Shipper 2)
    testCount++;
    try {
      const testOrder = await createTestOrder({
        status: 'READY_TO_PICK',
        pickupGeozoneId: zoneMain._id,
        actualWeight: 3.0,
        chargeableWeight: 3.0,
      });

      const dispatchRes = await dispatchEngineService.findBestShipperForTask(testOrder, 'PICKUP');

      assert.strictEqual(dispatchRes.success, true);
      // Shipper 1 rảnh hơn nhiều so với Shipper 2 gần chạm quota
      assert.strictEqual(dispatchRes.shipper._id.toString(), testShipper1._id.toString());
      pass('TC-2.1: Thuật toán tính điểm ưu tiên Shipper rảnh tải (Shipper 1) thay vì nhồi đơn cho Shipper 2');
      passCount++;
    } catch (e) {
      fail('TC-2.1: Thuật toán tính điểm điều phối', e);
    }

    // Test 2.2: Spillover Routing when primary zone shippers are exhausted
    testCount++;
    try {
      // Shipper 3 thuộc zoneNeighbor (ZONE-TB-TEST-02)
      const testShipper3 = await User.findOneAndUpdate(
        { phoneNumber: '0900000013' },
        {
          fullName: 'Shipper 3 (Vùng Lân Cận)',
          role: 'LOCAL_SHIPPER',
          phoneNumber: '0900000013',
          email: 'shipper3_test_v26@elogistic.vn',
          password: 'hash',
          activeGeozoneId: zoneNeighbor._id,
          isWorking: true,
          pickupQuota: { max: 25, current: 0 },
          deliveryQuota: { max: 35, current: 0 },
          acceptanceRate: 100,
          dispatchRejectionCount: 0,
          maxWeightCapacityKg: 45,
          currentWeightKg: 0,
        },
        { upsert: true, returnDocument: 'after' }
      );

      const testOrder = await createTestOrder({
        status: 'READY_TO_PICK',
        pickupGeozoneId: zoneMain._id,
      });

      // Exclude shippers in zoneMain to force spillover to zoneNeighbor
      const spilloverRes = await dispatchEngineService.findBestShipperForTask(
        testOrder,
        'PICKUP',
        true, // isSpilloverActive = true
        [testShipper1._id, testShipper2._id] // excluded
      );
      assert.strictEqual(spilloverRes.success, true);
      assert.strictEqual(spilloverRes.shipper._id.toString(), testShipper3._id.toString());
      pass('TC-2.2: Spillover Routing mở rộng tìm kiếm sang cụm tuyến lân cận (Shipper 3) thành công');
      passCount++;
    } catch (e) {
      fail('TC-2.2: Spillover routing', e);
    }

    // Test 2.3: Escalation after 3 timeouts
    testCount++;
    try {
      const orderToEscalate = await createTestOrder({
        status: 'READY_TO_PICK',
        dispatchRetryCount: 2,
      });

      const timeoutRes = await dispatchEngineService.handleShipperRejection(orderToEscalate._id, testShipper1._id, 'PICKUP');
      assert.strictEqual(timeoutRes.escalated, true);
      const reloadedOrder = await Order.findById(orderToEscalate._id);
      assert.strictEqual(reloadedOrder.status, 'DISPATCH_ESCALATED');
      pass('TC-2.3: Tự động ngắt vòng lặp timeout sau 3 lần retry -> DISPATCH_ESCALATED');
      passCount++;
    } catch (e) {
      fail('TC-2.3: Ngắt timeout và escalate', e);
    }

    // =========================================================================
    // SECTION 3: CHAIN OF CUSTODY (LEGAL TRANSFER LOGS)
    // =========================================================================
    section('3. KIỂM THỬ CHUỖI CHUYỂN GIAO TRÁCH NHIỆM (CHAIN OF CUSTODY)');

    // Test 3.1: Record Custody Transfer SELLER_TO_SHIPPER
    testCount++;
    try {
      const custOrder = await createTestOrder();

      const log = await CustodyTransferLog.create({
        orderId: custOrder._id,
        trackingCode: custOrder.trackingCode,
        transferType: 'SELLER_TO_SHIPPER',
        fromActor: { userId: testAdmin._id, role: 'SELLER', name: 'Shop Dược' },
        toActor: { userId: testShipper1._id, role: 'LOCAL_SHIPPER', name: 'Shipper 1' },
        measuredWeightKg: 2.1,
        packageCondition: 'INTACT',
        handoverCode: 'HO-123456',
        gpsLocation: { type: 'Point', coordinates: [106.65, 10.79] },
      });

      assert.ok(log._id);
      assert.strictEqual(log.transferType, 'SELLER_TO_SHIPPER');
      assert.strictEqual(log.measuredWeightKg, 2.1);
      pass('TC-3.1: Ghi nhận nhật ký pháp lý SELLER_TO_SHIPPER kèm GPS & khối lượng thực tế');
      passCount++;
    } catch (e) {
      fail('TC-3.1: Ghi nhận nhật ký SELLER_TO_SHIPPER', e);
    }

    // Test 3.2: Record Custody Transfer ORIGIN_HUB_TO_LINEHAUL
    testCount++;
    try {
      const logHub = await CustodyTransferLog.create({
        transferType: 'ORIGIN_HUB_TO_LINEHAUL',
        handoverCode: 'SEAL-SG-DAD-01',
        fromActor: { userId: testAdmin._id, role: 'HUB_STAFF', name: 'Kho Tân Bình' },
        fromHubId: testHub._id,
        toActor: { userId: testLineHaulDriver._id, role: 'LINE_HAUL_DRIVER', name: 'Tài xế Bảo' },
        toHubId: testDestHub._id,
        packageCondition: 'INTACT',
      });

      assert.ok(logHub._id);
      assert.strictEqual(logHub.fromHubId.toString(), testHub._id.toString());
      assert.strictEqual(logHub.toHubId.toString(), testDestHub._id.toString());
      pass('TC-3.2: Ghi nhận nhật ký ORIGIN_HUB_TO_LINEHAUL liên kết đúng fromHubId và toHubId');
      passCount++;
    } catch (e) {
      fail('TC-3.2: Ghi nhận nhật ký ORIGIN_HUB_TO_LINEHAUL', e);
    }

    // =========================================================================
    // SECTION 4: LINE-HAUL TRIPPING & SEALED BAGGING
    // =========================================================================
    section('4. KIỂM THỬ GOM BAO NIÊM PHONG & CHUYẾN XE TRUNG CHUYỂN');

    // Test 4.1: Create Sealed Bag
    testCount++;
    try {
      const createdBag = await Bag.create({
        sealCode: `SEAL-${Date.now()}`,
        originHubId: testHub._id,
        destinationHubId: testDestHub._id,
        status: 'SEALED',
        totalWeightKg: 18.5,
      });

      assert.ok(createdBag._id);
      assert.strictEqual(createdBag.status, 'SEALED');
      pass('TC-4.1: Tạo bao hàng niêm phong (Bag) trạng thái SEALED thành công');
      passCount++;
    } catch (e) {
      fail('TC-4.1: Tạo bao hàng niêm phong', e);
    }

    // Test 4.2: Create Trip and Assign Driver
    testCount++;
    try {
      const trip = await Trip.create({
        tripCode: `TRIP-TEST-${Date.now()}`,
        tripType: 'MID_MILE_TRANSFER',
        originHubId: testHub._id,
        destinationHubId: testDestHub._id,
        driverId: testLineHaulDriver._id,
        status: 'LOCKED_PENDING_DRIVER_CONFIRM',
      });

      assert.ok(trip._id);
      assert.strictEqual(trip.driverId.toString(), testLineHaulDriver._id.toString());
      pass('TC-4.2: Lập chuyến xe Trip gán tài xế xe tải liên tỉnh thành công');
      passCount++;
    } catch (e) {
      fail('TC-4.2: Lập chuyến xe Trip', e);
    }

    // =========================================================================
    // SECTION 5: HTTP REST APIS (3 MANAGERS PORTALS)
    // =========================================================================
    section('5. KIỂM THỬ CÁC HTTP API ENDPOINTS CỦA 3 QUẢN LÝ');

    // Test 5.1: GET /api/vendor-ops/pending-review
    testCount++;
    try {
      const res = await api('GET', '/api/vendor-ops/pending-review', null, vendorMgrToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      pass('TC-5.1: GET /api/vendor-ops/pending-review trả về danh sách đơn thẩm duyệt 200 OK');
      passCount++;
    } catch (e) {
      fail('TC-5.1: API vendor-ops pending review', e);
    }

    // Test 5.2: GET /api/dispatch/local/geozones
    testCount++;
    try {
      const res = await api('GET', '/api/dispatch/local/geozones', null, dispatcherToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      pass('TC-5.2: GET /api/dispatch/local/geozones trả về danh sách Geozones 200 OK');
      passCount++;
    } catch (e) {
      fail('TC-5.2: API local dispatch geozones', e);
    }

    // Test 5.3: GET /api/dispatch/local/shippers-overview
    testCount++;
    try {
      const res = await api('GET', '/api/dispatch/local/shippers-overview', null, dispatcherToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      pass('TC-5.3: GET /api/dispatch/local/shippers-overview trả về danh sách Shipper kèm Quota 200 OK');
      passCount++;
    } catch (e) {
      fail('TC-5.3: API shippers overview', e);
    }

    // Test 5.4: GET /api/dispatch/linehaul/trips
    testCount++;
    try {
      const res = await api('GET', '/api/dispatch/linehaul/trips', null, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      pass('TC-5.4: GET /api/dispatch/linehaul/trips trả về danh sách chuyến xe trung chuyển 200 OK');
      passCount++;
    } catch (e) {
      fail('TC-5.4: API linehaul trips', e);
    }

    // Test 5.5: GET /api/custody/history/all
    testCount++;
    try {
      const res = await api('GET', '/api/custody/history/all', null, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      pass('TC-5.5: GET /api/custody/history/all truy xuất nhật ký Chain of Custody 200 OK');
      passCount++;
    } catch (e) {
      fail('TC-5.5: API custody history', e);
    }

  } catch (err) {
    console.error(`${C.red}CRITICAL TEST SUITE ERROR:${C.reset}`, err);
  } finally {
    if (server) {
      await new Promise((res) => server.close(res));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    console.log(`\n${C.bold}${C.cyan}══════════════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.bold} 🎉 KẾT QUẢ TỔNG HỢP: ${passCount} PASS / ${testCount - passCount} FAIL / ${testCount} TỔNG${C.reset}`);
    console.log(`${C.bold}${C.cyan}══════════════════════════════════════════════════════════════════════${C.reset}\n`);
    process.exit(passCount === testCount ? 0 : 1);
  }
}

run();
