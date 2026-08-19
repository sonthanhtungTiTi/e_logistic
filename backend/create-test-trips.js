/**
 * Script tạo dữ liệu Chuyến Xe Mẫu (Test Trips & Orders) để test trên UI / API
 * Chạy: node create-test-trips.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const Hub = require('./src/models/hub.model');
const User = require('./src/models/user.model');
const Order = require('./src/models/order.model');
const Bag = require('./src/models/bag.model');
const Trip = require('./src/models/trip.model');

async function seedTestTrips() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  // Lấy các Hub
  const hubHph = await Hub.findOne({ code: 'HUB_HPH_01' });
  const hubHan = await Hub.findOne({ code: 'HUB_HAN_01' });
  const hubSgn = await Hub.findOne({ code: 'HUB_SGN_01' });

  // Lấy tài xế hoặc admin
  let driver = await User.findOne({ role: { $in: ['DRIVER', 'LINE_HAUL_DRIVER'] } });
  if (!driver) {
    driver = await User.findOne({ role: 'ADMIN' });
  }

  const ts = Date.now().toString().slice(-4);

  // ════════════════════════════════════════════════════════════════════════════
  // 1. TẠO CHUYẾN XE 1: Tuyến Gom Tỉnh (Hải Phòng ➔ Kho Tổng Hà Nội)
  // ════════════════════════════════════════════════════════════════════════════
  const tripCode1 = `TRIP-HPH-HAN-${ts}`;
  const sealCode1 = `SEAL-HP-HAN-${ts}`;

  const ord1 = `ELG-HP-HAN-01-${ts}`;
  const ord2 = `ELG-HP-HAN-02-${ts}`;
  const ord3 = `ELG-HP-HAN-03-${ts}`;
  const ord4 = `ELG-HP-HAN-04-${ts}`;
  const ordShortage = `ELG-HP-MISSING-${ts}`;

  // Tạo các đơn hàng ở Bưu cục Hải Phòng
  const sellerId = new mongoose.Types.ObjectId();
  const commonOrder = {
    currentHubId: hubHph._id,
    originHubId: hubHph._id,
    destinationHubId: hubHan._id,
    sellerId,
    actualWeight: 1.2,
    chargeableWeight: 1.2,
    shippingFee: 22000,
    baseFee: 22000,
    hubInboundAt: new Date(),
    pickupAddress: { fullName: 'Shop Hải Phòng', phone: '0981112222', address: '12 Lạch Tray', ward: '1', district: '1', province: 'Hải Phòng' },
    deliveryAddress: { fullName: 'Khách Nhận Hà Nội', phone: '0983334444', address: '45 Cầu Giấy', ward: '2', district: '2', province: 'Hà Nội' },
    items: [{ name: 'Sản phẩm Hải Phòng', quantity: 1, weight: 1.2 }],
  };

  // Tạo 4 đơn hợp lệ trong kho Hải Phòng (status: IN_HUB_ORIGIN)
  await Order.deleteMany({ trackingCode: { $in: [ord1, ord2, ord3, ord4, ordShortage] } });
  await Order.create([
    { ...commonOrder, trackingCode: ord1, status: 'IN_HUB_ORIGIN' },
    { ...commonOrder, trackingCode: ord2, status: 'IN_HUB_ORIGIN' },
    { ...commonOrder, trackingCode: ord3, status: 'IN_HUB_ORIGIN' },
    { ...commonOrder, trackingCode: ord4, status: 'IN_HUB_ORIGIN' },
    { ...commonOrder, trackingCode: ordShortage, status: 'IN_HUB_ORIGIN' },
  ]);

  // Tạo 1 Bao tải Niêm phong chứa ord1 & ord2
  await Bag.deleteMany({ sealCode: sealCode1 });
  const bag1 = await Bag.create({
    sealCode: sealCode1,
    originHubId: hubHph._id,
    destinationHubId: hubHan._id,
    status: 'SEALED',
    trackingCodes: [ord1, ord2],
    totalWeightKg: 2.4,
    maxCapacity: 30,
    maxWeightKg: 25,
    sealedAt: new Date(),
  });
  await Order.updateMany({ trackingCode: { $in: [ord1, ord2] } }, { $set: { sealId: bag1._id } });

  // Tạo Chuyến xe TRIP-1 (status: DRAFT)
  await Trip.deleteMany({ tripCode: tripCode1 });
  const trip1 = await Trip.create({
    tripCode: tripCode1,
    tripType: 'MID_MILE_TRANSFER',
    originHubId: hubHph._id,
    destinationHubId: hubHan._id,
    driverId: driver?._id || null,
    plannedTrackingCodes: [ord1, ord2, ord3, ord4, ordShortage],
    status: 'DRAFT',
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. TẠO CHUYẾN XE 2: Tuyến Trục Bắc - Nam (Hà Nội ➔ Kho Tổng TP.HCM)
  // ════════════════════════════════════════════════════════════════════════════
  const tripCode2 = `TRIP-HAN-SGN-${ts}`;
  const ordNorth1 = `ELG-HAN-SGN-01-${ts}`;
  const ordNorth2 = `ELG-HAN-SGN-02-${ts}`;

  await Order.deleteMany({ trackingCode: { $in: [ordNorth1, ordNorth2] } });
  await Order.create([
    {
      ...commonOrder,
      trackingCode: ordNorth1,
      currentHubId: hubHan._id,
      originHubId: hubHph._id,
      destinationHubId: hubSgn._id,
      status: 'IN_SORTING_HUB',
      deliveryAddress: { fullName: 'Khách SG 1', phone: '0985556666', address: '123 Q1', ward: '1', district: '1', province: 'TP. Hồ Chí Minh' },
    },
    {
      ...commonOrder,
      trackingCode: ordNorth2,
      currentHubId: hubHan._id,
      originHubId: hubHan._id,
      destinationHubId: hubSgn._id,
      status: 'IN_HUB_ORIGIN',
      deliveryAddress: { fullName: 'Khách SG 2', phone: '0987778888', address: '456 Q3', ward: '2', district: '2', province: 'TP. Hồ Chí Minh' },
    },
  ]);

  await Trip.deleteMany({ tripCode: tripCode2 });
  const trip2 = await Trip.create({
    tripCode: tripCode2,
    tripType: 'MID_MILE_TRANSFER',
    originHubId: hubHan._id,
    destinationHubId: hubSgn._id,
    driverId: driver?._id || null,
    plannedTrackingCodes: [ordNorth1, ordNorth2],
    status: 'DRAFT',
  });

  console.log('═════════════════════════════════════════════════════════════════════════');
  console.log('🎉 ĐÃ TẠO THÀNH CÔNG DỮ LIỆU CHUYẾN XE MẪU ĐỂ BẠN TEST TRỰC TIẾP!');
  console.log('═════════════════════════════════════════════════════════════════════════\n');

  console.log('🚚 [CHUYẾN XE 1] TUYẾN GOM TỈNH: HẢI PHÒNG ➔ KHO TỔNG HÀ NỘI');
  console.log(`   🔹 Mã Chuyến xe (Trip Code): \x1b[32m\x1b[1m${trip1.tripCode}\x1b[0m`);
  console.log(`   🔹 Trạng thái hiện tại:      ${trip1.status} (Sẵn sàng để quét xuất kho)`);
  console.log(`   🔹 Điểm xuất phát (Origin):   Bưu cục Hải Phòng (HUB_HPH_01)`);
  console.log(`   🔹 Điểm đến (Destination):   Kho Tổng Hà Nội (HUB_HAN_01)`);
  console.log('   ---------------------------------------------------------------------');
  console.log(`   📦 1 Bao tải niêm phong:     \x1b[36m${sealCode1}\x1b[0m (Chứa 2 đơn: ${ord1}, ${ord2})`);
  console.log(`   📦 2 Đơn hàng rời:           ${ord3}, ${ord4}`);
  console.log(`   ⚠️ 1 Đơn cố tình bỏ thiếu:   \x1b[33m${ordShortage}\x1b[0m (Dùng để test tính năng Shortage SEARCH_ZONE)`);
  console.log('\n=========================================================================\n');

  console.log('🚚 [CHUYẾN XE 2] TUYẾN ĐƯỜNG TRỤC: KHO TỔNG HÀ NỘI ➔ KHO TỔNG TP.HCM');
  console.log(`   🔹 Mã Chuyến xe (Trip Code): \x1b[32m\x1b[1m${trip2.tripCode}\x1b[0m`);
  console.log(`   🔹 Trạng thái hiện tại:      ${trip2.status}`);
  console.log(`   🔹 Điểm xuất phát (Origin):   Kho Tổng Hà Nội (HUB_HAN_01)`);
  console.log(`   🔹 Điểm đến (Destination):   Kho Tổng TP.HCM (HUB_SGN_01)`);
  console.log('   ---------------------------------------------------------------------');
  console.log(`   📦 2 Đơn hàng trung chuyển:  ${ordNorth1}, ${ordNorth2}`);
  console.log('\n═════════════════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

seedTestTrips().catch(err => {
  console.error('Error seeding test trips:', err);
  process.exit(1);
});
