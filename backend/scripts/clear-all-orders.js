require('dotenv').config();
const mongoose = require('mongoose');

async function clearAllOrders() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/e-logistics';
    console.log('🔄 Đang kết nối tới MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Đã kết nối MongoDB thành công.');

    const db = mongoose.connection.db;

    if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force-production')) {
      console.error('⛔ CẢNH BÁO AN TOÀN: Không thể chạy script xóa dữ liệu trên môi trường PRODUCTION!');
      process.exit(1);
    }

    console.log('🧹 Bắt đầu xóa sạch toàn bộ đơn hàng và dữ liệu vận hành liên quan...');

    // 1. Xóa toàn bộ Orders
    const resOrders = await db.collection('orders').deleteMany({});
    console.log(`🗑️ Đã xóa ${resOrders.deletedCount} đơn hàng (orders).`);

    // 2. Xóa Audit Logs và Tracking Timeline
    const resLogs = await db.collection('orderlogs').deleteMany({});
    console.log(`🗑️ Đã xóa ${resLogs.deletedCount} nhật ký đơn (orderlogs).`);

    const resTracking = await db.collection('order_tracking_logs').deleteMany({});
    console.log(`🗑️ Đã xóa ${resTracking.deletedCount} lịch sử tra cứu (order_tracking_logs).`);

    // 3. Xóa các biên bản gom hàng ePOH
    const resConfirm = await db.collection('pickupconfirmations').deleteMany({});
    console.log(`🗑️ Đã xóa ${resConfirm.deletedCount} biên bản ký số ePOH (pickupconfirmations).`);

    const resManifests = await db.collection('pickupmanifests').deleteMany({});
    console.log(`🗑️ Đã xóa ${resManifests.deletedCount} biên bản gom hàng (pickupmanifests).`);

    // 4. Xóa Bao tải & Chuyến xe (nếu có liên quan)
    const resBags = await db.collection('bags').deleteMany({});
    console.log(`🗑️ Đã xóa ${resBags.deletedCount} bao tải niêm phong (bags).`);

    const resTrips = await db.collection('trips').deleteMany({});
    console.log(`🗑️ Đã xóa ${resTrips.deletedCount} chuyến xe trung chuyển (trips).`);

    console.log('\n✨ DỌN DẸP HOÀN TẤT! Hệ thống đã sạch sẽ 100% để bạn bắt đầu test mới.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi dọn dẹp đơn hàng:', error.message);
    process.exit(1);
  }
}

clearAllOrders();
