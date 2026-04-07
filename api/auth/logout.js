// POST /api/auth/logout
const { authenticate, logout } = require('../../server/middleware/auth');
const { cors } = require('../_utils');

module.exports = async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    await authenticate(req, res, async () => {
        await logout(req, res);
    });
};
