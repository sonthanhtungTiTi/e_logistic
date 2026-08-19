require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const User = require('../../src/models/user.model');
const Order = require('../../src/models/order.model');
const OrderLog = require('../../src/models/orderLog.model');

const PORT = 5057;
const BASE_URL = `http://localhost:${PORT}/api`;

function createTestToken(userId) {
  return jwt.sign({ id: userId, type: 'access' }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function runUC16InboundTestSuite() {
  console.log('===========================================================');
  console.log('🧪 BẮT ĐẦU CHẠY SUITE TEST SENIOR AUDIT CHO UC-16 (NHẬP KHO)');
  console.log('===========================================================\n');

  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic';
  await mongoose.connect(mongoURI);
  console.log('✅ MongoDB Connected.');

  const server = app.listen(PORT, async () => {
    console.log(`🚀 Test Server running on port ${PORT}\n`);

    try {
      // Setup Mock Hub IDs
      const originHubId = new mongoose.Types.ObjectId();
      const destHubId = new mongoose.Types.ObjectId();
      const sortingHubId = new mongoose.Types.ObjectId();

      // Step 0: Create Warehouse Staff User directly in DB
      const staffUser = await User.create({
        fullName: 'Nhân viên Kho Gốc Test',
        email: `staff_uc16_${Date.now()}@example.com`,
        phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password123!',
        role: 'HUB_STAFF',
        hubId: originHubId,
        isActive: true
      });
      const staffToken = createTestToken(staffUser._id);

      // Seller User setup
      const sellerId = new mongoose.Types.ObjectId();

      console.log(`🔑 Warehouse Staff Token & Hub ID created: ${originHubId.toString()}`);

      // ----------------------------------------------------
      // TEST 1: IDOR PREVENTION (Gửi hub_id giả mạo trong body)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 1 — IDOR PREVENTION (Gửi hub_id giả mạo)');
      console.log('====================================================');

      const test1Code = `ELG-IDOR-${Date.now()}`;
      const order1 = await Order.create({
        trackingCode: test1Code,
        sellerId: sellerId,
        status: 'PICKED_UP',
        originHubId: originHubId,
        destinationHubId: destHubId,
        pickupAddress: { fullName: 'Sender A', phone: '0912345678', address: 'HN', ward: 'W', district: 'D', province: 'Hà Nội' },
        deliveryAddress: { fullName: 'Recv B', phone: '0987654321', address: 'HCM', ward: 'W', district: 'D', province: 'TP. Hồ Chí Minh' },
        items: [{ name: 'Sp 1', quantity: 1, weight: 1 }],
        actualWeight: 1,
        chargeableWeight: 1,
        shippingFee: 30000
      });

      const res1 = await fetch(`${BASE_URL}/inbound/scan-single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${staffToken}`
        },
        body: JSON.stringify({
          tracking_code: test1Code,
          hub_id: 'HUB_GIA_MAO_99999' // Giả mạo Hub ID trong body
        })
      });

      const data1 = await res1.json();
      console.log(`   HTTP Status: ${res1.status}`);
      console.log(`   Response Message: ${data1.message}`);
      console.log(`   Hub in DB result: ${data1.data?.hub_id}`);

      const refreshedOrder1 = await Order.findById(order1._id);
      if (res1.status === 200 && refreshedOrder1.currentHubId.toString() === originHubId.toString()) {
        console.log('✅ TEST 1 PASSED: Code đã lờ đi hub_id từ client body và lấy đúng req.user.hubId từ JWT.');
      } else {
        console.log('❌ TEST 1 FAILED: Phát hiện lỗ hổng IDOR.');
      }

      // ----------------------------------------------------
      // TEST 2: RACE CONDITION / DOUBLE-SCAN TEST (Atomic Update)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 2 — RACE CONDITION TEST (Promise.all 2 request song song)');
      console.log('====================================================');

      const test2Code = `ELG-RACE-${Date.now()}`;
      await Order.create({
        trackingCode: test2Code,
        sellerId: sellerId,
        status: 'PICKED_UP',
        originHubId: originHubId,
        destinationHubId: destHubId,
        pickupAddress: { fullName: 'Sender A', phone: '0912345678', address: 'HN', ward: 'W', district: 'D', province: 'Hà Nội' },
        deliveryAddress: { fullName: 'Recv B', phone: '0987654321', address: 'HCM', ward: 'W', district: 'D', province: 'TP. Hồ Chí Minh' },
        items: [{ name: 'Sp 2', quantity: 1, weight: 1 }],
        actualWeight: 1,
        chargeableWeight: 1,
        shippingFee: 30000
      });

      // Launch 2 scan requests concurrently at the exact same millisecond
      const reqA = fetch(`${BASE_URL}/inbound/scan-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
        body: JSON.stringify({ tracking_code: test2Code })
      });
      const reqB = fetch(`${BASE_URL}/inbound/scan-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
        body: JSON.stringify({ tracking_code: test2Code })
      });

      const [res2A, res2B] = await Promise.all([reqA, reqB]);
      const data2A = await res2A.json();
      const data2B = await res2B.json();

      console.log(`   Req 1 Status: ${res2A.status} (${data2A.message})`);
      console.log(`   Req 2 Status: ${res2B.status} (${data2B.message})`);

      const statuses = [res2A.status, res2B.status];
      const hasSuccess = statuses.includes(200);
      const hasConflictOrError = statuses.includes(409) || statuses.includes(400);

      // Wait a moment for async audit log
      await new Promise(resolve => setTimeout(resolve, 300));
      const logCount2 = await OrderLog.countDocuments({ trackingCode: test2Code });
      console.log(`   OrderLog Audit count for ${test2Code}: ${logCount2}`);

      if (hasSuccess && hasConflictOrError && logCount2 === 1) {
        console.log('✅ TEST 2 PASSED: 1 Request thành công (200 OK), 1 Request bị chặn (409/400). Log không bị tăng 2 lần.');
      } else {
        console.log('❌ TEST 2 FAILED: Race condition không được xử lý an toàn.');
      }

      // ----------------------------------------------------
      // TEST 3: STATE MACHINE BARRIER (CANCELLED Order)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 3 — STATE MACHINE BARRIER (Quét đơn đã HỦY)');
      console.log('====================================================');

      const test3Code = `ELG-CANCEL-${Date.now()}`;
      await Order.create({
        trackingCode: test3Code,
        sellerId: sellerId,
        status: 'CANCELLED',
        originHubId: originHubId,
        destinationHubId: destHubId,
        pickupAddress: { fullName: 'Sender A', phone: '0912345678', address: 'HN', ward: 'W', district: 'D', province: 'Hà Nội' },
        deliveryAddress: { fullName: 'Recv B', phone: '0987654321', address: 'HCM', ward: 'W', district: 'D', province: 'TP. Hồ Chí Minh' },
        items: [{ name: 'Sp 3', quantity: 1, weight: 1 }],
        actualWeight: 1,
        chargeableWeight: 1,
        shippingFee: 30000
      });

      const res3 = await fetch(`${BASE_URL}/inbound/scan-single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${staffToken}`
        },
        body: JSON.stringify({ tracking_code: test3Code })
      });
      const data3 = await res3.json();
      console.log(`   HTTP Status: ${res3.status}`);
      console.log(`   Error Code: ${data3.code}`);
      console.log(`   Error Message: ${data3.message}`);

      if (res3.status === 400 && data3.code === 'INVALID_STATE_TRANSITION') {
        console.log('✅ TEST 3 PASSED: Đơn CANCELLED bị chặn chính xác với mã lỗi INVALID_STATE_TRANSITION.');
      } else {
        console.log('❌ TEST 3 FAILED: Cho phép nhập kho đơn ở trạng thái không hợp lệ.');
      }

      // ----------------------------------------------------
      // TEST 4: TRANSIT ROUTING TEST (Mid-mile Hub Routing)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 4 — TRANSIT ROUTING TEST (Kho trung chuyển)');
      console.log('====================================================');

      // Create staff at Sorting Hub (Đà Nẵng) directly in DB
      const sortingStaffUser = await User.create({
        fullName: 'Nhân viên Kho Trung Chuyển Đà Nẵng',
        email: `staff_sorting_${Date.now()}@example.com`,
        phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password123!',
        role: 'HUB_STAFF',
        hubId: sortingHubId,
        isActive: true
      });
      const sortingStaffToken = createTestToken(sortingStaffUser._id);

      const test4Code = `ELG-TRANSIT-${Date.now()}`;
      await Order.create({
        trackingCode: test4Code,
        sellerId: sellerId,
        status: 'IN_TRANSIT',
        originHubId: originHubId, // Hà Nội Hub
        destinationHubId: destHubId, // Sài Gòn Hub
        pickupAddress: { fullName: 'Sender A', phone: '0912345678', address: 'HN', ward: 'W', district: 'D', province: 'Hà Nội' },
        deliveryAddress: { fullName: 'Recv B', phone: '0987654321', address: 'HCM', ward: 'W', district: 'D', province: 'TP. Hồ Chí Minh' },
        items: [{ name: 'Sp 4', quantity: 1, weight: 1 }],
        actualWeight: 1,
        chargeableWeight: 1,
        shippingFee: 30000
      });

      const res4 = await fetch(`${BASE_URL}/inbound/scan-single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sortingStaffToken}`
        },
        body: JSON.stringify({ tracking_code: test4Code })
      });
      const data4 = await res4.json();
      console.log(`   HTTP Status: ${res4.status}`);
      console.log(`   New Status: ${data4.data?.current_status}`);
      console.log(`   Next Action: ${data4.data?.next_action}`);

      if (res4.status === 200 && data4.data?.current_status === 'IN_SORTING_HUB' && data4.data?.next_action === 'SORT_FOR_NEXT_HUB') {
        console.log('✅ TEST 4 PASSED: Đơn IN_TRANSIT quét tại Kho Trung Chuyển đổi thành IN_SORTING_HUB (Không nhảy cóc sang Kho Đích).');
      } else {
        console.log('❌ TEST 4 FAILED: Logic tuyến trung chuyển bị nhảy vọt.');
      }

      // ----------------------------------------------------
      // TEST 5: BATCH SCANNING TEST
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 5 — BATCH SCANNING TEST (Quét hàng loạt)');
      console.log('====================================================');

      const batchCode1 = `ELG-BATCH1-${Date.now()}`;
      const batchCode2 = `ELG-BATCH2-${Date.now()}`;
      await Order.create({
        trackingCode: batchCode1,
        sellerId: sellerId,
        status: 'PICKED_UP',
        originHubId: originHubId,
        destinationHubId: destHubId,
        pickupAddress: { fullName: 'Sender A', phone: '0912345678', address: 'HN', ward: 'W', district: 'D', province: 'Hà Nội' },
        deliveryAddress: { fullName: 'Recv B', phone: '0987654321', address: 'HCM', ward: 'W', district: 'D', province: 'TP. Hồ Chí Minh' },
        items: [{ name: 'Sp B1', quantity: 1, weight: 1 }],
        actualWeight: 1,
        chargeableWeight: 1,
        shippingFee: 30000
      });
      await Order.create({
        trackingCode: batchCode2,
        sellerId: sellerId,
        status: 'PICKED_UP',
        originHubId: originHubId,
        destinationHubId: destHubId,
        pickupAddress: { fullName: 'Sender A', phone: '0912345678', address: 'HN', ward: 'W', district: 'D', province: 'Hà Nội' },
        deliveryAddress: { fullName: 'Recv B', phone: '0987654321', address: 'HCM', ward: 'W', district: 'D', province: 'TP. Hồ Chí Minh' },
        items: [{ name: 'Sp B2', quantity: 1, weight: 1 }],
        actualWeight: 1,
        chargeableWeight: 1,
        shippingFee: 30000
      });

      const res5 = await fetch(`${BASE_URL}/inbound/scan-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${staffToken}`
        },
        body: JSON.stringify({
          tracking_codes: [batchCode1, batchCode2, 'ELG-NON-EXISTENT']
        })
      });
      const data5 = await res5.json();
      console.log(`   HTTP Status: ${res5.status}`);
      console.log(`   Total Processed: ${data5.data?.total}`);
      console.log(`   Success Count: ${data5.data?.success_count}`);
      console.log(`   Failed Count: ${data5.data?.failed_count}`);

      if (res5.status === 200 && data5.data?.success_count === 2 && data5.data?.failed_count === 1) {
        console.log('✅ TEST 5 PASSED: Quét lô hàng loạt hoạt động chính xác với Promise.allSettled.');
      } else {
        console.log('❌ TEST 5 FAILED.');
      }

    } catch (err) {
      console.error('❌ Lỗi khi chạy UC-16 test suite:', err);
    } finally {
      await new Promise(resolve => setTimeout(resolve, 500));
      server.close();
      await mongoose.disconnect();
      console.log('\n🏁 Hoàn thành UC-16 test suite và đóng kết nối DB.');
      process.exit(0);
    }
  });
}

runUC16InboundTestSuite();
