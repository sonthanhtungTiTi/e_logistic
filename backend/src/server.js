require('dotenv').config();
const app = require('./app');

// Port được lấy từ biến môi trường, mặc định 5000
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Tương lai sẽ thêm hàm connect Database (Prisma) ở đây
    
    app.listen(PORT, () => {
      console.log(`🚀 E-Logistics Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start the server:', error.message);
    process.exit(1); // Thoát tiến trình nếu có lỗi nghiêm trọng
  }
};

startServer();
