// seed-hub-network.js — seed dữ liệu mạng lưới Hub mẫu (Dev / Testing)
const Hub = require('./src/models/hub.model');
const HubCoverage = require('./src/models/hubCoverage.model');
const HubConnection = require('./src/models/hubConnection.model');

async function seedHubNetwork() {
  console.log('🌱 Đang khởi tạo dữ liệu Mạng lưới Hub...');

  // Bước A: Tạo các Hub mẫu (Kho Tổng Bắc-Nam + Bưu cục HYBRID)
  const hcmSorting = await Hub.findOneAndUpdate(
    { code: 'HCM-SOC-01' },
    { name: 'Kho Phân Loại HCM', code: 'HCM-SOC-01', type: 'SORTING', address: 'Tân Bình, TP.HCM', coordinates: { lat: 10.8231, lng: 106.6297 }, isActive: true },
    { upsert: true, new: true }
  );

  const hanoiSorting = await Hub.findOneAndUpdate(
    { code: 'HN-SOC-01' },
    { name: 'Kho Phân Loại Hà Nội', code: 'HN-SOC-01', type: 'SORTING', address: 'Long Biên, Hà Nội', coordinates: { lat: 21.0285, lng: 105.8542 }, isActive: true },
    { upsert: true, new: true }
  );

  const hcmDelivery = await Hub.findOneAndUpdate(
    { code: 'HCM-DEL-Q1' },
    { name: 'Bưu Cục Giao Hàng Quận 1', code: 'HCM-DEL-Q1', type: 'HYBRID', address: 'Quận 1, TP.HCM', coordinates: { lat: 10.7756, lng: 106.7019 }, isActive: true },
    { upsert: true, new: true }
  );

  const hanoiDelivery = await Hub.findOneAndUpdate(
    { code: 'HN-DEL-CG' },
    { name: 'Bưu Cục Giao Hàng Cầu Giấy', code: 'HN-DEL-CG', type: 'HYBRID', address: 'Cầu Giấy, Hà Nội', coordinates: { lat: 21.0333, lng: 105.7961 }, isActive: true },
    { upsert: true, new: true }
  );

  // Bổ sung thêm kho Đà Nẵng để phủ Miền Trung
  const dadSorting = await Hub.findOneAndUpdate(
    { code: 'DAD-SOC-01' },
    { name: 'Kho Phân Loại Đà Nẵng', code: 'DAD-SOC-01', type: 'SORTING', address: 'Hải Châu, Đà Nẵng', coordinates: { lat: 16.0544, lng: 108.2022 }, isActive: true },
    { upsert: true, new: true }
  );

  // Bước B: Gán Coverage (Phủ khu vực Tỉnh + Huyện)
  const coverages = [
    { province: 'TP. Hồ Chí Minh', district: 'Quận 1', hubId: hcmDelivery._id },
    { province: 'TP. Hồ Chí Minh', district: 'Quận 3', hubId: hcmDelivery._id },
    { province: 'TP. Hồ Chí Minh', district: 'Quận Tân Bình', hubId: hcmSorting._id },
    { province: 'Hà Nội', district: 'Cầu Giấy', hubId: hanoiDelivery._id },
    { province: 'Hà Nội', district: 'Đống Đa', hubId: hanoiDelivery._id },
    { province: 'Hà Nội', district: 'Long Biên', hubId: hanoiSorting._id },
    { province: 'Đà Nẵng', district: 'Hải Châu', hubId: dadSorting._id },
  ];

  for (const cov of coverages) {
    await HubCoverage.findOneAndUpdate(
      { province: cov.province, district: cov.district },
      cov,
      { upsert: true }
    );
  }

  // Bước C: Kết nối mạng lưới đồ thị (HubConnections - 2 chiều có hướng)
  const connections = [
    // HCM-DEL-Q1 <-> HCM-SOC-01
    { fromHubId: hcmDelivery._id, toHubId: hcmSorting._id, transitTimeHours: 2, cost: 10000 },
    { fromHubId: hcmSorting._id, toHubId: hcmDelivery._id, transitTimeHours: 2, cost: 10000 },

    // HN-DEL-CG <-> HN-SOC-01
    { fromHubId: hanoiDelivery._id, toHubId: hanoiSorting._id, transitTimeHours: 2, cost: 10000 },
    { fromHubId: hanoiSorting._id, toHubId: hanoiDelivery._id, transitTimeHours: 2, cost: 10000 },

    // Linehaul Bắc - Nam: HCM-SOC-01 <-> DAD-SOC-01 <-> HN-SOC-01
    { fromHubId: hcmSorting._id, toHubId: dadSorting._id, transitTimeHours: 15, cost: 250000 },
    { fromHubId: dadSorting._id, toHubId: hcmSorting._id, transitTimeHours: 15, cost: 250000 },
    { fromHubId: dadSorting._id, toHubId: hanoiSorting._id, transitTimeHours: 15, cost: 250000 },
    { fromHubId: hanoiSorting._id, toHubId: dadSorting._id, transitTimeHours: 15, cost: 250000 },

    // Đường thẳng trực tiếp HCM-SOC-01 <-> HN-SOC-01 (Tuyến bay/Xe tốc hành)
    { fromHubId: hcmSorting._id, toHubId: hanoiSorting._id, transitTimeHours: 30, cost: 500000 },
    { fromHubId: hanoiSorting._id, toHubId: hcmSorting._id, transitTimeHours: 30, cost: 500000 },
  ];

  for (const conn of connections) {
    await HubConnection.findOneAndUpdate(
      { fromHubId: conn.fromHubId, toHubId: conn.toHubId },
      conn,
      { upsert: true }
    );
  }

  console.log('✅ Đã seed thành công Mạng lưới Hub, HubCoverage và HubConnection!');
  return {
    hubs: [hcmSorting, hanoiSorting, hcmDelivery, hanoiDelivery, dadSorting],
    coverageCount: coverages.length,
    connectionCount: connections.length
  };
}

module.exports = seedHubNetwork;

if (require.main === module) {
  const dotenv = require('dotenv');
  dotenv.config();
  const connectDB = require('./src/config/db');
  connectDB().then(async () => {
    await seedHubNetwork();
    process.exit(0);
  }).catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
