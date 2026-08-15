/**
 * MIGRATION SCRIPT — Chạy 1 LẦN DUY NHẤT
 * Mục đích:
 *   1. Đọc toàn bộ giá trị pickupHub/deliveryHub (string code như "HUB_HAN_01") từ tất cả Order.
 *   2. Tạo Hub document cho từng code chưa tồn tại (upsert).
 *   3. Backfill originHubId / destinationHubId bằng ObjectId vừa tạo/tìm được.
 *   4. Giữ nguyên field pickupHub / deliveryHub (legacy, không xóa).
 *
 * Cách chạy:
 *   cd backend
 *   node migrate-hub-backfill.js
 *
 * Đảm bảo MONGODB_URI được set trong .env hoặc export trước khi chạy.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Hub = require('./src/models/hub.model');
const Order = require('./src/models/order.model');

// ─── Mapping cố định từ Hub Code → metadata tĩnh ──────────────────────────────
// Lấy từ MASTER_HUB_MAP đang dùng trong pricing.service.js
const HUB_SEED_DATA = {
  'HUB_HAN_01':           { name: 'Bưu cục Trung tâm Hà Nội',    province: 'HÀ NỘI',          type: 'ORIGIN_HUB' },
  'HUB_SGN_01':           { name: 'Bưu cục Trung tâm TP.HCM',    province: 'TP. HỒ CHÍ MINH', type: 'DEST_HUB'   },
  'HUB_DAD_01':           { name: 'Bưu cục Đà Nẵng',             province: 'ĐÀ NẴNG',         type: 'MIXED'      },
  'HUB_VCA_01':           { name: 'Bưu cục Cần Thơ',             province: 'CẦN THƠ',         type: 'MIXED'      },
  'HUB_BDG_01':           { name: 'Bưu cục Bình Dương',          province: 'BÌNH DƯƠNG',       type: 'MIXED'      },
  'HUB_DNI_01':           { name: 'Bưu cục Đồng Nai',            province: 'ĐỒNG NAI',         type: 'MIXED'      },
  'HUB_HPH_01':           { name: 'Bưu cục Hải Phòng',           province: 'HẢI PHÒNG',        type: 'MIXED'      },
  'HUB_PROVINCIAL_DEFAULT': { name: 'Kho Tỉnh/Thành Tạm Thời',  province: null,               type: 'TRANSIT_HUB'},
};

async function run() {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/e-logistics';

  console.log(`\n🔌 Đang kết nối MongoDB: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);
  console.log('✅ Kết nối MongoDB thành công\n');

  // ── BƯỚC 1: Thu thập tất cả Hub Code duy nhất từ dữ liệu Order thật ──────────
  console.log('🔍 BƯỚC 1: Quét toàn bộ Order để thu thập Hub Code...');
  const distinctPickupHubs  = await Order.distinct('pickupHub',  { pickupHub:  { $nin: [null, ''] } });
  const distinctDeliveryHubs = await Order.distinct('deliveryHub', { deliveryHub: { $nin: [null, ''] } });

  const allHubCodes = [...new Set([...distinctPickupHubs, ...distinctDeliveryHubs])];
  console.log(`   Tìm thấy ${allHubCodes.length} Hub Code duy nhất: [${allHubCodes.join(', ')}]\n`);

  if (allHubCodes.length === 0) {
    console.log('⚠️  Không có Hub Code nào trong Order. Nếu DB đang trống, migration vẫn tạo Hub mặc định từ MASTER_HUB_MAP.\n');
  }

  // ── BƯỚC 2: Upsert Hub document cho mỗi code, xây dựng map code → ObjectId ───
  console.log('🏗️  BƯỚC 2: Upsert Hub documents...');

  // Hợp nhất codes từ Order + toàn bộ MASTER_HUB_MAP (để seed đầy đủ ngay từ đầu)
  const allCodesToSeed = [...new Set([...allHubCodes, ...Object.keys(HUB_SEED_DATA)])];

  const codeToObjectIdMap = {}; // { "HUB_HAN_01": ObjectId("...") }
  let hubsCreated = 0;
  let hubsExisted = 0;

  for (const code of allCodesToSeed) {
    const seedMeta = HUB_SEED_DATA[code] || {
      name: `Hub tự động từ dữ liệu cũ (${code})`,
      province: null,
      type: 'MIXED',
    };

    const hub = await Hub.findOneAndUpdate(
      { code: code.toUpperCase() },
      {
        $setOnInsert: {
          code: code.toUpperCase(),
          name: seedMeta.name,
          province: seedMeta.province,
          type: seedMeta.type,
          isActive: true,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    codeToObjectIdMap[code.toUpperCase()] = hub._id;

    if (hub.createdAt?.getTime() === hub.updatedAt?.getTime()) {
      // Mới được upsert/tạo
      hubsCreated++;
      console.log(`   ✅ TẠO MỚI Hub: [${code}] → ObjectId(${hub._id})`);
    } else {
      hubsExisted++;
      console.log(`   ⏩ Đã tồn tại: [${code}] → ObjectId(${hub._id})`);
    }
  }

  console.log(`\n   📊 Tổng kết Hub: ${hubsCreated} tạo mới, ${hubsExisted} đã có sẵn\n`);

  // ── BƯỚC 3: Backfill originHubId / destinationHubId trên từng Order ──────────
  console.log('🔄 BƯỚC 3: Backfill originHubId / destinationHubId cho các Order...');

  // Xử lý từng batch để tránh timeout trên collection lớn
  const BATCH_SIZE = 200;
  let totalOrdersScanned = 0;
  let totalOrdersBackfilled = 0;
  let totalOrdersSkipped = 0;
  let cursor = Order.find({
    $or: [
      { pickupHub:  { $nin: [null, ''] } },
      { deliveryHub: { $nin: [null, ''] } },
    ]
  }).cursor();

  const bulkOps = [];

  for await (const order of cursor) {
    totalOrdersScanned++;

    const pickupCode   = (order.pickupHub  || '').toUpperCase();
    const deliveryCode = (order.deliveryHub || '').toUpperCase();

    const newOriginHubId      = codeToObjectIdMap[pickupCode]   || null;
    const newDestinationHubId = codeToObjectIdMap[deliveryCode] || null;

    // Chỉ backfill nếu chưa có (tránh ghi đè dữ liệu đã tồn tại)
    const needsOriginBackfill = newOriginHubId      && !order.originHubId;
    const needsDestBackfill   = newDestinationHubId && !order.destinationHubId;

    if (!needsOriginBackfill && !needsDestBackfill) {
      totalOrdersSkipped++;
      continue;
    }

    const updateFields = {};
    if (needsOriginBackfill)      updateFields.originHubId      = newOriginHubId;
    if (needsDestBackfill) updateFields.destinationHubId = newDestinationHubId;

    bulkOps.push({
      updateOne: {
        filter: { _id: order._id },
        update: { $set: updateFields },
      }
    });

    // Flush theo batch
    if (bulkOps.length >= BATCH_SIZE) {
      const bulkResult = await Order.bulkWrite(bulkOps, { ordered: false });
      totalOrdersBackfilled += bulkResult.modifiedCount;
      console.log(`   🔄 Flush batch: ${bulkResult.modifiedCount} orders đã backfill...`);
      bulkOps.length = 0;
    }
  }

  // Flush batch cuối
  if (bulkOps.length > 0) {
    const bulkResult = await Order.bulkWrite(bulkOps, { ordered: false });
    totalOrdersBackfilled += bulkResult.modifiedCount;
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('✅ MIGRATION HOÀN TẤT');
  console.log(`   📦 Tổng Order đã quét    : ${totalOrdersScanned}`);
  console.log(`   ✅ Orders đã backfill      : ${totalOrdersBackfilled}`);
  console.log(`   ⏩ Orders đã có sẵn (skip): ${totalOrdersSkipped}`);
  console.log(`   🏢 Hubs tạo mới           : ${hubsCreated}`);
  console.log(`   🏢 Hubs đã có sẵn         : ${hubsExisted}`);
  console.log('══════════════════════════════════════════════════════════\n');

  // ── BƯỚC 4: Smoke test populate ──────────────────────────────────────────────
  console.log('🧪 BƯỚC 4: Smoke test — Order.findOne().populate(originHubId, destinationHubId, currentHubId)...');
  try {
    const testOrder = await Order.findOne({
      $or: [
        { originHubId: { $ne: null } },
        { destinationHubId: { $ne: null } },
      ]
    })
      .populate('originHubId', 'code name province')
      .populate('destinationHubId', 'code name province')
      .populate('currentHubId', 'code name province')
      .lean();

    if (testOrder) {
      console.log(`   ✅ Populate thành công trên đơn hàng: ${testOrder.trackingCode}`);
      console.log(`      originHubId     : ${JSON.stringify(testOrder.originHubId)}`);
      console.log(`      destinationHubId: ${JSON.stringify(testOrder.destinationHubId)}`);
      console.log(`      currentHubId    : ${JSON.stringify(testOrder.currentHubId)}`);
    } else {
      console.log('   ⚠️  Không có Order nào đã backfill (DB có thể đang trống). Thử populate trên Order bất kỳ...');
      const anyOrder = await Order.findOne()
        .populate('originHubId', 'code name')
        .populate('destinationHubId', 'code name')
        .populate('currentHubId', 'code name')
        .lean();
      if (anyOrder) {
        console.log(`   ✅ Populate KHÔNG LỖI (Schema Hub đã được đăng ký đúng): ${anyOrder.trackingCode}`);
      } else {
        console.log('   ℹ️  Collection Order đang trống — không thể test populate nhưng schema đã đúng.');
      }
    }
  } catch (populateErr) {
    console.error('   ❌ LỖI khi populate:', populateErr.message);
    process.exit(1);
  }

  await mongoose.disconnect();
  console.log('\n🔌 Đã ngắt kết nối MongoDB. Migration hoàn tất.\n');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ LỖI NGHIÊM TRỌNG trong quá trình migration:', err);
  process.exit(1);
});
