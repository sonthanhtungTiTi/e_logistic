const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const User = require('./src/models/user.model');
const Ticket = require('./src/models/ticket.model');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const csUser = await User.findOne({ role: { $in: ['CS', 'CUSTOMER_SERVICE', 'ADMIN'] } });
    const ticket = await Ticket.findOne();

    if (!csUser || !ticket) {
      console.log('No csUser or ticket found');
      return;
    }

    const token = jwt.sign(
      { id: csUser._id, role: csUser.role, csLevel: csUser.csLevel || 'L2' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('CS_USER: ' + csUser.email + ' (Role: ' + csUser.role + ')');
    console.log('TICKET_ID: ' + ticket._id + ' (' + ticket.ticketCode + ')');

    const res = await axios.get('http://localhost:5000/api/admin/tickets/' + ticket._id + '/context', {
      headers: { Authorization: 'Bearer ' + token },
    });

    console.log('\n--- VERBATIM CONTEXT OUTPUT (key "permissions" present) ---');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('API Error:', e.response ? e.response.data : e.message);
  } finally {
    await mongoose.disconnect();
  }
})();
