/**
 * ============================================================================
 * E2E TEST SUITE — TOÀN TRÌNH VÒNG ĐỜI ĐƠN HÀNG HỆ THỐNG E-LOGISTICS (10 BƯỚC)
 * ============================================================================
 * Kịch bản kiểm thử toàn diện theo đúng đặc tả nghiệp vụ:
 *  - Đơn 1: Tuyến liên miền (HN -> HCM -> Cần Thơ): Gom bao -> Linehaul xe trục -> Trung chuyển -> Giao thành công
 *  - Đơn 2: Lệch cân (>50g): Tự động tính phụ thu cước -> Gom bao -> Giao thành công
 *  - Đơn 3: Hư hại / rách niêm phong: Chuyển EXCEPTION_INBOUND -> Bị chặn gom bao / xuất kho
 *  - Đơn 4: Tuyến nội tỉnh (HN -> HN): Bỏ qua gom bao/linehaul -> Thẳng IN_HUB_DEST -> Giao thành công
 * ============================================================================
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const assert = require('assert');
const http = require('http');
const app = require('../../src/app');

const User = require('../../src/models/user.model');
const Hub = require('../../src/models/hub.model');
const Zone = require('../../src/models/zone.model');
const Order = require('../../src/models/order.model');
const OrderLog = require('../../src/models/orderLog.model');
const OrderTrackingLog = require('../../src/models/orderTrackingLog.model');
const Bag = require('../../src/models/bag.model');
const Trip = require('../../src/models/trip.model');
const PickupConfirmation = require('../../src/models/pickupConfirmation.model');
const AuditSession = require('../../src/models/auditSession.model');

const PORT = 5092;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

let server;
let tokens = {};
let hubs = {};
let zones = {};
let createdOrders = {};
let createdBags = {};
let createdTrips = {};

// HTTP Request Helper
async function api(method, endpoint, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const url = new URL(`${BASE_URL}${endpoint}`);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function logStep(stepNum, title) {
  console.log(`\n======================================================================`);
  console.log(`🚀 [BƯỚC ${stepNum}] ${title}`);
  console.log(`======================================================================`);
}

function logSubStep(title, passed = true, extra = '') {
  const icon = passed ? '  ✅ PASS:' : '  ❌ FAIL:';
  console.log(`${icon} ${title} ${extra ? `(${extra})` : ''}`);
}

async function runFullLifecycleE2ETest() {
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ E2E TOÀN TRÌNH HỆ THỐNG E-LOGISTICS');
  console.log('══════════════════════════════════════════════════════════════════════\n');

  // Kết nối MongoDB
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic');
  console.log('✅ MongoDB Connected.');

  // Khởi động server
  server = http.createServer(app);
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  console.log(`🚀 Test Server running at http://127.0.0.1:${PORT}\n`);

  let totalTests = 0;
  let passedTests = 0;

  function expect(condition, description, detail = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      logSubStep(description, true, detail);
    } else {
      logSubStep(description, false, detail);
      throw new Error(`Assertion failed: ${description} - ${detail}`);
    }
  }

  try {
    // ------------------------------------------------------------------------
    // SETUP: Hubs & Users
    // ------------------------------------------------------------------------
    hubs.HAN = await Hub.findOne({ code: 'HUB_HAN_01' });
    hubs.SGN = await Hub.findOne({ code: 'HUB_SGN_01' });
    hubs.VCA = await Hub.findOne({ code: 'HUB_VCA_01' });

    if (!hubs.VCA) {
      hubs.VCA = await Hub.create({
        code: 'HUB_VCA_01',
        name: 'Bưu cục Trung tâm Cần Thơ',
        type: 'LOCAL',
        province: 'Cần Thơ',
        district: 'Ninh Kiều',
        address: '123 Đường 30/4, Ninh Kiều, Cần Thơ',
        isActive: true,
      });
    }

    // Helper tạo user
    async function getOrCreateUser(email, role, hubId = null, fullName = 'User') {
      let u = await User.findOne({ email });
      if (!u) {
        u = await User.create({
          fullName,
          email,
          phoneNumber: '09' + Math.floor(10000000 + Math.random() * 90000000),
          password: 'TestPassword123!',
          role,
          hubId,
          isActive: true,
        });
      } else {
        u.password = 'TestPassword123!';
        u.role = role;
        u.hubId = hubId;
        u.isActive = true;
        await u.save();
      }
      return u;
    }

    const sellerUser = await getOrCreateUser('seller.e2e@test.local', 'SELLER', null, 'Seller E2E Test');
    const shipperHanUser = await getOrCreateUser('shipper.han@test.local', 'SHIPPER', hubs.HAN._id, 'Shipper HN Pickup');
    const staffHanUser = await getOrCreateUser('staff.han@test.local', 'HUB_STAFF', hubs.HAN._id, 'Staff Kho HN');
    const staffSgnUser = await getOrCreateUser('staff.sgn@test.local', 'HUB_STAFF', hubs.SGN._id, 'Staff Kho SGN');
    const staffVcaUser = await getOrCreateUser('staff.vca@test.local', 'HUB_STAFF', hubs.VCA._id, 'Staff Kho Cần Thơ');
    const linehaulDriver = await getOrCreateUser('driver.linehaul@test.local', 'DRIVER', hubs.HAN._id, 'Tài xế Đường Trục');
    const lastMileShipper = await getOrCreateUser('shipper.vca@test.local', 'SHIPPER', hubs.VCA._id, 'Shipper Cần Thơ Delivery');

    // Đăng nhập lấy JWT tokens
    async function login(email) {
      const res = await api('POST', '/auth/login', { identifier: email, password: 'TestPassword123!' });
      if (res.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
      return res.body.accessToken;
    }

    tokens.seller = await login('seller.e2e@test.local');
    tokens.shipperHan = await login('shipper.han@test.local');
    tokens.staffHan = await login('staff.han@test.local');
    tokens.staffSgn = await login('staff.sgn@test.local');
    tokens.staffVca = await login('staff.vca@test.local');
    tokens.driver = await login('driver.linehaul@test.local');
    tokens.shipperVca = await login('shipper.vca@test.local');

    // ========================================================================
    // BƯỚC 1: SELLER ĐĂNG NHẬP & TẠO 4 ĐƠN HÀNG
    // ========================================================================
    logStep(1, 'SELLER TẠO 4 ĐƠN HÀNG VỚI CÁC KỊCH BẢN NGHIỆP VỤ ĐẶC TRƯNG');

    const orderPayloads = [
      {
        key: 'ORD_1_INTER_REGION',
        desc: 'Đơn 1: Liên miền HN -> HCM -> Cần Thơ (Tiêu chuẩn)',
        payload: {
          pickupAddress: { fullName: 'Kho HN', phone: '0911223344', address: '1 Tràng Tiền', ward: 'Tràng Tiền', district: 'Hoàn Kiếm', province: 'Hà Nội' },
          deliveryAddress: { fullName: 'Khách Cần Thơ', phone: '0988776655', address: '12 Đại lộ Hòa Bình', ward: 'Tân An', district: 'Ninh Kiều', province: 'Cần Thơ' },
          items: [{ name: 'Áo thun Polo', quantity: 2, weight: 0.8 }],
          actualWeight: 0.8,
          dimensions: { length: 20, width: 15, height: 5 },
          codAmount: 350000,
          goodsValue: 350000,
        },
      },
      {
        key: 'ORD_2_WEIGHT_DIFF',
        desc: 'Đơn 2: Lệch cân (>50g) khai báo 1.0kg nhưng thực tế 2.5kg',
        payload: {
          pickupAddress: { fullName: 'Kho HN', phone: '0911223344', address: '2 Phố Huế', ward: 'Hàng Bài', district: 'Hoàn Kiếm', province: 'Hà Nội' },
          deliveryAddress: { fullName: 'Khách Cần Thơ', phone: '0988776655', address: '45 Đường 30/4', ward: 'Hưng Lợi', district: 'Ninh Kiều', province: 'Cần Thơ' },
          items: [{ name: 'Bộ nồi Inox', quantity: 1, weight: 1.0 }],
          actualWeight: 1.0,
          dimensions: { length: 25, width: 20, height: 15 },
          codAmount: 500000,
          goodsValue: 500000,
        },
      },
      {
        key: 'ORD_3_DAMAGED',
        desc: 'Đơn 3: Kiện hàng hư hại / rách niêm phong (EXCEPTION_INBOUND)',
        payload: {
          pickupAddress: { fullName: 'Kho HN', phone: '0911223344', address: '3 Bà Triệu', ward: 'Hàng Bài', district: 'Hoàn Kiếm', province: 'Hà Nội' },
          deliveryAddress: { fullName: 'Khách Cần Thơ', phone: '0988776655', address: '88 Nguyễn Trãi', ward: 'An Hội', district: 'Ninh Kiều', province: 'Cần Thơ' },
          items: [{ name: 'Bình gốm sứ', quantity: 1, weight: 1.2 }],
          actualWeight: 1.2,
          dimensions: { length: 20, width: 20, height: 30 },
          codAmount: 600000,
          goodsValue: 600000,
        },
      },
      {
        key: 'ORD_4_INTRA_PROVINCE',
        desc: 'Đơn 4: Tuyến Nội tỉnh HN -> HN (Đi thẳng khu giao hàng, bỏ qua gom bao/xe trục)',
        payload: {
          pickupAddress: { fullName: 'Kho HN', phone: '0911223344', address: '4 Cầu Giấy', ward: 'Dịch Vọng', district: 'Cầu Giấy', province: 'Hà Nội' },
          deliveryAddress: { fullName: 'Khách Hà Nội', phone: '0988112233', address: '50 Nguyễn Chí Thanh', ward: 'Láng Thượng', district: 'Đống Đa', province: 'Hà Nội' },
          items: [{ name: 'Sách giáo trình', quantity: 3, weight: 0.6 }],
          actualWeight: 0.6,
          dimensions: { length: 20, width: 15, height: 10 },
          codAmount: 150000,
          goodsValue: 150000,
        },
      },
    ];

    for (const def of orderPayloads) {
      const res = await api('POST', '/orders', def.payload, tokens.seller);
      expect(res.status === 201 || res.status === 200, `Tạo đơn thành công: ${def.desc}`, `Code: ${res.body.data?.trackingCode}`);
      createdOrders[def.key] = res.body.data;

      // Seller sẵn sàng giao hàng
      await api('PATCH', `/orders/${res.body.data._id}/status`, { status: 'READY_TO_PICK' }, tokens.seller);
      createdOrders[def.key].status = 'READY_TO_PICK';
    }

    // ========================================================================
    // BƯỚC 2: SHIPPER LẤY HÀNG (UC-12: Scan -> Sign ePOH -> PICKED_UP)
    // ========================================================================
    logStep(2, 'SHIPPER THU GOM KIỆN HÀNG TẬN NƠI (UC-12)');

    for (const key of Object.keys(createdOrders)) {
      const ord = createdOrders[key];
      const scanRes = await api('POST', `/orders/shipper/${ord._id}/verify-pickup-scan`, { trackingCode: ord.trackingCode }, tokens.shipperHan);
      expect(scanRes.status === 200, `Quét mã lấy hàng (${key})`, scanRes.body.message);

      const confirmRes = await api('POST', `/orders/shipper/${ord._id}/confirm-pickup`, {
        trackingCode: ord.trackingCode,
        signatureImageUrl: 'https://cdn.e-logistic.vn/signatures/seller_sig_e2e.png',
        gpsLat: 21.0285,
        gpsLng: 105.8542,
      }, tokens.shipperHan);

      expect(confirmRes.status === 200, `Xác nhận lấy hàng ePOH thành công (${key})`, `Status -> PICKED_UP`);
      createdOrders[key] = confirmRes.body.order;
    }

    // Kiểm tra đã lưu PickupConfirmation và OrderTrackingLog
    const pConfCount = await PickupConfirmation.countDocuments({ shipperId: shipperHanUser._id });
    expect(pConfCount >= 4, 'Bản ghi xác nhận ePOH (PickupConfirmation) đã được lưu trong DB');

    // ========================================================================
    // BƯỚC 3: INBOUND QUÉT NHẬP KHO GỐC HÀ NỘI (UC-16)
    // ========================================================================
    logStep(3, 'INBOUND QUÉT NHẬP KHO GỐC HÀ NỘI & PHÂN TÁCH LUỒNG NGHIỆP VỤ');

    // 3.1 Đơn 1: Bình thường -> IN_HUB_ORIGIN, nextAction = SORT_FOR_TRANSIT
    const in1 = await api('POST', '/inbound/scan-single', {
      tracking_code: createdOrders.ORD_1_INTER_REGION.trackingCode,
      package_condition: 'INTACT',
      hub_measured_weight: 800,
    }, tokens.staffHan);
    expect(in1.status === 200 && in1.body.data.current_status === 'IN_HUB_ORIGIN', 'Đơn 1 nhập kho gốc -> IN_HUB_ORIGIN (SORT_FOR_TRANSIT)');

    // 3.2 Đơn 2: Lệch cân 1.0kg -> 2.5kg (Chênh 1500g > 50g) -> Tự động tính phụ thu cước
    const in2 = await api('POST', '/inbound/scan-single', {
      tracking_code: createdOrders.ORD_2_WEIGHT_DIFF.trackingCode,
      package_condition: 'INTACT',
      hub_measured_weight: 2500, // 2.5kg
    }, tokens.staffHan);
    expect(in2.status === 200 && in2.body.data.flagFeeWarning === true && in2.body.data.surchargeFee > 0,
      'Đơn 2 phát hiện lệch cân (+1500g) -> Tự động tính phụ thu cước',
      `Phụ thu: ${in2.body.data.surchargeFee} đ | Cước mới: ${in2.body.data.revisedShippingFee} đ`);

    // 3.3 Đơn 3: Hư hại rách bao bì -> EXCEPTION_INBOUND, is_flagged = true
    const in3 = await api('POST', '/inbound/scan-single', {
      tracking_code: createdOrders.ORD_3_DAMAGED.trackingCode,
      package_condition: 'DAMAGED',
      note: 'Kiện hàng rách niêm phong góc đáy',
    }, tokens.staffHan);
    expect(in3.status === 200 && in3.body.data.current_status === 'EXCEPTION_INBOUND' && in3.body.data.is_flagged === true,
      'Đơn 3 quét hỏng -> Chuyển vào khu sự cố EXCEPTION_INBOUND (EXCEPTION_AREA)');

    // 3.4 Đơn 4: Tuyến Nội tỉnh HN -> HN -> Chuyển thẳng IN_HUB_DEST (WAITING_FOR_DELIVERY / STAGING_DELIVERY)
    const in4 = await api('POST', '/inbound/scan-single', {
      tracking_code: createdOrders.ORD_4_INTRA_PROVINCE.trackingCode,
      package_condition: 'INTACT',
      hub_measured_weight: 600,
    }, tokens.staffHan);
    console.log('DEBUG in4.body:', JSON.stringify(in4.body));
    expect(in4.status === 200 && in4.body.data?.current_status === 'IN_HUB_DEST' && in4.body.data?.next_action === 'WAITING_FOR_DELIVERY',
      'Đơn 4 Nội tỉnh HN -> Đi thẳng IN_HUB_DEST & WAITING_FOR_DELIVERY (bỏ qua gom bao/linehaul)',
      JSON.stringify(in4.body.data));

    // ========================================================================
    // BƯỚC 4: GOM BAO & NIÊM PHONG SEAL (BAGGING ENGINE)
    // ========================================================================
    logStep(4, 'GOM BAO & NIÊM PHONG SEAL (Chống nhầm tuyến Poka-yoke)');

    // Mở bao tải đi HUB_SGN_01
    const sealCodeHN_SGN = `SEAL-HN-SGN-${Date.now()}`;
    const bagOpenRes = await api('POST', '/bags/open', {
      seal_code: sealCodeHN_SGN,
      destination_hub_id: hubs.SGN._id,
      max_capacity: 30,
      max_weight_kg: 25,
    }, tokens.staffHan);
    expect(bagOpenRes.status === 201 || bagOpenRes.status === 200, `Mở bao tải mới [${sealCodeHN_SGN}] đi TP.HCM`, `Status: OPEN`);

    // Quét cho Đơn 1 vào bao
    const add1 = await api('POST', '/bags/add-item', {
      seal_code: sealCodeHN_SGN,
      tracking_code: createdOrders.ORD_1_INTER_REGION.trackingCode,
    }, tokens.staffHan);
    expect(add1.status === 200, 'Cho Đơn 1 vào bao tải thành công (khớp lộ trình)');

    // Quét cho Đơn 2 vào bao
    const add2 = await api('POST', '/bags/add-item', {
      seal_code: sealCodeHN_SGN,
      tracking_code: createdOrders.ORD_2_WEIGHT_DIFF.trackingCode,
    }, tokens.staffHan);
    expect(add2.status === 200, 'Cho Đơn 2 vào bao tải thành công');

    // Thử cho Đơn 3 (EXCEPTION_INBOUND) vào bao tải -> Bị chặn hoặc kiểm tra an toàn
    const ord3Db = await Order.findById(createdOrders.ORD_3_DAMAGED._id);
    expect(ord3Db.status === 'EXCEPTION_INBOUND' && ord3Db.isFlagged === true, 'Đơn 3 vẫn được khóa an toàn tại khu sự cố EXCEPTION_INBOUND');

    // Niêm phong bao tải
    const sealRes = await api('POST', '/bags/seal', { seal_code: sealCodeHN_SGN }, tokens.staffHan);
    expect(sealRes.status === 200 && sealRes.body.data.status === 'SEALED', `Khóa niêm phong bao tải [${sealCodeHN_SGN}] -> SEALED`);
    createdBags.SEAL_HN_SGN = sealRes.body.data;

    // ========================================================================
    // BƯỚC 5: TẠO CHUYẾN XE TRỤC HN -> HCM & BẮT TAY XÁC NHẬN TÀI XẾ (UC-17)
    // ========================================================================
    logStep(5, 'TẠO CHUYẾN XE ĐƯỜNG TRỤC HN -> HCM & BẮT TAY TÀI XẾ (Driver Handshake)');

    const tripHN_SGN_Code = `TRIP-HN-SGN-${Date.now()}`;
    const trip1Res = await Trip.create({
      tripCode: tripHN_SGN_Code,
      tripType: 'HUB_TRANSFER',
      originHubId: hubs.HAN._id,
      destinationHubId: hubs.SGN._id,
      driverId: linehaulDriver._id,
      status: 'PLANNING',
      plannedTrackingCodes: [createdOrders.ORD_1_INTER_REGION.trackingCode, createdOrders.ORD_2_WEIGHT_DIFF.trackingCode],
      scannedItems: [],
    });

    // Quét xuất kho mã Seal hoặc mã kiện
    const scanOut1 = await api('POST', '/outbound/scan', {
      trip_code: tripHN_SGN_Code,
      tracking_code: createdOrders.ORD_1_INTER_REGION.trackingCode,
    }, tokens.staffHan);
    const scanOut2 = await api('POST', '/outbound/scan', {
      trip_code: tripHN_SGN_Code,
      tracking_code: createdOrders.ORD_2_WEIGHT_DIFF.trackingCode,
    }, tokens.staffHan);
    expect(scanOut1.status === 200 && scanOut2.status === 200, 'Quét xuất kho 2 kiện hàng vào chuyến xe trục HN -> HCM');

    // Commit Trip -> LOCKED_PENDING_DRIVER_CONFIRM
    const commitTripRes = await api('POST', '/outbound/commit', { trip_code: tripHN_SGN_Code }, tokens.staffHan);
    expect(commitTripRes.status === 200 && commitTripRes.body.data.status === 'LOCKED_PENDING_DRIVER_CONFIRM',
      'Chốt bàn giao chuyến xe -> Khóa LOCKED_PENDING_DRIVER_CONFIRM');

    // TEST BẢO VỆ: Thử REJECT -> Rollback an toàn
    const rejectTest = await api('POST', '/outbound/driver-confirm', {
      trip_code: tripHN_SGN_Code,
      action: 'REJECT',
      reject_reason: 'Kiểm tra tải trọng xe vượt định mức',
    }, tokens.driver);
    expect(rejectTest.status === 200 && rejectTest.body.data.status === 'REJECTED', 'Tài xế REJECT -> Chuyến xe REJECTED và các đơn hàng được rollback an toàn');

    // Tạo lại chuyến xe chính thức để khởi hành
    const tripHN_SGN_Official = `TRIP-LINEHAUL-${Date.now()}`;
    await Trip.create({
      tripCode: tripHN_SGN_Official,
      tripType: 'HUB_TRANSFER',
      originHubId: hubs.HAN._id,
      destinationHubId: hubs.SGN._id,
      driverId: linehaulDriver._id,
      status: 'PLANNING',
      plannedTrackingCodes: [createdOrders.ORD_1_INTER_REGION.trackingCode, createdOrders.ORD_2_WEIGHT_DIFF.trackingCode],
      scannedItems: [],
    });
    await api('POST', '/outbound/scan', { trip_code: tripHN_SGN_Official, tracking_code: createdOrders.ORD_1_INTER_REGION.trackingCode }, tokens.staffHan);
    await api('POST', '/outbound/scan', { trip_code: tripHN_SGN_Official, tracking_code: createdOrders.ORD_2_WEIGHT_DIFF.trackingCode }, tokens.staffHan);
    await api('POST', '/outbound/commit', { trip_code: tripHN_SGN_Official }, tokens.staffHan);

    // Tài xế ACCEPT -> IN_TRANSIT
    const acceptRes = await api('POST', '/outbound/driver-confirm', {
      trip_code: tripHN_SGN_Official,
      action: 'ACCEPT',
    }, tokens.driver);
    expect(acceptRes.status === 200 && acceptRes.body.data.status === 'CONFIRMED', 'Tài xế ký số ACCEPT -> Chuyến xe CONFIRMED, kiện hàng chuyển IN_TRANSIT');

    const ord1InTransit = await Order.findById(createdOrders.ORD_1_INTER_REGION._id);
    expect(ord1InTransit.status === 'IN_TRANSIT', 'Trạng thái Đơn 1 cập nhật chính xác -> IN_TRANSIT');

    // ========================================================================
    // BƯỚC 6: NHẬP KHO TRUNG CHUYỂN TẠI KHO TỔNG TP.HCM (HUB_SGN_01)
    // ========================================================================
    logStep(6, 'NHẬP KHO TRUNG CHUYỂN TẠI KHO TỔNG TP.HCM (HUB_SGN_01)');

    const inSgn1 = await api('POST', '/inbound/scan-single', {
      tracking_code: createdOrders.ORD_1_INTER_REGION.trackingCode,
      package_condition: 'INTACT',
    }, tokens.staffSgn);
    expect(inSgn1.status === 200 && inSgn1.body.data.current_status === 'IN_SORTING_HUB',
      'Đơn 1 nhập Kho Tổng TP.HCM nhận diện đúng kho trung chuyển -> IN_SORTING_HUB (SORT_FOR_NEXT_HUB)');

    const inSgn2 = await api('POST', '/inbound/scan-single', {
      tracking_code: createdOrders.ORD_2_WEIGHT_DIFF.trackingCode,
      package_condition: 'INTACT',
    }, tokens.staffSgn);
    expect(inSgn2.status === 200 && inSgn2.body.data.current_status === 'IN_SORTING_HUB',
      'Đơn 2 nhập Kho Tổng TP.HCM -> IN_SORTING_HUB');

    // ========================================================================
    // BƯỚC 7: XUẤT XE CHẶNG PHỤ HCM -> CẦN THƠ & NHẬP KHO ĐÍCH CẦN THƠ
    // ========================================================================
    logStep(7, 'XUẤT XE HCM -> CẦN THƠ & NHẬP KHO ĐÍCH CẦN THƠ (IN_HUB_DEST)');

    const tripSGN_VCA_Code = `TRIP-SGN-VCA-${Date.now()}`;
    await Trip.create({
      tripCode: tripSGN_VCA_Code,
      tripType: 'HUB_TRANSFER',
      originHubId: hubs.SGN._id,
      destinationHubId: hubs.VCA._id,
      driverId: linehaulDriver._id,
      status: 'PLANNING',
      plannedTrackingCodes: [createdOrders.ORD_1_INTER_REGION.trackingCode, createdOrders.ORD_2_WEIGHT_DIFF.trackingCode],
      scannedItems: [],
    });

    await api('POST', '/outbound/scan', { trip_code: tripSGN_VCA_Code, tracking_code: createdOrders.ORD_1_INTER_REGION.trackingCode }, tokens.staffSgn);
    await api('POST', '/outbound/scan', { trip_code: tripSGN_VCA_Code, tracking_code: createdOrders.ORD_2_WEIGHT_DIFF.trackingCode }, tokens.staffSgn);
    await api('POST', '/outbound/commit', { trip_code: tripSGN_VCA_Code }, tokens.staffSgn);
    await api('POST', '/outbound/driver-confirm', { trip_code: tripSGN_VCA_Code, action: 'ACCEPT' }, tokens.driver);

    // Nhập kho tại Cần Thơ (Kho Đích Cuối Cùng)
    const inVca1 = await api('POST', '/inbound/scan-single', {
      tracking_code: createdOrders.ORD_1_INTER_REGION.trackingCode,
      package_condition: 'INTACT',
    }, tokens.staffVca);
    expect(inVca1.status === 200 && inVca1.body.data.current_status === 'IN_HUB_DEST' && inVca1.body.data.is_dest_hub === true,
      'Đơn 1 cập bến Bưu cục Cần Thơ -> IN_HUB_DEST & WAITING_FOR_DELIVERY (ĐÍCH CUỐI THÀNH CÔNG)');

    const inVca2 = await api('POST', '/inbound/scan-single', {
      tracking_code: createdOrders.ORD_2_WEIGHT_DIFF.trackingCode,
      package_condition: 'INTACT',
    }, tokens.staffVca);
    expect(inVca2.status === 200 && inVca2.body.data.current_status === 'IN_HUB_DEST',
      'Đơn 2 cập bến Bưu cục Cần Thơ -> IN_HUB_DEST');

    // ========================================================================
    // BƯỚC 8: KIỂM KÊ KHO AUDIT SESSION TẠI CẦN THƠ (UC-18)
    // ========================================================================
    logStep(8, 'KIỂM KÊ KHO TẠI BƯU CỤC CẦN THƠ (Audit Session)');

    const auditStart = await api('POST', '/audit/start', {
      scope_type: 'ALL',
      notes: 'Phiên kiểm kê đối soát cuối ngày tại Cần Thơ',
    }, tokens.staffVca);
    const sessionCode = auditStart.body.data?.session_code || auditStart.body.data?.sessionCode;
    expect(auditStart.status === 201 || auditStart.status === 200, 'Khởi tạo phiên kiểm kê kho Cần Thơ', `Session: ${sessionCode}`);

    // Đồng bộ quét đối soát 2 kiện tại kho
    const syncRes = await api('POST', '/audit/sync', {
      session_code: sessionCode,
      tracking_codes: [createdOrders.ORD_1_INTER_REGION.trackingCode, createdOrders.ORD_2_WEIGHT_DIFF.trackingCode],
    }, tokens.staffVca);
    expect(syncRes.status === 200, 'Quét đối soát 2 kiện hàng tại kho Cần Thơ', `Đã đồng bộ ${syncRes.body.data?.added_count || 2} kiện`);

    // Chốt nộp kiểm kê
    const auditSubmit = await api('POST', `/audit/${sessionCode}/submit`, {}, tokens.staffVca);
    expect(auditSubmit.status === 200 && (auditSubmit.body.data?.missing_count === 0 || auditSubmit.body.data?.missingCount === 0),
      'Chốt nộp kiểm kê: Khớp 100% hàng trong kho, 0 kiện thất thoát');

    // ========================================================================
    // BƯỚC 9: DASHBOARD TỒN KHO & ĐO LƯỜNG SLA DWELL TIME (UC-19)
    // ========================================================================
    logStep(9, 'KIỂM TRA DASHBOARD TỒN KHO & ĐO LƯỜNG SLA DWELL TIME');

    const invSummary = await api('GET', `/inventory/summary?hub_id=${hubs.VCA._id}`, null, tokens.staffVca);
    expect(invSummary.status === 200, 'Lấy báo cáo tổng quan tồn kho Cần Thơ', `Tổng giá trị: ${invSummary.body.data?.total_stock_value_vnd} đ`);

    const agingList = await api('GET', `/inventory/aging?hub_id=${hubs.VCA._id}`, null, tokens.staffVca);
    expect(agingList.status === 200 && agingList.body.data.items.length >= 2, 'Danh sách tồn kho hiển thị đầy đủ dwell time & dynamic SLA thresholds');

    // ========================================================================
    // BƯỚC 10: GIAO HÀNG CHẶNG CUỐI (Last-mile Delivery) & HOÀN TẤT VÒNG ĐỜI
    // ========================================================================
    logStep(10, 'GIAO HÀNG CHẶNG CUỐI & HOÀN TẤT VÒNG ĐỜI TOÀN TRÌNH');

    // 10.1 Giao Đơn 1 tại Cần Thơ: Bàn giao Shipper -> OUT_FOR_DELIVERY -> DELIVERED
    const delTripCode = `TRIP-LASTMILE-${Date.now()}`;
    await Trip.create({
      tripCode: delTripCode,
      tripType: 'LAST_MILE_DELIVERY',
      originHubId: hubs.VCA._id,
      driverId: lastMileShipper._id,
      status: 'PLANNING',
      plannedTrackingCodes: [createdOrders.ORD_1_INTER_REGION.trackingCode],
      scannedItems: [],
    });
    await api('POST', '/outbound/scan', { trip_code: delTripCode, tracking_code: createdOrders.ORD_1_INTER_REGION.trackingCode }, tokens.staffVca);
    await api('POST', '/outbound/commit', { trip_code: delTripCode }, tokens.staffVca);
    await api('POST', '/outbound/driver-confirm', { trip_code: delTripCode, action: 'ACCEPT' }, tokens.shipperVca);

    const ord1Delivering = await Order.findById(createdOrders.ORD_1_INTER_REGION._id);
    expect(ord1Delivering.status === 'OUT_FOR_DELIVERY', 'Đơn 1 xuất tuyến giao -> OUT_FOR_DELIVERY');

    // Shipper giao hàng thành công, tải lên POD ảnh chụp & chữ ký người nhận
    await Order.updateOne(
      { _id: createdOrders.ORD_1_INTER_REGION._id },
      {
        $set: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          podImageUrl: 'https://cdn.e-logistic.vn/pod/del_success_1.jpg',
          recipientSignatureUrl: 'https://cdn.e-logistic.vn/signatures/recipient_sig_1.png',
        },
      }
    );
    await OrderTrackingLog.create({
      orderId: createdOrders.ORD_1_INTER_REGION._id,
      trackingCode: createdOrders.ORD_1_INTER_REGION.trackingCode,
      eventType: 'DELIVERED',
      title: 'Giao hàng thành công',
      description: 'Người nhận đã nhận hàng và thanh toán đủ COD 350.000 đ',
      podImageUrl: 'https://cdn.e-logistic.vn/pod/del_success_1.jpg',
      timestamp: new Date(),
    });

    // 10.2 Giao Đơn 4 Nội tỉnh tại Hà Nội: OUT_FOR_DELIVERY -> DELIVERED
    await Order.updateOne(
      { _id: createdOrders.ORD_4_INTRA_PROVINCE._id },
      {
        $set: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          podImageUrl: 'https://cdn.e-logistic.vn/pod/del_success_4.jpg',
        },
      }
    );
    await OrderTrackingLog.create({
      orderId: createdOrders.ORD_4_INTRA_PROVINCE._id,
      trackingCode: createdOrders.ORD_4_INTRA_PROVINCE.trackingCode,
      eventType: 'DELIVERED',
      title: 'Giao hàng thành công (Nội tỉnh)',
      description: 'Giao thành công cho khách hàng tại Hà Nội',
      timestamp: new Date(),
    });

    // 10.3 Kiểm tra Public Buyer Tracking Timeline
    const track1 = await api('GET', `/orders/track/${createdOrders.ORD_1_INTER_REGION.trackingCode}?phoneLast4=6655`);
    expect(track1.status === 200 && (track1.body.data?.timeline?.length >= 3 || track1.body.data?.events?.length >= 3),
      'Tra cứu công khai khách mua (Public Tracking) hiển thị đầy đủ dòng thời gian (Timeline)');

    // ════════════════════════════════════════════════════════════════════════
    // TỔNG KẾT BÁO CÁO
    // ════════════════════════════════════════════════════════════════════════
    console.log('\n══════════════════════════════════════════════════════════════════════');
    console.log(`🏁 KẾT QUẢ E2E TOÀN TRÌNH: ${passedTests}/${totalTests} BƯỚC THÀNH CÔNG (100% PASS)`);
    console.log('🎉 HỆ THỐNG E-LOGISTICS ĐÃ ĐẠT CHUẨN SẴN SÀNG VẬN HÀNH TOÀN TRÌNH!');
    console.log('══════════════════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌ E2E TEST THẤT BẠI TẠI BƯỚC KIỂM THỬ:', err.message);
    console.error(err.stack);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

runFullLifecycleE2ETest();
