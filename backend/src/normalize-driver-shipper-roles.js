const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

  // 1. Shippers: Local pickup/delivery
  const shipperEmails = [
    'shipper.han@test.local',
    'shipper.vca@test.local',
    'shipper.dad@test.local',
    'shipper.hph@test.local',
    'shipper.demo@elogistic.vn',
  ];

  await User.updateMany(
    {
      $or: [
        { email: { $in: shipperEmails } },
        { email: { $regex: /^shipper/i } },
        { role: 'LOCAL_SHIPPER' },
      ],
    },
    { $set: { role: 'SHIPPER' } }
  );

  // 2. Line-haul Drivers: Long-haul truck drivers
  const driverEmails = [
    'driver.linehaul@test.local',
    'driver.demo@elogistic.vn',
    'driver@elogistic.vn',
    'driver@test.local',
    'e2e.driver@test.local',
  ];

  await User.updateMany(
    {
      $or: [
        { email: { $in: driverEmails } },
        { email: { $regex: /^driver/i } },
        { role: 'LINE_HAUL_DRIVER' },
      ],
    },
    { $set: { role: 'DRIVER' } }
  );

  // Make sure Line-haul driver demo has truck info
  await User.findOneAndUpdate(
    { email: 'driver.demo@elogistic.vn' },
    {
      $set: {
        role: 'DRIVER',
        fullName: 'Phạm Quốc Bảo (Tài Xế Tuyến Liên Tỉnh)',
        vehicleInfo: {
          licensePlate: '51C-889.99',
          vehicleType: 'Xe tải 8 tấn (Thùng kín)',
        },
      },
    }
  );

  await User.findOneAndUpdate(
    { email: 'driver.linehaul@test.local' },
    {
      $set: {
        role: 'DRIVER',
        fullName: 'Tài Xế Đường Trục Hà Nội - TP.HCM',
        vehicleInfo: {
          licensePlate: '29H-778.89',
          vehicleType: 'Xe tải 15 tấn (Tuyến Bắc - Nam)',
        },
      },
    }
  );

  console.log('Roles normalized successfully!');
  const allUsers = await User.find({ role: { $in: ['SHIPPER', 'DRIVER'] } }).select('email fullName role vehicleInfo operatingArea');
  console.log('Normalized Shippers & Drivers:');
  allUsers.forEach((u) => console.log(`- [${u.role}] ${u.fullName} (${u.email})`));

  await mongoose.disconnect();
}

run().catch(console.error);
