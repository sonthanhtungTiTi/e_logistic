const mongoose = require('mongoose');

// Pre-load tất cả Mongoose Models để đăng ký Schema vào registry của Mongoose.
// PHẢI require ở đây để tránh lỗi "Schema hasn't been registered for model X"
// khi bất kỳ model nào gọi .populate() trỏ đến model khác.
require('../models/hub.model');          // ← THÊM MỚI: bắt buộc phải load trước các model ref Hub
require('../models/hubCoverage.model');
require('../models/hubConnection.model');
require('../models/zone.model');         // UC-16: Zone khu vực trong Hub
require('../models/bag.model');          // UC-16: Bao tải niêm phong
require('../models/trip.model');         // UC-17: Trip xuất kho
require('../models/auditSession.model'); // UC-18: Phiên kiểm kê kho
require('../models/user.model');
require('../models/order.model');
require('../models/orderLog.model');
require('../models/orderTrackingLog.model');
require('../models/authLog.model');
require('../models/passwordResetOtp.model');
require('../models/pickupConfirmation.model');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/e-logistics';
    const conn = await mongoose.connect(mongoURI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Lỗi kết nối MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
