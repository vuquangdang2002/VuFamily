// GET /api/requests/pending
const { authenticate, requireAdmin } = require('../../server/middleware/auth');
const UpdateRequestModel = require('../../server/models/UpdateRequest');
const { cors } = require('../_utils');

module.exports = async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

    return authenticate(req, res, () =>
        requireAdmin(req, res, async () => {
            try {
                const data = await UpdateRequestModel.getAll('pending');
                res.json({ success: true, data });
            } catch (e) { res.status(500).json({ success: false, error: e.message }); }
        })
    );
};
