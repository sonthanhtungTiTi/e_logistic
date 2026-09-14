const express = require('express');
const router = express.Router();
const { isRedisConnected } = require('../config/redis.config');
const { isRabbitMQConnected } = require('../config/rabbitmq.config');
const { getPendingSyncCount } = require('../services/sync.service');

router.get('/sync-status', async (req, res) => {
  try {
    const redisActive = isRedisConnected();
    const rabbitMQActive = isRabbitMQConnected();
    const pendingCount = await getPendingSyncCount();

    return res.json({
      success: true,
      architecture: 'Redis-First Write-Behind + RabbitMQ',
      redis: {
        status: redisActive ? 'ONLINE' : 'OFFLINE (Fallback Active)',
        hotLayerActive: redisActive,
      },
      rabbitmq: {
        status: rabbitMQActive ? 'ONLINE' : 'OFFLINE (Fallback Active)',
        brokerActive: rabbitMQActive,
      },
      syncMetrics: {
        pendingOrdersInRedis: pendingCount,
        syncLatency: pendingCount > 1000 ? 'HIGH' : pendingCount > 100 ? 'MODERATE' : 'OPTIMAL',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
