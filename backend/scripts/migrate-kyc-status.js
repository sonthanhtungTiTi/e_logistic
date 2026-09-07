require('dotenv').config();
const mongoose = require('mongoose');

async function migrateKycStatus() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/e-logistics';
    console.log('🔄 Đang kết nối tới MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Đã kết nối MongoDB thành công.');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    const totalUsers = await usersCollection.countDocuments({});
    console.log(`📊 Tổng số users cần kiểm tra: ${totalUsers}`);

    // Map old status to new standardized status:
    // VERIFIED_KYC -> APPROVED (kycVerified = true)
    // PENDING_KYC  -> PENDING  (kycVerified = false)
    // REJECTED_KYC -> REJECTED (kycVerified = false)
    // NOT_SUBMITTED -> NOT_SUBMITTED (kycVerified = false)

    const resVerified = await usersCollection.updateMany(
      { kycStatus: 'VERIFIED_KYC' },
      { $set: { kycStatus: 'APPROVED', kycVerified: true } }
    );
    console.log(`✅ Đã chuyển đổi ${resVerified.modifiedCount} user có status VERIFIED_KYC -> APPROVED (kycVerified: true)`);

    const resPending = await usersCollection.updateMany(
      { kycStatus: 'PENDING_KYC' },
      { $set: { kycStatus: 'PENDING', kycVerified: false } }
    );
    console.log(`⏳ Đã chuyển đổi ${resPending.modifiedCount} user có status PENDING_KYC -> PENDING (kycVerified: false)`);

    const resRejected = await usersCollection.updateMany(
      { kycStatus: 'REJECTED_KYC' },
      { $set: { kycStatus: 'REJECTED', kycVerified: false } }
    );
    console.log(`❌ Đã chuyển đổi ${resRejected.modifiedCount} user có status REJECTED_KYC -> REJECTED (kycVerified: false)`);

    // Ensure all other users have kycVerified initialized if missing
    const resInitVerified = await usersCollection.updateMany(
      { kycVerified: { $exists: false } },
      {
        $set: {
          kycVerified: false,
          kycStatus: 'NOT_SUBMITTED',
        },
      }
    );
    console.log(`🔄 Đã khởi tạo kycVerified: false cho ${resInitVerified.modifiedCount} user chưa có field này.`);

    console.log('🎉 Hoàn tất migration trạng thái KYC cho User model!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khi chạy migration:', err);
    process.exit(1);
  }
}

migrateKycStatus();
