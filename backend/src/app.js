const express = require('express');
const cors = require('cors');
const { errorMiddleware } = require('./middlewares/error.middleware');

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

// Tương lai sẽ import các Route ở đây
// const routes = require('./routes/index');
// app.use('/api/v1', routes);

// Error Handling Middleware (luôn phải nằm cuối cùng)
app.use(errorMiddleware);

module.exports = app;
