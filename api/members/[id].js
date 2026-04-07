// GET /api/members/[id] — get single member
// PUT /api/members/[id] — update member (admin only)
// DELETE /api/members/[id] — delete member (admin only)
const MemberController = require('../../server/controllers/memberController');
const { authenticate, requireAdmin } = require('../../server/middleware/auth');
const { cors } = require('../_utils');

module.exports = async (req, res) => {
    if (cors(req, res)) return;

    // Extract id from Vercel dynamic route
    const { id } = req.query;
    req.params = { id };

    if (req.method === 'GET') {
        return MemberController.getById(req, res);
    }

    if (req.method === 'PUT') {
        return authenticate(req, res, () =>
            requireAdmin(req, res, () =>
                MemberController.update(req, res)
            )
        );
    }

    if (req.method === 'DELETE') {
        return authenticate(req, res, () =>
            requireAdmin(req, res, () =>
                MemberController.delete(req, res)
            )
        );
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
};
