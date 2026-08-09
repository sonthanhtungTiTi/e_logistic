require('dotenv').config();
const app = require('./app');

const connectDB = require('./config/db');

// Kiểm tra cấu hình bảo mật trước khi chạy server
if (!process.env.JWT_SECRET) {
  console.error('❌ LỖI NGHIÊM TRỌNG: Thiếu JWT_SECRET trong biến môi trường (.env)');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Kết nối Database
    await connectDB();

    
    app.listen(PORT, () => {
      console.log(`🚀 E-Logistics Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start the server:', error.message);
    process.exit(1); // Thoát tiến trình nếu có lỗi nghiêm trọng
  }
};

startServer();
