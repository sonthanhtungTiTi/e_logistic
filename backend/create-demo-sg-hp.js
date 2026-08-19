/**
 * SCRIPT TẠO ĐƠN MẪU TỪ SÀI GÒN -> HẢI PHÒNG ĐỂ TEST TỪ ĐẦU ĐẾN CUỐI
 * Chạy: node create-demo-sg-hp.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const Hub = require('./src/models/hub.model');
const User = require('./src/models/user.model');
const Order = require('./src/models/order.model');
const hubRoutingService = require('./src/services/hubRouting.service');

async function createDemoOrderSgToHp() {
  await mongoose.connect(process.env.MONGODB_URI);

  const hubSgn = await Hub.findOne({ code: 'HUB_SGN_01' });
  const hubHan = await Hub.findOne({ code: 'HUB_HAN_01' });
  const hubHph = await Hub.findOne({ code: 'HUB_HPH_01' });

  const seller = await User.findOne({ role: 'SELLER' }) || await User.findOne({ role: 'ADMIN' });
  const ts = Date.now().toString().slice(-4);
  const trackingCode = `ELG-SG-HP-${ts}`;

  // Tính cước và khoảng cách tự động
  const routeMetrics = hubRoutingService.calculateRouteDistanceAndEta('HUB_SGN_01', 'HUB_HPH_01');
  const zoneInfo = hubRoutingService.calculateZoneTier('TP. Hồ Chí Minh', 'Hải Phòng');
  const zoneTier = zoneInfo.tier || 'INTER_REGION';

  const order = await Order.create({
    trackingCode,
    sellerId: seller._id,
    originHubId: hubSgn._id,
    currentHubId: hubSgn._id,
    destinationHubId: hubHph._id,
    actualWeight: 1.5,
    chargeableWeight: 1.5,
    goodsValue: 850000,
    shippingFee: 35000,
    baseFee: 35000,
    zoneTier,
    routeDistanceKm: routeMetrics.totalDistanceKm,
    estimatedDeliveryDays: routeMetrics.estimatedDeliveryDays,
    status: 'PICKED_UP', // Trạng thái vừa được Shipper lấy từ Seller về
    pickupAddress: {
      fullName: 'Shop Sài Gòn Thời Trang',
      phone: '0901234567',
      address: '72 Lê Thánh Tôn, Bến Nghé',
      ward: 'Bến Nghé',
      district: 'Quận 1',
      province: 'TP. Hồ Chí Minh',
    },
    deliveryAddress: {
      fullName: 'Chị Lan Hải Phòng',
      phone: '0987654321',
      address: '88 Lạch Tray, Ngô Quyền',
      ward: 'Lạch Tray',
      district: 'Ngô Quyền',
      province: 'Hải Phòng',
    },
    items: [{ name: 'Áo Thun Cao Cấp', quantity: 2, weight: 1.5 }],
  });

  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        🎉 ĐÃ TẠO THÀNH CÔNG ĐƠN HÀNG MẪU: SÀI GÒN ➔ HẢI PHÒNG!               ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  console.log(`📦 Mã Vận Đơn (Tracking Code): \x1b[32m\x1b[1m${order.trackingCode}\x1b[0m`);
  console.log(`📍 Lộ trình luân chuyển:        TP.HCM ➔ Hà Nội ➔ Hải Phòng`);
  console.log(`📏 Cự ly luân chuyển thực tế:  ${order.routeDistanceKm} km | Vùng cước: ${order.zoneTier}`);
  console.log(`💰 Cước phí vận chuyển:        ${order.shippingFee.toLocaleString('vi-VN')} đ | Dự kiến: ${order.estimatedDeliveryDays} ngày`);
  console.log(`🏢 Kho gốc đón hàng:           ${hubSgn.name} (${hubSgn.code})`);
  console.log(`🏢 Kho đích phát hàng:         ${hubHph.name} (${hubHph.code})`);
  console.log(`🔄 Trạng thái hiện tại:        \x1b[33m\x1b[1m${order.status}\x1b[0m (Vừa lấy từ Seller, sẵn sàng Nhập kho Sài Gòn)\n`);

  await mongoose.disconnect();
}

createDemoOrderSgToHp().catch(console.error);
