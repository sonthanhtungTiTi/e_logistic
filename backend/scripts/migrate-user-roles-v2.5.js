/**
 * Migration Script v2.5: Phân tách vai trò DRIVER -> LOCAL_SHIPPER / LINE_HAUL_DRIVER
 * 
 * Cách dùng:
 *   node scripts/migrate-user-roles-v2.5.js --dry-run  (Chỉ kiểm tra và in báo cáo, KHÔNG ghi DB)
 *   node scripts/migrate-user-roles-v2.5.js            (Thực hiện cập nhật DB)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user.model');

const isDryRun = process.argv.includes('--dry-run');

async function runMigration() {
  console.log('====================================================');
  console.log(`[MIGRATION] Bắt đầu di trú vai trò User v2.5`);
  console.log(`[CHẾ ĐỘ]: ${isDryRun ? '🔍 DRY-RUN (Chỉ đọc & Báo cáo)' : '⚡ THỰC THI GHI VÀO DATABASE'}`);
  console.log('====================================================');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/e_logistic';
  await mongoose.connect(mongoUri);
  console.log(`✅ Đã kết nối MongoDB: ${mongoUri}`);

  const drivers = await User.find({ role: 'DRIVER' });
  console.log(`📊 Tìm thấy tổng cộng: ${drivers.length} tài khoản có role='DRIVER'`);

  let localShipperCount = 0;
  let linehaulDriverCount = 0;
  let manualReviewList = [];

  for (const driver of drivers) {
    const vType = (driver.vehicleInfo?.vehicleType || '').toLowerCase();
    
    // Nhánh 1: Xe máy -> LOCAL_SHIPPER
    if (vType.includes('máy') || vType.includes('motor') || vType.includes('bike') || vType.includes('hai bánh')) {
      localShipperCount++;
      console.log(`  -> [LOCAL_SHIPPER] User ${driver.fullName} (${driver.phoneNumber}) - Xe: ${driver.vehicleInfo?.vehicleType}`);
      if (!isDryRun) {
        driver.role = 'LOCAL_SHIPPER';
        driver.pickupQuota = driver.pickupQuota || { max: 25, current: 0 };
        driver.deliveryQuota = driver.deliveryQuota || { max: 35, current: 0 };
        driver.maxWeightCapacityKg = driver.maxWeightCapacityKg || 45;
        driver.requiresManualRoleReview = false;
        await driver.save();
      }
    } 
    // Nhánh 2: Xe tải -> LINE_HAUL_DRIVER
    else if (vType.includes('tải') || vType.includes('truck') || vType.includes('container') || vType.includes('tấn')) {
      linehaulDriverCount++;
      console.log(`  -> [LINE_HAUL_DRIVER] User ${driver.fullName} (${driver.phoneNumber}) - Xe: ${driver.vehicleInfo?.vehicleType}`);
      if (!isDryRun) {
        driver.role = 'LINE_HAUL_DRIVER';
        driver.requiresManualRoleReview = false;
        await driver.save();
      }
    } 
    // Nhánh 3: Dữ liệu mơ hồ / null -> Đánh dấu cần rà soát thủ công
    else {
      manualReviewList.push({
        id: driver._id,
        fullName: driver.fullName,
        phone: driver.phoneNumber,
        vehicleType: driver.vehicleInfo?.vehicleType || 'NULL/EMPTY',
      });
      console.warn(`  ⚠️ [CẦN RÀ SOÁT] User ${driver.fullName} (${driver.phoneNumber}) - vehicleType không rõ ràng: "${driver.vehicleInfo?.vehicleType}"`);
      if (!isDryRun) {
        driver.requiresManualRoleReview = true;
        await driver.save();
      }
    }
  }

  console.log('\n====================================================');
  console.log('📈 TỔNG KẾT DI TRÚ:');
  console.log(`- Chuyển thành LOCAL_SHIPPER: ${localShipperCount}`);
  console.log(`- Chuyển thành LINE_HAUL_DRIVER: ${linehaulDriverCount}`);
  console.log(`- Cần Admin rà soát thủ công: ${manualReviewList.length}`);
  if (manualReviewList.length > 0) {
    console.log('Danh sách tài khoản cần rà soát:', JSON.stringify(manualReviewList, null, 2));
  }
  console.log('====================================================');

  await mongoose.disconnect();
  console.log('✅ Hoàn tất migration và đóng kết nối DB.');
}

runMigration().catch(err => {
  console.error('❌ Lỗi di trú:', err);
  process.exit(1);
});
