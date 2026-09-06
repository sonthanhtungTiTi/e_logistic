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

  console.log('\n================================================================================');
  console.log('         DA TAO THANH CONG DON HANG MAU: SAI GON -> HAI PHONG!                  ');
  console.log('================================================================================\n');

  console.log(`[Package] Ma Van Don (Tracking Code): \x1b[32m\x1b[1m${order.trackingCode}\x1b[0m`);
  console.log(`[Route] Lo trinh luan chuyen:        TP.HCM -> Ha Noi -> Hai Phong`);
  console.log(`[Distance] Cu ly luan chuyen thuc te:  ${order.routeDistanceKm} km | Vung cuoc: ${order.zoneTier}`);
  console.log(`[Fee] Cuoc phi van chuyen:        ${order.shippingFee.toLocaleString('vi-VN')} d | Du kien: ${order.estimatedDeliveryDays} ngay`);
  console.log(`[Origin] Kho goc don hang:           ${hubSgn.name} (${hubSgn.code})`);
  console.log(`[Destination] Kho dich phat hang:         ${hubHph.name} (${hubHph.code})`);
  console.log(`[Status] Trang thai hien tai:        \x1b[33m\x1b[1m${order.status}\x1b[0m (Vua lay tu Seller, san sang Nhap kho Sai Gon)\n`);

  await mongoose.disconnect();
}

createDemoOrderSgToHp().catch(console.error);
