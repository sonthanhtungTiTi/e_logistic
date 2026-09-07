const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  const shippers = await User.find({
    role: { $in: ['SHIPPER', 'LOCAL_SHIPPER', 'DRIVER', 'LINE_HAUL_DRIVER'] },
  }).select('email fullName role operatingArea hubId vehicleInfo');
  console.log('Current Shippers in DB:', JSON.stringify(shippers, null, 2));
  await mongoose.disconnect();
}

run().catch(console.error);
