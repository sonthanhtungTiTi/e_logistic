const mongoose = require('mongoose');
require('dotenv').config();
const Ticket = require('./src/models/ticket.model');

async function runStep0SchemaDiff() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    const ticketsCol = db.collection('tickets');

    // 1. Lấy toàn bộ paths trực tiếp và lồng nhau được khai báo trong schema
    const declaredRootPaths = new Set(Object.keys(Ticket.schema.paths).map(p => p.split('.')[0]));
    declaredRootPaths.add('_id');
    declaredRootPaths.add('__v');

    const declaredSlaPaths = new Set(
      Object.keys(Ticket.schema.paths)
        .filter(p => p.startsWith('sla.'))
        .map(p => p.replace('sla.', ''))
    );

    const declaredCompensationPaths = new Set(
      Object.keys(Ticket.schema.paths)
        .filter(p => p.startsWith('compensation.'))
        .map(p => p.replace('compensation.', ''))
    );

    const declaredCsatPaths = new Set(
      Object.keys(Ticket.schema.paths)
        .filter(p => p.startsWith('csat.'))
        .map(p => p.replace('csat.', ''))
    );

    const tickets = await ticketsCol.find({}).sort({ createdAt: 1 }).toArray();

    console.log('=== KẾT QUẢ QUÉT FIELD LẠ TRONG 12 TICKET ===\n');

    const diffResults = [];

    for (const t of tickets) {
      const extraFields = [];

      // Quét root fields lạ
      for (const key of Object.keys(t)) {
        if (!declaredRootPaths.has(key)) {
          extraFields.push(`[ROOT].${key} (${typeof t[key]})`);
        }
      }

      // Quét sub-fields lạ trong sla
      if (t.sla && typeof t.sla === 'object') {
        for (const subKey of Object.keys(t.sla)) {
          if (!declaredSlaPaths.has(subKey)) {
            extraFields.push(`sla.${subKey} (${typeof t.sla[subKey]} = ${JSON.stringify(t.sla[subKey])})`);
          }
        }
      }

      // Quét sub-fields lạ trong compensation
      if (t.compensation && typeof t.compensation === 'object') {
        for (const subKey of Object.keys(t.compensation)) {
          if (!declaredCompensationPaths.has(subKey)) {
            extraFields.push(`compensation.${subKey} (${typeof t.compensation[subKey]} = ${JSON.stringify(t.compensation[subKey])})`);
          }
        }
      }

      // Quét sub-fields lạ trong csat
      if (t.csat && typeof t.csat === 'object') {
        for (const subKey of Object.keys(t.csat)) {
          if (!declaredCsatPaths.has(subKey)) {
            extraFields.push(`csat.${subKey} (${typeof t.csat[subKey]} = ${JSON.stringify(t.csat[subKey])})`);
          }
        }
      }

      diffResults.push({
        ticketCode: t.ticketCode,
        status: t.status,
        extraCount: extraFields.length,
        extraFields: extraFields
      });
    }

    console.table(diffResults.map(d => ({
      'Mã Ticket': d.ticketCode,
      'Trạng thái': d.status,
      'Số field lạ': d.extraCount,
      'Chi tiết field lạ': d.extraFields.join('; ') || 'HOÀN TOÀN KHỚP SCHEMA'
    })));

  } catch (err) {
    console.error('Error in schema diff:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

runStep0SchemaDiff();
