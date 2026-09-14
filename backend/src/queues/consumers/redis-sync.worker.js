const { getChannel, QUEUES, isRabbitMQConnected } = require('../../config/rabbitmq.config');
const { getRedis, isRedisConnected } = require('../../config/redis.config');

const startRedisSyncWorker = async () => {
  if (!isRabbitMQConnected()) {
    console.warn('⚠️ RabbitMQ disconnected. Redis Sync Worker paused.');
    return;
  }

  const channel = getChannel();
  if (!channel) return;

  console.log('⚙️ Redis Sync Worker started (Listening on sync_to_redis_queue)...');

  channel.consume(QUEUES.SYNC_TO_REDIS, async (msg) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString());
      const { entityType, entityId, data, updatedAt } = payload;

      if (isRedisConnected()) {
        const redis = getRedis();

        if (entityType === 'order' && entityId) {
          const redisKey = `order:detail:${entityId}`;
          const current = await redis.hgetall(redisKey);

          const currentVersion = Number(current.version || 0);
          const newVersion = Number(payload.version || 0);

          const isVersionNewer = newVersion > 0 ? newVersion >= currentVersion : true;
          const isTimestampNewer = !current.updatedAt || new Date(updatedAt) >= new Date(current.updatedAt);

          // Atomic Versioning & Timestamp Guard: Chỉ cập nhật nếu dữ liệu từ Mongo mới hơn hoặc bằng
          if (isVersionNewer && isTimestampNewer) {
            const hashData = {};
            for (const [k, v] of Object.entries(data || {})) {
              hashData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
            }
            hashData.updatedAt = updatedAt || new Date().toISOString();
            if (newVersion > 0) hashData.version = String(newVersion);
            await redis.hset(redisKey, hashData);
          } else {
            console.log(`⏳ [VERSION GUARD] Skipped stale change stream update for order ${entityId}`);
          }
        } else if (entityType === 'wallet' && entityId) {
          const redisKey = `seller:wallet:${entityId}`;
          await redis.hset(redisKey, {
            balance: String(data.balance || 0),
            pendingBalance: String(data.pendingBalance || 0),
            updatedAt: updatedAt || new Date().toISOString(),
          });
        }
      }

      channel.ack(msg);
    } catch (err) {
      console.error('❌ Redis Sync Worker Error:', err.message);
      channel.nack(msg, false, false);
    }
  });
};

module.exports = {
  startRedisSyncWorker,
};
