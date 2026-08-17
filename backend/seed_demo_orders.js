require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const Order = require('./src/models/order.model');

async function seedOrders() {
  console.log('====================================================');
  console.log('🌱 SEEDING DEMO ORDERS FOR E-LOGISTICS SYSTEM');
  console.log('====================================================\n');

  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/elogistic';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB.');

    // Tìm tài khoản Admin hoặc Seller để làm sellerId
    let seller = await User.findOne({ role: 'ADMIN' });
    if (!seller) {
      seller = await User.findOne({});
    }

    if (!seller) {
      console.error('❌ Không tìm thấy user nào trong DB để gán làm Seller.');
      process.exit(1);
    }

    const sampleOrders = [
      {
        trackingCode: 'ELG-VN-888001',
        sellerId: seller._id,
        status: 'PENDING_VERIFICATION',
        flagCodAnomaly: true,
        flagFeeWarning: false,
        needsManualRouting: false,
        pickupAddress: {
          fullName: 'Công Ty Dược Phẩm Sài Gòn (Sapharco)',
          phone: '0901234567',
          address: '434 Nguyễn Thị Minh Khai',
          ward: 'Phường 5',
          district: 'Quận 3',
          province: 'TP. Hồ Chí Minh',
          coordinates: { lat: 10.7725, lng: 106.6852 },
        },
        deliveryAddress: {
          fullName: 'Bệnh Viện Đại Học Y Dược TP.HCM',
          phone: '0918765432',
          address: '215 Hồng Bàng',
          ward: 'Phường 11',
          district: 'Quận 5',
          province: 'TP. Hồ Chí Minh',
          coordinates: { lat: 10.7554, lng: 106.6648 },
        },
        items: [
          { name: 'Vắc xin Lạnh Cúm Mùa (Hộp 50 liều)', quantity: 5, weight: 2.5 },
        ],
        dimensions: { length: 30, width: 20, height: 15 },
        actualWeight: 2.5,
        volumetricWeight: 1.8,
        chargeableWeight: 2.5,
        isCod: true,
        codAmount: 85000000, // 85 triệu -> COD Anomaly
        goodsValue: 90000000,
        baseFee: 120000,
        insuranceFee: 170000,
        shippingFee: 290000,
        pickupHub: 'HUB_SGN_01',
        deliveryHub: 'HUB_SGN_02',
      },
      {
        trackingCode: 'ELG-VN-888002',
        sellerId: seller._id,
        status: 'READY_TO_PICK',
        flagCodAnomaly: false,
        flagFeeWarning: true,
        needsManualRouting: false,
        pickupAddress: {
          fullName: 'Nhà Thuốc Long Châu CN1',
          phone: '0903334444',
          address: '379 Hai Bà Trưng',
          ward: 'Phường 8',
          district: 'Quận 3',
          province: 'TP. Hồ Chí Minh',
        },
        deliveryAddress: {
          fullName: 'Nhà Thuốc Pharmacity Nam Kỳ Khởi Nghĩa',
          phone: '0907778888',
          address: '158 Nam Kỳ Khởi Nghĩa',
          ward: 'Phường 6',
          district: 'Quận 3',
          province: 'TP. Hồ Chí Minh',
        },
        items: [
          { name: 'Máy Đo Huyết Áp Omron HEA-7120', quantity: 10, weight: 4.0 },
        ],
        dimensions: { length: 40, width: 30, height: 25 },
        actualWeight: 4.0,
        volumetricWeight: 5.0,
        chargeableWeight: 5.0,
        isCod: true,
        codAmount: 7500000,
        goodsValue: 8000000,
        baseFee: 45000,
        insuranceFee: 15000,
        shippingFee: 60000,
        pickupHub: 'HUB_SGN_01',
        deliveryHub: 'HUB_SGN_01',
      },
      {
        trackingCode: 'ELG-VN-888003',
        sellerId: seller._id,
        status: 'PICKING',
        flagCodAnomaly: false,
        flagFeeWarning: false,
        needsManualRouting: true,
        pickupAddress: {
          fullName: 'Kho Dược Trung Trung Bộ',
          phone: '0905111222',
          address: '12 KCN Hòa Cầm',
          ward: 'Hòa Thọ Tây',
          district: 'Quận Cẩm Lệ',
          province: 'Đà Nẵng',
        },
        deliveryAddress: {
          fullName: 'Bệnh Viện Đà Nẵng',
          phone: '0905999000',
          address: '124 Hải Phòng',
          ward: 'Thạch Thang',
          district: 'Quận Hải Châu',
          province: 'Đà Nẵng',
        },
        items: [
          { name: 'Huyết Tương Kháng Độc Tố Dịch Thảo', quantity: 2, weight: 1.2 },
        ],
        dimensions: { length: 20, width: 15, height: 10 },
        actualWeight: 1.2,
        volumetricWeight: 0.6,
        chargeableWeight: 1.2,
        isCod: false,
        codAmount: 0,
        goodsValue: 12000000,
        baseFee: 35000,
        insuranceFee: 24000,
        shippingFee: 59000,
        pickupHub: 'HUB_DAD_01',
        deliveryHub: 'HUB_DAD_01',
      },
      {
        trackingCode: 'ELG-VN-888004',
        sellerId: seller._id,
        status: 'INBOUND_HUB',
        flagCodAnomaly: false,
        flagFeeWarning: false,
        needsManualRouting: false,
        pickupAddress: {
          fullName: 'Dược Phẩm Hậu Giang (DHG Pharma)',
          phone: '0913888999',
          address: '288 Nguyễn Văn Cừ',
          ward: 'An Hòa',
          district: 'Quận Ninh Kiều',
          province: 'Cần Thơ',
        },
        deliveryAddress: {
          fullName: 'Bệnh Viện Bạch Mai Hanoi',
          phone: '0912111333',
          address: '78 Giải Phóng',
          ward: 'Phương Mai',
          district: 'Quận Đống Đa',
          province: 'Hà Nội',
        },
        items: [
          { name: 'Hộp Hapacol Extra (Thùng 100 hộp)', quantity: 20, weight: 15.0 },
        ],
        dimensions: { length: 60, width: 40, height: 40 },
        actualWeight: 15.0,
        volumetricWeight: 16.0,
        chargeableWeight: 16.0,
        isCod: true,
        codAmount: 32000000,
        goodsValue: 35000000,
        baseFee: 180000,
        insuranceFee: 70000,
        shippingFee: 250000,
        pickupHub: 'HUB_SGN_01',
        deliveryHub: 'HUB_HAN_01',
      },
      {
        trackingCode: 'ELG-VN-888005',
        sellerId: seller._id,
        status: 'DELIVERED',
        flagCodAnomaly: false,
        flagFeeWarning: false,
        needsManualRouting: false,
        pickupAddress: {
          fullName: 'Tổng Kho Thiết Bị Y Tế Việt Đức',
          phone: '0988777666',
          address: '45 Phố Vọng',
          ward: 'Đồng Tâm',
          district: 'Quận Hai Bà Trưng',
          province: 'Hà Nội',
        },
        deliveryAddress: {
          fullName: 'Phòng Khám Đa Khoa Hồng Ngọc',
          phone: '0988111222',
          address: '55 Yên Ninh',
          ward: 'Trúc Bạch',
          district: 'Quận Ba Đình',
          province: 'Hà Nội',
        },
        items: [
          { name: 'Bộ Kit Test Nhanh Sinh Học', quantity: 50, weight: 3.0 },
        ],
        dimensions: { length: 30, width: 25, height: 20 },
        actualWeight: 3.0,
        volumetricWeight: 3.0,
        chargeableWeight: 3.0,
        isCod: false,
        codAmount: 0,
        goodsValue: 4500000,
        baseFee: 40000,
        insuranceFee: 9000,
        shippingFee: 49000,
        pickupHub: 'HUB_HAN_01',
        deliveryHub: 'HUB_HAN_01',
      },
    ];

    for (const o of sampleOrders) {
      let existing = await Order.findOne({ trackingCode: o.trackingCode });
      if (!existing) {
        await Order.create(o);
        console.log(`✨ Created sample order: ${o.trackingCode} [${o.status}]`);
      } else {
        await Order.updateOne({ trackingCode: o.trackingCode }, o);
        console.log(`🔄 Updated sample order: ${o.trackingCode} [${o.status}]`);
      }
    }

    console.log('\n====================================================');
    console.log('✅ SEED DEMO ORDERS COMPLETED SUCCESSFULLY!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Error seeding demo orders:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🏁 MongoDB Disconnected.');
    process.exit(0);
  }
}

seedOrders();
