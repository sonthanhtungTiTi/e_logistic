/**
 * MIGRATION SCRIPT — User.hubId Orphan Repair
 *
 * Vấn đề: User HUB_STAFF/HUB_COORDINATOR/DRIVER trong DB có hubId là ObjectId orphan
 *          (được tạo bởi test suite dùng `new mongoose.Types.ObjectId()` inline,
 *           không có Hub document tương ứng trong collection hubs).
 *
 * Chiến lược:
 *   A. Với user TEST (email khớp pattern test): xóa hoặc reassign sang Hub thật gần nhất.
 *   B. Với user PRODUCTION thật (nếu có): cần xác nhận thủ công.
 *
 * Cụ thể script này sẽ:
 *   1. Liệt kê tất cả user có hubId orphan.
 *   2. Phân loại: test user (email pattern) vs production user.
 *   3. Với test user: reassign hubId → Hub 'HUB_HAN_01' (hub mặc định cho dữ liệu test HN).
 *   4. Với production user (nếu có): log ra để xác nhận thủ công, KHÔNG tự sửa.
 *   5. Tạo 1 user HUB_STAFF thật với hubId hợp lệ để test API sau này.
 *
 * Cách chạy: node migrate-user-hub-repair.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
require('./src/models/hub.model');
require('./src/models/user.model');

// Pattern nhận diện email test (từ test suite)
const TEST_EMAIL_PATTERNS = [
  /^staff_uc16_\d+@example\.com$/,
  /^staff_sorting_\d+@example\.com$/,
  /^staff_dest_\d+@example\.com$/,
  /^driver_\d+@example\.com$/,
  /@example\.com$/,  // tất cả @example.com đều là test
];

function isTestUser(email) {
  return TEST_EMAIL_PATTERNS.some(p => p.test(email));
}

async function run() {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/e-logistics';
  await mongoose.connect(MONGO_URI);
  console.log('✅ Kết nối MongoDB thành công\n');

  const User = mongoose.model('User');
  const Hub = mongoose.model('Hub');

  // ── BƯỚC 1: Tìm Hub mặc định để dùng cho reassign test user ─────────────────
  const defaultHub = await Hub.findOne({ code: 'HUB_HAN_01' }).lean();
  if (!defaultHub) {
    console.error('❌ Không tìm thấy HUB_HAN_01 trong collection hubs. Chạy migrate-hub-backfill.js trước.');
    process.exit(1);
  }
  console.log(`🏢 Hub mặc định cho reassign: ${defaultHub.code} → ${defaultHub._id}\n`);

  // ── BƯỚC 2: Lấy tất cả ObjectId hợp lệ trong hubs collection ─────────────────
  const allHubs = await Hub.find({}).lean();
  const validHubIds = new Set(allHubs.map(h => h._id.toString()));
  console.log(`🏢 Tổng số Hub hợp lệ trong DB: ${allHubs.length}`);
  allHubs.forEach(h => console.log(`   ${h._id} → ${h.code}`));

  // ── BƯỚC 3: Tìm tất cả user có hubId orphan ───────────────────────────────────
  console.log('\n🔍 Tìm user có hubId không thuộc hubs collection...');
  const staffUsers = await User.find({
    role: { $in: ['HUB_STAFF', 'HUB_COORDINATOR', 'DRIVER', 'LINE_HAUL_DRIVER'] },
    hubId: { $ne: null }
  }).lean();

  const orphanUsers = staffUsers.filter(u => !validHubIds.has(u.hubId?.toString()));
  const validUsers  = staffUsers.filter(u =>  validHubIds.has(u.hubId?.toString()));

  console.log(`   Tổng user staff/driver: ${staffUsers.length}`);
  console.log(`   Orphan hubId (cần sửa): ${orphanUsers.length}`);
  console.log(`   Hợp lệ (không cần sửa): ${validUsers.length}`);

  // ── BƯỚC 4: Phân loại orphan ─────────────────────────────────────────────────
  const testOrphans = orphanUsers.filter(u => isTestUser(u.email));
  const prodOrphans = orphanUsers.filter(u => !isTestUser(u.email));

  console.log(`\n📊 Trong ${orphanUsers.length} user orphan:`);
  console.log(`   Test users (@example.com): ${testOrphans.length}`);
  console.log(`   Production users thật: ${prodOrphans.length}`);

  // ── BƯỚC 5: Cảnh báo production orphan (KHÔNG tự sửa) ───────────────────────
  if (prodOrphans.length > 0) {
    console.log('\n⚠️  PRODUCTION USER CÓ HUB ORPHAN — CẦN XÁC NHẬN THỦ CÔNG:');
    prodOrphans.forEach(u => {
      console.log(`   email=${u.email} | role=${u.role} | hubId=${u.hubId} (ORPHAN)`);
    });
    console.log('   → Không tự sửa production user. Báo cáo cho team ops.');
  }

  // ── BƯỚC 6: Reassign test orphan → HUB_HAN_01 ───────────────────────────────
  if (testOrphans.length === 0) {
    console.log('\n✅ Không có test user orphan nào cần sửa.');
  } else {
    console.log(`\n🔄 Reassign ${testOrphans.length} test user sang Hub HUB_HAN_01 (${defaultHub._id})...`);
    const testIds = testOrphans.map(u => u._id);
    const result = await User.updateMany(
      { _id: { $in: testIds } },
      { $set: { hubId: defaultHub._id } }
    );
    console.log(`   ✅ Đã reassign: ${result.modifiedCount} users`);
    testOrphans.forEach(u => {
      console.log(`   ${u.email} (${u.role}): ${u.hubId} → ${defaultHub._id}`);
    });
  }

  // ── BƯỚC 7: Tạo user HUB_STAFF test chuẩn để dùng trong API test ────────────
  console.log('\n🧪 Tạo user HUB_STAFF test chuẩn để dùng test API...');
  const testEmail = 'test.hub_staff.han01@elogistic.test';
  let testStaff = await User.findOne({ email: testEmail });

  if (testStaff) {
    // Update hubId nếu đã tồn tại
    testStaff.hubId = defaultHub._id;
    await testStaff.save();
    console.log(`   ⏩ User test đã tồn tại, cập nhật hubId → ${defaultHub._id}`);
  } else {
    testStaff = await User.create({
      fullName: 'Nhân viên Kho HAN01 (Test)',
      email: testEmail,
      phoneNumber: '0900000001',
      password: 'TestPass123!',
      role: 'HUB_STAFF',
      hubId: defaultHub._id,
      isActive: true
    });
    console.log(`   ✅ Tạo mới user test: ${testEmail}`);
  }

  console.log(`\n📋 THÔNG TIN USER TEST CHO API TEST:`);
  console.log(`   Email   : ${testStaff.email}`);
  console.log(`   Password: TestPass123!`);
  console.log(`   Role    : ${testStaff.role}`);
  console.log(`   hubId   : ${testStaff.hubId} (HUB_HAN_01)`);
  console.log(`   _id     : ${testStaff._id}`);

  // ── BƯỚC 8: Tổng kết verify ──────────────────────────────────────────────────
  console.log('\n=== VERIFY SAU MIGRATE ===');
  const verifyUsers = await User.find({
    role: { $in: ['HUB_STAFF', 'HUB_COORDINATOR', 'DRIVER', 'LINE_HAUL_DRIVER'] },
    hubId: { $ne: null }
  }).populate('hubId', 'code name').lean();

  verifyUsers.forEach(u => {
    const hubInfo = u.hubId ? `${u.hubId.code} (${u.hubId._id})` : 'ORPHAN (null sau populate)';
    const isOrphan = !u.hubId;
    console.log(`  ${isOrphan ? '❌' : '✅'} ${u.email} | ${u.role} | hub: ${hubInfo}`);
  });

  await mongoose.disconnect();
  console.log('\n🔌 Ngắt kết nối. Migration hoàn tất.');
  process.exit(0);
}

run().catch(e => { console.error('❌ LỖI:', e.message); process.exit(1); });
