// GET /api/stats
const MemberController = require('../../server/controllers/memberController');
const { cors } = require('../_utils');

module.exports = async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    return MemberController.getStats(req, res);
};
