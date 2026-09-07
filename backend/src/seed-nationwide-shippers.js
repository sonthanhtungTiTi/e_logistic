const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  const Hub = mongoose.model('Hub', new mongoose.Schema({}, { strict: false }), 'hubs');

  const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

  const hubDad = await Hub.findOne({ code: 'HUB_DAD_01' });
  const hubHph = await Hub.findOne({ code: 'HUB_HPH_01' });

  // 1. Shipper Đà Nẵng
  await User.findOneAndUpdate(
    { email: 'shipper.dad@test.local' },
    {
      $set: {
        fullName: 'Shipper Đà Nẵng (Miền Trung)',
        phoneNumber: '0977333444',
        password: hashedPassword,
        role: 'SHIPPER',
        isWorking: true,
        hubId: hubDad?._id,
        vehicleInfo: {
          licensePlate: '43C1-667.89',
          vehicleType: 'Xe máy (Honda Future)',
        },
        operatingArea: {
          province: 'Đà Nẵng',
          district: 'Quận Hải Châu',
          ward: 'Phường Hải Châu 1',
          subZone: 'Khu phố 1',
          detailAddress: 'Khu phố 1, Phường Hải Châu 1, Quận Hải Châu, Đà Nẵng',
        },
      },
    },
    { upsert: true, new: true }
  );

  // 2. Shipper Hải Phòng
  await User.findOneAndUpdate(
    { email: 'shipper.hph@test.local' },
    {
      $set: {
        fullName: 'Shipper Hải Phòng (Duyên Hải)',
        phoneNumber: '0966555777',
        password: hashedPassword,
        role: 'SHIPPER',
        isWorking: true,
        hubId: hubHph?._id,
        vehicleInfo: {
          licensePlate: '15B2-889.99',
          vehicleType: 'Xe máy (Yamaha Exciter)',
        },
        operatingArea: {
          province: 'Hải Phòng',
          district: 'Quận Hồng Bàng',
          ward: 'Phường Hoàng Văn Thụ',
          subZone: 'Khu phố 2',
          detailAddress: 'Khu phố 2, Phường Hoàng Văn Thụ, Quận Hồng Bàng, Hải Phòng',
        },
      },
    },
    { upsert: true, new: true }
  );

  console.log('Seeded Shipper Đà Nẵng & Shipper Hải Phòng successfully!');
  await mongoose.disconnect();
}

run().catch(console.error);
