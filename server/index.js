// Express server entry point
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./routes/api');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public/
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api', apiRoutes);

// Serve SPA for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
    console.log('');
    console.log('🏛️  ═══════════════════════════════════════');
    console.log('    GIA PHẢ - Family Genealogy Server');
    console.log('    ═══════════════════════════════════════');
    console.log(`    🌐 http://localhost:${config.port}`);
    console.log(`    📁 Database: ${config.dbPath}`);
    console.log(`    🔧 Environment: ${config.env}`);
    console.log('    ═══════════════════════════════════════');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Đang tắt server...');
    const { closeAll } = require('../database/connection');
    closeAll();
    process.exit(0);
});
