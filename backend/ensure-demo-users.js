require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/user.model');
const Hub = require('./src/models/hub.model');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const hub = await Hub.findOne({ code: 'HUB_SGN_01' }) || await Hub.findOne();
  console.log('Using Hub:', hub?.code, hub?._id);

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('123456', salt);

  const accounts = [
    {
      fullName: 'Shop Dược Phẩm Sài Gòn',
      email: 'seller@elogistic.vn',
      phoneNumber: '0909000001',
      role: 'SELLER',
      isActive: true,
      password: hash,
      companyName: 'Công Ty Dược Phẩm Sài Gòn',
      pickupAddress: {
        fullName: 'Shop Dược Phẩm Sài Gòn',
        phone: '0909000001',
        address: '123 Nguyễn Thị Minh Khai',
        province: 'TP. HỒ CHÍ MINH',
        district: 'Quận 1',
        ward: 'Bến Nghé'
      }
    },
    {
      fullName: 'Quản Lý Vận Hành (Admin)',
      email: 'admin@elogistic.vn',
      phoneNumber: '0909000002',
      role: 'ADMIN',
      isActive: true,
      password: hash,
      hubId: hub?._id
    },
    {
      fullName: 'Tài Xế Nguyễn Văn Giao',
      email: 'driver@elogistic.vn',
      phoneNumber: '0909000003',
      role: 'DRIVER',
      isActive: true,
      password: hash,
      hubId: hub?._id,
      rejectionQuota: { remainingToday: 3, maxPerDay: 3 },
      serviceAreas: [
        { province: 'TP. HỒ CHÍ MINH', district: 'Quận 1' },
        { province: 'TP. HỒ CHÍ MINH', district: 'Bình Thạnh' }
      ]
    },
    {
      fullName: 'Thủ Kho Trần Văn Kho',
      email: 'warehouse@elogistic.vn',
      phoneNumber: '0909000004',
      role: 'HUB_STAFF',
      isActive: true,
      password: hash,
      hubId: hub?._id
    }
  ];

  for (const acc of accounts) {
    const res = await User.findOneAndUpdate(
      { email: acc.email },
      { $set: acc },
      { upsert: true, new: true }
    );
    console.log(`✅ [${res.role}] ${res.email} (${res.fullName}) -> OK`);
  }

  console.log('\n🎉 Đã khởi tạo xong 4 tài khoản Demo chuẩn mực!');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
