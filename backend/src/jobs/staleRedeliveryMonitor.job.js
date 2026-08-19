const Order = require('../models/order.model');
const SystemConfig = require('../models/systemConfig.model');
const notificationService = require('../services/notification.service');

async function checkStaleRedeliveryOrders() {
  const staleHoursConfig = await SystemConfig.findOne({ key: 'STALE_REDELIVERY_ALERT_HOURS' });
  const staleHours = staleHoursConfig?.value ?? 48;
  const staleThreshold = new Date(Date.now() - staleHours * 60 * 60 * 1000);

  const staleOrders = await Order.find({
    status: 'PENDING_REDELIVERY',
    updatedAt: { $lt: staleThreshold }
  });

  for (const order of staleOrders) {
    if (notificationService && typeof notificationService.sendNotification === 'function') {
      const recipientId = order.dispatcherId || order.sellerId;
      if (recipientId) {
        await notificationService.sendNotification(recipientId, 'STALE_REDELIVERY_ALERT', {
          orderId: order._id,
          staleSince: order.updatedAt
        }).catch(err => console.error(`[Stale Alert Error] Order ${order._id}:`, err));
      }
    }
  }

  console.log(`[StaleRedeliveryMonitor] Đã cảnh báo ${staleOrders.length} đơn quá hạn.`);
  return staleOrders;
}

module.exports = checkStaleRedeliveryOrders;
