require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user.model');

async function seedAndTestRoles() {
  console.log('====================================================');
  console.log('🌱 SEEDING TEST ACCOUNTS & TESTING ALL ROLES');
  console.log('====================================================\n');

  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/elogistic';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB.');

    const testUsers = [
      {
        fullName: 'Nguyễn Văn Quản Lý',
        email: 'admin@elogistic.vn',
        phoneNumber: '0901000001',
        password: 'password123',
        role: 'ADMIN',
        isActive: true,
      },
      {
        fullName: 'Lê Văn Tài Xế',
        email: 'driver@elogistic.vn',
        phoneNumber: '0901000002',
        password: 'password123',
        role: 'DRIVER',
        isActive: true,
      },
      {
        fullName: 'Trần Văn Thủ Kho',
        email: 'warehouse@elogistic.vn',
        phoneNumber: '0901000003',
        password: 'password123',
        role: 'HUB_STAFF',
        isActive: true,
      },
      {
        fullName: 'Phạm Văn Điều Phối',
        email: 'dispatcher@elogistic.vn',
        phoneNumber: '0901000004',
        password: 'password123',
        role: 'HUB_COORDINATOR',
        isActive: true,
      },
    ];

    for (const u of testUsers) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = new User(u);
        await user.save();
        console.log(`✨ Created new test user: ${u.email} [${u.role}]`);
      } else {
        user.role = u.role;
        user.isActive = u.isActive;
        user.password = u.password;
        await user.save();
        console.log(`🔄 Updated existing test user: ${u.email} [${u.role}]`);
      }
    }

    console.log('\n====================================================');
    console.log('🧪 TESTING LOGIN API FOR ALL CREATED ROLES');
    console.log('====================================================\n');

    const BASE_URL = 'http://localhost:5000/api';

    for (const u of testUsers) {
      console.log(`🔍 Testing login for: ${u.email} (${u.role})...`);
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: u.email,
          password: u.password,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        console.log(`   ✅ Status ${res.status}: OK`);
        console.log(`   👤 User ID: ${data._id}`);
        console.log(`   🎭 Role: ${data.role}`);
        console.log(`   🔑 Access Token: ${data.accessToken?.substring(0, 30)}...\n`);
      } else {
        console.log(`   ❌ Status ${res.status}: ${data.message}\n`);
      }
    }

  } catch (err) {
    console.error('❌ Error in seedAndTestRoles:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🏁 MongoDB Disconnected.');
    process.exit(0);
  }
}

seedAndTestRoles();
