const mongoose = require('mongoose');
require('dotenv').config();
const Ticket = require('./src/models/ticket.model');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const tickets = await Ticket.find({ ticketCode: { $in: ['TK-LIVE-0001', 'TK-20260917-0001'] } }).lean();
    console.log('--- FOUND TICKETS ---');
    console.log(JSON.stringify(tickets, null, 2));

    const recent = await Ticket.find().sort({ createdAt: -1 }).limit(5).select('ticketCode status priority category assignedTo assigneeId attachments createdAt').lean();
    console.log('--- RECENT 5 TICKETS ---');
    console.log(JSON.stringify(recent, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}
check();
