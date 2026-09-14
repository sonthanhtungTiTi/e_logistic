const { v4: uuidv4 } = require('uuid');
const { getRedis, isRedisConnected } = require('../config/redis.config');
const { publishMessage, isRabbitMQConnected, EXCHANGES } = require('../config/rabbitmq.config');
const Order = require('../models/order.model');
const User = require('../models/user.model');

const PENDING_SYNC_SET = 'sync:pending:orders';

/**
 * Write-Behind: Ghi trực tiếp vào Redis trước, sau đó phát message lên RabbitMQ
 * để DB Sync Worker cập nhật ngầm vào MongoDB.
 */
const writeOrderToRedis = async (orderId, updateFields) => {
  const redis = getRedis();
  const redisActive = isRedisConnected();
  const rmqActive = isRabbitMQConnected();
  const eventId = uuidv4();
  const timestamp = new Date().toISOString();

  const payload = {
    eventId,
    orderId,
    updateFields,
    timestamp,
  };

  // Case 1: True Write-Behind (Both Redis Hot Layer AND RabbitMQ Broker are ONLINE)
  if (redisActive && rmqActive) {
    try {
      const redisKey = `order:detail:${orderId}`;
      const hashData = {};

      for (const [key, val] of Object.entries(updateFields)) {
        hashData[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
      }
      hashData.updatedAt = timestamp;

      await redis.hset(redisKey, hashData);
      await redis.sadd(PENDING_SYNC_SET, orderId);

      const published = await publishMessage(
        EXCHANGES.SYNC,
        'redis.write.order.status',
        payload
      );
      if (published) {
        return { success: true, mode: 'write-behind', eventId, redisActive: true, rmqActive: true };
      }

      // If RabbitMQ publish failed, fallback to Direct DB Write
      console.warn(`⚠️ RabbitMQ Publish Failed: Fallback to Direct MongoDB write for order ${orderId}`);
      await Order.findByIdAndUpdate(orderId, { $set: updateFields });
      await redis.srem(PENDING_SYNC_SET, orderId);
      return { success: true, mode: 'fallback-redis-direct-db', eventId, redisActive: true, rmqActive: false };
    } catch (err) {
      console.warn(`⚠️ Redis/RMQ Write-Behind Failed for order ${orderId}: ${err.message}`);
    }
  }

  // Case 2: Partial Fallback (Redis is ONLINE, but RabbitMQ is OFFLINE)
  if (redisActive && !rmqActive) {
    try {
      const redisKey = `order:detail:${orderId}`;
      const hashData = {};

      for (const [key, val] of Object.entries(updateFields)) {
        hashData[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
      }
      hashData.updatedAt = timestamp;

      await redis.hset(redisKey, hashData);
      await Order.findByIdAndUpdate(orderId, { $set: updateFields });
      return { success: true, mode: 'fallback-redis-direct-db', eventId, redisActive: true, rmqActive: false };
    } catch (err) {
      console.warn(`⚠️ Redis Direct DB Write Failed for order ${orderId}: ${err.message}`);
    }
  }

  // Case 3: Complete Fallback (Redis is OFFLINE)
  console.warn(`⚠️ Redis Offline: Fallback to Direct MongoDB write for order ${orderId}`);
  try {
    await Order.findByIdAndUpdate(orderId, { $set: updateFields });
    return { success: true, mode: 'fallback-direct-db', eventId, redisActive: false, rmqActive: rmqActive };
  } catch (dbErr) {
    console.error(`❌ Fallback DB Write Failed for order ${orderId}:`, dbErr.message);
    throw dbErr;
  }
};

/**
 * Đánh dấu đơn hàng đã được ghi thành công xuống MongoDB
 */
const markSynced = async (orderId) => {
  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      await redis.srem(PENDING_SYNC_SET, orderId);
    } catch (e) {
      // Ignore redis error
    }
  }
};

/**
 * Lấy tổng số lượng đơn hàng đang chờ đồng bộ xuống DB
 */
const getPendingSyncCount = async () => {
  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      return await redis.scard(PENDING_SYNC_SET);
    } catch (e) {
      return 0;
    }
  }
  return 0;
};

/**
 * Quy tắc Double-Write cho dữ liệu tài chính (Ví COD)
 */
const writeWalletDoubleWrite = async (userId, walletFields) => {
  // Ghi Mongo trước
  const updatedUser = await User.findByIdAndUpdate(userId, { $set: walletFields }, { new: true });

  // Cập nhật luôn Redis
  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      const redisKey = `seller:wallet:${userId}`;
      await redis.hset(redisKey, {
        balance: String(updatedUser.codWalletBalance || 0),
        pendingBalance: String(updatedUser.codPendingBalance || 0),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn(`⚠️ Failed to update wallet Redis cache for user ${userId}: ${err.message}`);
    }
  }

  return updatedUser;
};

/**
 * Đọc đơn hàng từ Redis (Hot Layer), fallback MongoDB nếu Miss
 */
const getOrderFromRedis = async (orderId) => {
  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      const redisKey = `order:detail:${orderId}`;
      const data = await redis.hgetall(redisKey);

      if (data && Object.keys(data).length > 0) {
        return { ...data, _fromCache: true };
      }
    } catch (err) {
      console.warn(`⚠️ Read Redis failed for order ${orderId}: ${err.message}`);
    }
  }

  // Fallback MongoDB
  const dbOrder = await Order.findById(orderId).lean();
  if (dbOrder && isRedisConnected()) {
    // Warmup cache
    try {
      const redis = getRedis();
      const hashData = {
        _id: String(dbOrder._id),
        orderCode: dbOrder.orderCode || '',
        status: dbOrder.status || '',
        codAmount: String(dbOrder.codAmount || 0),
        receiverName: dbOrder.receiverName || dbOrder.receiver?.name || '',
        receiverPhone: dbOrder.receiverPhone || dbOrder.receiver?.phone || '',
        updatedAt: new Date().toISOString(),
      };
      await redis.hset(`order:detail:${orderId}`, hashData);
    } catch (e) {
      // Ignore
    }
  }

  return dbOrder ? { ...dbOrder, _fromCache: false } : null;
};

/**
 * Tra cứu public theo mã vận đơn
 */
const getPublicTrackingFromRedis = async (orderCode) => {
  const cacheKey = `order:track:${orderCode}`;
  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      const cached = await redis.get(cacheKey);
      if (cached) {
        return { data: JSON.parse(cached), _fromCache: true };
      }
    } catch (err) {
      console.warn(`⚠️ Public tracking Redis read failed: ${err.message}`);
    }
  }

  const dbOrder = await Order.findOne({
    $or: [{ orderCode }, { trackingCode: orderCode }],
  }).lean();

  if (!dbOrder) return null;

  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      await redis.setex(cacheKey, 1800, JSON.stringify(dbOrder)); // 30 mins TTL
    } catch (e) {
      // Ignore
    }
  }

  return { data: dbOrder, _fromCache: false };
};

module.exports = {
  writeOrderToRedis,
  markSynced,
  getPendingSyncCount,
  writeWalletDoubleWrite,
  getOrderFromRedis,
  getPublicTrackingFromRedis,
  PENDING_SYNC_SET,
};
