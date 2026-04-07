// POST /api/achievements — add achievement (admin only)
const MemberController = require('../../server/controllers/memberController');
const { authenticate, requireAdmin } = require('../../server/middleware/auth');
const { cors } = require('../_utils');

module.exports = async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    return authenticate(req, res, () =>
        requireAdmin(req, res, () =>
            MemberController.addAchievement(req, res)
        )
    );
};
