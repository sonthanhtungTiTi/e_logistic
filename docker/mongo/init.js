// MongoDB Initialization Script for E-Logistics Development Container
db = db.getSiblingDB('e_logistic');

// Foundational System Configuration Collections
db.createCollection('users');
db.createCollection('hubs');
db.createCollection('hub_connections');
db.createCollection('hub_coverages');
db.createCollection('system_configs');

// Index Optimization for Core System Infrastructure
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ phoneNumber: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.hubs.createIndex({ hubCode: 1 }, { unique: true });
db.hub_connections.createIndex({ fromHubId: 1, toHubId: 1 }, { unique: true });
db.hub_coverages.createIndex({ province: 1 });

console.log('✅ E-Logistics MongoDB System Infrastructure Collections Initialized (DB: e_logistic)');
