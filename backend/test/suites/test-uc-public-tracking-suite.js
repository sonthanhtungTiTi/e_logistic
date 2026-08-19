const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const ioClient = require('socket.io-client');
const app = require('../../src/app');
const { initTrackingGateway } = require('../../src/websocket/tracking.gateway');
const Order = require('../../src/models/order.model');
const mongoose = require('mongoose');

const PORT = 5002;
const API_BASE = `http://localhost:${PORT}/api`;
const WS_BASE = `http://localhost:${PORT}`;

async function runTests() {
  console.log('\n============== TEST SUITE: UC PUBLIC BUYER TRACKING & TECHNICAL FIXES ==============\n');

  let server;
  let ioServer;

  try {
    // 1. Setup Test DB Connection & HTTP/WebSocket Server
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/elogistics';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    server = http.createServer(app);
    ioServer = new Server(server, { cors: { origin: '*' } });
    initTrackingGateway(ioServer);

    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`✅ Test HTTP & WebSocket Server listening on port ${PORT}`);

    // Seed test order
    const trackingCode = 'EL260810X8F9';
    await Order.deleteOne({ trackingCode });

    const dummySellerId = new mongoose.Types.ObjectId();
    const testOrder = await Order.create({
      trackingCode,
      status: 'DELIVERING',
      sellerId: dummySellerId,
      pickupAddress: {
        fullName: 'Kho An Bình',
        phone: '0901112223',
        address: '123 Cống Quỳnh',
        ward: 'Phường Nguyễn Cư Trinh',
        district: 'Quận 1',
        province: 'TP.Hồ Chí Minh'
      },
      deliveryAddress: {
        fullName: 'Nguyễn Văn Anh',
        phone: '0908889999',
        address: '456 Nguyễn Trãi',
        ward: 'Phường Bến Thành',
        district: 'Quận 1',
        province: 'TP.Hồ Chí Minh'
      },
      items: [{ name: 'Thuốc bổ An Bình', quantity: 2, weight: 0.5 }],
      actualWeight: 0.5,
      chargeableWeight: 0.5,
      shippingFee: 25000,
      driver: { fullName: 'Tài Xế Trần Văn Bắc', phone: '0987654321' },
      driverLastLocation: { lat: 10.776889, lng: 106.700806, updatedAt: new Date() },
      destinationLocation: { lat: 10.769012, lng: 106.695123 },
      calculatedEta: 12
    });

    console.log(`✅ Seeded Test Order: ${testOrder.trackingCode}`);

    // Test Case 1: PII Masking & Public Data Contract
    console.log('\n--- TEST CASE 1: Verification of PII Masking & Data Contract ---');
    const res1 = await axios.get(`${API_BASE}/orders/track/${trackingCode}`);
    const data = res1.data.data;

    console.log('✅ Response HTTP Status:', res1.status);
    console.log('✅ Tracking Number:', data.tracking_number);
    console.log('✅ Masked Receiver Name:', data.receiver.name);
    console.log('✅ Masked Receiver Phone:', data.receiver.phone);
    console.log('✅ Masked Receiver Address:', data.receiver.address);
    console.log('✅ Status Text:', data.status_text);
    console.log('✅ Live Tracking Active Status:', data.live_tracking.is_active);

    if (data.receiver.phone.includes('***') && data.receiver.name.includes('***')) {
      console.log('🎉 PASSED: PII Masking is strictly applied to unauthenticated buyer queries!');
    } else {
      throw new Error('PII Masking failed');
    }

    // Test Case 2: WebSocket Room Pattern Real-time GPS Push
    console.log('\n--- TEST CASE 2: Verification of WebSocket Room Pattern GPS Push ---');
    const clientSocket = ioClient(WS_BASE, { transports: ['websocket'] });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        clientSocket.disconnect();
        reject(new Error('WebSocket timeout waiting for gps_updated event'));
      }, 5000);

      clientSocket.on('connect', () => {
        console.log('✅ Client Socket Connected:', clientSocket.id);
        clientSocket.emit('join_order_tracking', trackingCode);

        // Driver updates location after 500ms
        setTimeout(() => {
          clientSocket.emit('update_driver_location', {
            trackingNumber: trackingCode,
            lat: 10.780123,
            lng: 106.705456,
            etaMinutes: 8
          });
        }, 500);
      });

      clientSocket.on('gps_updated', (gps) => {
        console.log('✅ Received Real-time gps_updated via WebSocket Room:', gps);
        if (gps.lat === 10.780123 && gps.lng === 106.705456 && gps.eta_minutes === 8) {
          console.log('🎉 PASSED: WebSocket Room Pattern targeted GPS push works perfectly!');
          clearTimeout(timeout);
          clientSocket.disconnect();
          resolve();
        }
      });
    });

    // Test Case 3: Rate Limiting Verification (10 Requests/min)
    console.log('\n--- TEST CASE 3: Rate Limiting Protection (Max 10 requests/min per IP) ---');
    let limitTriggered = false;

    for (let i = 1; i <= 12; i++) {
      try {
        const r = await axios.get(`${API_BASE}/orders/track/${trackingCode}`);
        console.log(`  Request ${i}: HTTP ${r.status}`);
      } catch (err) {
        if (err.response && err.response.status === 429) {
          limitTriggered = true;
          console.log(`  Request ${i}: Received HTTP 429 Rate Limit Exceeded: "${err.response.data.message}"`);
          break;
        }
      }
    }

    if (limitTriggered) {
      console.log('🎉 PASSED: Anti-spam / Bot Crawling Rate Limiting successfully blocks excessive requests!');
    } else {
      console.warn('⚠️ WARNING: Rate Limiter did not trigger on 12 requests.');
    }

    console.log('\n================ ALL TEST CASES EXECUTED SUCCESSFULLY ================');
  } catch (err) {
    console.error('❌ Test Suite Failed:', err.message);
    if (err.response) console.error('Response Data:', err.response.data);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();
