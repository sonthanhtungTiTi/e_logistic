require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/user.model');
const Order = require('../../src/models/order.model');
const OrderLog = require('../../src/models/orderLog.model');

const PORT = 5056;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runUC06TestSuite() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU CHẠY SUITE TEST CHO UC-06 (TẠO ĐƠN HÀNG)');
  console.log('====================================================\n');

  const mongoURI = process.env.MONGODB_URI;
  await mongoose.connect(mongoURI);
  console.log('✅ MongoDB Connected.');

  const server = app.listen(PORT, async () => {
    console.log(`🚀 Test Server running on port ${PORT}\n`);

    try {
      // Step 0: Tạo Seller để lấy JWT Token
      const sellerEmail = `seller_uc06_${Date.now()}@example.com`;
      const sellerPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;

      const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Seller UC06 Test',
          email: sellerEmail,
          phoneNumber: sellerPhone,
          password: 'Password123!',
          confirmPassword: 'Password123!'
        })
      });
      const regData = await regRes.json();
      const sellerToken = regData.accessToken;
      const sellerId = regData._id;
      console.log(`🔑 Registered Seller ID: ${sellerId}`);

      // ----------------------------------------------------
      // TEST 1: LẤY BÁO GIÁ XEM TRƯỚC (QUOTE PREVIEW)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 1 — LẤY BÁO GIÁ XEM TRƯỚC (POST /api/orders/quote)');
      console.log('====================================================');

      const quotePayload = {
        pickupAddress: { province: 'Hà Nội', district: 'Cầu Giấy' },
        deliveryAddress: { province: 'TP. Hồ Chí Minh', district: 'Quận 1' },
        items: [{ name: 'Laptop Gaming', quantity: 1, weight: 2.2 }], // 2.2 kg
        dimensions: { length: 40, width: 30, height: 10 }, // 40*30*10/5000 = 2.4 kg
        goodsValue: 15000000, // 15 triệu
        discountCode: 'FREESHIP15'
      };

      const quoteRes = await fetch(`${BASE_URL}/orders/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sellerToken}`
        },
        body: JSON.stringify(quotePayload)
      });
      const quoteData = await quoteRes.json();
      console.log(`   HTTP Status: ${quoteRes.status}`);
      console.log(`   Chargeable Weight: ${quoteData.data?.chargeableWeight} kg (Kỳ vọng max(2.2, 2.4) = 2.4kg -> làm tròn 2.5kg)`);
      console.log(`   Base Fee: ${quoteData.data?.baseFee} VNĐ`);
      console.log(`   Insurance Fee: ${quoteData.data?.insuranceFee} VNĐ`);
      console.log(`   Discount: ${quoteData.data?.discountAmount} VNĐ`);
      console.log(`   Final Fee: ${quoteData.data?.shippingFee} VNĐ`);

      if (quoteData.data?.chargeableWeight === 2.5) {
        console.log('✅ TEST 1 PASSED: Tính toán Chargeable Weight chuẩn (2.5 kg).');
      } else {
        console.log('❌ TEST 1 FAILED: Chargeable Weight chưa đúng.');
      }

      // ----------------------------------------------------
      // TEST 2: LUỒNG TẠO ĐƠN HÀNG CHÍNH (MAIN FLOW - HTTP 201)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 2 — LUỒNG TẠO ĐƠN CHÍNH (POST /api/orders)');
      console.log('====================================================');

      const idempotencyKey1 = `IDEM-TEST-${Date.now()}`;
      const orderPayload1 = {
        idempotencyKey: idempotencyKey1,
        pickupAddress: {
          fullName: 'Kho Hàng Hà Nội',
          phone: '0988888888',
          address: '123 Đường Cầu Giấy',
          ward: 'Dịch Vọng',
          district: 'Cầu Giấy',
          province: 'Hà Nội'
        },
        deliveryAddress: {
          fullName: 'Nguyen Van A',
          phone: '0977777777',
          address: '456 Đường Lê Lợi',
          ward: 'Bến Nghé',
          district: 'Quận 1',
          province: 'TP. Hồ Chí Minh'
        },
        items: [{ name: 'Áo sơ mi cao cấp', quantity: 2, weight: 0.3 }],
        dimensions: { length: 20, width: 15, height: 10 },
        codAmount: 500000,
        goodsValue: 1000000
      };

      const createRes1 = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sellerToken}`,
          'X-Idempotency-Key': idempotencyKey1
        },
        body: JSON.stringify(orderPayload1)
      });
      const createData1 = await createRes1.json();
      console.log(`   HTTP Status: ${createRes1.status}`);
      console.log(`   Tracking Code: ${createData1.trackingCode}`);
      console.log(`   Order Status: ${createData1.status}`);
      console.log(`   Shipping Fee: ${createData1.data?.shippingFee} VNĐ`);
      console.log(`   Print Label URL: ${createData1.printLabelUrl}`);

      // Kiểm tra xem OrderLog đã được tạo chưa
      const logsCount = await OrderLog.countDocuments({ orderId: createData1.data?._id });
      console.log(`   OrderLog Audit Count: ${logsCount}`);

      if (createRes1.status === 201 && createData1.trackingCode.startsWith('ELG') && logsCount === 1) {
        console.log('✅ TEST 2 PASSED: Đã tạo đơn thành công, sinh mã tracking và ghi OrderLog.');
      } else {
        console.log('❌ TEST 2 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 3: IDEMPOTENCY REPEAT REQUEST (HTTP 200)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 3 — GỬI LẠI REQUEST TRÙNG KEY IDEMPOTENCY (HTTP 200)');
      console.log('====================================================');

      const createResRepeat = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sellerToken}`,
          'X-Idempotency-Key': idempotencyKey1
        },
        body: JSON.stringify(orderPayload1)
      });
      const createDataRepeat = await createResRepeat.json();
      console.log(`   HTTP Status: ${createResRepeat.status}`);
      console.log(`   Tracking Code trùng khớp: ${createDataRepeat.trackingCode === createData1.trackingCode}`);

      if (createResRepeat.status === 200 && createDataRepeat.trackingCode === createData1.trackingCode) {
        console.log('✅ TEST 3 PASSED: Đã trả về HTTP 200 OK kèm mã đơn cũ (Cơ chế Idempotent).');
      } else {
        console.log('❌ TEST 3 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 4: RISK ENGINE & PENDING_VERIFICATION (HIGH COD > 10M)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 4 — RISK ENGINE & TRẠNG THÁI PENDING_VERIFICATION');
      console.log('====================================================');

      const highCodPayload = {
        pickupAddress: {
          fullName: 'Kho Hàng Hà Nội',
          phone: '0988888888',
          address: '123 Đường Cầu Giấy',
          ward: 'Dịch Vọng',
          district: 'Cầu Giấy',
          province: 'Hà Nội'
        },
        deliveryAddress: {
          fullName: 'Nguyen Van B',
          phone: '0966666666',
          address: '789 Đường Nguyễn Huệ',
          ward: 'Bến Nghé',
          district: 'Quận 1',
          province: 'TP. Hồ Chí Minh'
        },
        items: [{ name: 'Đồng hồ Thụy Sĩ', quantity: 1, weight: 0.5 }],
        codAmount: 15000000, // 15 triệu VND (> 10 triệu threshold)
        goodsValue: 15000000
      };

      const riskRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sellerToken}`
        },
        body: JSON.stringify(highCodPayload)
      });
      const riskData = await riskRes.json();
      console.log(`   HTTP Status: ${riskRes.status}`);
      console.log(`   Order Status: ${riskData.status}`);
      console.log(`   Flag COD Anomaly: ${riskData.data?.flagCodAnomaly}`);

      if (riskData.status === 'PENDING_VERIFICATION' && riskData.data?.flagCodAnomaly === true) {
        console.log('✅ TEST 4 PASSED: Risk Engine đã dán cờ cảnh báo và chuyển về PENDING_VERIFICATION.');
      } else {
        console.log('❌ TEST 4 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 5: OUTSIDE SERVICE AREA (HTTP 400)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 5 — OUTSIDE SERVICE AREA (HTTP 400)');
      console.log('====================================================');

      const invalidAddressPayload = {
        pickupAddress: {
          fullName: 'Kho Hàng Hà Nội',
          phone: '0988888888',
          address: '123 Đường Cầu Giấy',
          ward: 'Dịch Vọng',
          district: 'Cầu Giấy',
          province: 'HÀ NỘI'
        },
        deliveryAddress: {
          fullName: 'Nguyen Van C',
          phone: '0955555555',
          address: 'Island 123',
          ward: 'Unmapped Ward',
          district: 'Unmapped District',
          province: 'TỈNH UNKNOWN UNMAPPED'
        },
        items: [{ name: 'Item Test', quantity: 1, weight: 1.0 }]
      };

      const outRes = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sellerToken}`
        },
        body: JSON.stringify(invalidAddressPayload)
      });
      const outData = await outRes.json();
      console.log(`   HTTP Status: ${outRes.status}`);
      console.log(`   Message: ${outData.message}`);

      if (outRes.status === 400 || outData.data?.needsManualRouting === true) {
        console.log('✅ TEST 5 PASSED: Đã xử lý khu vực hoặc điều phối thành công.');
      } else {
        console.log('❌ TEST 5 FAILED.');
      }

    } catch (err) {
      console.error('❌ Lỗi trong quá trình chạy test UC-06:', err);
    } finally {
      server.close();
      await mongoose.disconnect();
      console.log('\n🏁 Đã hoàn thành UC-06 test suite và đóng kết nối.');
      process.exit(0);
    }
  });
}

runUC06TestSuite();
