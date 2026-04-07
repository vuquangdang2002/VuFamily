// POST /api/requests/[id]/approve
const { authenticate, requireAdmin } = require('../../../server/middleware/auth');
const UpdateRequestModel = require('../../../server/models/UpdateRequest');
const { cors } = require('../../_utils');

module.exports = async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    return authenticate(req, res, () =>
        requireAdmin(req, res, async () => {
            try {
                const result = await UpdateRequestModel.approve(req.query.id, req.user.id);
                if (!result) return res.status(404).json({ success: false, error: 'Không tìm thấy yêu cầu' });
                res.json({ success: true, message: 'Đã duyệt yêu cầu cập nhật' });
            } catch (e) { res.status(500).json({ success: false, error: e.message }); }
        })
    );
};
