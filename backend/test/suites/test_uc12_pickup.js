require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/user.model');
const Order = require('../../src/models/order.model');
const OrderLog = require('../../src/models/orderLog.model');
const PickupConfirmation = require('../../src/models/pickupConfirmation.model');

const PORT = 5088;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function runUC12TestSuite() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU CHẠY TEST SUITE CHO UC-12 (XÁC NHẬN LẤY HÀNG)');
  console.log('====================================================\n');

  const mongoURI = process.env.MONGODB_URI;
  await mongoose.connect(mongoURI);
  console.log('✅ MongoDB Connected.');

  const server = app.listen(PORT, async () => {
    console.log(`🚀 Test Server running on port ${PORT}\n`);

    try {
      // 0. Khởi tạo tài khoản Seller & Shipper trực tiếp trong CSDL
      const sellerEmail = `seller_uc12_${Date.now()}@example.com`;
      const shipperEmail = `shipper_uc12_${Date.now()}@example.com`;

      const sellerUser = new User({
        fullName: 'Seller UC12 Kho',
        email: sellerEmail,
        phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password123!',
        role: 'SELLER',
        isActive: true
      });
      await sellerUser.save();

      const shipperUser = new User({
        fullName: 'Shipper First Mile UC12',
        email: shipperEmail,
        phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password123!',
        role: 'DRIVER',
        isActive: true
      });
      await shipperUser.save();

      const loginSellerRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: sellerEmail, password: 'Password123!' })
      });
      const loginSellerData = await loginSellerRes.json();
      const tokenSeller = loginSellerData.accessToken;

      const loginShipperRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: shipperEmail, password: 'Password123!' })
      });
      const loginShipperData = await loginShipperRes.json();
      const tokenShipper = loginShipperData.accessToken;

      console.log(`🔑 Seller Token: ${tokenSeller ? 'OK' : 'FAIL'}`);
      console.log(`🔑 Shipper Token: ${tokenShipper ? 'OK' : 'FAIL'}\n`);

      // Helper function tạo đơn hàng mẫu
      const createOrder = async (weight = 1.0) => {
        const res = await fetch(`${BASE_URL}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenSeller}`
          },
          body: JSON.stringify({
            pickupAddress: {
              fullName: 'Kho Seller UC12',
              phone: '0911223344',
              address: '123 Nguyen Trai',
              ward: 'Thanh Xuan Trung',
              district: 'Thanh Xuan',
              province: 'Hà Nội'
            },
            deliveryAddress: {
              fullName: 'Nguyen Van Recipient UC12',
              phone: '0988776655',
              address: '456 Le Duan',
              ward: 'Ben Nghe',
              district: 'Quận 1',
              province: 'TP. Hồ Chí Minh'
            },
            items: [{ name: 'Sản phẩm Test UC12', quantity: 2, weight }],
            actualWeight: weight,
            dimensions: { length: 15, width: 10, height: 10 },
            codAmount: 200000
          })
        });
        const data = await res.json();
        if (!data.success) {
          console.error('⚠️ [createOrder Error]:', data);
        }
        return data.data;
      };

      // ----------------------------------------------------
      // TEST 1 — LUỒNG CHÍNH: XÁC NHẬN LẤY HÀNG THÀNH CÔNG (MAIN FLOW)
      // ----------------------------------------------------
      console.log('====================================================');
      console.log('📌 TEST 1 — MAIN FLOW: XÁC NHẬN LẤY HÀNG THÀNH CÔNG');
      console.log('====================================================');

      const order1 = await createOrder(1.5);
      console.log(`📦 Created Order 1 ID: ${order1._id}, TrackingCode: ${order1.trackingCode}`);

      const confirmRes1 = await fetch(`${BASE_URL}/orders/shipper/${order1._id}/confirm-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenShipper}`
        },
        body: JSON.stringify({
          trackingCode: order1.trackingCode,
          signatureImageUrl: 'https://cdn.e-logistic.vn/signatures/sig_001.png',
          proofPhotoUrls: ['https://cdn.e-logistic.vn/proofs/photo_001.jpg'],
          gpsLat: 21.0012,
          gpsLng: 105.8123
        })
      });
      const confirmData1 = await confirmRes1.json();
      console.log(`   HTTP Status: ${confirmRes1.status}`);
      console.log(`   Message: ${confirmData1.message}`);
      console.log(`   Updated Order Status: ${confirmData1.order?.status}`);

      const confRecord1 = await PickupConfirmation.findOne({ orderId: order1._id });
      const logRecord1 = await OrderLog.findOne({ orderId: order1._id, actionType: 'PICKED_UP' });

      if (confirmRes1.status === 200 && confirmData1.order?.status === 'PICKED_UP' && confRecord1 && logRecord1) {
        console.log('✅ TEST 1 PASSED: Xác nhận lấy hàng thành công, tạo ePOH và Audit Log.');
      } else {
        console.log('❌ TEST 1 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 2 — LUỒNG THAY THẾ 5.1: NHẬP MÃ THỦ CÔNG KHI QR MỜ/RÁCH
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 2 — ALT FLOW 5.1: NHẬP MÃ MÃ VẬN ĐƠN THỦ CÔNG');
      console.log('====================================================');

      const order2 = await createOrder(1.0);

      const confirmRes2 = await fetch(`${BASE_URL}/orders/shipper/${order2._id}/confirm-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenShipper}`
        },
        body: JSON.stringify({
          trackingCode: order2.trackingCode, // Nhập tay mã khớp
          signatureImageUrl: 'https://cdn.e-logistic.vn/signatures/sig_manual.png',
          gpsLat: 21.0050,
          gpsLng: 105.8150
        })
      });
      const confirmData2 = await confirmRes2.json();
      console.log(`   HTTP Status: ${confirmRes2.status}`);
      console.log(`   Updated Order Status: ${confirmData2.order?.status}`);

      if (confirmRes2.status === 200 && confirmData2.order?.status === 'PICKED_UP') {
        console.log('✅ TEST 2 PASSED: Xác nhận lấy hàng bằng nhập mã thủ công thành công.');
      } else {
        console.log('❌ TEST 2 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 3 — LUỒNG THAY THẾ 8.1: CHÊNH LỆCH KHỐI LƯỢNG & TÍNH PHỤ THU
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 3 — ALT FLOW 8.1: CHÊNH LỆCH KHỐI LƯỢNG & PHỤ THU CƯỚC');
      console.log('====================================================');

      const order3 = await createOrder(1.0); // Khai báo 1.0kg

      const confirmRes3 = await fetch(`${BASE_URL}/orders/shipper/${order3._id}/confirm-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenShipper}`
        },
        body: JSON.stringify({
          trackingCode: order3.trackingCode,
          signatureImageUrl: 'https://cdn.e-logistic.vn/signatures/sig_weight.png',
          parcelImageUrl: 'https://cdn.e-logistic.vn/proof/parcel_proof_03.jpg',
          actualWeight: 3.0, // Cân thực tế 3.0kg (> 1.0kg)
          gpsLat: 21.0020,
          gpsLng: 105.8130
        })
      });
      const confirmData3 = await confirmRes3.json();
      console.log(`   HTTP Status: ${confirmRes3.status}`);
      console.log(`   New Actual Weight: ${confirmData3.order?.actualWeight} kg`);
      console.log(`   New Shipping Fee: ${confirmData3.order?.shippingFee} VNĐ`);

      const confRecord3 = await PickupConfirmation.findOne({ orderId: order3._id });
      console.log(`   Weight Discrepancy Flag: ${confRecord3?.weightDiscrepancy}`);
      console.log(`   Surcharge Fee: ${confRecord3?.surchargeFee} VNĐ`);

      if (confirmRes3.status === 200 && confRecord3?.weightDiscrepancy === true && confRecord3?.surchargeFee > 0) {
        console.log('✅ TEST 3 PASSED: Đã ghi nhận chênh lệch khối lượng và tính phụ thu cước.');
      } else {
        console.log('❌ TEST 3 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 4 — LUỒNG NGOẠI LỆ 7.1: QUÉT SAI MÃ VẬN ĐƠN (MISMATCH)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 4 — EXCEPTION FLOW 7.1: QUÉT SAI MÃ VẬN ĐƠN -> HTTP 400');
      console.log('====================================================');

      const order4 = await createOrder(1.0);

      const confirmRes4 = await fetch(`${BASE_URL}/orders/shipper/${order4._id}/confirm-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenShipper}`
        },
        body: JSON.stringify({
          trackingCode: 'WRONG-TRACKING-CODE-999',
          signatureImageUrl: 'https://cdn.e-logistic.vn/signatures/sig_test.png'
        })
      });
      const confirmData4 = await confirmRes4.json();
      console.log(`   HTTP Status: ${confirmRes4.status}`);
      console.log(`   Error Message: ${confirmData4.message}`);

      if (confirmRes4.status === 400 && confirmData4.message.includes('không khớp')) {
        console.log('✅ TEST 4 PASSED: Chặn thành công khi mã vận đơn quét bị sai (HTTP 400 Bad Request).');
      } else {
        console.log('❌ TEST 4 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 5 — LUỒNG NGOẠI LỆ 9.1: MẤT GPS -> ĐÁNH DẤU GPS MISSING
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 5 — EXCEPTION FLOW 9.1: MẤT GPS KHI XÁC NHẬN LẤY HÀNG');
      console.log('====================================================');

      const order5 = await createOrder(1.0);

      const confirmRes5 = await fetch(`${BASE_URL}/orders/shipper/${order5._id}/confirm-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenShipper}`
        },
        body: JSON.stringify({
          trackingCode: order5.trackingCode,
          signatureImageUrl: 'https://cdn.e-logistic.vn/signatures/sig_no_gps.png',
          gpsLat: null,
          gpsLng: null
        })
      });
      const confirmData5 = await confirmRes5.json();
      const confRecord5 = await PickupConfirmation.findOne({ orderId: order5._id });
      console.log(`   HTTP Status: ${confirmRes5.status}`);
      console.log(`   gpsMissing Flag: ${confRecord5?.gpsMissing}`);

      if (confirmRes5.status === 200 && confRecord5?.gpsMissing === true) {
        console.log('✅ TEST 5 PASSED: Xác nhận thành công khi mất GPS và đánh dấu gpsMissing=true.');
      } else {
        console.log('❌ TEST 5 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 6 — LUỒNG NGOẠI LỆ 10: THIẾU CHỮ KÝ SELLER -> HTTP 400
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 6 — EXCEPTION FLOW 10: THIẾU CHỮ KÝ SELLER -> HTTP 400');
      console.log('====================================================');

      const order6 = await createOrder(1.0);

      const confirmRes6 = await fetch(`${BASE_URL}/orders/shipper/${order6._id}/confirm-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenShipper}`
        },
        body: JSON.stringify({
          trackingCode: order6.trackingCode,
          signatureImageUrl: '', // Trống chữ ký
          gpsLat: 21.0010,
          gpsLng: 105.8110
        })
      });
      const confirmData6 = await confirmRes6.json();
      console.log(`   HTTP Status: ${confirmRes6.status}`);
      console.log(`   Error Message: ${confirmData6.message}`);

      if (confirmRes6.status === 400 && confirmData6.message.includes('chữ ký')) {
        console.log('✅ TEST 6 PASSED: Yêu cầu bắt buộc chữ ký Seller thành công (HTTP 400).');
      } else {
        console.log('❌ TEST 6 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 7 — LUỒNG NGOẠI LỆ 11.1: MẤT MẠNG VÀ GỬI LẠI (IDEMPOTENCY CLIENT OFFLINE ID)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 7 — EXCEPTION FLOW 11.1: IDEMPOTENCY CLIENT OFFLINE QUEUE');
      console.log('====================================================');

      const order7 = await createOrder(1.0);
      const offlineId = `OFFLINE_SYNC_${Date.now()}`;

      // Request 1: Gửi lần đầu từ offline queue
      const confirmRes7a = await fetch(`${BASE_URL}/orders/shipper/${order7._id}/confirm-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenShipper}`
        },
        body: JSON.stringify({
          trackingCode: order7.trackingCode,
          signatureImageUrl: 'https://cdn.e-logistic.vn/signatures/sig_offline.png',
          clientOfflineId: offlineId
        })
      });
      const data7a = await confirmRes7a.json();

      // Request 2: Gửi lặp lại cùng clientOfflineId
      const confirmRes7b = await fetch(`${BASE_URL}/orders/shipper/${order7._id}/confirm-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenShipper}`
        },
        body: JSON.stringify({
          trackingCode: order7.trackingCode,
          signatureImageUrl: 'https://cdn.e-logistic.vn/signatures/sig_offline.png',
          clientOfflineId: offlineId
        })
      });
      const data7b = await confirmRes7b.json();

      console.log(`   Req 1 Status: ${confirmRes7a.status}`);
      console.log(`   Req 2 Status: ${confirmRes7b.status}, Message: ${data7b.message}`);

      const totalConfs = await PickupConfirmation.countDocuments({ clientOfflineId: offlineId });

      if (confirmRes7a.status === 200 && confirmRes7b.status === 200 && totalConfs === 1) {
        console.log('✅ TEST 7 PASSED: Idempotency ngăn chặn ghi trùng bản ghi khi đồng bộ offline.');
      } else {
        console.log('❌ TEST 7 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 8 — LUỒNG NGOẠI LỆ 10.1: GHI NHẬN LẤY HÀNG THẤT BẠI (PICKUP FAILED)
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 8 — EXCEPTION FLOW 10.1: GHI NHẬN LẤY HÀNG THẤT BẠI');
      console.log('====================================================');

      const order8 = await createOrder(1.0);

      const failRes8 = await fetch(`${BASE_URL}/orders/shipper/${order8._id}/pickup-failed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenShipper}`
        },
        body: JSON.stringify({
          reason: 'SELLER_REFUSED_SIGNATURE',
          note: 'Seller không chịu ký biên bản bàn giao điện tử'
        })
      });
      const failData8 = await failRes8.json();
      console.log(`   HTTP Status: ${failRes8.status}`);
      console.log(`   Updated Order Status: ${failData8.order?.status}`);
      console.log(`   Fail Reason: ${failData8.order?.pickupFailReason}`);

      const logRecord8 = await OrderLog.findOne({ orderId: order8._id, actionType: 'PICKUP_FAILED' });

      if (failRes8.status === 200 && failData8.order?.status === 'PICKUP_FAILED' && logRecord8) {
        console.log('✅ TEST 8 PASSED: Ghi nhận lấy hàng thất bại và lưu Audit Log thành công.');
      } else {
        console.log('❌ TEST 8 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 9 — STATE MACHINE GUARD (TC_UC12_11): ĐƠN ĐÃ BỊ HỦY -> HTTP 409
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 9 — STATE MACHINE GUARD (TC_UC12_11): ĐƠN HÀNG ĐÃ BỊ HỦY');
      console.log('====================================================');

      const order9 = await createOrder(1.0);
      await Order.findByIdAndUpdate(order9._id, { status: 'CANCELLED' });

      const confirmRes9 = await fetch(`${BASE_URL}/orders/shipper/${order9._id}/confirm-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenShipper}`
        },
        body: JSON.stringify({
          trackingCode: order9.trackingCode,
          signatureImageUrl: 'https://cdn.e-logistic.vn/signatures/sig_test9.png'
        })
      });
      const data9 = await confirmRes9.json();
      console.log(`   HTTP Status: ${confirmRes9.status}`);
      console.log(`   Error Message: ${data9.message}`);

      if (confirmRes9.status === 409) {
        console.log('✅ TEST 9 PASSED: Chặn thành công khi đơn hàng đã ở trạng thái CANCELLED (HTTP 409 Conflict).');
      } else {
        console.log('❌ TEST 9 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 10 — DRIVER ASSIGNMENT GUARD (TC_UC12_12): SAI TÀI XẾ -> HTTP 403
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 10 — DRIVER ASSIGNMENT GUARD (TC_UC12_12): LẤY NHẦM TUYẾN');
      console.log('====================================================');

      const otherDriverId = new mongoose.Types.ObjectId();
      const order10 = await createOrder(1.0);
      await Order.findByIdAndUpdate(order10._id, { assignedDriverId: otherDriverId });

      const confirmRes10 = await fetch(`${BASE_URL}/orders/shipper/${order10._id}/confirm-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenShipper}`
        },
        body: JSON.stringify({
          trackingCode: order10.trackingCode,
          signatureImageUrl: 'https://cdn.e-logistic.vn/signatures/sig_test10.png'
        })
      });
      const data10 = await confirmRes10.json();
      console.log(`   HTTP Status: ${confirmRes10.status}`);
      console.log(`   Error Message: ${data10.message}`);

      if (confirmRes10.status === 403) {
        console.log('✅ TEST 10 PASSED: Chặn tài xế lấy đơn của tuyến người khác (HTTP 403 Forbidden).');
      } else {
        console.log('❌ TEST 10 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 11 — VOLUMETRIC WEIGHT (TC_UC12_13): QUY ĐỔI THỂ TÍCH
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 11 — VOLUMETRIC WEIGHT (TC_UC12_13): TÍNH CƯỚC THỂ TÍCH');
      console.log('====================================================');

      const order11 = await createOrder(1.0);

      const confirmRes11 = await fetch(`${BASE_URL}/orders/shipper/${order11._id}/confirm-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenShipper}`
        },
        body: JSON.stringify({
          trackingCode: order11.trackingCode,
          signatureImageUrl: 'https://cdn.e-logistic.vn/signatures/sig_vol.png',
          parcelImageUrl: 'https://cdn.e-logistic.vn/proof/parcel_vol.jpg',
          actualWeight: 1.0,
          dimensions: { length: 50, width: 40, height: 30 } // 50*40*30/5000 = 12kg
        })
      });
      const data11 = await confirmRes11.json();
      console.log(`   HTTP Status: ${confirmRes11.status}`);
      console.log(`   Chargeable Weight: ${data11.order?.chargeableWeight} kg`);

      if (confirmRes11.status === 200 && data11.order?.chargeableWeight === 12) {
        console.log('✅ TEST 11 PASSED: Quy đổi thể tích 50x40x30cm -> 12kg Chargeable Weight thành công.');
      } else {
        console.log('❌ TEST 11 FAILED.');
      }

      // ----------------------------------------------------
      // TEST 12 — PARCEL PHOTO VALIDATION (TC_UC12_14): THIẾU ÁNH ĐỐI CHỨNG -> HTTP 422
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST 12 — PARCEL PHOTO VALIDATION (TC_UC12_14): THIẾU ẢNH KIỆN HÀNG');
      console.log('====================================================');

      const order12 = await createOrder(1.0);

      const confirmRes12 = await fetch(`${BASE_URL}/orders/shipper/${order12._id}/confirm-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenShipper}`
        },
        body: JSON.stringify({
          trackingCode: order12.trackingCode,
          signatureImageUrl: 'https://cdn.e-logistic.vn/signatures/sig_test12.png',
          actualWeight: 4.0 // Lệch cân nhưng KHÔNG gửi parcelImageUrl
        })
      });
      const data12 = await confirmRes12.json();
      console.log(`   HTTP Status: ${confirmRes12.status}`);
      console.log(`   Error Message: ${data12.message}`);

      if (confirmRes12.status === 422) {
        console.log('✅ TEST 12 PASSED: Bắt buộc ảnh chụp đối chứng khi có chênh lệch khối lượng (HTTP 422).');
      } else {
        console.log('❌ TEST 12 FAILED.');
      }

    } catch (err) {
      console.error('❌ Lỗi trong quá trình thực thi suite test UC-12:', err);
    } finally {
      server.close();
      await mongoose.disconnect();
      console.log('\n🏁 Complete UC-12 integration test suite execution.');
      process.exit(0);
    }
  });
}

runUC12TestSuite();
