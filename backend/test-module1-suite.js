require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');
const User = require('./src/models/user.model');

const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU CHẠY SUITE TEST THẬT CHO MODULE 1');
  console.log('====================================================\n');

  // 1. Kết nối DB và Lắng nghe Port
  const mongoURI = process.env.MONGODB_URI;
  await mongoose.connect(mongoURI);
  console.log('✅ MongoDB Connected.');

  const server = app.listen(PORT, async () => {
    console.log(`🚀 Test Server running on port ${PORT}\n`);

    try {
      // ----------------------------------------------------
      // TEST A: LOCK TAKE EFFECT (VÔ HIỆU HÓA PHIÊN NGAY LẬP TỨC)
      // ----------------------------------------------------
      console.log('====================================================');
      console.log('📌 TEST A — LOCK TAKE EFFECT');
      console.log('====================================================');

      const userAEmail = `victim_${Date.now()}@example.com`;
      const adminEmail = `admin_${Date.now()}@example.com`;
      const phoneA = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
      const phoneAdmin = `09${Math.floor(10000000 + Math.random() * 90000000)}`;

      // Step A.1: Đăng ký & Đăng nhập User A
      console.log(`[A.1] Đăng ký User thường (Victim): ${userAEmail}`);
      const regARes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'User Victim',
          email: userAEmail,
          phoneNumber: phoneA,
          password: 'password123',
          confirmPassword: 'password123'
        })
      });
      const regAData = await regARes.json();
      const userAToken = regAData.accessToken;
      const userAId = regAData._id;
      console.log(`   User A ID: ${userAId}`);
      console.log(`   User A AccessToken: ${userAToken.substring(0, 25)}...`);

      // Verify User A Profile before lock
      const profBeforeRes = await fetch(`${BASE_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${userAToken}` }
      });
      console.log(`   [Before Lock] User A GET /profile Status: ${profBeforeRes.status}`);

      // Step A.2: Đăng ký & Nâng quyền Admin
      console.log(`\n[A.2] Tạo tài khoản Admin: ${adminEmail}`);
      const regAdminRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Admin User',
          email: adminEmail,
          phoneNumber: phoneAdmin,
          password: 'password123',
          confirmPassword: 'password123'
        })
      });
      const regAdminData = await regAdminRes.json();
      // Set role ADMIN trực tiếp trong DB cho test admin
      await User.findByIdAndUpdate(regAdminData._id, { role: 'ADMIN' });
      
      // Login lại Admin để nhận token có role ADMIN
      const loginAdminRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: adminEmail, password: 'password123' })
      });
      const loginAdminData = await loginAdminRes.json();
      const adminToken = loginAdminData.accessToken;
      console.log(`   Admin AccessToken: ${adminToken.substring(0, 25)}...`);

      // Step A.3: Admin thực hiện KHÓA User A
      console.log(`\n[A.3] Admin gọi API khóa User A (PATCH /api/admin/users/${userAId}/status)...`);
      const lockRes = await fetch(`${BASE_URL}/admin/users/${userAId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ action: 'lock' })
      });
      const lockData = await lockRes.json();
      console.log(`   Admin Lock Status Code: ${lockRes.status}`);
      console.log(`   Admin Lock Response Body:`, JSON.stringify(lockData, null, 2));

      // Step A.4: User A gọi GET /profile ngay lập tức với token cũ
      console.log(`\n[A.4] User A dùng accessToken cũ gọi GET /api/auth/profile ngay lập tức...`);
      const profAfterRes = await fetch(`${BASE_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${userAToken}` }
      });
      const profAfterData = await profAfterRes.json();
      console.log(`👉 KẾT QUẢ KỲ VỌNG: HTTP 403 (Hoặc 401)`);
      console.log(`   HTTP Status Code Thật: ${profAfterRes.status}`);
      console.log(`   Response Body Thật:`, JSON.stringify(profAfterData, null, 2));

      // ----------------------------------------------------
      // TEST B: RACE CONDITION ĐĂNG KÝ
      // ----------------------------------------------------
      console.log('\n====================================================');
      console.log('📌 TEST B — RACE CONDITION ĐĂNG KÝ (PROMISE.ALL)');
      console.log('====================================================');

      const raceEmail = `race_user_${Date.now()}@example.com`;
      const racePhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
      
      const payload = {
        fullName: 'Race Condition User',
        email: raceEmail,
        phoneNumber: racePhone,
        password: 'password123',
        confirmPassword: 'password123'
      };

      console.log(`[B.1] Gửi đồng thời 2 Request Đăng Ký giống hệt nhau bằng Promise.all...`);
      console.log(`   Target Email: ${raceEmail}`);
      console.log(`   Target Phone: ${racePhone}`);

      const req1 = fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const req2 = fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const [res1, res2] = await Promise.all([req1, req2]);
      const data1 = await res1.json();
      const data2 = await res2.json();

      console.log('\n--- LOG RESPONSE REQUEST 1 ---');
      console.log(`HTTP Status: ${res1.status}`);
      console.log(`Response Body:`, JSON.stringify(data1, null, 2));

      console.log('\n--- LOG RESPONSE REQUEST 2 ---');
      console.log(`HTTP Status: ${res2.status}`);
      console.log(`Response Body:`, JSON.stringify(data2, null, 2));

      // Kiểm tra MongoDB
      const countInDB = await User.countDocuments({ email: raceEmail });
      console.log(`\n👉 KIỂM TRA MONGODB:`);
      console.log(`   Số lượng record được tạo trong DB với email '${raceEmail}': ${countInDB}`);
      if (countInDB === 1) {
        console.log(`✅ THÀNH CÔNG: Cơ chế chống Race Condition / Unique Index MongoDB hoạt động chuẩn (Chỉ 1 record được tạo).`);
      } else {
        console.log(`❌ THẤT BẠI: Phát hiện trùng lặp (${countInDB} records).`);
      }

    } catch (err) {
      console.error('❌ Lỗi trong quá trình chạy test:', err);
    } finally {
      server.close();
      await mongoose.disconnect();
      console.log('\n🏁 Đã hoàn thành test suite và đóng kết nối.');
      process.exit(0);
    }
  });
}

runTestSuite();
