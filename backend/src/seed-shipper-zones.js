const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

  // 1. Shipper Hà Nội
  await User.updateOne(
    { email: 'shipper.han@test.local' },
    {
      $set: {
        role: 'SHIPPER',
        isWorking: true,
        vehicleInfo: {
          licensePlate: '29A1-998.88',
          vehicleType: 'Xe máy (Honda Wave Alpha)',
        },
        operatingArea: {
          province: 'Hà Nội',
          district: 'Quận Hoàn Kiếm',
          ward: 'Phường Hàng Bài',
          subZone: 'Khu phố 1',
          detailAddress: 'Khu phố 1, Phường Hàng Bài, Quận Hoàn Kiếm, Hà Nội',
        },
      },
    }
  );

  // 2. Shipper Cần Thơ
  await User.updateOne(
    { email: 'shipper.vca@test.local' },
    {
      $set: {
        role: 'SHIPPER',
        isWorking: true,
        vehicleInfo: {
          licensePlate: '65B1-778.99',
          vehicleType: 'Xe máy (Yamaha Sirius)',
        },
        operatingArea: {
          province: 'Cần Thơ',
          district: 'Quận Ninh Kiều',
          ward: 'Phường Tân An',
          subZone: 'Khu phố 2',
          detailAddress: 'Khu phố 2, Phường Tân An, Quận Ninh Kiều, Cần Thơ',
        },
      },
    }
  );

  // 3. Shipper Demo TP.HCM
  await User.updateOne(
    { email: 'shipper.demo@elogistic.vn' },
    {
      $set: {
        role: 'LOCAL_SHIPPER',
        isWorking: true,
        vehicleInfo: {
          licensePlate: '59C2-123.45',
          vehicleType: 'Xe máy (Honda Air Blade)',
        },
        operatingArea: {
          province: 'TP. Hồ Chí Minh',
          district: 'Quận Tân Bình',
          ward: 'Phường 12',
          subZone: 'Khu phố 5',
          detailAddress: 'Khu phố 5, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh',
        },
      },
    }
  );

  console.log('Seeded operating areas for shippers successfully!');
  await mongoose.disconnect();
}

run().catch(console.error);
