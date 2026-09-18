const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./src/models/user.model');
const Order = require('./src/models/order.model');
const Ticket = require('./src/models/ticket.model');
const Wallet = require('./src/models/wallet.model');

async function testLiveApi() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic';
  await mongoose.connect(mongoURI);

  // 1. Prepare/Fetch CS User (Role CS, Level L1)
  let csUser = await User.findOne({ role: 'CS', csLevel: 'L1' });
  if (!csUser) {
    csUser = await User.create({
      fullName: 'Live CS Agent L1',
      email: `live.cs.${Date.now()}@elogistic.vn`,
      role: 'CS',
      csLevel: 'L1',
      phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      isActive: true,
    });
  }

  // 2. Prepare Seller User & Wallet
  let sellerUser = await User.findOne({ role: 'SELLER' });
  if (!sellerUser) {
    sellerUser = await User.create({
      fullName: 'Live Seller',
      email: `live.seller.${Date.now()}@elogistic.vn`,
      role: 'SELLER',
      phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password123!',
      isActive: true,
      walletBalance: 500000,
    });
  }

  await Wallet.findOneAndUpdate(
    { ownerId: sellerUser._id },
    { balance: 500000, currency: 'VND', status: 'ACTIVE' },
    { upsert: true, returnDocument: 'after' }
  );

  // 3. Prepare Order & Ticket
  const order = await Order.findOneAndUpdate(
    { trackingCode: 'EL-LIVE-TEST-001' },
    {
      sellerId: sellerUser._id,
      declaredValue: 2000000,
      shippingFee: 30000,
      status: 'DELIVERED',
      routeType: 'DIRECT',
    },
    { upsert: true, returnDocument: 'after' }
  );

  const ticket = await Ticket.findOneAndUpdate(
    { ticketCode: 'TK-LIVE-0001' },
    {
      title: 'Hàng bị vỡ góc',
      description: 'Khách khiếu nại hộp bị móp rách khi nhận hàng',
      category: 'DAMAGED_GOODS',
      priority: 'P3',
      status: 'IN_PROGRESS',
      requesterId: sellerUser._id,
      orderId: order._id,
      orderTrackingCode: order.trackingCode,
      assignedTo: csUser._id,
    },
    { upsert: true, returnDocument: 'after' }
  );

  // 4. Generate real JWT Token for CS User
  const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
  const token = jwt.sign({ id: csUser._id, role: csUser.role }, jwtSecret, { expiresIn: '1h' });

  console.log('--- EXECUTING HTTP POST REQUEST TO LIVE SERVER ---');
  console.log(`URL: http://127.0.0.1:5000/api/admin/tickets/${ticket._id}/compensations`);
  
  const payload = {
    amount: 150000,
    reason: 'Bồi thường khách hàng hộp bị móp góc',
    evidence: ['https://cdn.elogistics.vn/evidence1.jpg'],
  };

  const response = await fetch(`http://127.0.0.1:5000/api/admin/tickets/${ticket._id}/compensations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const statusCode = response.status;
  const jsonBody = await response.json();

  console.log(`HTTP_STATUS: ${statusCode}`);
  console.log(JSON.stringify(jsonBody, null, 2));

  await mongoose.disconnect();
}

testLiveApi().catch((err) => {
  console.error('Lỗi test live API:', err);
  process.exit(1);
});
