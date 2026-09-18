const mongoose = require('mongoose');
require('dotenv').config();
const Ticket = require('./src/models/ticket.model');

async function runStepC3_3Verify() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

    // Đọc document qua Mongoose Model (không dùng .lean(), không dùng native driver)
    const t = await Ticket.findOne({ ticketCode: 'TK-LIVE-0001' });

    console.log('=== BƯỚC C3.3: VERIFY MONGOOSE MODEL PARSING ===\n');
    console.log('ticketCode:', t.ticketCode);
    console.log('t.sla.is24x7:', t.sla.is24x7);
    console.log('typeof t.sla.is24x7:', typeof t.sla.is24x7);
    console.log('Full t.sla object via Mongoose:', JSON.stringify(t.sla, null, 2));

    // Thử gọi .save() qua Mongoose để kiểm tra strict mode
    await t.save();
    console.log('\n✅ t.save() thành công qua Mongoose Model.');

    // Đọc lại lần nữa sau khi save
    const tReloaded = await Ticket.findOne({ ticketCode: 'TK-LIVE-0001' });
    console.log('tReloaded.sla.is24x7 sau save():', tReloaded.sla.is24x7);

  } catch (err) {
    console.error('Error in step C3.3 verify:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

runStepC3_3Verify();
