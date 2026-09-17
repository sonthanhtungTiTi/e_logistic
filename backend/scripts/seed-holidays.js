const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Holiday = require('../src/models/holiday.model');

const HOLIDAYS_VN = [
  // ── NĂM 2026 ─────────────────────────────────────────────────────────────
  { dateStr: '2026-01-01', name: 'Tết Dương Lịch 2026', isRecurringYearly: true },
  
  // Tết Nguyên Đán Bính Ngọ 2026 (Mùng 1 là 17/02/2026 Dương Lịch)
  { dateStr: '2026-02-14', name: 'Nghỉ Tết Nguyên Đán 2026 (27 Tết)' },
  { dateStr: '2026-02-15', name: 'Nghỉ Tết Nguyên Đán 2026 (28 Tết)' },
  { dateStr: '2026-02-16', name: 'Nghỉ Tết Nguyên Đán 2026 (29 Tết)' },
  { dateStr: '2026-02-17', name: 'Mùng 1 Tết Bính Ngọ 2026' },
  { dateStr: '2026-02-18', name: 'Mùng 2 Tết Bính Ngọ 2026' },
  { dateStr: '2026-02-19', name: 'Mùng 3 Tết Bính Ngọ 2026' },
  { dateStr: '2026-02-20', name: 'Mùng 4 Tết Bính Ngọ 2026' },
  { dateStr: '2026-02-21', name: 'Mùng 5 Tết Bính Ngọ 2026' },
  { dateStr: '2026-02-22', name: 'Mùng 6 Tết Bính Ngọ 2026' },

  // Giỗ Tổ Hùng Vương 2026 (10/3 Âm lịch = 26/04/2026 Dương lịch)
  { dateStr: '2026-04-26', name: 'Giỗ Tổ Hùng Vương 2026 (10/3 Âm lịch)' },

  // Giải phóng miền Nam & Quốc tế Lao động 2026
  { dateStr: '2026-04-30', name: 'Ngày Chiến Thắng 30/4/2026', isRecurringYearly: true },
  { dateStr: '2026-05-01', name: 'Quốc Tế Lao Động 1/5/2026', isRecurringYearly: true },

  // Quốc Khánh 2026
  { dateStr: '2026-09-01', name: 'Nghỉ liền kề Quốc Khánh 2026' },
  { dateStr: '2026-09-02', name: 'Quốc Khánh 2/9/2026', isRecurringYearly: true },

  // ── NĂM 2027 ─────────────────────────────────────────────────────────────
  { dateStr: '2027-01-01', name: 'Tết Dương Lịch 2027', isRecurringYearly: true },

  // Tết Nguyên Đán Đinh Mùi 2027 (Mùng 1 là 06/02/2027 Dương Lịch)
  { dateStr: '2027-02-04', name: 'Nghỉ Tết Nguyên Đán 2027 (28 Tết)' },
  { dateStr: '2027-02-05', name: 'Nghỉ Tết Nguyên Đán 2027 (29 Tết)' },
  { dateStr: '2027-02-06', name: 'Mùng 1 Tết Đinh Mùi 2027' },
  { dateStr: '2027-02-07', name: 'Mùng 2 Tết Đinh Mùi 2027' },
  { dateStr: '2027-02-08', name: 'Mùng 3 Tết Đinh Mùi 2027' },
  { dateStr: '2027-02-09', name: 'Mùng 4 Tết Đinh Mùi 2027' },
  { dateStr: '2027-02-10', name: 'Mùng 5 Tết Đinh Mùi 2027' },
  { dateStr: '2027-02-11', name: 'Mùng 6 Tết Đinh Mùi 2027' },

  // Giỗ Tổ Hùng Vương 2027 (10/3 Âm lịch = 16/04/2027 Dương lịch)
  { dateStr: '2027-04-16', name: 'Giỗ Tổ Hùng Vương 2027 (10/3 Âm lịch)' },

  // Giải phóng miền Nam & Quốc tế Lao động 2027
  { dateStr: '2027-04-30', name: 'Ngày Chiến Thắng 30/4/2027', isRecurringYearly: true },
  { dateStr: '2027-05-01', name: 'Quốc Tế Lao Động 1/5/2027', isRecurringYearly: true },

  // Quốc Khánh 2027
  { dateStr: '2027-09-01', name: 'Nghỉ liền kề Quốc Khánh 2027' },
  { dateStr: '2027-09-02', name: 'Quốc Khánh 2/9/2027', isRecurringYearly: true },
];

async function seedHolidays() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/e_logistic';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoURI);
  }
  console.log('🌱 Connected to MongoDB for Holidays Seeding.');

  let upsertCount = 0;
  for (const h of HOLIDAYS_VN) {
    // Chuẩn hóa ngày về 00:00:00 UTC của ngày tương ứng
    const dateObj = new Date(`${h.dateStr}T00:00:00.000Z`);
    await Holiday.findOneAndUpdate(
      { date: dateObj },
      {
        $set: {
          date: dateObj,
          name: h.name,
          isRecurringYearly: !!h.isRecurringYearly,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    upsertCount++;
  }

  console.log(`✅ Đã seed thành công ${upsertCount} ngày nghỉ lễ Việt Nam (2026-2027) chuẩn Idempotent.`);
  if (require.main === module) {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedHolidays().catch(err => {
    console.error('❌ Lỗi seed ngày lễ:', err);
    process.exit(1);
  });
}

module.exports = { seedHolidays, HOLIDAYS_VN };
