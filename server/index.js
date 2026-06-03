// Express server entry point
require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./routes/api');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { initRealtimeHub } = require('./utils/realtimeHub');

const app = express();

// Middleware
app.use(compression());
app.use(cors({ origin: config.corsOrigin }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from client/dist/ (built Vite app)
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// API routes
app.use('/api', apiRoutes);

// Serve SPA for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Wrap Express in native http.Server so Socket.io can share the same port
const httpServer = http.createServer(app);

// Attach Socket.io Realtime Hub (Chat + Call signaling) — path: /hub
initRealtimeHub(httpServer);

// Start server only if running directly
if (require.main === module) {
    // Start background email reminder checker
    try {
        const { startReminderInterval } = require('./utils/reminderCron');
        startReminderInterval();
    } catch (err) {
        console.error('❌ Failed to initialize reminder cron:', err.message);
    }

    httpServer.listen(config.port, () => {
        const domain = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${config.port}`;
        const wsDomain = process.env.RAILWAY_PUBLIC_DOMAIN ? `wss://${process.env.RAILWAY_PUBLIC_DOMAIN}/hub` : `ws://localhost:${config.port}/hub`;

        console.log('');
        console.log('🏛️  ═══════════════════════════════════════');
        console.log('    FAMILY TREE - Genealogy Server');
        console.log('    ═══════════════════════════════════════');
        console.log(`    🌐 ${domain}`);
        console.log(`    ⚡ Realtime Hub (Chat+Call): ${wsDomain}`);
        console.log(`    📁 Database: Supabase PostgreSQL (Cloud)`);
        console.log(`    🔧 Environment: ${config.env}`);
        console.log('    ═══════════════════════════════════════');
        console.log('');
    });

    process.on('SIGTERM', () => {
        console.log('👋 Shutting down server...');
        httpServer.close(() => process.exit(0));
    });
}

// Export cho Vercel (chỉ Express app, không có Socket.io — fallback SSE)
module.exports = app;

