// GET /api/requests — list requests
// POST /api/requests — create request
const { authenticate } = require('../../server/middleware/auth');
const UpdateRequestModel = require('../../server/models/UpdateRequest');
const { cors } = require('../_utils');

module.exports = async (req, res) => {
    if (cors(req, res)) return;

    if (req.method === 'GET') {
        return authenticate(req, res, async () => {
            try {
                const data = req.user.role === 'admin'
                    ? await UpdateRequestModel.getAll()
                    : await UpdateRequestModel.getByUser(req.user.id);
                res.json({ success: true, data });
            } catch (e) { res.status(500).json({ success: false, error: e.message }); }
        });
    }

    if (req.method === 'POST') {
        return authenticate(req, res, async () => {
            try {
                const { memberId, changes, note } = req.body;
                if (!memberId || !changes) return res.status(400).json({ success: false, error: 'Thiếu thông tin' });
                const id = await UpdateRequestModel.create(req.user.id, memberId, changes, note);
                res.status(201).json({ success: true, data: { id }, message: 'Đã gửi yêu cầu cập nhật. Vui lòng chờ Admin duyệt.' });
            } catch (e) { res.status(500).json({ success: false, error: e.message }); }
        });
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
};
