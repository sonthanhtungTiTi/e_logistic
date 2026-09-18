const mongoose = require('mongoose');
require('dotenv').config();

async function runStepA() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    const ticketsCol = db.collection('tickets');

    const totalTickets = await ticketsCol.countDocuments({});

    const mismatchCount = await ticketsCol.countDocuments({
      assigneeId: null,
      assignedTo: { $ne: null }
    });

    const reverseMismatchCount = await ticketsCol.countDocuments({
      assigneeId: { $ne: null },
      assignedTo: null
    });

    console.log('TOTAL_TICKETS_IN_DB:', totalTickets);
    console.log('MISMATCH (assigneeId == null && assignedTo != null):', mismatchCount);
    console.log('REVERSE_MISMATCH (assigneeId != null && assignedTo == null):', reverseMismatchCount);

    if (mismatchCount > 0) {
      const docs = await ticketsCol
        .find({ assigneeId: null, assignedTo: { $ne: null } })
        .project({ ticketCode: 1, status: 1, assignedTo: 1, assigneeId: 1, createdAt: 1, subject: 1 })
        .limit(20)
        .toArray();

      console.log('--- TICKETS WITH MISMATCH (FIRST 20) ---');
      console.log(JSON.stringify(docs, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

runStepA();
