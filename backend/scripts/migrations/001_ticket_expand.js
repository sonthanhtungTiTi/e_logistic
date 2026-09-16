const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

// Helper format ticketCode: TK-YYYYMMDD-NNNN
function formatTicketCode(date, seq) {
  const d = new Date(date || Date.now());
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const seqStr = String(seq).padStart(4, '0');
  return `TK-${yyyy}${mm}${dd}-${seqStr}`;
}

async function runMigration() {
  const startTime = Date.now();
  console.log('🚀 Start Migration 001: Expand Ticket Schema & Extract Ticket Messages...');

  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic';
  await mongoose.connect(mongoURI);
  console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);

  const db = mongoose.connection.db;
  const ticketsColl = db.collection('tickets');
  const ticketMessagesColl = db.collection('ticketmessages');
  const ordersColl = db.collection('orders');

  // 1. Tạo indexes ở background (an toàn nếu index đã tồn tại)
  console.log('📦 Creating background indexes...');
  const createIndexSafe = async (coll, keys, options) => {
    try {
      await coll.createIndex(keys, options);
    } catch (err) {
      if (err.code !== 86 && err.codeName !== 'IndexKeySpecsConflict') {
        throw err;
      }
    }
  };

  await Promise.all([
    createIndexSafe(ticketsColl, { ticketCode: 1 }, { unique: true, background: true }),
    createIndexSafe(ticketsColl, { status: 1, priority: 1, 'sla.resolutionDueAt': 1 }, { background: true }),
    createIndexSafe(ticketsColl, { assigneeId: 1, status: 1 }, { background: true }),
    createIndexSafe(ticketsColl, { orderTrackingCode: 1 }, { background: true }),
    createIndexSafe(ticketsColl, { sellerId: 1, createdAt: -1 }, { background: true }),
    createIndexSafe(ticketMessagesColl, { ticketId: 1, seq: 1 }, { unique: true, background: true }),
    createIndexSafe(ticketMessagesColl, { ticketId: 1, clientMsgId: 1 }, { unique: true, background: true, partialFilterExpression: { clientMsgId: { $type: 'string' } } }),
  ]);
  console.log('✅ Background indexes created.');

  // 2. Fetch all tickets
  const cursor = ticketsColl.find({});
  const totalTickets = await ticketsColl.countDocuments();
  console.log(`🔍 Found ${totalTickets} tickets to process.`);

  let updatedCount = 0;
  let totalMessagesExtracted = 0;
  let batchOps = [];
  let seqCounter = 1;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();

    // Mapping priority cũ sang P1..P4
    let mappedPriority = 'P3';
    if (doc.priority === 'URGENT') mappedPriority = 'P1';
    else if (doc.priority === 'HIGH') mappedPriority = 'P2';
    else if (doc.priority === 'NORMAL') mappedPriority = 'P3';
    else if (doc.priority === 'LOW') mappedPriority = 'P4';
    else if (['P1', 'P2', 'P3', 'P4'].includes(doc.priority)) mappedPriority = doc.priority;

    // Mapping status cũ sang 9 status mới
    let mappedStatus = doc.status || 'NEW';
    if (doc.status === 'OPEN') mappedStatus = 'NEW';

    // Tạo code mới nếu chưa có
    const ticketCode = doc.ticketCode && doc.ticketCode.startsWith('TK-')
      ? doc.ticketCode
      : formatTicketCode(doc.createdAt, seqCounter++);

    // Look up tracking code
    let orderTrackingCode = doc.orderTrackingCode || doc.trackingCode || '';

    // Data update cho document ticket
    const updatePayload = {
      $set: {
        ticketCode,
        category: doc.category || 'OTHER',
        subCategory: doc.subCategory || '',
        priority: mappedPriority,
        channel: doc.channel || 'WEB',
        status: mappedStatus,
        requesterRole: doc.requesterRole || 'SELLER',
        assigneeId: doc.assigneeId || doc.assignedTo || null,
        assignedAt: doc.assignedAt || (doc.assignedTo ? (doc.updatedAt || doc.createdAt) : null),
        watcherIds: doc.watcherIds || [],
        orderTrackingCode,
        sla: doc.sla || {
          firstResponseDueAt: null,
          firstRespondedAt: null,
          resolutionDueAt: null,
          resolvedAt: doc.resolvedAt || null,
          breachedFirstResponse: false,
          breachedResolution: false,
          pausedMs: 0,
        },
        compensation: doc.compensation || {
          proposedAmount: 0,
          proposedBy: null,
          proposedAt: null,
          approvedBy: null,
          approvedAt: null,
          rejectReason: '',
          idempotencyKey: null,
          ledgerEntryId: null,
          state: 'NONE',
        },
        attachments: doc.attachments || [],
        csat: doc.csat || { score: null, comment: '', submittedAt: null },
        tags: doc.tags || [],
      },
    };

    batchOps.push({
      updateOne: {
        filter: { _id: doc._id },
        update: updatePayload,
      },
    });

    // 3. Extract messages[] sang collection ticketmessages (Idempotent)
    if (Array.isArray(doc.messages) && doc.messages.length > 0) {
      // Check count existing messages in ticketmessages for this ticket
      const existingCount = await ticketMessagesColl.countDocuments({ ticketId: doc._id });
      if (existingCount === 0) {
        const msgDocs = doc.messages.map((m, idx) => ({
          ticketId: doc._id,
          seq: idx + 1,
          senderId: m.senderId,
          senderName: m.senderName || 'N/A',
          senderRole: m.senderRole || 'SELLER',
          visibility: m.visibility || 'PUBLIC',
          body: m.message || m.body || '',
          attachments: m.attachments || [],
          clientMsgId: null,
          createdAt: m.createdAt || new Date(),
        }));

        if (msgDocs.length > 0) {
          await ticketMessagesColl.insertMany(msgDocs, { ordered: false }).catch(() => {});
          totalMessagesExtracted += msgDocs.length;
        }
      }
    }

    // Process batch 1000
    if (batchOps.length >= 1000) {
      await ticketsColl.bulkWrite(batchOps, { ordered: false });
      updatedCount += batchOps.length;
      console.log(`  ... Processed batch of ${batchOps.length} tickets (${updatedCount}/${totalTickets})`);
      batchOps = [];
    }
  }

  if (batchOps.length > 0) {
    await ticketsColl.bulkWrite(batchOps, { ordered: false });
    updatedCount += batchOps.length;
  }

  const durationMs = Date.now() - startTime;
  console.log('\n==================================================');
  console.log('🎉 MIGRATION 001 COMPLETED SUCCESSFULLY!');
  console.log(`- Total Tickets Processed: ${updatedCount}`);
  console.log(`- Total Messages Extracted: ${totalMessagesExtracted}`);
  console.log(`- Duration: ${durationMs}ms`);
  console.log('==================================================\n');

  await mongoose.disconnect();
}

runMigration().catch((err) => {
  console.error('❌ Migration 001 Failed:', err);
  process.exit(1);
});
