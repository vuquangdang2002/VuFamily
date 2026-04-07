// DELETE /api/achievements/[id]
const MemberController = require('../../server/controllers/memberController');
const { authenticate, requireAdmin } = require('../../server/middleware/auth');
const { cors } = require('../_utils');

module.exports = async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'DELETE') return res.status(405).json({ success: false, error: 'Method not allowed' });
    req.params = { id: req.query.id };
    return authenticate(req, res, () =>
        requireAdmin(req, res, () =>
            MemberController.deleteAchievement(req, res)
        )
    );
};
