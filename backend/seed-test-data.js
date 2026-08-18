/**
 * SEED SCRIPT — Module 4 Test Data
 * Chạy: cd backend && node seed-test-data.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/e_logistic')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1); });


const User  = require('./src/models/user.model');
const Hub   = require('./src/models/hub.model');
const Order = require('./src/models/order.model');
let Trip;
try { Trip = require('./src/models/trip.model'); }
catch(e) { console.warn('⚠️  trip.model.js không tìm thấy:', e.message); }

const ADDR = {
  fullName: 'Nguyễn Văn Test', phone: '0901234567',
  address: '123 Điện Biên Phủ', ward: 'Phường 15',
  district: 'Bình Thạnh', province: 'TP. Hồ Chí Minh',
};

async function main() {
  console.log('\n🧹 Xóa dữ liệu seed cũ...');
  await User.deleteMany({ email: /@test\.local$/ });
  await Hub.deleteMany({ code: /^TEST-/ });

  console.log('🏭 Tạo Hub test...');
  const hub = await Hub.create({
    code: 'TEST-HCM-01', name: 'Kho Test TP.HCM',
    address: '456 Lê Văn Sỹ', district: 'Quận 3',
    province: 'TP. Hồ Chí Minh', type: 'MIXED', isActive: true,
  });
  console.log(`  → Hub: ${hub.code} | _id: ${hub._id}`);

  console.log('👤 Tạo User test...');
  const pw = 'Test@123456'; // userSchema.pre('save') sẽ tự động hash, không cần tự hash ở đây
  const [staffUser, coordinatorUser, driverUser, adminUser, sellerUser] = await Promise.all([
    User.create({ fullName: 'Nhân Viên Kho Test', email: 'staff@test.local', phoneNumber: '0911000001', password: pw, role: 'HUB_STAFF', hubId: hub._id, isActive: true }),
    User.create({ fullName: 'Điều Phối Kho Test', email: 'coordinator@test.local', phoneNumber: '0911000002', password: pw, role: 'HUB_COORDINATOR', hubId: hub._id, isActive: true }),
    User.create({ fullName: 'Tài Xế Test', email: 'driver@test.local', phoneNumber: '0911000003', password: pw, role: 'DRIVER', hubId: hub._id, isActive: true }),
    User.create({ fullName: 'Admin Test', email: 'admin@test.local', phoneNumber: '0911000004', password: pw, role: 'ADMIN', isActive: true }),
    User.create({ fullName: 'Seller Test', email: 'seller@test.local', phoneNumber: '0911000005', password: pw, role: 'SELLER', isActive: true }),
  ]);
  console.log('  → staff@test.local / coordinator@test.local / driver@test.local / admin@test.local (mật khẩu: Test@123456)');

  async function createOrder(trackingCode, status, overrides = {}) {
    return Order.findOneAndUpdate({ trackingCode }, { $set: {
      trackingCode, status, sellerId: sellerUser._id,
      originHubId: hub._id, destinationHubId: hub._id, currentHubId: hub._id,
      isFlagged: false, pickupAddress: ADDR, deliveryAddress: ADDR,
      items: [{ name: 'Hàng test', quantity: 1, weight: 1.0 }],
      dimensions: { length: 20, width: 15, height: 10 },
      actualWeight: 1.0, volumetricWeight: 0.5, chargeableWeight: 1.0,
      isCod: false, codAmount: 0, goodsValue: 100000,
      baseFee: 25000, insuranceFee: 0, discountAmount: 0, shippingFee: 25000,
      hubInboundAt: ['IN_HUB_ORIGIN','SEARCH_ZONE','SUSPECTED_LOST','SURPLUS'].includes(status)
        ? new Date(Date.now() - 2 * 3600_000) : null,
      ...overrides,
    }}, { upsert: true, new: true });
  }

  console.log('\n📦 UC-16 Inbound Orders...');
  await Promise.all([
    createOrder('TEST-INBOUND-001', 'PICKED_UP'),
    createOrder('TEST-INBOUND-002', 'PICKED_UP'),
    createOrder('TEST-INBOUND-003', 'PICKED_UP'),  // Test DAMAGED
    createOrder('TEST-INBOUND-004', 'PICKED_UP'),  // Test TORN_SEAL
    createOrder('TEST-INBOUND-005', 'PICKED_UP'),  // Test chênh cân
    createOrder('TEST-INBOUND-006', 'IN_TRANSIT'), // Status sai → lỗi
  ]);

  console.log('🚚 UC-17 Outbound Orders...');
  await Promise.all([
    createOrder('TEST-OUTBOUND-001', 'IN_HUB_ORIGIN'),
    createOrder('TEST-OUTBOUND-002', 'IN_HUB_ORIGIN'),
    createOrder('TEST-OUTBOUND-003', 'IN_HUB_ORIGIN'),
    createOrder('TEST-OUTBOUND-004', 'IN_HUB_ORIGIN'), // Sẽ không quét → shortage
    createOrder('TEST-OUTBOUND-005', 'EXCEPTION_INBOUND', { isFlagged: true }), // Bị lock
  ]);

  if (Trip) {
    const tripCode = `TRIP-${Date.now()}-TEST`;
    await Trip.findOneAndUpdate({ tripCode }, { $set: {
      tripCode, tripType: 'LINE_HAUL', status: 'DRAFT',
      originHubId: hub._id, destinationHubId: hub._id,
      assignedDriverId: driverUser._id,
      plannedTrackingCodes: ['TEST-OUTBOUND-001','TEST-OUTBOUND-002','TEST-OUTBOUND-003','TEST-OUTBOUND-004'],
      scannedItems: [], shortageTrackingCodes: [],
    }}, { upsert: true, new: true });
    console.log(`\n🚌 TRIP CODE (ghi lại để dùng test UC-17): ${tripCode}`);
  } else {
    console.warn('  ⚠️  Bỏ qua tạo Trip — trip.model.js không tồn tại');
  }

  console.log('📋 UC-18 Audit Orders...');
  await Promise.all([
    createOrder('TEST-AUDIT-001', 'IN_HUB_ORIGIN'),
    createOrder('TEST-AUDIT-002', 'IN_HUB_ORIGIN'),
    createOrder('TEST-AUDIT-003', 'IN_HUB_ORIGIN'),
    createOrder('TEST-AUDIT-004', 'IN_HUB_ORIGIN'), // Sẽ thiếu → SEARCH_ZONE
    createOrder('TEST-AUDIT-005', 'IN_HUB_ORIGIN'), // Sẽ thiếu → SEARCH_ZONE
  ]);

  console.log('📊 UC-19 Inventory Orders...');
  await Promise.all([
    createOrder('TEST-INV-NORMAL-001', 'IN_HUB_ORIGIN', { hubInboundAt: new Date(Date.now() - 5 * 3600_000) }),
    createOrder('TEST-INV-WARNING-001', 'IN_HUB_ORIGIN', { hubInboundAt: new Date(Date.now() - 30 * 3600_000) }),
    createOrder('TEST-INV-WARNING-002', 'IN_HUB_ORIGIN', { hubInboundAt: new Date(Date.now() - 36 * 3600_000) }),
    createOrder('TEST-INV-CRITICAL-001', 'SEARCH_ZONE', { hubInboundAt: new Date(Date.now() - 52 * 3600_000) }),
    createOrder('TEST-INV-CRITICAL-002', 'SUSPECTED_LOST', { hubInboundAt: new Date(Date.now() - 72 * 3600_000) }),
  ]);

  console.log('\n✅ Seed hoàn tất!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📌 TÀI KHOẢN TEST (mật khẩu chung: Test@123456):');
  console.log('   HUB_STAFF:        staff@test.local');
  console.log('   HUB_COORDINATOR:  coordinator@test.local');
  console.log('   DRIVER:           driver@test.local');
  console.log('   ADMIN:            admin@test.local');
  console.log('\n📌 MÃ VẬN ĐƠN TEST:');
  console.log('   UC-16: TEST-INBOUND-001 → 005 (PICKED_UP), TEST-INBOUND-006 (sai status)');
  console.log('   UC-17: TEST-OUTBOUND-001 → 004 (IN_HUB_ORIGIN), 005 (bị lock)');
  console.log('   UC-18: TEST-AUDIT-001 → 003 (sẽ quét), 004 → 005 (sẽ thiếu)');
  console.log('   UC-19: TEST-INV-NORMAL/WARNING/CRITICAL-001~002');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  mongoose.disconnect();
}

main().catch(err => { console.error('❌ Lỗi seed:', err); mongoose.disconnect(); process.exit(1); });