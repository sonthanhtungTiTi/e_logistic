const SystemConfig = require('./src/models/systemConfig.model');

async function seedConfig() {
  const configs = [
    {
      key: 'MAX_DELIVERY_FAILURE_COUNT',
      value: 3,
      description: 'Số lần giao thất bại tối đa trước khi chuyển sang xử lý hoàn hàng'
    },
    {
      key: 'MIN_MINUTES_BETWEEN_FAILURE_REPORTS',
      value: 30,
      description: 'Khoảng cách tối thiểu (phút) giữa 2 lần báo thất bại liên tiếp, chống gian lận'
    },
    {
      key: 'STALE_REDELIVERY_ALERT_HOURS',
      value: 48,
      description: 'Số giờ đơn "Chờ giao lại" chưa được gán tuyến trước khi cảnh báo Điều phối viên'
    }
  ];

  for (const cfg of configs) {
    await SystemConfig.findOneAndUpdate(
      { key: cfg.key },
      cfg,
      { upsert: true, new: true } // idempotent — chạy lại không tạo trùng
    );
  }
  console.log('Đã seed xong config Báo giao thất bại.');
}

module.exports = seedConfig;
