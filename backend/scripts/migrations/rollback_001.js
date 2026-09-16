const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function rollback() {
  console.log('🔄 Starting Rollback Migration 001...');

  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic';
  await mongoose.connect(mongoURI);
  console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);

  const db = mongoose.connection.db;
  const ticketsColl = db.collection('tickets');
  const ticketMessagesColl = db.collection('ticketmessages');

  // Gỡ các trường mới thêm nếu cần (hoặc giữ nguyên không xoá field dữ liệu cũ)
  // Vì migration 001 giữ nguyên mảng messages[] cũ trong tickets collection nên dữ liệu cũ không bị mất!
  console.log('🗑️ Cleaning extracted ticketmessages collection...');
  const deleteResult = await ticketMessagesColl.deleteMany({});
  console.log(`✅ Removed ${deleteResult.deletedCount} extracted messages from ticketmessages.`);

  console.log('\n==================================================');
  console.log('🎉 ROLLBACK 001 COMPLETED SUCCESSFULLY!');
  console.log('==================================================\n');

  await mongoose.disconnect();
}

rollback().catch((err) => {
  console.error('❌ Rollback 001 Failed:', err);
  process.exit(1);
});
