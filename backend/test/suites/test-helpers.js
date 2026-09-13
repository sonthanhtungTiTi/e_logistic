require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../../src/models/user.model');
const Hub = require('../../src/models/hub.model');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic';
    await mongoose.connect(uri);
  }
}

async function api(method, endpoint, body = null, token = null, customHeaders = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...customHeaders };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, options);
    let data;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, ok: res.ok, body: data };
  } catch (err) {
    return { status: 500, ok: false, error: err.message };
  }
}

function createTestLogger(suiteName) {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failures = [];

  console.log('══════════════════════════════════════════════════════════════════════');
  console.log(`🧪 BẮT ĐẦU KIỂM THỬ: ${suiteName.toUpperCase()}`);
  console.log('══════════════════════════════════════════════════════════════════════\n');

  function logStep(stepNum, title) {
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`📌 [BƯỚC ${stepNum}] ${title}`);
    console.log(`----------------------------------------------------------------------`);
  }

  function expect(condition, description, detail = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${description} ${detail ? `(${detail})` : ''}`);
    } else {
      failedTests++;
      const msg = `❌ FAIL: ${description} ${detail ? `(${detail})` : ''}`;
      console.log(`  ${msg}`);
      failures.push({ description, detail });
    }
  }

  function summarize() {
    console.log('\n======================================================================');
    console.log(`📊 TỔNG KẾT BỘ TEST: ${suiteName}`);
    console.log(`   ├─ Tổng số kịch bản: ${totalTests}`);
    console.log(`   ├─ Thành công (PASS): ${passedTests}`);
    console.log(`   ├─ Thất bại (FAIL):   ${failedTests}`);
    console.log(`   └─ Tỷ lệ đạt:        ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);
    if (failedTests > 0) {
      console.log('\n🚨 Danh sách kịch bản thất bại:');
      failures.forEach((f, idx) => console.log(`   ${idx + 1}. ${f.description} - ${f.detail}`));
    }
    console.log('======================================================================\n');
    return { totalTests, passedTests, failedTests, success: failedTests === 0 };
  }

  return { logStep, expect, summarize };
}

async function getOrCreateUser(email, role, hubId = null, fullName = 'Test User') {
  let u = await User.findOne({ email });
  if (!u) {
    u = new User({
      fullName,
      email,
      phoneNumber: '09' + Math.floor(10000000 + Math.random() * 90000000),
      password: 'Password123@', // Plain text to trigger pre('save') correctly
      role,
      hubId,
      isActive: true,
      kycStatus: 'APPROVED',
      kycVerified: true,
    });
    await u.save();
  } else {
    u.role = role;
    if (hubId) u.hubId = hubId;
    u.password = 'Password123@';
    u.isActive = true;
    u.kycStatus = 'APPROVED';
    u.kycVerified = true;
    await u.save();
  }
  return u;
}

async function setupTestEntities() {
  await connectDB();

  const SystemConfig = require('../../src/models/systemConfig.model');
  await SystemConfig.findOneAndUpdate(
    { key: 'MIN_MINUTES_BETWEEN_FAILURE_REPORTS' },
    { key: 'MIN_MINUTES_BETWEEN_FAILURE_REPORTS', value: 0 },
    { upsert: true }
  );

  // Ensure Hubs
  let hubHN = await Hub.findOne({ code: 'HUB_HAN_01' });
  if (!hubHN) {
    hubHN = await Hub.create({
      code: 'HUB_HAN_01',
      name: 'Bưu cục Trung tâm Hà Nội',
      type: 'HYBRID',
      province: 'Hà Nội',
      district: 'Hoàn Kiếm',
      ward: 'Tràng Tiền',
      address: '1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
      isActive: true,
    });
  }

  let hubHCM = await Hub.findOne({ code: 'HUB_SGN_01' });
  if (!hubHCM) {
    hubHCM = await Hub.create({
      code: 'HUB_SGN_01',
      name: 'Bưu cục Trung tâm TP. Hồ Chí Minh',
      type: 'HYBRID',
      province: 'TP Hồ Chí Minh',
      district: 'Quận 1',
      ward: 'Bến Nghé',
      address: '88 Lê Duẩn, Bến Nghé, Quận 1, TP Hồ Chí Minh',
      isActive: true,
    });
  }

  // Ensure Users
  const seller = await getOrCreateUser('seller.demo@elogistic.vn', 'SELLER', null, 'Shop Dược An Bình (Seller)');
  const shipperPickup = await getOrCreateUser('shipper.pickup@elogistic.vn', 'DRIVER', hubHN._id, 'Shipper Gom Hà Nội');
  const shipperDelivery = await getOrCreateUser('shipper.delivery@elogistic.vn', 'DRIVER', hubHCM._id, 'Shipper Giao HCM');
  const linehaulDriver = await getOrCreateUser('driver.linehaul@elogistic.vn', 'DRIVER', hubHN._id, 'Tài xế Xe Trục HN-HCM');
  const staffHN = await getOrCreateUser('staff.hub.hn@elogistic.vn', 'HUB_STAFF', hubHN._id, 'Nhân viên Kho Hà Nội');
  const staffHCM = await getOrCreateUser('staff.hub.hcm@elogistic.vn', 'HUB_STAFF', hubHCM._id, 'Nhân viên Kho TP.HCM');
  const admin = await getOrCreateUser('admin.demo@elogistic.vn', 'ADMIN', null, 'Quản Trị Viên Hệ Thống');

  // Clean up previous test orders for test seller to prevent HIGH_ORDER_VELOCITY
  const Order = require('../../src/models/order.model');
  await Order.deleteMany({ sellerId: seller._id });

  // Login & get JWTs
  async function login(email) {
    const res = await api('POST', '/auth/login', { identifier: email, password: 'Password123@' });
    if (res.status !== 200) {
      throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
    }
    return res.body.accessToken;
  }

  const tokens = {
    seller: await login('seller.demo@elogistic.vn'),
    shipperPickup: await login('shipper.pickup@elogistic.vn'),
    shipperDelivery: await login('shipper.delivery@elogistic.vn'),
    linehaulDriver: await login('driver.linehaul@elogistic.vn'),
    staffHN: await login('staff.hub.hn@elogistic.vn'),
    staffHCM: await login('staff.hub.hcm@elogistic.vn'),
    admin: await login('admin.demo@elogistic.vn'),
  };

  return {
    hubs: { HN: hubHN, HCM: hubHCM },
    users: { seller, shipperPickup, shipperDelivery, linehaulDriver, staffHN, staffHCM, admin },
    tokens,
  };
}

module.exports = {
  BASE_URL,
  connectDB,
  api,
  createTestLogger,
  setupTestEntities,
};
