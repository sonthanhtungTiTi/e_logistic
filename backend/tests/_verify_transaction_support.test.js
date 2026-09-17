const mongoose = require('mongoose');

test('mongodb-memory-server supports transactions', async () => {
  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    // no-op
  });
  await session.endSession();
});
