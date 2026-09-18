const mongoose = require('mongoose');
require('dotenv').config();

async function runMigration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    const ticketsCol = db.collection('tickets');

    const filter = {
      assigneeId: null,
      assignedTo: { $ne: null }
    };

    // 1. In ra danh sách ticketCode sẽ bị ảnh hưởng trước khi update
    const targetDocs = await ticketsCol.find(filter).project({ ticketCode: 1, assignedTo: 1 }).toArray();
    console.log('--- TICKETS TO BE MIGRATED ---');
    console.log(JSON.stringify(targetDocs, null, 2));

    // 2. Chạy migration: copy assignedTo sang assigneeId
    const result = await ticketsCol.updateMany(
      filter,
      [
        {
          $set: {
            assigneeId: '$assignedTo'
          }
        }
      ]
    );

    console.log('--- MIGRATION RESULT ---');
    console.log(`matchedCount: ${result.matchedCount}`);
    console.log(`modifiedCount: ${result.modifiedCount}`);
    console.log(`acknowledged: ${result.acknowledged}`);
  } catch (err) {
    console.error('Migration Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

runMigration();
