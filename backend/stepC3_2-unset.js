const mongoose = require('mongoose');
require('dotenv').config();

async function runStepC3_2() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    const ticketsCol = db.collection('tickets');

    // 1. Chạy updateMany unset assignedTo
    const updateResult = await ticketsCol.updateMany({}, { $unset: { assignedTo: '' } });

    console.log('=== KẾT QUẢ UPDATE UNSET ASSIGNEDTO ===');
    console.log(`matchedCount: ${updateResult.matchedCount}`);
    console.log(`modifiedCount: ${updateResult.modifiedCount}`);
    console.log(`acknowledged: ${updateResult.acknowledged}`);

    // 2. Chạy lại truy vấn để verify
    const verifyResults = await ticketsCol
      .find({}, { projection: { ticketCode: 1, assignedTo: 1, assigneeId: 1, status: 1, _id: 0 } })
      .sort({ createdAt: 1 })
      .toArray();

    console.log('\n=== BƯỚC C3.2: TOÀN BỘ 12 DOCUMENT SAU KHI UNSET ===\n');
    console.log(JSON.stringify(verifyResults, null, 2));

  } catch (err) {
    console.error('Error in step C3.2:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

runStepC3_2();
