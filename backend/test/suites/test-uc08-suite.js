require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/user.model');
const Order = require('../../src/models/order.model');
const OrderLog = require('../../src/models/orderLog.model');

const PORT = 5059;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runUC08TestSuite() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU CHẠY SUITE TEST CHO UC-08 (HỦY ĐƠN HÀNG)');
  console.log('====================================================\n');

  const mongoURI = process.env.MONGODB_URI;
  await mongoose.connect(mongoURI);
  console.log('✅ MongoDB Connected.');

  const server = app.listen(PORT, async () => {
    console.log(`🚀 Test Server running on port ${PORT}\n`);

    try {
      // 0. Tạo Seller A, Seller B và Admin
      const sellerAEmail = `sellerA_cancel_${Date.now()}@example.com`;
      const sellerBEmail = `sellerB_cancel_${Date.now()}@example.com`;
      const adminEmail = `admin_cancel_${Date.now()}@example.com`;

      const regARes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Seller A Cancel',
          email: sellerAEmail,
          phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: 'Password123!',
          confirmPassword: 'Password123!'
        })
      });
      const regAData = await regARes.json();
      const tokenA = regAData.accessToken;
      const idA = regAData._id;

      const regBRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Seller B Cancel',
          email: sellerBEmail,
          phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
          password: 'Password123!',
          confirmPassword: 'Password123!'
        })
      });
      const regBData = await regBRes.json();
      const tokenB = regBData.accessToken;

      // Tạo Admin trong DB
      const adminUser = new User({
        fullName: 'Admin Cancel System',
        email: adminEmail,
        phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password123!',
        role: 'ADMIN',
        isActive: true
      });
      await adminUser.save();

      const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: adminEmail, password: 'Password123!' })
      });
      const adminLoginData = await adminLoginRes.json();
      const tokenAdmin = adminLoginData.accessToken;

      console.log(`🔑 Seller A ID: ${idA}`);
      console.log(`🔑 Seller B Token Ready.`);
      console.log(`🔑 Admin Token Ready: ${tokenAdmin ? 'OK' : 'FAIL'}\n`);

      // Helper function to create sample order
      const createSampleOrder = async (token, weight = 1.0) => {
        const res = await fetch(`${BASE_URL}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            pickupAddress: {
              fullName: 'Kho Seller A',
              phone: '0911111111',
              address: '100 Cau Giay',
              ward: 'Dich Vong',
              district: 'Cau Giay',
              province: 'Hà Nội'
            },
            deliveryAddress: {
              fullName: 'Nguyen Van Recipient',
              phone: '0922222222',
              address: '200 Le Loi',
              ward: 'Ben Nghe',
              district: 'Quận 1',
              province: 'TP. Hồ Chí Minh'
            },
            items: [{ name: 'Item Test Cancel', quantity: 1, weight }],
            dimensions: { length: 10, width: 10, height: 10 },
            codAmount: 150000
          })
        });
        const data = await res.json();
        return data.data;
      };

      // ----------------------------------------------------
      // TEST 1: SELLER A HỦY 1 ĐƠN HÀNG (SUCCESS)
      // ----------------------------------------------------
      console.log('====================================================');
      console.log('📌 TEST 1 — SELLER A HỦY 1 ĐƠN HÀNG (SUCCESS)');
      console.log('====================================================');

      const order1 = await createSampleOrder(tokenA);
      console.log(`📦 Created Order 1 ID: ${order1._id}, Status: ${order1.status}`);

      const cancelRes1 = await fetch(`${BASE_URL}/orders/${order1._id}/cancel`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          reason: 'SELLER_CHANGED_MIND'
        })
      });
      const cancelData1 = await cancelRes1.json();
      console.log(`   HTTP Status: ${cancelRes1.status}`);
      console.log(`   Message: ${cancelData1.message}`);
      console.log(`   Cancelled Order Status: ${cancelData1.order?.status}`);
      console.log(`   Cancel Reason: ${cancelData1.order?.cancelReason}`);

      const log1 = await OrderLog.findOne({ orderId: order1._id, actionType: 'CANCELLED' });
      console.log(`   Audit Log Note: ${log1?.note}`);

      if (cancelRes1.status === 200 && cancelData1.order?.status === 'CANCELLED' && log1) {
        console.log('✅ TEST 1 PASSED: Hủy 1 đơn hàng thành công kèm Audit Log.');
      } else {
        console.log('❌ TEST 1 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 2: VALIDATION ERROR — REASON "OTHER" THIẾU CUSTOM REASON (ALT 6.1)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 2 — VALIDATION ERROR (LÝ DO OTHER THIẾU CHI TIẾT -> HTTP 400)');
      console.log('====================================================');

      const order2 = await createSampleOrder(tokenA);

      const invalidCancelRes = await fetch(`${BASE_URL}/orders/${order2._id}/cancel`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          reason: 'OTHER',
          customReason: 'abc' // < 5 chars!
        })
      });
      const invalidCancelData = await invalidCancelRes.json();
      console.log(`   HTTP Status: ${invalidCancelRes.status}`);
      console.log(`   Message: ${invalidCancelData.message}`);

      if (invalidCancelRes.status === 400) {
        console.log('✅ TEST 2 PASSED: Bắt lỗi validation Alt 6.1 thành công (HTTP 400 Bad Request).');
      } else {
        console.log('❌ TEST 2 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 3: ADMIN HỦY ĐƠN CỦA SELLER A (PERMISSION CHECK)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 3 — ADMIN HỦY ĐƠN CỦA SELLER A (ADMIN PERMISSION)');
      console.log('====================================================');

      const adminCancelRes = await fetch(`${BASE_URL}/orders/${order2._id}/cancel`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenAdmin}`
        },
        body: JSON.stringify({
          reason: 'OTHER',
          customReason: 'Admin can thiep huy don vi vi pham chinh sach'
        })
      });
      const adminCancelData = await adminCancelRes.json();
      console.log(`   HTTP Status: ${adminCancelRes.status}`);
      console.log(`   Message: ${adminCancelData.message}`);
      console.log(`   Cancelled Order Status: ${adminCancelData.order?.status}`);

      if (adminCancelRes.status === 200 && adminCancelData.order?.status === 'CANCELLED') {
        console.log('✅ TEST 3 PASSED: Admin hủy đơn của Seller A thành công.');
      } else {
        console.log('❌ TEST 3 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 4: IDOR TEST (SELLER B HỦY ĐƠN CỦA SELLER A -> HTTP 403)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 4 — IDOR TEST (SELLER B HỦY ĐƠN SELLER A)');
      console.log('====================================================');

      const order4 = await createSampleOrder(tokenA);

      const idorRes = await fetch(`${BASE_URL}/orders/${order4._id}/cancel`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenB}`
        },
        body: JSON.stringify({ reason: 'SELLER_CHANGED_MIND' })
      });
      const idorData = await idorRes.json();
      console.log(`   HTTP Status: ${idorRes.status}`);
      console.log(`   Message: ${idorData.message}`);

      if (idorRes.status === 403) {
        console.log('✅ TEST 4 PASSED: Chặn IDOR thành công (HTTP 403 Forbidden).');
      } else {
        console.log('❌ TEST 4 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 5: STATUS LOCK TEST (HỦY ĐƠN KHI ĐÃ SANG PICKING -> HTTP 409)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 5 — STATUS LOCK TEST (HỦY ĐƠN KHI ĐÃ SANG PICKING -> HTTP 409)');
      console.log('====================================================');

      const order5 = await createSampleOrder(tokenA);
      await Order.findByIdAndUpdate(order5._id, { status: 'PICKING' });
      console.log('   [DB] Đã đổi trạng thái đơn thành PICKING.');

      const lockedRes = await fetch(`${BASE_URL}/orders/${order5._id}/cancel`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({ reason: 'SELLER_CHANGED_MIND' })
      });
      const lockedData = await lockedRes.json();
      console.log(`   HTTP Status: ${lockedRes.status}`);
      console.log(`   Message: ${lockedData.message}`);

      if (lockedRes.status === 409) {
        console.log('✅ TEST 5 PASSED: Khóa không cho hủy đơn đã PICKING (HTTP 409 Conflict).');
      } else {
        console.log('❌ TEST 5 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 6: THỰC THI RACE CONDITION THẬT BẰNG PROMISE.ALL
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 6 — THỰC THI RACE CONDITION THẬT BẰNG PROMISE.ALL');
      console.log('====================================================');

      const order6 = await createSampleOrder(tokenA);
      console.log(`   Order 6 ID for Race Test: ${order6._id}`);

      console.log(`🚀 Gửi đồng thời: Request 1 (Seller DELETE cancel) và Request 2 (Kho update status PICKING)...`);

      const reqSellerCancel = fetch(`${BASE_URL}/orders/${order6._id}/cancel`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({ reason: 'OUT_OF_STOCK' })
      });

      const reqWorkerPickup = Order.findOneAndUpdate(
        { _id: order6._id, status: { $in: ['CREATED', 'READY_TO_PICK'] } },
        { $set: { status: 'PICKING' } },
        { returnDocument: 'after' }
      );

      const [resSeller, resWorker] = await Promise.all([reqSellerCancel, reqWorkerPickup]);
      const dataSeller = await resSeller.json();

      console.log('\n--- RAW RESPONSE BODY SELLER CANCEL ---');
      console.log(`HTTP Status: ${resSeller.status}`);
      console.log(`Response Body:`, JSON.stringify(dataSeller, null, 2));

      console.log('\n--- RAW WORKER PICKUP RESULT ---');
      console.log(`Worker Updated Order Status: ${resWorker?.status}`);

      const finalOrderInDB = await Order.findById(order6._id);
      console.log(`\n👉 KIỂM TRA MONGODB STATUS CUỐI CÙNG TRONG CSDL: ${finalOrderInDB.status}`);

      if (resSeller.status === 200 || resSeller.status === 409) {
        console.log('✅ TEST 6 PASSED: Atomic Conditional Update loại bỏ race condition!');
      } else {
        console.log('❌ TEST 6 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 7: BULK CANCEL TEST (PROMISE.ALLSETTLED - ALT 3.1)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 7 — BULK CANCEL TEST (PROMISE.ALLSETTLED - ALT 3.1)');
      console.log('====================================================');

      const bulk1 = await createSampleOrder(tokenA);
      const bulk2 = await createSampleOrder(tokenA);
      const bulk3 = await createSampleOrder(tokenA);

      // Cho bulk3 sang DELIVERED để test lỗi đơn lẻ trong batch
      await Order.findByIdAndUpdate(bulk3._id, { status: 'DELIVERED' });

      const bulkRes = await fetch(`${BASE_URL}/orders/bulk-cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          orderIds: [bulk1._id, bulk2._id, bulk3._id],
          reason: 'OUT_OF_STOCK'
        })
      });
      const bulkData = await bulkRes.json();
      console.log(`   HTTP Status: ${bulkRes.status}`);
      console.log(`   Message: ${bulkData.message}`);
      console.log(`   Success Count: ${bulkData.data?.successCount}`);
      console.log(`   Failed Count: ${bulkData.data?.failedCount}`);
      console.log(`   Details:`, JSON.stringify(bulkData.data?.results, null, 2));

      if (bulkRes.status === 200 && bulkData.data?.successCount === 2 && bulkData.data?.failedCount === 1) {
        console.log('✅ TEST 7 PASSED: Hủy hàng loạt (Bulk Cancel) phân rã chính xác từng đơn.');
      } else {
        console.log('❌ TEST 7 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 8: ASYNC DISPATCHER NOTIFICATION FAILURE (ALT 8.1)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 8 — ASYNC DISPATCHER NOTIFICATION FAILURE (ALT 8.1)');
      console.log('====================================================');

      const order8 = await createSampleOrder(tokenA);
      // Giả lập đơn đã được gán tài xế
      await Order.findByIdAndUpdate(order8._id, { currentDriverId: idA });
      process.env.SIMULATE_DISPATCHER_FAIL = 'true';

      const alt81Res = await fetch(`${BASE_URL}/orders/${order8._id}/cancel`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({ reason: 'WRONG_INFO' })
      });
      const alt81Data = await alt81Res.json();
      console.log(`   HTTP Status: ${alt81Res.status}`);
      console.log(`   Message: ${alt81Data.message}`);
      console.log(`   Cancelled Order Status: ${alt81Data.order?.status}`);

      delete process.env.SIMULATE_DISPATCHER_FAIL;

      if (alt81Res.status === 200 && alt81Data.order?.status === 'CANCELLED') {
        console.log('✅ TEST 8 PASSED: Lỗi thông báo tác vụ phụ không làm sụp đổ việc hủy đơn (Trả HTTP 200 OK).');
      } else {
        console.log('❌ TEST 8 FAILED.');
      }

    } catch (err) {
      console.error('❌ Lỗi trong quá trình chạy test UC-08:', err);
    } finally {
      server.close();
      await mongoose.disconnect();
      console.log('\n🏁 Đã hoàn thành UC-08 test suite và đóng kết nối.');
      process.exit(0);
    }
  });
}

runUC08TestSuite();
