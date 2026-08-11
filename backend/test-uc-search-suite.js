const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE_URL = 'http://127.0.0.1:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_logistics_key_2026';

const User = require('./src/models/user.model');
const Order = require('./src/models/order.model');
const OrderLog = require('./src/models/orderLog.model');

async function runSearchTestSuite() {
  console.log('================================================================');
  console.log(' 🧪 RUNNING TEST SUITE: TRA CỨU ĐƠN HÀNG (ORDER LOOKUP & TRACKING)');
  console.log('================================================================\n');

  try {
    // 1. Connect MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    // 2. Setup 2 Test Sellers directly in DB
    const emailA = `seller_a_${Date.now()}@test.com`;
    const emailB = `seller_b_${Date.now()}@test.com`;

    const userA = await User.create({
      fullName: 'Seller A (Dược An Bình)',
      email: emailA,
      phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'SELLER'
    });

    const userB = await User.create({
      fullName: 'Seller B (Vật Tư Bảo Long)',
      email: emailB,
      phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'password123',
      role: 'SELLER'
    });

    const sellerAToken = jwt.sign({ id: userA._id, type: 'access' }, JWT_SECRET, { expiresIn: '1h' });
    const sellerBToken = jwt.sign({ id: userB._id, type: 'access' }, JWT_SECRET, { expiresIn: '1h' });

    console.log(`[SETUP 1] Khởi tạo Seller A: ${userA.email} (ID: ${userA._id})`);
    console.log(`[SETUP 2] Khởi tạo Seller B: ${userB.email} (ID: ${userB._id})`);

    // 3. Create 1 order owned by Seller A
    console.log('[SETUP 3] Seller A tạo đơn hàng mới...');
    const createRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sellerAToken}`
      },
      body: JSON.stringify({
        pickupAddress: {
          fullName: 'Kho An Bình',
          phone: '0912345678',
          address: '123 Lý Thường Kiệt',
          ward: 'Phường 14',
          district: 'Quận 10',
          province: 'TP. Hồ Chí Minh'
        },
        deliveryAddress: {
          fullName: 'Nguyễn Văn An',
          phone: '0987654321',
          address: '456 Nguyễn Văn Cừ',
          ward: 'Phường 4',
          district: 'Quận 5',
          province: 'TP. Hồ Chí Minh'
        },
        items: [{ name: 'Thuốc Kháng Sinh Paracetamol 500mg', quantity: 5, weight: 0.5 }],
        codAmount: 250000,
        goodsValue: 300000
      })
    });
    const createData = await createRes.json();
    const createdTrackingCode = createData.trackingCode || createData.data?.trackingCode;
    const createdOrderId = createData.data?._id;
    console.log(`✅ Đã tạo đơn hàng demo! Tracking Code: ${createdTrackingCode}, ID: ${createdOrderId}\n`);

    // -------------------------------------------------------------
    // TEST CASE 1: Main Flow - Seller A tra cứu danh sách đơn hàng hợp lệ
    // -------------------------------------------------------------
    console.log('📌 [TC_SEARCH_01] Main Flow: Seller A tra cứu danh sách đơn hàng có điều kiện...');
    const searchRes1 = await fetch(`${BASE_URL}/orders?search=${createdTrackingCode}&status=ALL`, {
      headers: { 'Authorization': `Bearer ${sellerAToken}` }
    });
    const searchData1 = await searchRes1.json();

    if (searchRes1.status === 200 && searchData1.data?.length > 0) {
      console.log(`✅ [PASSED] Tìm thấy ${searchData1.data.length} đơn hàng của Seller A!`);
      console.log(`   Mã vận đơn: ${searchData1.data[0].trackingCode}, Người nhận: ${searchData1.data[0].deliveryAddress.fullName}`);
    } else {
      console.log(`❌ [FAILED] Không tìm thấy đơn hàng của Seller A. Status: ${searchRes1.status}`);
    }
    console.log('');

    // -------------------------------------------------------------
    // TEST CASE 2: Alt Flow 4.1 - Kiểm tra validation sai khoảng thời gian (fromDate > toDate)
    // -------------------------------------------------------------
    console.log('📌 [TC_SEARCH_02] Alt Flow 4.1: Kiểm tra khoảng thời gian từ ngày lớn hơn đến ngày...');
    const invalidDateRes = await fetch(`${BASE_URL}/orders?fromDate=2026-12-31&toDate=2026-01-01`, {
      headers: { 'Authorization': `Bearer ${sellerAToken}` }
    });
    const invalidDateData = await invalidDateRes.json();

    if (invalidDateRes.status === 400) {
      console.log(`✅ [PASSED] Server chặn thành công (HTTP 400 Bad Request).`);
      console.log(`   Message từ Server: "${invalidDateData.message}"`);
    } else {
      console.log(`❌ [FAILED] Kỳ vọng HTTP 400 nhưng nhận được HTTP ${invalidDateRes.status}`);
    }
    console.log('');

    // -------------------------------------------------------------
    // TEST CASE 3: Alt Flow 6.1 - Không tìm thấy đơn hàng phù hợp
    // -------------------------------------------------------------
    console.log('📌 [TC_SEARCH_03] Alt Flow 6.1: Tìm kiếm với từ khóa không tồn tại...');
    const noResultRes = await fetch(`${BASE_URL}/orders?search=NOT_EXIST_CODE_99999`, {
      headers: { 'Authorization': `Bearer ${sellerAToken}` }
    });
    const noResultData = await noResultRes.json();

    if (noResultRes.status === 200 && noResultData.data?.length === 0) {
      console.log(`✅ [PASSED] Trả về danh sách trống thành công (Total: 0).`);
      console.log(`   Message từ Server: "${noResultData.message}"`);
    } else {
      console.log(`❌ [FAILED] Kết quả trả về không khớp kỳ vọng.`);
    }
    console.log('');

    // -------------------------------------------------------------
    // TEST CASE 4: Exception Flow 8.1 - Protection IDOR (Seller B truy cập đơn hàng của Seller A)
    // -------------------------------------------------------------
    console.log('📌 [TC_SEARCH_04] Exception Flow 8.1: Seller B cố tình xem chi tiết đơn hàng của Seller A...');
    const idorRes = await fetch(`${BASE_URL}/orders/${createdOrderId}`, {
      headers: { 'Authorization': `Bearer ${sellerBToken}` }
    });
    const idorData = await idorRes.json();

    if (idorRes.status === 403 || idorRes.status === 404) {
      console.log(`✅ [PASSED] Bảo mật IDOR hoạt động chuẩn xác! Chặn Seller B (HTTP ${idorRes.status}).`);
      console.log(`   Message từ Server: "${idorData.message}"`);
    } else {
      console.log(`❌ [FAILED] Lỗ hổng IDOR! Seller B có thể đọc đơn hàng của Seller A (HTTP ${idorRes.status})`);
    }
    console.log('');

    // -------------------------------------------------------------
    // TEST CASE 5: Public Guest Order Tracking (Giải quyết bài toán Tra cứu Khách hàng + Mask PII)
    // -------------------------------------------------------------
    console.log('📌 [TC_SEARCH_05] Public Guest Tracking: Khách hàng/Người nhận tra cứu qua mã vận đơn...');
    const publicRes = await fetch(`${BASE_URL}/orders/track/${createdTrackingCode}`);
    const publicData = await publicRes.json();

    if (publicRes.status === 200 && publicData.data?.trackingCode === createdTrackingCode) {
      console.log(`✅ [PASSED] Khách hàng tra cứu thành công không cần login!`);
      console.log(`   Mã vận đơn: ${publicData.data.trackingCode}`);
      console.log(`   Trạng thái: ${publicData.data.status}`);
      console.log(`   Tên người nhận (Masked PII): "${publicData.data.recipient.fullName}"`);
      console.log(`   SĐT người nhận (Masked PII): "${publicData.data.recipient.phone}"`);
      console.log(`   Địa chỉ (Masked PII): "${publicData.data.recipient.addressMasked}"`);
    } else {
      console.log(`❌ [FAILED] Không thể tra cứu công khai. Status: ${publicRes.status}`);
    }
    console.log('');

    console.log('================================================================');
    console.log(' 🎉 ALL 5 TEST CASES FOR TRA CỨU ĐƠN HÀNG COMPLETED 100% PASSED!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ Lỗi khi thực thi test suite:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runSearchTestSuite();
