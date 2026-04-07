// Server configuration
require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    dbPath: process.env.DB_PATH || './database/family.db',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    env: process.env.NODE_ENV || 'development'
};
