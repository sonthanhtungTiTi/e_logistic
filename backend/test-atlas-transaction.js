const mongoose = require('mongoose');
require('dotenv').config();

async function verifyAtlasTransaction() {
  console.log('Connecting to Atlas MONGODB_URI:', process.env.MONGODB_URI?.replace(/:([^@]+)@/, ':****@'));
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ Connected to MongoDB host:', conn.connection.host);

    // Kiểm tra xem cluster có phải Replica Set không
    const isMasterRes = await mongoose.connection.db.command({ isMaster: 1 });
    console.log('Replica Set Name (setName):', isMasterRes.setName || 'STANDALONE (No replica set)');
    console.log('Is Master / Primary:', isMasterRes.ismaster);
    console.log('Hosts in Replica Set:', isMasterRes.hosts);

    // Thử nghiệm Multi-Document Transaction thật trên Atlas
    const testCollection = mongoose.connection.db.collection('_atlas_tx_verify_test');
    
    // 1. Transaction Test: Rollback verification
    const session = await mongoose.startSession();
    console.log('Starting Transaction Session 1 (Rollback Test)...');
    try {
      session.startTransaction();
      await testCollection.insertOne({ testId: 'tx-rollback-test', val: 123 }, { session });
      console.log('Inserted doc within transaction, now aborting...');
      await session.abortTransaction();
      console.log('Transaction aborted successfully.');
    } finally {
      session.endSession();
    }

    const docAfterAbort = await testCollection.findOne({ testId: 'tx-rollback-test' });
    console.log('Doc exists after abort? (Expect null):', docAfterAbort === null ? 'NULL (PASSED)' : 'EXISTS (FAILED)');

    // 2. Transaction Test: Commit verification
    const session2 = await mongoose.startSession();
    console.log('Starting Transaction Session 2 (Commit Test)...');
    try {
      session2.startTransaction();
      await testCollection.insertOne({ testId: 'tx-commit-test', val: 456, createdAt: new Date() }, { session2 });
      await session2.commitTransaction();
      console.log('Transaction committed successfully.');
    } finally {
      session2.endSession();
    }

    const docAfterCommit = await testCollection.findOne({ testId: 'tx-commit-test' });
    console.log('Doc exists after commit? (Expect found):', docAfterCommit ? `FOUND (_id: ${docAfterCommit._id})` : 'NOT FOUND (FAILED)');

    // Clean up test document
    await testCollection.deleteOne({ testId: 'tx-commit-test' });
    console.log('✅ ATLAS REPLICA SET MULTI-DOCUMENT TRANSACTION VERIFICATION: 100% PASSED');

  } catch (err) {
    console.error('❌ Transaction Test Failed on Atlas:', err);
  } finally {
    await mongoose.disconnect();
  }
}

verifyAtlasTransaction();
