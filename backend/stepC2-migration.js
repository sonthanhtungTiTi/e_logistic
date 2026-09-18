const mongoose = require('mongoose');
require('dotenv').config();
const { computeDueDates } = require('./src/services/slaCalculator.service');

async function runStepC2Migration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    const ticketsCol = db.collection('tickets');

    const filter = { ticketCode: 'TK-LIVE-0001' };

    // 1. In dữ liệu hiện tại trước khi update
    const beforeDoc = await ticketsCol.findOne(filter);
    console.log('--- DỮ LIỆU TRƯỚC KHI MIGRATION (TK-LIVE-0001) ---');
    console.log(JSON.stringify({
      ticketCode: beforeDoc?.ticketCode,
      category: beforeDoc?.category,
      priority: beforeDoc?.priority,
      status: beforeDoc?.status,
      sla: beforeDoc?.sla
    }, null, 2));

    if (!beforeDoc) {
      console.log('Không tìm thấy ticket TK-LIVE-0001 để update.');
      return;
    }

    // 2. Tính toán SLA deadlines mới theo tier P2 từ thời điểm hiện tại (now)
    const now = new Date();
    const slaDates = await computeDueDates({ priority: 'P2', createdAt: now }, { now });

    // 3. Thực hiện update có điều kiện idempotent
    const updateResult = await ticketsCol.updateOne(
      filter,
      {
        $set: {
          priority: 'P2',
          'sla.firstResponseDueAt': slaDates.firstResponseDueAt,
          'sla.resolutionDueAt': slaDates.resolutionDueAt,
          'sla.is24x7': slaDates.is24x7 || false,
          'sla.breachedFirstResponse': false,
          'sla.breachedResolution': false,
          'sla.warnedFirstResponse': false,
          'sla.warnedResolution': false,
          updatedAt: now
        }
      }
    );

    console.log('\n--- KẾT QUẢ UPDATE MIGRATION ---');
    console.log(`matchedCount: ${updateResult.matchedCount}`);
    console.log(`modifiedCount: ${updateResult.modifiedCount}`);
    console.log(`acknowledged: ${updateResult.acknowledged}`);

    // 4. In dữ liệu sau khi update để verify
    const afterDoc = await ticketsCol.findOne(filter);
    console.log('\n--- DỮ LIỆU SAU KHI MIGRATION (TK-LIVE-0001) ---');
    console.log(JSON.stringify({
      ticketCode: afterDoc?.ticketCode,
      category: afterDoc?.category,
      priority: afterDoc?.priority,
      status: afterDoc?.status,
      sla: afterDoc?.sla
    }, null, 2));

  } catch (err) {
    console.error('Migration Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

runStepC2Migration();
