const UpdateRequestModel = require('../models/UpdateRequest');

class UpdateRequestController {
    static async getRequests(req, res) {
        try {
            const data = (req.user.role === 'admin' || req.user.role === 'editor')
                ? await UpdateRequestModel.getAll()
                : await UpdateRequestModel.getByUser(req.user.id);
            res.json({ success: true, data });
        } catch (e) { 
            console.error('[UpdateRequestController - getRequests] Error:', e.message); 
            res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); 
        }
    }

    static async getPendingRequests(req, res) {
        try {
            const data = await UpdateRequestModel.getAll('pending');
            res.json({ success: true, data });
        } catch (e) { 
            console.error('[UpdateRequestController - getPendingRequests] Error:', e.message); 
            res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); 
        }
    }

    static async createRequest(req, res) {
        try {
            const { memberId, changes, note } = req.body;
            if (!memberId || !changes) return res.status(400).json({ success: false, error: 'Thiếu thông tin' });
            const id = await UpdateRequestModel.create(req.user.id, memberId, changes, note);
            res.status(201).json({ success: true, data: { id }, message: 'Đã gửi yêu cầu cập nhật. Vui lòng chờ Admin duyệt.' });
        } catch (e) { 
            console.error('[UpdateRequestController - createRequest] Error:', e.message); 
            res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); 
        }
    }

    static async approveRequest(req, res) {
        try {
            const result = await UpdateRequestModel.approve(req.params.id, req.user.id);
            if (!result) return res.status(404).json({ success: false, error: 'Không tìm thấy yêu cầu' });
            res.json({ success: true, message: 'Đã duyệt yêu cầu cập nhật' });
        } catch (e) { 
            console.error(`[UpdateRequestController - approveRequest] Error:`, e.message); 
            res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); 
        }
    }

    static async rejectRequest(req, res) {
        try {
            await UpdateRequestModel.reject(req.params.id, req.user.id, req.body.rejectReason || req.body.reason);
            res.json({ success: true, message: 'Đã từ chối yêu cầu' });
        } catch (e) { 
            console.error(`[UpdateRequestController - rejectRequest] Error:`, e.message); 
            res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); 
        }
    }
}

module.exports = UpdateRequestController;
