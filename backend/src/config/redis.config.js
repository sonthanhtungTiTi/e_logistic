const Redis = require('ioredis');
let RedisMock = null;
try {
  RedisMock = require('ioredis-mock');
} catch (e) {
  // Optional dependency
}

let redisClient = null;
let isConnected = false;

const connectRedis = () => {
  if (redisClient) return redisClient;

  // Mode Test / Mock Redis Engine
  if ((process.env.USE_MOCK_REDIS === 'true' || process.env.NODE_ENV === 'test') && RedisMock) {
    redisClient = new RedisMock();
    isConnected = true;
    console.log('⚡ Redis Connected: In-Memory Redis Engine Active (Hot Layer Active)');
    return redisClient;
  }

  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = Number(process.env.REDIS_PORT) || 6379;
  const redisPassword = process.env.REDIS_PASSWORD || undefined;

  try {
    redisClient = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('⚠️ Redis connection retries exceeded (3/3). Continuing in fallback mode.');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 1000);
      },
    });

    redisClient.on('connect', () => {
      isConnected = true;
      console.log(`⚡ Redis Connected: ${redisHost}:${redisPort} (Hot Layer Active)`);
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      console.warn(`⚠️ Redis Connection Warning: ${err.message}`);
    });

    redisClient.connect().catch((err) => {
      if ((process.env.USE_MOCK_REDIS === 'true' || process.env.NODE_ENV === 'test') && RedisMock) {
        console.warn('⚠️ TCP Redis Unavailable. Switching to In-Memory Redis Engine for Test Suite.');
        redisClient = new RedisMock();
        isConnected = true;
      } else {
        isConnected = false;
        console.warn(`⚠️ Redis Unavailable (${err.message}). Fallback to MongoDB enabled.`);
      }
    });
  } catch (err) {
    if ((process.env.USE_MOCK_REDIS === 'true' || process.env.NODE_ENV === 'test') && RedisMock) {
      redisClient = new RedisMock();
      isConnected = true;
    } else {
      isConnected = false;
      console.warn(`⚠️ Redis Init Exception: ${err.message}`);
    }
  }

  return redisClient;
};

const getRedis = () => redisClient;
const isRedisConnected = () => isConnected && redisClient && (redisClient.status === 'ready' || redisClient.status === 'connect' || redisClient.isMock || isConnected);

module.exports = {
  connectRedis,
  getRedis,
  isRedisConnected,
};
