const amqp = require('amqplib');

let connection = null;
let channel = null;
let isConnected = false;

const EXCHANGES = {
  SYNC: 'elogistic.sync',
  ORDERS: 'elogistic.orders',
  WALLET: 'elogistic.wallet',
  NOTIFICATIONS: 'elogistic.notifications',
  DLX: 'elogistic.dlx',
};

const QUEUES = {
  SYNC_TO_DB: 'sync_to_db_queue',
  SYNC_TO_REDIS: 'sync_to_redis_queue',
  BATCH_ORDERS: 'batch_orders_queue',
  WALLET_TRANSACTION: 'wallet_transaction_queue',
  NOTIFICATIONS_SOCKET: 'notifications_socket_queue',
  FAILED_DLQ: 'orders.failed.dlq',
  REDIS_SYNC_FAILED_DLQ: 'redis.sync.failed.dlq',
};

const connectRabbitMQ = async () => {
  if (channel) return { connection, channel };

  const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

  try {
    connection = await amqp.connect(rabbitUrl);
    channel = await connection.createChannel();
    isConnected = true;

    console.log('📩 RabbitMQ Connected (AMQP Broker Active)');

    // 1. Assert Exchanges
    await channel.assertExchange(EXCHANGES.SYNC, 'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.ORDERS, 'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.WALLET, 'direct', { durable: true });
    await channel.assertExchange(EXCHANGES.NOTIFICATIONS, 'fanout', { durable: true });
    await channel.assertExchange(EXCHANGES.DLX, 'topic', { durable: true });

    // 2. Assert DLQ Queues
    await channel.assertQueue(QUEUES.FAILED_DLQ, { durable: true });
    await channel.assertQueue(QUEUES.REDIS_SYNC_FAILED_DLQ, { durable: true });

    // Bind DLQ to DLX
    await channel.bindQueue(QUEUES.FAILED_DLQ, EXCHANGES.DLX, '#');
    await channel.bindQueue(QUEUES.REDIS_SYNC_FAILED_DLQ, EXCHANGES.DLX, '#');

    // 3. Assert Work Queues with DLX backing
    await channel.assertQueue(QUEUES.SYNC_TO_DB, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DLX,
        'x-dead-letter-routing-key': 'db.sync.failed',
      },
    });

    await channel.assertQueue(QUEUES.SYNC_TO_REDIS, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DLX,
        'x-dead-letter-routing-key': 'redis.sync.failed',
      },
    });

    await channel.assertQueue(QUEUES.BATCH_ORDERS, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': EXCHANGES.DLX,
      },
    });

    await channel.assertQueue(QUEUES.WALLET_TRANSACTION, { durable: true });
    await channel.assertQueue(QUEUES.NOTIFICATIONS_SOCKET, { durable: true });

    // 4. Bind Queues to Exchanges
    await channel.bindQueue(QUEUES.SYNC_TO_DB, EXCHANGES.SYNC, 'redis.write.#');
    await channel.bindQueue(QUEUES.SYNC_TO_REDIS, EXCHANGES.SYNC, 'db.changed.#');
    await channel.bindQueue(QUEUES.WALLET_TRANSACTION, EXCHANGES.WALLET, 'wallet.payout');
    await channel.bindQueue(QUEUES.NOTIFICATIONS_SOCKET, EXCHANGES.NOTIFICATIONS, '');

    connection.on('error', (err) => {
      isConnected = false;
      console.warn(`⚠️ RabbitMQ Connection Error: ${err.message}`);
    });

    connection.on('close', () => {
      isConnected = false;
      console.warn('⚠️ RabbitMQ Connection Closed');
    });

    return { connection, channel };
  } catch (err) {
    isConnected = false;
    console.warn(`⚠️ RabbitMQ Unavailable (${err.message}). Direct DB fallback enabled.`);
    return { connection: null, channel: null };
  }
};

let simulatedPublishFailure = false;

const setSimulatedPublishFailure = (status) => {
  simulatedPublishFailure = status;
};

const publishMessage = async (exchange, routingKey, payload) => {
  try {
    if (simulatedPublishFailure || !channel || !isConnected) {
      console.warn(`⚠️ RabbitMQ offline or simulated failure. Skipping async message publish for [${routingKey}]`);
      return false;
    }
    const buffer = Buffer.from(JSON.stringify(payload));
    const published = channel.publish(exchange, routingKey, buffer, { persistent: true });
    return published;
  } catch (err) {
    console.error(`❌ Failed to publish message to RabbitMQ [${routingKey}]:`, err.message);
    return false;
  }
};

const getChannel = () => channel;
const isRabbitMQConnected = () => isConnected && channel !== null && !simulatedPublishFailure;

module.exports = {
  connectRabbitMQ,
  publishMessage,
  setSimulatedPublishFailure,
  getChannel,
  isRabbitMQConnected,
  EXCHANGES,
  QUEUES,
};
