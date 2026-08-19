require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const app = require('../../src/app');
const Order = require('../../src/models/order.model');
const User = require('../../src/models/user.model');
const SystemConfig = require('../../src/models/systemConfig.model');
const seedConfig = require('../../seed-delivery-failure-config');
const checkStaleRedeliveryOrders = require('../../src/jobs/staleRedeliveryMonitor.job');
const generateToken = require('../../src/utils/generateToken');

const PORT = 5059;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runDeliveryFailureTestSuite() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU CHẠY BỘ TEST SUITE CHO CHỨC NĂNG BÁO GIAO THẤT BẠI');
  console.log('================================================================\n');

  const mongoURI = process.env.MONGODB_URI;
  await mongoose.connect(mongoURI);
  console.log('✅ MongoDB Connected.');

  // Seed System Config
  await seedConfig();

  const server = app.listen(PORT, async () => {
    console.log(`🚀 Test Server running on port ${PORT}\n`);

    try {
      // 1. Setup User Roles (Driver & Seller)
      const timestamp = Date.now();
      const driverUser = await User.create({
        fullName: 'Tài xế Test Driver',
        email: `driver_${timestamp}@example.com`,
        phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password123!',
        role: 'DRIVER',
        isActive: true,
      });

      const sellerUser = await User.create({
        fullName: 'Seller Test Shop',
        email: `seller_${timestamp}@example.com`,
        phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password123!',
        role: 'SELLER',
        isActive: true,
      });

      const driverToken = generateToken.generateAccessToken(driverUser._id);
      const sellerToken = generateToken.generateAccessToken(sellerUser._id);

      // Helper function to create an Order in DELIVERING status
      const createTestOrder = async (customStatus = 'DELIVERING') => {
        return await Order.create({
          trackingCode: `ELG-FAIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          sellerId: sellerUser._id,
          assignedDriverId: driverUser._id,
          status: customStatus,
          pickupAddress: {
            fullName: 'Shop Sender',
            phone: '0901112222',
            address: '123 Le Loi',
            ward: 'Phuong 1',
            district: 'Quan 1',
            province: 'TP. Hồ Chí Minh',
          },
          deliveryAddress: {
            fullName: 'Buyer Receiver',
            phone: '0903334444',
            address: '456 Nguyen Hue',
            ward: 'Phuong 2',
            district: 'Quan 1',
            province: 'TP. Hồ Chí Minh',
          },
          items: [{ name: 'Test Product', quantity: 1, weight: 1.0 }],
          actualWeight: 1.0,
          chargeableWeight: 1.0,
          shippingFee: 30000,
        });
      };

      // ----------------------------------------------------
      // TC DF-01: Báo thất bại lần 1 hợp lệ
      // ----------------------------------------------------
      console.log('📌 DF-01: Báo thất bại lần 1 hợp lệ (status -> PENDING_REDELIVERY)');
      const order1 = await createTestOrder('DELIVERING');
      const res1 = await fetch(`${BASE_URL}/orders/${order1._id}/delivery-failure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({
          reasonGroup: 'CANNOT_CONTACT',
          contactAttempts: 2,
          note: 'Đã gọi 2 lần không nghe máy',
          latitude: 10.7981,
          longitude: 106.7456,
          clientOfflineId: `uuid-df01-${Date.now()}`
        })
      });
      const data1 = await res1.json();
      const updatedOrder1 = await Order.findById(order1._id);

      console.log(`   HTTP Status: ${res1.status}`);
      console.log(`   Order Status: ${updatedOrder1.status}`);
      console.log(`   Failure Count: ${updatedOrder1.deliveryFailureCount}`);
      if (res1.status === 200 && updatedOrder1.status === 'PENDING_REDELIVERY' && updatedOrder1.deliveryFailureCount === 1) {
        console.log('✅ PASS DF-01\n');
      } else {
        console.log('❌ FAIL DF-01\n');
      }

      // ----------------------------------------------------
      // TC DF-02: Báo đủ số lần cấu hình (3 lần) -> DELIVERY_FAILED_PENDING_RETURN
      // ----------------------------------------------------
      console.log('📌 DF-02: Báo đủ 3 lần giao thất bại -> DELIVERY_FAILED_PENDING_RETURN');
      const order2 = await createTestOrder('DELIVERING');
      
      // Override config tạm thời để test không bị vướng khoảng cách thời gian
      await SystemConfig.findOneAndUpdate({ key: 'MIN_MINUTES_BETWEEN_FAILURE_REPORTS' }, { value: 0 });

      for (let i = 1; i <= 3; i++) {
        // Reset status to DELIVERING between attempts to simulate redelivery cycles
        await Order.findByIdAndUpdate(order2._id, { status: 'DELIVERING' });

        const res2 = await fetch(`${BASE_URL}/orders/${order2._id}/delivery-failure`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${driverToken}`
          },
          body: JSON.stringify({
            reasonGroup: 'CANNOT_CONTACT',
            contactAttempts: 2,
            clientOfflineId: `uuid-df02-step${i}-${Date.now()}`
          })
        });
        const data2 = await res2.json();
        console.log(`   Attempt ${i}: Status HTTP ${res2.status}`);
      }

      const updatedOrder2 = await Order.findById(order2._id);
      console.log(`   Final Order Status: ${updatedOrder2.status}`);
      console.log(`   Final Failure Count: ${updatedOrder2.deliveryFailureCount}`);

      if (updatedOrder2.status === 'DELIVERY_FAILED_PENDING_RETURN' && updatedOrder2.deliveryFailureCount === 3) {
        console.log('✅ PASS DF-02\n');
      } else {
        console.log('❌ FAIL DF-02\n');
      }

      // Restore min minutes config to 30 for subsequent tests
      await SystemConfig.findOneAndUpdate({ key: 'MIN_MINUTES_BETWEEN_FAILURE_REPORTS' }, { value: 30 });

      // ----------------------------------------------------
      // TC DF-03: Báo thất bại khi đơn không ở DELIVERING
      // ----------------------------------------------------
      console.log('📌 DF-03: Báo thất bại khi đơn không ở DELIVERING (HTTP 409)');
      const order3 = await createTestOrder('CREATED');
      const res3 = await fetch(`${BASE_URL}/orders/${order3._id}/delivery-failure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({
          reasonGroup: 'CANNOT_CONTACT',
          clientOfflineId: `uuid-df03-${Date.now()}`
        })
      });
      console.log(`   HTTP Status: ${res3.status}`);
      if (res3.status === 409) {
        console.log('✅ PASS DF-03\n');
      } else {
        console.log('❌ FAIL DF-03\n');
      }

      // ----------------------------------------------------
      // TC DF-04: Báo 2 lần cách nhau < 30 phút (HTTP 429)
      // ----------------------------------------------------
      console.log('📌 DF-04: Báo 2 lần cách nhau < 30 phút (HTTP 429)');
      const order4 = await createTestOrder('DELIVERING');

      // Lần 1
      await fetch(`${BASE_URL}/orders/${order4._id}/delivery-failure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({
          reasonGroup: 'CANNOT_CONTACT',
          clientOfflineId: `uuid-df04-a-${Date.now()}`
        })
      });

      // Reset status back to DELIVERING immediately
      await Order.findByIdAndUpdate(order4._id, { status: 'DELIVERING' });

      // Lần 2 (ngay lập tức < 30 phút)
      const res4 = await fetch(`${BASE_URL}/orders/${order4._id}/delivery-failure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({
          reasonGroup: 'CANNOT_CONTACT',
          clientOfflineId: `uuid-df04-b-${Date.now()}`
        })
      });
      const data4 = await res4.json();
      console.log(`   HTTP Status: ${res4.status}`);
      console.log(`   Message: ${data4.message}`);
      if (res4.status === 429 && data4.minutesRemaining) {
        console.log('✅ PASS DF-04\n');
      } else {
        console.log('❌ FAIL DF-04\n');
      }

      // ----------------------------------------------------
      // TC DF-05: CUSTOMER_REFUSED không có ảnh (HTTP 400)
      // ----------------------------------------------------
      console.log('📌 DF-05: CUSTOMER_REFUSED không có ảnh minh chứng (HTTP 400)');
      const order5 = await createTestOrder('DELIVERING');
      const res5 = await fetch(`${BASE_URL}/orders/${order5._id}/delivery-failure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({
          reasonGroup: 'CUSTOMER_REFUSED',
          proofImageUrls: [],
          clientOfflineId: `uuid-df05-${Date.now()}`
        })
      });
      console.log(`   HTTP Status: ${res5.status}`);
      if (res5.status === 400) {
        console.log('✅ PASS DF-05\n');
      } else {
        console.log('❌ FAIL DF-05\n');
      }

      // ----------------------------------------------------
      // TC DF-06: WRONG_ADDRESS với contactAttempts: 0 (HTTP 400)
      // ----------------------------------------------------
      console.log('📌 DF-06: WRONG_ADDRESS với contactAttempts: 0 (HTTP 400)');
      const order6 = await createTestOrder('DELIVERING');
      const res6 = await fetch(`${BASE_URL}/orders/${order6._id}/delivery-failure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({
          reasonGroup: 'WRONG_ADDRESS',
          contactAttempts: 0,
          clientOfflineId: `uuid-df06-${Date.now()}`
        })
      });
      console.log(`   HTTP Status: ${res6.status}`);
      if (res6.status === 400) {
        console.log('✅ PASS DF-06\n');
      } else {
        console.log('❌ FAIL DF-06\n');
      }

      // ----------------------------------------------------
      // TC DF-07: Mất GPS khi báo thất bại (isGpsMissing: true)
      // ----------------------------------------------------
      console.log('📌 DF-07: Mất GPS khi báo thất bại (isGpsMissing = true)');
      const order7 = await createTestOrder('DELIVERING');
      const res7 = await fetch(`${BASE_URL}/orders/${order7._id}/delivery-failure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({
          reasonGroup: 'CANNOT_CONTACT',
          clientOfflineId: `uuid-df07-${Date.now()}`
        })
      });
      const updatedOrder7 = await Order.findById(order7._id);
      const lastHistory7 = updatedOrder7.deliveryFailureHistory[0];
      console.log(`   HTTP Status: ${res7.status}`);
      console.log(`   isGpsMissing: ${lastHistory7?.gpsLocation?.isGpsMissing}`);
      if (res7.status === 200 && lastHistory7?.gpsLocation?.isGpsMissing === true) {
        console.log('✅ PASS DF-07\n');
      } else {
        console.log('❌ FAIL DF-07\n');
      }

      // ----------------------------------------------------
      // TC DF-08: Đồng bộ offline với clientOfflineId trùng
      // ----------------------------------------------------
      console.log('📌 DF-08: Đồng bộ offline với clientOfflineId trùng (Idempotency)');
      const order8 = await createTestOrder('DELIVERING');
      const clientOfflineIdDup = `uuid-df08-dup-${Date.now()}`;

      // Gọi lần 1
      await fetch(`${BASE_URL}/orders/${order8._id}/delivery-failure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({
          reasonGroup: 'CANNOT_CONTACT',
          clientOfflineId: clientOfflineIdDup
        })
      });

      // Reset status back to DELIVERING to check if idempotency stops second increment
      await Order.findByIdAndUpdate(order8._id, { status: 'DELIVERING' });

      // Gọi lần 2 với cùng clientOfflineId
      const res8 = await fetch(`${BASE_URL}/orders/${order8._id}/delivery-failure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({
          reasonGroup: 'CANNOT_CONTACT',
          clientOfflineId: clientOfflineIdDup
        })
      });
      const data8 = await res8.json();
      const updatedOrder8 = await Order.findById(order8._id);

      console.log(`   HTTP Status: ${res8.status}`);
      console.log(`   alreadyProcessed: ${data8.alreadyProcessed}`);
      console.log(`   Failure Count: ${updatedOrder8.deliveryFailureCount}`);
      if (res8.status === 200 && data8.alreadyProcessed === true && updatedOrder8.deliveryFailureCount === 1) {
        console.log('✅ PASS DF-08\n');
      } else {
        console.log('❌ FAIL DF-08\n');
      }

      // ----------------------------------------------------
      // TC DF-09: Batch sync offline (1 report lỗi giữa chừng)
      // ----------------------------------------------------
      console.log('📌 DF-09: Batch sync offline (3 reports, 1 orderId không tồn tại)');
      const order9a = await createTestOrder('DELIVERING');
      const order9b = await createTestOrder('DELIVERING');
      const fakeOrderId = new mongoose.Types.ObjectId().toString();

      const batchSyncPayload = {
        reports: [
          {
            orderId: order9a._id.toString(),
            reasonGroup: 'CANNOT_CONTACT',
            clientOfflineId: `uuid-df09-a-${Date.now()}`
          },
          {
            orderId: fakeOrderId,
            reasonGroup: 'CANNOT_CONTACT',
            clientOfflineId: `uuid-df09-b-${Date.now()}`
          },
          {
            orderId: order9b._id.toString(),
            reasonGroup: 'CANNOT_CONTACT',
            clientOfflineId: `uuid-df09-c-${Date.now()}`
          }
        ]
      };

      const res9 = await fetch(`${BASE_URL}/delivery-failure/sync-offline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify(batchSyncPayload)
      });
      const data9 = await res9.json();

      console.log(`   Synced Count: ${data9.syncedCount}/${data9.totalCount}`);
      console.log(`   Results:`, data9.results);
      if (res9.status === 200 && data9.syncedCount === 2 && data9.results[1].success === false) {
        console.log('✅ PASS DF-09\n');
      } else {
        console.log('❌ FAIL DF-09\n');
      }

      // ----------------------------------------------------
      // TC DF-10: Notification service giả lập lỗi (API vẫn trả 200)
      // ----------------------------------------------------
      console.log('📌 DF-10: Notification service giả lập lỗi (API vẫn 200, không rollback)');
      const notificationService = require('../../src/services/notification.service');
      const originalSendNotification = notificationService.sendNotification;

      // Mock notificationService.sendNotification to throw an exception
      notificationService.sendNotification = async () => {
        throw new Error('Simulated Notification Gateway Error');
      };

      const order10 = await createTestOrder('DELIVERING');
      const res10 = await fetch(`${BASE_URL}/orders/${order10._id}/delivery-failure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({
          reasonGroup: 'CANNOT_CONTACT',
          clientOfflineId: `uuid-df10-${Date.now()}`
        })
      });

      const updatedOrder10 = await Order.findById(order10._id);

      // Restore original sendNotification
      notificationService.sendNotification = originalSendNotification;

      console.log(`   HTTP Status: ${res10.status}`);
      console.log(`   Order Status: ${updatedOrder10.status}`);
      if (res10.status === 200 && updatedOrder10.status === 'PENDING_REDELIVERY') {
        console.log('✅ PASS DF-10\n');
      } else {
        console.log('❌ FAIL DF-10\n');
      }

      // ----------------------------------------------------
      // TC DF-11: Background job giám sát đơn "Chờ giao lại" quá 48h
      // ----------------------------------------------------
      console.log('📌 DF-11: Background job giám sát đơn PENDING_REDELIVERY quá 48h');
      const staleOrder = await Order.create({
        trackingCode: `ELG-STALE-${Date.now()}`,
        sellerId: sellerUser._id,
        assignedDriverId: driverUser._id,
        dispatcherId: sellerUser._id,
        status: 'PENDING_REDELIVERY',
        pickupAddress: { fullName: 'Shop', phone: '0901', address: 'A', ward: 'W', district: 'D', province: 'P' },
        deliveryAddress: { fullName: 'Buyer', phone: '0902', address: 'B', ward: 'W', district: 'D', province: 'P' },
        items: [{ name: 'Item', quantity: 1, weight: 1.0 }],
        actualWeight: 1.0,
        chargeableWeight: 1.0,
        shippingFee: 30000,
      });

      // Override updatedAt directly in MongoDB to bypass Mongoose automatic timestamp
      await Order.updateOne(
        { _id: staleOrder._id },
        { $set: { updatedAt: new Date(Date.now() - 50 * 60 * 60 * 1000) } },
        { timestamps: false }
      );

      const flaggedStaleOrders = await checkStaleRedeliveryOrders();
      const foundStale = flaggedStaleOrders.some(o => o._id.toString() === staleOrder._id.toString());
      console.log(`   Found stale order in cron output: ${foundStale}`);
      if (foundStale) {
        console.log('✅ PASS DF-11\n');
      } else {
        console.log('❌ FAIL DF-11\n');
      }

      // ----------------------------------------------------
      // TC DF-12: Role không phải DRIVER gọi API (HTTP 403)
      // ----------------------------------------------------
      console.log('📌 DF-12: Calling API with SELLER token (HTTP 403 Forbidden)');
      const order12 = await createTestOrder('DELIVERING');
      const res12 = await fetch(`${BASE_URL}/orders/${order12._id}/delivery-failure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sellerToken}`
        },
        body: JSON.stringify({
          reasonGroup: 'CANNOT_CONTACT',
          clientOfflineId: `uuid-df12-${Date.now()}`
        })
      });
      console.log(`   HTTP Status: ${res12.status}`);
      if (res12.status === 403) {
        console.log('✅ PASS DF-12\n');
      } else {
        console.log('❌ FAIL DF-12\n');
      }

    } catch (err) {
      console.error('❌ Lỗi trong quá trình chạy Delivery Failure Test Suite:', err);
    } finally {
      server.close();
      await mongoose.disconnect();
      console.log('🏁 Đã hoàn thành Delivery Failure test suite và đóng kết nối.');
      process.exit(0);
    }
  });
}

runDeliveryFailureTestSuite();
