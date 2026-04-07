// GET /api/members — list all
// POST /api/members — create new (admin only)
const MemberController = require('../../server/controllers/memberController');
const { authenticate, requireAdmin } = require('../../server/middleware/auth');
const { cors } = require('../_utils');

module.exports = async (req, res) => {
    if (cors(req, res)) return;

    if (req.method === 'GET') {
        return MemberController.getAll(req, res);
    }

    if (req.method === 'POST') {
        return authenticate(req, res, () =>
            requireAdmin(req, res, () =>
                MemberController.create(req, res)
            )
        );
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
};
