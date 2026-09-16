const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function verify() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic';
  await mongoose.connect(mongoURI);

  const db = mongoose.connection.db;
  const ticketsColl = db.collection('tickets');
  const messagesColl = db.collection('ticketmessages');

  const dupes = await ticketsColl.aggregate([
    { $group: { _id: '$ticketCode', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  const msgCount = await messagesColl.countDocuments();
  const ticketCount = await ticketsColl.countDocuments();

  console.log('--- MIGRATION 001 VERIFICATION REPORT ---');
  console.log(`- Total Tickets: ${ticketCount}`);
  console.log(`- Total Extracted Messages: ${msgCount}`);
  console.log(`- Duplicate TicketCodes: ${dupes.length}`);
  if (dupes.length === 0) {
    console.log('✅ VERIFICATION PASSED: No duplicate ticketCodes found.');
  } else {
    console.log('❌ VERIFICATION FAILED: Duplicates found:', dupes);
  }

  await mongoose.disconnect();
}

verify();
