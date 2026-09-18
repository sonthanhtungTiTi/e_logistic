const mongoose = require('mongoose');
require('dotenv').config();

async function runStepC3_1() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    const ticketsCol = db.collection('tickets');

    const results = await ticketsCol
      .find({}, { projection: { ticketCode: 1, assignedTo: 1, assigneeId: 1, status: 1, _id: 0 } })
      .sort({ createdAt: 1 })
      .toArray();

    console.log('=== BƯỚC C3.1: TOÀN BỘ 12 DOCUMENT TRONG DB ===\n');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Error in step C3.1:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

runStepC3_1();
