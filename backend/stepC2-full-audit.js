const mongoose = require('mongoose');
require('dotenv').config();
const { computePriority, computeIsVip } = require('./src/services/ticketPriority.service');
const Order = require('./src/models/order.model');

async function runFullAudit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    const ticketsCol = db.collection('tickets');

    const tickets = await ticketsCol.find({}).sort({ createdAt: 1 }).toArray();

    const results = [];

    for (const t of tickets) {
      let order = null;
      if (t.orderId) {
        order = await Order.findById(t.orderId).lean();
      } else if (t.orderTrackingCode || t.trackingCode) {
        order = await Order.findOne({
          trackingCode: (t.orderTrackingCode || t.trackingCode).trim().toUpperCase()
        }).lean();
      }

      const isVip = t.sellerId ? await computeIsVip(t.sellerId, null, Order) : false;
      const orderCod = order ? Number(order.codAmount || order.cod || 0) : 0;
      const orderStatus = order?.status || 'N/A';

      const autoComputed = computePriority(t, order, { isVip });
      const isMatch = t.priority === autoComputed;
      const isClosedOrResolved = ['RESOLVED', 'CLOSED'].includes(t.status);

      results.push({
        ticketCode: t.ticketCode,
        category: t.category,
        ticketStatus: t.status,
        currentPriority: t.priority,
        autoPriority: autoComputed,
        isMatch: isMatch ? 'KHỚP' : 'LỆCH',
        orderTrackingCode: order?.trackingCode || t.orderTrackingCode || t.trackingCode || 'N/A',
        orderStatus,
        codAmount: orderCod,
        isVip,
        isClosedOrResolved,
        recommendation: !isMatch
          ? isClosedOrResolved
            ? 'GIỮ NGUYÊN (Đã đóng/Resolved)'
            : `ĐỀ XUẤT CẬP NHẬT: ${autoComputed}`
          : 'KHÔNG ĐỔI'
      });
    }

    console.log('--- BẢNG ĐỐI CHIẾU TOÀN BỘ 12 TICKET ---');
    console.table(
      results.map(r => ({
        'Mã Ticket': r.ticketCode,
        'Category': r.category,
        'Status Ticket': r.ticketStatus,
        'DB Priority': r.currentPriority,
        'Auto Priority': r.autoPriority,
        'Đối chiếu': r.isMatch,
        'COD Amount': r.codAmount.toLocaleString('vi-VN') + ' đ',
        'Order Status': r.orderStatus,
        'VIP': r.isVip ? 'CÓ' : 'KHÔNG',
        'Khuyến nghị': r.recommendation
      }))
    );

    console.log('\n--- CHI TIẾT CÁC TICKET BỊ LỆCH ---');
    const mismatches = results.filter(r => r.isMatch === 'LỆCH');
    console.log(JSON.stringify(mismatches, null, 2));

  } catch (err) {
    console.error('Audit Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

runFullAudit();
