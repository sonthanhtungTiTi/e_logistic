const { getPendingSyncCount } = require('../services/sync.service');
const { isRedisConnected } = require('../config/redis.config');
const { isRabbitMQConnected } = require('../config/rabbitmq.config');

let monitorInterval = null;

const checkSyncHealth = async () => {
  try {
    const redisOnline = isRedisConnected();
    const rmqOnline = isRabbitMQConnected();
    const pendingCount = await getPendingSyncCount();

    if (pendingCount > 100) {
      console.warn(`🚨 [SYNC ALERT] High pending sync count: ${pendingCount} orders waiting in Redis for DB sync!`);
    }

    if (!redisOnline) {
      console.warn(`⚠️ [MONITOR NOTICE] Redis is OFFLINE. System is operating in Direct MongoDB Fallback mode.`);
    }

    if (!rmqOnline) {
      console.warn(`⚠️ [MONITOR NOTICE] RabbitMQ is OFFLINE. System is operating in Direct MongoDB Fallback mode.`);
    }
  } catch (err) {
    console.error('❌ Error in sync monitor job:', err.message);
  }
};

const startSyncMonitorJob = (intervalMs = 30000) => {
  if (monitorInterval) return;

  console.log('⏱️ Automated Sync Monitor Job started (Checking every 30s)...');
  monitorInterval = setInterval(checkSyncHealth, intervalMs);
};

const stopSyncMonitorJob = () => {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
};

module.exports = {
  startSyncMonitorJob,
  stopSyncMonitorJob,
  checkSyncHealth,
};
