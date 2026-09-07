const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('../src/models/user.model');
const Geozone = require('../src/models/geozone.model');
const Hub = require('../src/models/hub.model');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected.');

  let hub = await Hub.findOne({ code: 'HUB_TEST_V26' });
  if (!hub) {
    hub = await Hub.create({
      name: 'Bưu Cục Trung Tâm Tân Bình',
      code: 'HUB_TEST_V26',
      address: '123 Đường Tân Bình, P. 12, Q. Tân Bình, TP.HCM',
      province: 'TP. Hồ Chí Minh',
      district: 'Quận Tân Bình',
      ward: 'Phường 12',
      location: { type: 'Point', coordinates: [106.65, 10.79] },
      status: 'ACTIVE',
    });
  }

  let zone = await Geozone.findOne({ code: 'ZONE-TB-TEST-01' });
  if (!zone) {
    zone = await Geozone.create({
      name: 'Cụm Tuyến Phường 12 - Tân Bình',
      code: 'ZONE-TB-TEST-01',
      province: 'TP. Hồ Chí Minh',
      district: 'Quận Tân Bình',
      ward: 'Phường 12',
      hubId: hub._id,
      subZones: ['Khu phố 1', 'Khu phố 2', 'Khu phố 3', 'Khu phố 4', 'Khu phố 5'],
      status: 'ACTIVE',
    });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Password123@', salt);

  const demoAccounts = [
    {
      fullName: 'Shop Dược An Bình (Seller)',
      email: 'seller.demo@elogistic.vn',
      phoneNumber: '0900000001',
      role: 'SELLER',
      kycStatus: 'VERIFIED_KYC',
      isActive: true,
      password: hashedPassword,
    },
    {
      fullName: 'Nguyễn Văn Duyệt (QL Đơn & NCC)',
      email: 'vendormgr.demo@elogistic.vn',
      phoneNumber: '0900000002',
      role: 'ORDER_VENDOR_MANAGER',
      kycStatus: 'VERIFIED_KYC',
      isActive: true,
      password: hashedPassword,
    },
    {
      fullName: 'Trần Thị Điều (QL Điều Phối Shipper)',
      email: 'dispatcher.demo@elogistic.vn',
      phoneNumber: '0900000003',
      role: 'LAST_MILE_DISPATCHER',
      kycStatus: 'VERIFIED_KYC',
      isActive: true,
      password: hashedPassword,
    },
    {
      fullName: 'Võ Vận Tải (QL Đội Xe Tải Tuyến)',
      email: 'linehaul.demo@elogistic.vn',
      phoneNumber: '0900000004',
      role: 'LINE_HAUL_DISPATCHER',
      kycStatus: 'VERIFIED_KYC',
      isActive: true,
      password: hashedPassword,
    },
    {
      fullName: 'Lê Văn Giao (Shipper Nội Thành)',
      email: 'shipper.demo@elogistic.vn',
      phoneNumber: '0900000011',
      role: 'LOCAL_SHIPPER',
      kycStatus: 'VERIFIED_KYC',
      activeGeozoneId: zone._id,
      isWorking: true,
      pickupQuota: { max: 25, current: 3 },
      deliveryQuota: { max: 35, current: 8 },
      acceptanceRate: 98,
      dispatchRejectionCount: 0,
      maxWeightCapacityKg: 45,
      currentWeightKg: 6,
      currentLocation: { type: 'Point', coordinates: [106.651, 10.791] },
      isActive: true,
      password: hashedPassword,
    },
    {
      fullName: 'Phạm Quốc Bảo (Tài Xế Tuyến Liên Tỉnh)',
      email: 'driver.demo@elogistic.vn',
      phoneNumber: '0900000021',
      role: 'LINE_HAUL_DRIVER',
      kycStatus: 'VERIFIED_KYC',
      isWorking: true,
      vehicleInfo: { licensePlate: '51C-889.99', vehicleType: 'Xe tải 8 tấn' },
      isActive: true,
      password: hashedPassword,
    },
    {
      fullName: 'Nguyễn Kho Vận (Nhân Viên Hub)',
      email: 'hub.demo@elogistic.vn',
      phoneNumber: '0900000031',
      role: 'HUB_STAFF',
      hubId: hub._id,
      kycStatus: 'VERIFIED_KYC',
      isActive: true,
      password: hashedPassword,
    },
    {
      fullName: 'Quản Trị Viên Hệ Thống (Admin)',
      email: 'admin.demo@elogistic.vn',
      phoneNumber: '0900000099',
      role: 'ADMIN',
      kycStatus: 'VERIFIED_KYC',
      isActive: true,
      password: hashedPassword,
    },
  ];

  for (const acc of demoAccounts) {
    const updated = await User.findOneAndUpdate(
      { phoneNumber: acc.phoneNumber },
      { $set: acc },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`✅ Seeded account: ${updated.role.padEnd(22)} | Email: ${updated.email.padEnd(30)} | SĐT: ${updated.phoneNumber}`);
  }

  console.log('\n🎉 Đã hoàn tất khởi tạo các tài khoản demo chuẩn với mật khẩu: Password123@');
  await mongoose.disconnect();
}

seed().catch(console.error);
