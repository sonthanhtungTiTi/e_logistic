const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic');
  const User = require('./src/models/user.model');
  const Wallet = require('./src/models/wallet.model');
  const Order = require('./src/models/order.model');
  const ticketCore = require('./src/services/ticketCore.service');

  // Find or create CS user
  let csUser = await User.findOne({ role: 'CS' });
  if (!csUser) {
    csUser = await User.create({
      fullName: 'CS Test Agent',
      email: 'cstest_' + Date.now() + '@elogistics.test',
      phoneNumber: '0909999999',
      password: 'Password123@',
      role: 'CS',
      csLevel: 'L1',
    });
  }

  // Find or create Seller
  let seller = await User.findOne({ role: 'SELLER' });
  if (!seller) {
    seller = await User.create({
      fullName: 'Seller Test',
      email: 'seller_' + Date.now() + '@elogistics.test',
      phoneNumber: '0908888888',
      password: 'Password123@',
      role: 'SELLER',
    });
  }

  // Ensure seller has wallet
  let wallet = await Wallet.findOne({ ownerId: seller._id });
  if (!wallet) {
    wallet = await Wallet.create({ ownerId: seller._id, balance: 1000000 });
  }

  // Create order
  const order = await Order.create({
    trackingCode: 'LIVE-TEST-' + Date.now(),
    sellerId: seller._id,
    declaredValue: 2000000,
    goodsValue: 2000000,
    shippingFee: 30000,
    codAmount: 2030000,
    status: 'DELIVERING',
    pickupAddress: { fullName: 'A', phone: '0901', address: 'B', ward: 'W', district: 'D', province: 'P' },
    deliveryAddress: { fullName: 'B', phone: '0902', address: 'C', ward: 'W', district: 'D', province: 'P' },
    items: [{ name: 'Test', quantity: 1, weight: 1 }],
    actualWeight: 1,
    chargeableWeight: 1,
  });

  // Create ticket
  const { ticket } = await ticketCore.createTicket(
    {
      trackingCode: order.trackingCode,
      orderId: order._id,
      category: 'DAMAGED',
      subject: 'Live Curl Test Ticket ' + Date.now(),
      message: 'Test message for compensation',
    },
    seller
  );

  const csToken = jwt.sign(
    { id: csUser._id, role: csUser.role, csLevel: csUser.csLevel || 'L1' },
    process.env.JWT_SECRET || 'test_secret_key'
  );

  const payload = JSON.stringify({
    amount: 150000,
    reason: 'Đền bù thiệt hại kiện hàng kiểm thử live',
    evidence: ['https://cdn.e-logistic.vn/evidence/test1.jpg'],
  });

  const path = `/api/admin/tickets/${ticket._id}/compensations`;

  const req = http.request(
    {
      host: '127.0.0.1',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + csToken,
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        console.log('TARGET_URL:', `http://127.0.0.1:5000${path}`);
        console.log('HTTP_STATUS:', res.statusCode);
        console.log('BODY:', body);
        process.exit(0);
      });
    }
  );

  req.on('error', (e) => {
    console.error('ERROR:', e.message);
    process.exit(1);
  });

  req.write(payload);
  req.end();
}

run();
