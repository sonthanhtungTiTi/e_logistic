const Order = require('../models/order.model');
const User = require('../models/user.model');
const { publishMessage, EXCHANGES, isRabbitMQConnected } = require('../config/rabbitmq.config');

const startDBWatcher = () => {
  try {
    // 1. Order Collection Change Stream Watcher
    const orderStream = Order.watch([], { fullDocument: 'updateLookup' });

    orderStream.on('change', async (change) => {
      if (!isRabbitMQConnected()) return;

      const operation = change.operationType; // 'insert', 'update', 'replace'
      if (['insert', 'update', 'replace'].includes(operation)) {
        const fullDoc = change.fullDocument;
        if (fullDoc && fullDoc._id) {
          await publishMessage(EXCHANGES.SYNC, 'db.changed.order', {
            entityType: 'order',
            entityId: String(fullDoc._id),
            data: {
              orderCode: fullDoc.orderCode,
              status: fullDoc.status,
              codAmount: fullDoc.codAmount,
              receiverName: fullDoc.receiverName || fullDoc.receiver?.name,
            },
            updatedAt: fullDoc.updatedAt ? fullDoc.updatedAt.toISOString() : new Date().toISOString(),
          });
        }
      }
    });

    orderStream.on('error', (err) => {
      // Standalone MongoDB (Non-replica set) will trigger error for Change Streams
      console.warn(`ℹ️ MongoDB Change Stream Watcher Notice: ${err.message}`);
    });

    // 2. User/Wallet Collection Change Stream Watcher
    const userStream = User.watch([], { fullDocument: 'updateLookup' });

    userStream.on('change', async (change) => {
      if (!isRabbitMQConnected()) return;

      const operation = change.operationType;
      if (['insert', 'update', 'replace'].includes(operation)) {
        const fullDoc = change.fullDocument;
        if (fullDoc && fullDoc._id && fullDoc.role === 'SELLER') {
          await publishMessage(EXCHANGES.SYNC, 'db.changed.wallet', {
            entityType: 'wallet',
            entityId: String(fullDoc._id),
            data: {
              balance: fullDoc.codWalletBalance || 0,
              pendingBalance: fullDoc.codPendingBalance || 0,
            },
            updatedAt: fullDoc.updatedAt ? fullDoc.updatedAt.toISOString() : new Date().toISOString(),
          });
        }
      }
    });

    userStream.on('error', (err) => {
      // Ignore standalone mongo error
    });

    console.log('👁️ MongoDB Change Stream Watcher initialized.');
  } catch (err) {
    console.warn(`ℹ️ DB Watcher Notice: ${err.message}`);
  }
};

module.exports = {
  startDBWatcher,
};
