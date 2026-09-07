const express = require('express');
const cors = require('cors');
const { errorMiddleware } = require('./middleware/error.middleware');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json()); // Parsing JSON body
app.use(express.urlencoded({ extended: true })); // Parsing URL-encoded body

// Health-check / Default Route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to E-Logistics API (Node.js)',
    version: '1.0.0',
  });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/admin', require('./routes/admin.routes')); // UC Quản lý người dùng
app.use('/api/seller', require('./routes/seller.routes')); // Module Quản lý Seller Nâng cao (2FA, KYC, Sub-account, Multi-pickup)
app.use('/api', require('./routes/orderManager.routes')); // Nghiệp vụ Duyệt đơn cho Seller & Order Manager
app.use('/api/driver-manager', require('./routes/driverManager.routes')); // Nghiệp vụ Điều phối & Quản lý Tài xế cho Driver Manager
app.use('/api/driver', require('./routes/driver.routes')); // Nghiệp vụ Từ chối đơn từ phía Tài xế
app.use('/api/inbound', require('./routes/inbound.routes')); // UC-16 Nhập kho
app.use('/api/trips', require('./routes/trips.routes'));          // UC-17: Tạo chuyến xe
app.use('/api/outbound', require('./routes/outbound.routes'));    // UC-17: Xuất kho
app.use('/api/driver/trips', require('./routes/driverHandoff.routes')); // UC-17: Tài xế xác nhận
app.use('/api/bags', require('./routes/bag.routes'));                // UC-Bagging: Gom bao & Niêm phong
app.use('/api/audit', require('./routes/audit.routes'));          // UC-18: Kiểm kê kho
app.use('/api/inventory', require('./routes/inventory.routes')); // UC-19: Dashboard Tồn kho
app.use('/api/wallet', require('./routes/wallet.routes'));       // Module 6: Ví COD Seller & Rút tiền
app.use('/api/seller/wallet', require('./routes/wallet.routes'));// Alias cho sub-account Seller
app.use('/api', require('./routes/deliveryFailure.routes'));       // Chức năng Báo giao thất bại (Delivery Failure Report)
app.use('/api/vendor-ops', require('./routes/vendorOps.routes')); // Module Quản trị Đơn hàng & Nhà cung cấp
app.use('/api/dispatch/local', require('./routes/localDispatch.routes')); // Module Điều phối Shipper Nội vùng
app.use('/api/dispatch/linehaul', require('./routes/linehaulDispatch.routes')); // Module Điều phối Đội xe tải Liên tỉnh
app.use('/api/custody', require('./routes/custody.routes')); // Module Chuỗi chuyển giao trách nhiệm (Chain of Custody)

// Endpoint bảo vệ truy cập ảnh KYC (Anti-IDOR Image Stream)
const { protect } = require('./middleware/auth.middleware');
const { getKycFile } = require('./controllers/kyc.controller');
app.get('/api/kyc/files/:filename', protect, getKycFile);

// Error Handling Middleware (luôn phải nằm cuối cùng)
app.use(errorMiddleware);

module.exports = app;
