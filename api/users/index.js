// GET /api/users — list users (admin only)
// POST /api/users — create user (admin only)
const { authenticate, requireAdmin, getUsers, createUser } = require('../../server/middleware/auth');
const { cors } = require('../_utils');

module.exports = async (req, res) => {
    if (cors(req, res)) return;

    if (req.method === 'GET') {
        return authenticate(req, res, () =>
            requireAdmin(req, res, () => getUsers(req, res))
        );
    }

    if (req.method === 'POST') {
        return authenticate(req, res, () =>
            requireAdmin(req, res, () => createUser(req, res))
        );
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
};
