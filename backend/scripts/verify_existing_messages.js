const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verifyMessages() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic';
  await mongoose.connect(mongoURI);

  const db = mongoose.connection.db;
  const ticketsColl = db.collection('tickets');
  const ticketMessagesColl = db.collection('ticketmessages');

  const totalTickets = await ticketsColl.countDocuments();
  const ticketsWithEmbeddedMessages = await ticketsColl.countDocuments({ messages: { $exists: true, $not: { $size: 0 } } });
  const totalExtractedMessages = await ticketMessagesColl.countDocuments();

  console.log('--- MESSAGES VERIFICATION REPORT ---');
  console.log(`- Total Tickets in collection: ${totalTickets}`);
  console.log(`- Tickets with embedded messages[]: ${ticketsWithEmbeddedMessages}`);
  console.log(`- Total Extracted Messages in ticketmessages: ${totalExtractedMessages}`);

  const sampleTicketWithMessage = await ticketsColl.findOne({ messages: { $exists: true, $not: { $size: 0 } } });
  if (sampleTicketWithMessage) {
    console.log(`- Sample Ticket ID: ${sampleTicketWithMessage._id}, TicketCode: ${sampleTicketWithMessage.ticketCode}`);
    console.log(`- Sample Embedded Messages Count: ${sampleTicketWithMessage.messages.length}`);
    console.log(`- Sample First Message Body: "${sampleTicketWithMessage.messages[0]?.message || sampleTicketWithMessage.messages[0]?.body || ''}"`);
  } else {
    console.log('- Note: No tickets found with non-empty embedded messages[] array directly on ticket documents.');
  }

  const sampleExtractedMsg = await ticketMessagesColl.findOne({});
  if (sampleExtractedMsg) {
    console.log(`- Sample Extracted TicketMessage document ID: ${sampleExtractedMsg._id}, Ticket ID: ${sampleExtractedMsg.ticketId}, Body: "${sampleExtractedMsg.body}"`);
  }

  await mongoose.disconnect();
}

verifyMessages().catch(err => {
  console.error('Error verifying messages:', err);
  process.exit(1);
});
