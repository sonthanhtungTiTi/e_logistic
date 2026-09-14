const { getChannel, QUEUES, isRabbitMQConnected } = require('../../config/rabbitmq.config');
const { getRedis, isRedisConnected } = require('../../config/redis.config');
const { markSynced } = require('../../services/sync.service');
const Order = require('../../models/order.model');

const processedEvents = new Set(); // Fallback sliding window set

/**
 * Distributed Idempotency Guard (Redis SETNX with 24h TTL)
 * Returns true if event was ALREADY processed.
 */
const checkAndMarkEventProcessed = async (eventId) => {
  if (!eventId) return false;

  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      const lockKey = `processed:event:${eventId}`;
      // SET NX (Only set if not exists) with 24-hour expiration (86400s)
      const setResult = await redis.set(lockKey, '1', 'EX', 86400, 'NX');
      // If setResult is null, the key already existed -> duplicate event!
      return setResult === null;
    } catch (e) {
      // Fallback to in-memory check below
    }
  }

  if (processedEvents.has(eventId)) {
    return true; // Already processed
  }

  processedEvents.add(eventId);
  if (processedEvents.size > 5000) {
    const first = processedEvents.values().next().value;
    processedEvents.delete(first);
  }
  return false;
};

const startDBSyncWorker = async () => {
  if (!isRabbitMQConnected()) {
    console.warn('⚠️ RabbitMQ disconnected. DB Sync Worker paused.');
    return;
  }

  const channel = getChannel();
  if (!channel) return;

  console.log('⚙️ DB Sync Worker started (Listening on sync_to_db_queue with Distributed Idempotency)...');

  channel.consume(QUEUES.SYNC_TO_DB, async (msg) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString());
      const { eventId, orderId, updateFields } = payload;

      // Distributed Idempotency check: Tránh xử lý trùng tin nhắn khi scale ngang
      const isDuplicate = await checkAndMarkEventProcessed(eventId);
      if (isDuplicate) {
        console.log(`ℹ️ [IDEMPOTENCY] Skipped duplicate eventId: ${eventId}`);
        channel.ack(msg);
        return;
      }

      if (orderId && updateFields) {
        // Optimistic update DB
        await Order.updateOne({ _id: orderId }, { $set: updateFields });

        // Đánh dấu đã đồng bộ xong trên Redis
        await markSynced(orderId);
      }

      channel.ack(msg);
    } catch (err) {
      console.error('❌ DB Sync Worker Error:', err.message);
      channel.nack(msg, false, false);
    }
  });
};

module.exports = {
  startDBSyncWorker,
};
