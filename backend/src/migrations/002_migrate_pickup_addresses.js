const User = require('../models/user.model');
const PickupAddress = require('../models/pickupAddress.model');

async function migratePickupAddresses() {
  try {
    const sellers = await User.find({
      role: 'SELLER',
      address: { $exists: true, $ne: '' },
    });
    let migrated = 0;

    for (const seller of sellers) {
      const exists = await PickupAddress.findOne({ sellerId: seller._id });
      if (exists) continue; // Idempotent check

      const lat = parseFloat(seller.latitude) || 10.812569;
      const lng = parseFloat(seller.longitude) || 106.668425;

      await PickupAddress.create({
        sellerId: seller._id,
        label: 'Kho mặc định',
        province: 'Thành phố Hồ Chí Minh',
        district: 'Quận 5',
        ward: 'Phường 1',
        addressDetail: seller.address || 'Địa chỉ kho đăng ký ban đầu',
        contactName: seller.fullName || '',
        contactPhone: seller.phoneNumber || '',
        latitude: lat,
        longitude: lng,
        isDefault: true,
        isActive: true,
      });
      migrated++;
    }
    console.log(`[Migration 002] Đã migrate ${migrated}/${sellers.length} địa chỉ kho từ User model.`);
    return migrated;
  } catch (error) {
    console.error(`[Migration 002] Lỗi khi chạy migration địa chỉ kho:`, error);
    throw error;
  }
}

module.exports = migratePickupAddresses;
