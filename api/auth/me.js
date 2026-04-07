// GET /api/auth/me
const { authenticate, getMe } = require('../../server/middleware/auth');
const { cors } = require('../_utils');

module.exports = async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    await authenticate(req, res, async () => {
        await getMe(req, res);
    });
};
