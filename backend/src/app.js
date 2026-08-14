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
app.use('/api/inbound', require('./routes/inbound.routes')); // UC-16 Nhập kho



// Error Handling Middleware (luôn phải nằm cuối cùng)
app.use(errorMiddleware);

module.exports = app;
