/**
 * TOOL SINH MÃ CHUYẾN XE VÀ ĐƠN HÀNG TỰ ĐỘNG ĐỂ DEMO (Live Demo Trip Generator)
 * 
 * Cách chạy:
 *   cd backend
 *   node generate-demo-trip.js
 * 
 * Hoặc chọn tuyến:
 *   node generate-demo-trip.js hph-han    (Gom tỉnh: Hải Phòng -> Hà Nội)
 *   node generate-demo-trip.js han-sgn    (Đường trục: Hà Nội -> TP.HCM)
 *   node generate-demo-trip.js sgn-vca    (Phân phối: TP.HCM -> Cần Thơ)
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Hub = require('./src/models/hub.model');
const User = require('./src/models/user.model');
const Order = require('./src/models/order.model');
const Bag = require('./src/models/bag.model');
const Trip = require('./src/models/trip.model');

async function generateDemoTrip() {
  const routeArg = (process.argv[2] || 'hph-han').toLowerCase();

  await mongoose.connect(process.env.MONGODB_URI);

  // Tìm các Hub
  const hubHph = await Hub.findOne({ code: 'HUB_HPH_01' }) || { _id: new mongoose.Types.ObjectId(), code: 'HUB_HPH_01', name: 'Bưu cục Hải Phòng', province: 'Hải Phòng' };
  const hubHan = await Hub.findOne({ code: 'HUB_HAN_01' }) || { _id: new mongoose.Types.ObjectId(), code: 'HUB_HAN_01', name: 'Kho Tổng Hà Nội', province: 'Hà Nội' };
  const hubSgn = await Hub.findOne({ code: 'HUB_SGN_01' }) || { _id: new mongoose.Types.ObjectId(), code: 'HUB_SGN_01', name: 'Kho Tổng TP.HCM', province: 'TP. Hồ Chí Minh' };
  const hubVca = await Hub.findOne({ code: 'HUB_VCA_01' }) || { _id: new mongoose.Types.ObjectId(), code: 'HUB_VCA_01', name: 'Bưu cục Cần Thơ', province: 'Cần Thơ' };

  let originHub, destHub, routeName, initialStatus;

  if (routeArg === 'han-sgn') {
    originHub = hubHan;
    destHub = hubSgn;
    routeName = 'ĐƯỜNG TRỤC: KHO TỔNG HÀ NỘI ➔ KHO TỔNG TP.HCM';
    initialStatus = 'IN_SORTING_HUB';
  } else if (routeArg === 'sgn-vca') {
    originHub = hubSgn;
    destHub = hubVca;
    routeName = 'PHÂN PHỐI TỈNH: KHO TỔNG TP.HCM ➔ BƯU CỤC CẦN THƠ';
    initialStatus = 'IN_SORTING_HUB';
  } else {
    originHub = hubHph;
    destHub = hubHan;
    routeName = 'GOM TỈNH: BƯU CỤC HẢI PHÒNG ➔ KHO TỔNG HÀ NỘI';
    initialStatus = 'IN_HUB_ORIGIN';
  }

  // Lấy User tài xế / admin
  const driver = await User.findOne({ role: { $in: ['DRIVER', 'LINE_HAUL_DRIVER', 'ADMIN'] } });

  // Sinh ID ngẫu nhiên cho đợt demo
  const rand = Math.floor(1000 + Math.random() * 9000);
  const prefix = originHub.code.split('_')[1];
  const destPrefix = destHub.code.split('_')[1];

  const tripCode = `TRIP-${prefix}-${destPrefix}-${rand}`;
  const sealCode = `SEAL-${prefix}-${destPrefix}-${rand}`;

  const ord1 = `ELG-${prefix}-${rand}-01`;
  const ord2 = `ELG-${prefix}-${rand}-02`;
  const ord3 = `ELG-${prefix}-${rand}-03`;
  const ord4 = `ELG-${prefix}-${rand}-04`;
  const ordShortage = `ELG-${prefix}-${rand}-MISSING`;

  const sellerId = new mongoose.Types.ObjectId();

  const baseOrder = {
    currentHubId: originHub._id,
    originHubId: originHub._id,
    destinationHubId: destHub._id,
    sellerId,
    actualWeight: 1.2,
    chargeableWeight: 1.2,
    shippingFee: 28000,
    baseFee: 28000,
    hubInboundAt: new Date(),
    pickupAddress: { fullName: 'Shop Demo', phone: '0981112222', address: '123 Đường Demo', ward: '1', district: '1', province: originHub.province || 'Hải Phòng' },
    deliveryAddress: { fullName: 'Khách Nhận Demo', phone: '0983334444', address: '456 Đường Nhận', ward: '2', district: '2', province: destHub.province || 'Hà Nội' },
    items: [{ name: 'Hàng Demo E-Logistics', quantity: 1, weight: 1.2 }],
    status: initialStatus,
  };

  // 1. Tạo 5 đơn hàng trong MongoDB
  await Order.create([
    { ...baseOrder, trackingCode: ord1 },
    { ...baseOrder, trackingCode: ord2 },
    { ...baseOrder, trackingCode: ord3 },
    { ...baseOrder, trackingCode: ord4 },
    { ...baseOrder, trackingCode: ordShortage },
  ]);

  // 2. Tạo 1 Bao tải Niêm phong chứa ord1 & ord2
  const bag = await Bag.create({
    sealCode,
    originHubId: originHub._id,
    destinationHubId: destHub._id,
    status: 'SEALED',
    trackingCodes: [ord1, ord2],
    totalWeightKg: 2.4,
    maxCapacity: 30,
    maxWeightKg: 25,
    sealedAt: new Date(),
  });
  await Order.updateMany({ trackingCode: { $in: [ord1, ord2] } }, { $set: { sealId: bag._id } });

  // 3. Tạo Chuyến xe Trip (DRAFT)
  const trip = await Trip.create({
    tripCode,
    tripType: 'MID_MILE_TRANSFER',
    originHubId: originHub._id,
    destinationHubId: destHub._id,
    driverId: driver?._id || null,
    plannedTrackingCodes: [ord1, ord2, ord3, ord4, ordShortage],
    status: 'DRAFT',
  });

  // In ra bảng mã tuyệt đẹp cho người dùng
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║               🎉 ĐÃ SINH MÃ CHUYẾN XE DEMO THÀNH CÔNG!                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  console.log(`📍 TUYẾN XE: \x1b[33m\x1b[1m${routeName}\x1b[0m`);
  console.log(`🏢 Điểm xuất phát: \x1b[32m${originHub.name} (${originHub.code})\x1b[0m`);
  console.log(`🏢 Điểm đích đến:  \x1b[32m${destHub.name} (${destHub.code})\x1b[0m\n`);

  console.log('┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log(`│ 🚚 MÃ CHUYẾN XE (TRIP CODE):   \x1b[32m\x1b[1m${tripCode.padEnd(42)}\x1b[0m │`);
  console.log(`│ 🔒 MÃ SEAL BAO TẢI (SEAL CODE): \x1b[36m\x1b[1m${sealCode.padEnd(42)}\x1b[0m │`);
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('📦 CHI TIẾT DANH SÁCH HÀNG HÓA TRÊN CHUYẾN XE:');
  console.log(`   1. Bao tải niêm phong: \x1b[36m${sealCode}\x1b[0m (Đã gom sẵn 2 đơn: ${ord1}, ${ord2})`);
  console.log(`   2. Đơn hàng rời 1:     \x1b[37m${ord3}\x1b[0m`);
  console.log(`   3. Đơn hàng rời 2:     \x1b[37m${ord4}\x1b[0m`);
  console.log(`   4. Đơn giả lập thiếu:  \x1b[31m\x1b[1m${ordShortage}\x1b[0m (Bỏ qua không quét để demo SEARCH_ZONE)\n`);

  console.log('📋 CÁC BƯỚC THỰC HIỆN DEMO TRÊN GIAO DIỆN:');
  console.log(`   👉 BƯỚC 1: Vào http://localhost:5174/warehouse/outbound`);
  console.log(`              Chọn mã chuyến: "${tripCode}"`);
  console.log(`              Quét mã Seal:   "${sealCode}" (sẽ xuất đồng loạt 2 đơn 01 và 02)`);
  console.log(`              Quét 2 đơn lẻ:  "${ord3}", "${ord4}"`);
  console.log(`              Bấm nút "Chốt chuyến xe (Commit Trip)" và chọn "Ghi nhận hàng thiếu"`);
  console.log(`              ==> Kết quả: Đơn ${ordShortage} tự động vào SEARCH_ZONE!`);
  console.log(`\n   👉 BƯỚC 2: Tài xế vào xác nhận chuyến (Bắt tay kép)`);
  console.log(`              POST http://localhost:5000/api/outbound/driver-confirm`);
  console.log(`              Body: { "trip_code": "${tripCode}", "action": "ACCEPT" }`);
  console.log(`              ==> Kết quả: Chuyến xe CONFIRMED, 4 kiện hàng chuyển sang IN_TRANSIT!\n`);

  await mongoose.disconnect();
}

generateDemoTrip().catch((err) => {
  console.error('Lỗi khi sinh mã demo:', err);
  process.exit(1);
});
