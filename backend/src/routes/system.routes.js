const express = require('express');
const router = express.Router();
const { isRedisConnected, getRedisClient } = require('../config/redis.config');
const { isRabbitMQConnected } = require('../config/rabbitmq.config');
const { getPendingSyncCount } = require('../services/sync.service');
const { protect, authorize } = require('../middleware/auth.middleware');

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

// @route   GET /api/system/jobs-status
// @desc    Lấy danh sách và trạng thái các Background Jobs (SLA Monitor, Auto-Close, Sync...)
// @access  Private (ADMIN)
router.get('/jobs-status', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const redis = getRedisClient();
    let jobs = [];

    if (redis && typeof redis.hgetall === 'function') {
      const rawJobs = await redis.hgetall('system:jobs');
      if (rawJobs && typeof rawJobs === 'object') {
        jobs = Object.entries(rawJobs).map(([jobKey, valueStr]) => {
          try {
            return JSON.parse(valueStr);
          } catch {
            return { name: jobKey, raw: valueStr };
          }
        });
      }
    }

    // Default list placeholder if empty
    if (jobs.length === 0) {
      jobs = [
        { name: 'slaMonitor', intervalMs: 120000, lastRunAt: null, lastDurationMs: 0, lastError: null, isRunning: false },
        { name: 'ticketAutoClose', intervalMs: 3600000, lastRunAt: null, lastDurationMs: 0, lastError: null, isRunning: false },
      ];
    }

    return res.json({
      success: true,
      data: jobs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

