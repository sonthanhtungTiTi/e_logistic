const mongoose = require('mongoose');
require('dotenv').config();
const { resolvePriority, computePriority, computeIsVip } = require('./src/services/ticketPriority.service');
const Order = require('./src/models/order.model');

async function runStepC2() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    const ticketsCol = db.collection('tickets');

    const legacyPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
    const count = await ticketsCol.countDocuments({ priority: { $in: legacyPriorities } });

    console.log('COUNT_LEGACY_PRIORITY_TICKETS:', count);

    if (count > 0) {
      const tickets = await ticketsCol
        .find({ priority: { $in: legacyPriorities } })
        .limit(20)
        .toArray();

      console.log(`\n--- CHI TIẾT ${tickets.length} TICKET (TỐI ĐA 20) ---`);
      
      const comparisonRows = [];

      for (const t of tickets) {
        let order = null;
        if (t.orderId) {
          order = await Order.findById(t.orderId).lean();
        } else if (t.orderTrackingCode || t.trackingCode) {
          order = await Order.findOne({ trackingCode: (t.orderTrackingCode || t.trackingCode).trim().toUpperCase() }).lean();
        }

        const isVip = t.sellerId ? await computeIsVip(t.sellerId, null, Order) : false;
        const autoPriority = computePriority(t, order, { isVip });
        const newPriority = resolvePriority(t.priority, autoPriority);

        comparisonRows.push({
          ticketCode: t.ticketCode,
          category: t.category,
          currentPriority: t.priority,
          orderStatus: order?.status || 'N/A',
          codAmount: order ? Number(order.codAmount || order.cod || 0) : 0,
          isVip,
          autoPriority,
          newPriority,
          changed: t.priority !== newPriority,
          status: t.status,
          createdAt: t.createdAt
        });
      }

      console.table(comparisonRows.map(r => ({
        'Mã Ticket': r.ticketCode,
        'Phân loại': r.category,
        'Priority cũ (sai)': r.currentPriority,
        'Auto tính': r.autoPriority,
        'Priority mới (dự kiến)': r.newPriority,
        'Thay đổi': r.changed ? 'CÓ' : 'KHÔNG',
        'Trạng thái': r.status
      })));

      console.log('\n--- RAW JSON DATA ---');
      console.log(JSON.stringify(comparisonRows, null, 2));
    } else {
      console.log('Không có ticket nào đang lưu format LOW/NORMAL/HIGH/URGENT.');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

runStepC2();
