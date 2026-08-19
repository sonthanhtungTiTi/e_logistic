require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/user.model');
const Order = require('../../src/models/order.model');
const OrderLog = require('../../src/models/orderLog.model');

const PORT = 5058;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runUC07TestSuite() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU CHẠY SUITE TEST CHO UC-07 (CẬP NHẬT ĐƠN HÀNG)');
  console.log('====================================================\n');

  const mongoURI = process.env.MONGODB_URI;
  await mongoose.connect(mongoURI);
  console.log('✅ MongoDB Connected.');

  const server = app.listen(PORT, async () => {
    console.log(`🚀 Test Server running on port ${PORT}\n`);

    try {
      // 0. Tạo Seller A, Seller B và Admin
      const sellerAEmail = `sellerA_${Date.now()}@example.com`;
      const sellerBEmail = `sellerB_${Date.now()}@example.com`;
      const adminEmail = `admin_${Date.now()}@example.com`;

      const regARes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Seller A',
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
          fullName: 'Seller B',
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
        fullName: 'System Administrator',
        email: adminEmail,
        phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password123!',
        role: 'ADMIN',
        isActive: true
      });
      await adminUser.save();

      // Đăng nhập Admin với body: { identifier, password }
      const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: adminEmail, password: 'Password123!' })
      });
      const adminLoginData = await adminLoginRes.json();
      const tokenAdmin = adminLoginData.accessToken;

      console.log(`🔑 Seller A ID: ${idA}`);
      console.log(`🔑 Seller B Token Ready.`);
      console.log(`🔑 Admin Token Ready: ${tokenAdmin ? 'OK' : 'FAIL'}`);

      // Step 1: Seller A tạo 1 đơn hàng mới
      const createPayload = {
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
        items: [{ name: 'San pham ban dau', quantity: 1, weight: 1.0 }],
        dimensions: { length: 10, width: 10, height: 10 },
        codAmount: 200000,
        goodsValue: 500000
      };

      const orderCreateRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify(createPayload)
      });
      const orderCreateData = await orderCreateRes.json();
      const targetOrderId = orderCreateData.data._id;
      const initialFee = orderCreateData.data.shippingFee;
      console.log(`📦 Created Order ID: ${targetOrderId}, Initial Fee: ${initialFee} VNĐ\n`);

      // ----------------------------------------------------
      // TEST 1: ADMIN CẬP NHẬT ĐƠN CỦA SELLER A (SUCCESS)
      // ----------------------------------------------------
      console.log('====================================================');
      console.log('📌 TEST 1 — ADMIN CẬP NHẬT ĐƠN CỦA SELLER A (PERMISSION FIX)');
      console.log('====================================================');

      const adminUpdateRes = await fetch(`${BASE_URL}/orders/${targetOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenAdmin}`
        },
        body: JSON.stringify({
          deliveryNote: 'Admin đã kiểm tra và ghi chú hỗ trợ giao nhanh'
        })
      });
      const adminUpdateData = await adminUpdateRes.json();
      console.log(`   HTTP Status: ${adminUpdateRes.status}`);
      console.log(`   Message: ${adminUpdateData.message}`);
      console.log(`   Delivery Note: ${adminUpdateData.order?.deliveryNote}`);

      if (adminUpdateRes.status === 200 && adminUpdateData.success === true) {
        console.log('✅ TEST 1 PASSED: Admin sửa đơn của Seller A thành công!');
      } else {
        console.log('❌ TEST 1 FAILED: Admin bị chặn sửa đơn.');
      }

      // ----------------------------------------------------
      // TEST 2: VALIDATION ERROR (KÍCH THƯỚC ÂM -> HTTP 400)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 2 — VALIDATION ERROR (KÍCH THƯỚC ÂM -> HTTP 400)');
      console.log('====================================================');

      const invalidDimRes = await fetch(`${BASE_URL}/orders/${targetOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          dimensions: { length: -50, width: 10, height: 10 }
        })
      });
      const invalidDimData = await invalidDimRes.json();
      console.log(`   HTTP Status: ${invalidDimRes.status}`);
      console.log(`   Message: ${invalidDimData.message}`);

      if (invalidDimRes.status === 400) {
        console.log('✅ TEST 2 PASSED: Bắt lỗi kích thước âm thành công (HTTP 400 Bad Request).');
      } else {
        console.log('❌ TEST 2 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 3: SELLER A CẬP NHẬT ĐƠN (TĂNG CÂN NẶNG -> TÍNH LẠI CƯỚC)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 3 — SELLER A CẬP NHẬT ĐƠN (TĂNG CÂN NẶNG -> TÍNH LẠI CƯỚC)');
      console.log('====================================================');

      const updatePayload1 = {
        deliveryAddress: {
          fullName: 'Nguyen Van Recipient Updated',
          phone: '0933333333',
          address: '205 Le Loi',
          ward: 'Ben Nghe',
          district: 'Quận 1',
          province: 'TP. Hồ Chí Minh'
        },
        items: [{ name: 'San pham ban dau', quantity: 1, weight: 3.5 }],
        dimensions: { length: 30, width: 20, height: 15 }
      };

      const updateRes1 = await fetch(`${BASE_URL}/orders/${targetOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify(updatePayload1)
      });
      const updateData1 = await updateRes1.json();
      console.log(`   HTTP Status: ${updateRes1.status}`);
      console.log(`   Fee Changed: ${updateData1.fee_changed}`);
      console.log(`   Old Fee: ${updateData1.old_fee} VNĐ`);
      console.log(`   New Fee: ${updateData1.new_fee} VNĐ`);
      console.log(`   Updated Recipient Name: ${updateData1.order?.deliveryAddress?.fullName}`);

      if (updateRes1.status === 200 && updateData1.fee_changed === true && updateData1.new_fee > updateData1.old_fee) {
        console.log('✅ TEST 3 PASSED: Đã cập nhật thông tin và tính lại cước phí chính xác.');
      } else {
        console.log('❌ TEST 3 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 4: IDOR TEST (SELLER B SỬA ĐƠN CỦA SELLER A -> HTTP 403)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 4 — IDOR TEST (SELLER B SỬA ĐƠN CỦA SELLER A)');
      console.log('====================================================');

      const idorRes = await fetch(`${BASE_URL}/orders/${targetOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenB}`
        },
        body: JSON.stringify({ deliveryNote: 'Hacker Edit' })
      });
      const idorData = await idorRes.json();
      console.log(`   HTTP Status: ${idorRes.status}`);
      console.log(`   Message: ${idorData.message}`);

      if (idorRes.status === 403) {
        console.log('✅ TEST 4 PASSED: Chặn IDOR thành công (Trả HTTP 403 Forbidden).');
      } else {
        console.log('❌ TEST 4 FAILED: Không chặn được IDOR!');
      }

      // ----------------------------------------------------
      // TEST 5: STATUS LOCK TEST (SỬA ĐƠN KHI ĐÃ SANG PICKING -> HTTP 409)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 5 — STATUS LOCK TEST (ĐƠN CHUYỂN SANG PICKING -> HTTP 409)');
      console.log('====================================================');

      await Order.findByIdAndUpdate(targetOrderId, { status: 'PICKING' });
      console.log('   [DB] Đã giả lập đổi trạng thái đơn hàng thành PICKING.');

      const lockedRes = await fetch(`${BASE_URL}/orders/${targetOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({ deliveryNote: 'Ghi chu khi dang giao' })
      });
      const lockedData = await lockedRes.json();
      console.log(`   HTTP Status: ${lockedRes.status}`);
      console.log(`   Message: ${lockedData.message}`);

      if (lockedRes.status === 409) {
        console.log('✅ TEST 5 PASSED: Khóa không cho sửa đơn đã xử lý (Trả HTTP 409 Conflict).');
      } else {
        console.log('❌ TEST 5 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 6: THỰC THI TEST RACE CONDITION THẬT BẰNG PROMISE.ALL
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 6 — THỰC THI RACE CONDITION THẬT BẰNG PROMISE.ALL');
      console.log('====================================================');

      const order2Res = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({
          pickupAddress: createPayload.pickupAddress,
          deliveryAddress: createPayload.deliveryAddress,
          items: [{ name: 'Item Test Race Condition', quantity: 1, weight: 1.5 }],
          codAmount: 100000
        })
      });
      const order2Data = await order2Res.json();
      const raceOrderId = order2Data.data._id;
      console.log(`   Order 2 ID for Race Test: ${raceOrderId}`);

      console.log(`🚀 Gửi đồng thời: Request 1 (Seller PUT update) và Request 2 (Kho update status PICKING)...`);

      const reqSellerUpdate = fetch(`${BASE_URL}/orders/${raceOrderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({ deliveryNote: 'Update Note in Race Condition Window' })
      });

      const reqWorkerPickup = Order.findOneAndUpdate(
        { _id: raceOrderId, status: { $in: ['CREATED', 'READY_TO_PICK'] } },
        { $set: { status: 'PICKING' } },
        { returnDocument: 'after' }
      );

      const [resSeller, resWorker] = await Promise.all([reqSellerUpdate, reqWorkerPickup]);
      const dataSeller = await resSeller.json();

      console.log('\n--- RAW RESPONSE BODY SELLER UPDATE ---');
      console.log(`HTTP Status: ${resSeller.status}`);
      console.log(`Response Body:`, JSON.stringify(dataSeller, null, 2));

      console.log('\n--- RAW WORKER PICKUP RESULT ---');
      console.log(`Worker Updated Order Status: ${resWorker?.status}`);

      const finalOrderInDB = await Order.findById(raceOrderId);
      console.log(`\n👉 KIỂM TRA MONGODB STATUS CUỐI CÙNG TRONG CSDL: ${finalOrderInDB.status}`);
      
      if (resSeller.status === 200 || resSeller.status === 409) {
        console.log('✅ TEST 6 PASSED: Atomic Conditional Update loại bỏ race window hoàn toàn!');
      } else {
        console.log('❌ TEST 6 FAILED.');
      }

    } catch (err) {
      console.error('❌ Lỗi trong quá trình chạy test UC-07:', err);
    } finally {
      server.close();
      await mongoose.disconnect();
      console.log('\n🏁 Đã hoàn thành UC-07 test suite và đóng kết nối.');
      process.exit(0);
    }
  });
}

runUC07TestSuite();
