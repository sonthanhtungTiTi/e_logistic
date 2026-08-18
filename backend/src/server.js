require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const { initTrackingGateway } = require('./websocket/tracking.gateway');

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

    // Khởi tạo HTTP Server & WebSocket Server (Socket.io)
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Khởi tạo io singleton cho các service
    const ioSingleton = require('./lib/ioSingleton');
    ioSingleton.setIo(io);

    // Khởi tạo WebSocket Room Gateway cho Live GPS Tracking
    initTrackingGateway(io);

    // Dashboard inventory: client join room
    io.on('connection', (socket) => {
      socket.on('join_warehouse_dashboard', (hubId) => {
        if (hubId) socket.join(`warehouse-dashboard:${hubId}`);
      });
    });

    // Khởi động Audit Lost Timeout Job
    const { startAuditLostTimeoutJob } = require('./jobs/auditLostTimeout.job');
    startAuditLostTimeoutJob();

    server.listen(PORT, () => {
      console.log(`🚀 E-Logistics Server & WebSocket Gateway running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start the server:', error.message);
    process.exit(1); // Thoát tiến trình nếu có lỗi nghiêm trọng
  }
};

startServer();
