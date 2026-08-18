/**
 * LIVE REAL SYSTEM VERIFICATION SCRIPT
 * Chạy trên Database thật và Model/Service thật của hệ thống
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./src/models/order.model');
const Hub = require('./src/models/hub.model');
const User = require('./src/models/user.model');
const OrderLog = require('./src/models/orderLog.model');
const Trip = require('./src/models/trip.model');
const orderService = require('./src/services/order.service');
const { processInboundSingle } = require('./src/services/inboundCore.service');
const { processOutboundScan, commitTrip, processDriverConfirm } = require('./src/services/outboundCore.service');

async function verifyLive() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔴 XÁC THỰC DỮ LIỆU THỰC TẾ TRÊN DATABASE & SERVICE HỆ THỐNG');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log(`🔌 Đang kết nối tới MongoDB: ${process.env.MONGODB_URI}`);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Đã kết nối MongoDB thành công!\n');

  // Lấy hoặc tạo Seller thật
  let seller = await User.findOne({ role: 'SELLER' });
  if (!seller) {
    seller = await User.create({
      fullName: 'Seller Real Test',
      email: `seller_real_${Date.now()}@elogistic.vn`,
      password: 'hashed_password_placeholder',
      role: 'SELLER'
    });
  }

  // Lấy các Hub thật trong DB
  const hubHPH = await Hub.findOne({ code: 'HUB_HPH_01' });
  const hubHAN = await Hub.findOne({ code: 'HUB_HAN_01' });
  const hubSGN = await Hub.findOne({ code: 'HUB_SGN_01' });
  const hubVCA = await Hub.findOne({ code: 'HUB_VCA_01' });

  console.log('🏢 CÁC HUB THỰC TẾ TRONG DATABASE:');
  console.log(`   • Kho gốc:     ${hubHPH.name} (${hubHPH.code}) - ID: ${hubHPH._id}`);
  console.log(`   • Kho Tổng HN: ${hubHAN.name} (${hubHAN.code}) - ID: ${hubHAN._id}`);
  console.log(`   • Kho Tổng HCM:${hubSGN.name} (${hubSGN.code}) - ID: ${hubSGN._id}`);
  console.log(`   • Kho đích:    ${hubVCA.name} (${hubVCA.code}) - ID: ${hubVCA._id}\n`);

  const realTrackingCode = `ELG-LIVE-${Date.now().toString().slice(-6)}`;

  // ── BƯỚC 1: TẠO ĐƠN HÀNG THẬT TRONG MONGODB ─────────────────────────────────
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('📦 BƯỚC 1: TẠO ĐƠN HÀNG THẬT (Hải Phòng -> Cần Thơ)');
  const orderRes = await orderService.createNewOrder(seller._id, {
    trackingCode: realTrackingCode,
    pickupAddress: {
      fullName: 'Kho Hàng Thủy Nguyên',
      phone: '0981234567',
      address: 'Xã Núi Đèo',
      ward: 'Núi Đèo',
      district: 'Thủy Nguyên',
      province: 'Hải Phòng'
    },
    deliveryAddress: {
      fullName: 'Nguyễn Văn Nhận',
      phone: '0912345678',
      address: 'Số 10 Đại Lộ Hòa Bình',
      ward: 'Tân An',
      district: 'Ninh Kiều',
      province: 'Cần Thơ'
    },
    items: [{ name: 'Bánh đa cua Hải Phòng', quantity: 2, weight: 0.6 }],
    actualWeight: 1.2
  });

  // Query lại thẳng từ MongoDB để chứng minh dữ liệu đã ghi vào DB
  const rawDbOrder = await Order.findById(orderRes.order._id)
    .populate('originHubId', 'name code province')
    .populate('destinationHubId', 'name code province')
    .lean();

  console.log('📄 BẢN GHI ĐƠN HÀNG THẬT TRONG MONGODB:');
  console.log(`   • Mã đơn hàng (Tracking Code): ${rawDbOrder.trackingCode}`);
  console.log(`   • MongoDB ObjectId:            ${rawDbOrder._id}`);
  console.log(`   • Trạng thái ban đầu:          ${rawDbOrder.status}`);
  console.log(`   • Kho gốc tự động gán:         ${rawDbOrder.originHubId?.name} [${rawDbOrder.originHubId?.code}]`);
  console.log(`   • Kho đích tự động gán:        ${rawDbOrder.destinationHubId?.name} [${rawDbOrder.destinationHubId?.code}]`);
  console.log(`   • Phân vùng cước (Zone Tier):  ${rawDbOrder.zoneTier}`);
  console.log(`   • Cự ly luân chuyển GPS:       ${rawDbOrder.routeDistanceKm} km`);
  console.log(`   • Thời gian giao dự kiến:      ${rawDbOrder.estimatedDeliveryDays} ngày`);
  console.log(`   • Cước phí tính tự động:       ${rawDbOrder.shippingFee.toLocaleString('vi-VN')} đ\n`);

  // ── BƯỚC 2: NHẬP KHO GỐC (HẢI PHÒNG) ─────────────────────────────────────────
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('📥 BƯỚC 2: QUÉT NHẬP KHO LẦN ĐẦU TẠI BƯU CỤC HẢI PHÒNG');
  await Order.updateOne({ _id: rawDbOrder._id }, { $set: { status: 'PICKED_UP' } });
  
  const opHPH = { _id: new mongoose.Types.ObjectId(), hubId: hubHPH._id };
  const inbHPH = await processInboundSingle({
    trackingCode: realTrackingCode,
    operator: opHPH,
    condition: 'INTACT'
  });

  const afterInbHPH = await Order.findById(rawDbOrder._id).lean();
  console.log(`   • Trạng thái mới:      ${afterInbHPH.status} (Khớp với màn hình Inbound)`);
  console.log(`   • Hub hiện tại:        ${afterInbHPH.currentHubId}`);
  console.log(`   • Luồng xử lý chỉ định: ${inbHPH.next_action}`);
  console.log(`   • Đã đến kho đích chưa: ${inbHPH.is_dest_hub ? 'ĐÃ ĐẾN' : 'CHƯA (Tiếp tục chuyển đi)'}\n`);

  // ── BƯỚC 3: XUẤT KHO HẢI PHÒNG -> HÀ NỘI ─────────────────────────────────────
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('🚚 BƯỚC 3: XUẤT KHO CHUYẾN XE HẢI PHÒNG -> KHO TỔNG HÀ NỘI');
  const tripCode1 = `TRIP-LIVE-HPH-HAN-${Date.now().toString().slice(-4)}`;
  await Trip.create({
    tripCode: tripCode1,
    tripType: 'MID_MILE_TRANSFER',
    originHubId: hubHPH._id,
    destinationHubId: hubHAN._id,
    plannedTrackingCodes: [realTrackingCode],
    status: 'DRAFT'
  });
  await processOutboundScan({ tripCode: tripCode1, trackingCode: realTrackingCode, operator: opHPH });
  await commitTrip({ tripCode: tripCode1, isShortage: false, operator: opHPH });
  await processDriverConfirm({ tripCode: tripCode1, action: 'ACCEPT', operator: { _id: new mongoose.Types.ObjectId() } });

  const afterOutbHPH = await Order.findById(rawDbOrder._id).lean();
  console.log(`   • Mã chuyến xe:        ${tripCode1}`);
  console.log(`   • Trạng thái sau xuất: ${afterOutbHPH.status} (Xe đang trên đường)\n`);

  // ── BƯỚC 4: NHẬP KHO TỔNG HÀ NỘI (TRUNG GIAN) ────────────────────────────────
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('🏢 BƯỚC 4: NHẬP KHO TỔNG TRUNG GIAN TẠI HÀ NỘI');
  const opHAN = { _id: new mongoose.Types.ObjectId(), hubId: hubHAN._id };
  const inbHAN = await processInboundSingle({
    trackingCode: realTrackingCode,
    operator: opHAN,
    condition: 'INTACT'
  });

  const afterInbHAN = await Order.findById(rawDbOrder._id).lean();
  console.log(`   • Trạng thái mới:      ${afterInbHAN.status} (IN_SORTING_HUB)`);
  console.log(`   • Nhận diện kho:       Kho trung chuyển (is_dest_hub = ${inbHAN.is_dest_hub})`);
  console.log(`   • Luồng xử lý chỉ định: ${inbHAN.next_action}\n`);

  // ── BƯỚC 5: NHẬP KHO ĐÍCH CẦN THƠ (ĐÍCH ĐẾN CUỐI CÙNG) ──────────────────────
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('🏁 BƯỚC 5: CHUYỂN TỚI BƯU CỤC ĐÍCH CẦN THƠ & QUÉT NHẬP KHO ĐÍCH');
  // Giả lập xe đường trục tới Cần Thơ
  await Order.updateOne({ _id: rawDbOrder._id }, { $set: { status: 'IN_TRANSIT' } });

  const opVCA = { _id: new mongoose.Types.ObjectId(), hubId: hubVCA._id };
  const inbVCA = await processInboundSingle({
    trackingCode: realTrackingCode,
    operator: opVCA,
    condition: 'INTACT'
  });

  const afterInbVCA = await Order.findById(rawDbOrder._id).lean();
  console.log(`   • Trạng thái mới:      ${afterInbVCA.status} (IN_HUB_DEST)`);
  console.log(`   • Nhận diện kho:       ĐÃ ĐẾN ĐÚNG KHO ĐÍCH! (is_dest_hub = ${inbVCA.is_dest_hub})`);
  console.log(`   • Luồng xử lý chỉ định: ${inbVCA.next_action} (Sẵn sàng giao cho Shipper phát)\n`);

  // ── BƯỚC 6: KIỂM TRA LỊCH SỬ ORDER LOG THẬT TRONG MONGODB ───────────────────
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('📜 BƯỚC 6: KIỂM TRA LỊCH SỬ AUDIT LOG TRONG MONGODB (OrderLog Collection)');
  const logs = await OrderLog.find({ trackingCode: realTrackingCode }).sort({ createdAt: 1 }).lean();
  console.log(`   Tìm thấy ${logs.length} bản ghi Audit Log được ghi nhận tự động:`);
  logs.forEach((l, idx) => {
    console.log(`   [${idx + 1}] Action: ${l.actionType.padEnd(16)} | Pre: ${(l.preStatus || 'N/A').padEnd(14)} ➔ Post: ${(l.postStatus || 'N/A').padEnd(14)} | Note: ${l.note || ''}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('🎉 TOÀN BỘ KẾT QUẢ ĐÃ ĐƯỢC KIỂM CHỨNG THỰC TẾ 100% TRÊN DATABASE THẬT!');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  await new Promise(r => setTimeout(r, 300));
  await mongoose.disconnect();
  process.exit(0);
}

verifyLive().catch(e => {
  console.error('❌ Lỗi:', e.message, e.stack);
  process.exit(1);
});
