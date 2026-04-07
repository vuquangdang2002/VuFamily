// Members controller
const MemberModel = require('../models/Member');

class MemberController {
    static async getAll(req, res) {
        try { res.json({ success: true, data: await MemberModel.getAll() }); }
        catch (e) { console.error('[DangVQ Log] [API: getAll] Error:', e.message); res.status(500).json({ success: false, error: e.message }); }
    }

    static async getById(req, res) {
        try {
            const member = await MemberModel.getById(req.params.id);
            if (!member) return res.status(404).json({ success: false, error: 'Không tìm thấy' });
            res.json({ success: true, data: member });
        } catch (e) { console.error(`[DangVQ Log] [API: getById ${req.params.id}] Error:`, e.message); res.status(500).json({ success: false, error: e.message }); }
    }

    static async search(req, res) {
        try { res.json({ success: true, data: await MemberModel.search(req.query.q || '') }); }
        catch (e) { console.error('[DangVQ Log] [API: search] Error:', e.message); res.status(500).json({ success: false, error: e.message }); }
    }

    static async getChildren(req, res) {
        try { res.json({ success: true, data: await MemberModel.getChildren(req.params.id) }); }
        catch (e) { console.error(`[DangVQ Log] [API: getChildren ${req.params.id}] Error:`, e.message); res.status(500).json({ success: false, error: e.message }); }
    }

    static async create(req, res) {
        try {
            if (!req.body.name) return res.status(400).json({ success: false, error: 'Tên là bắt buộc' });
            res.status(201).json({ success: true, data: await MemberModel.create(req.body) });
        } catch (e) { console.error('[DangVQ Log] [API: createMember] Error:', e.message); res.status(500).json({ success: false, error: e.message }); }
    }

    static async update(req, res) {
        try {
            const member = await MemberModel.update(req.params.id, req.body);
            if (!member) return res.status(404).json({ success: false, error: 'Không tìm thấy' });
            res.json({ success: true, data: member });
        } catch (e) { console.error(`[DangVQ Log] [API: updateMember ${req.params.id}] Error:`, e.message); res.status(500).json({ success: false, error: e.message }); }
    }

    static async delete(req, res) {
        try {
            const ok = await MemberModel.delete(req.params.id);
            if (!ok) return res.status(404).json({ success: false, error: 'Không tìm thấy' });
            res.json({ success: true, message: 'Đã xóa' });
        } catch (e) { console.error(`[DangVQ Log] [API: deleteMember ${req.params.id}] Error:`, e.message); res.status(500).json({ success: false, error: e.message }); }
    }

    static async getStats(req, res) {
        try { res.json({ success: true, data: await MemberModel.getStats() }); }
        catch (e) { console.error('[DangVQ Log] [API: getStats] Error:', e.message); res.status(500).json({ success: false, error: e.message }); }
    }

    // Achievements
    static async getAchievements(req, res) {
        try { res.json({ success: true, data: await MemberModel.getAchievements(req.params.id) }); }
        catch (e) { console.error(`[DangVQ Log] [API: getAchievements ${req.params.id}] Error:`, e.message); res.status(500).json({ success: false, error: e.message }); }
    }

    static async addAchievement(req, res) {
        try {
            if (!req.body.title) return res.status(400).json({ success: false, error: 'Tên thành tích là bắt buộc' });
            const id = await MemberModel.addAchievement(req.body);
            res.status(201).json({ success: true, data: { id } });
        } catch (e) { console.error('[DangVQ Log] [API: addAchievement] Error:', e.message); res.status(500).json({ success: false, error: e.message }); }
    }

    static async deleteAchievement(req, res) {
        try {
            await MemberModel.deleteAchievement(req.params.id);
            res.json({ success: true, message: 'Đã xóa' });
        } catch (e) { console.error(`[DangVQ Log] [API: deleteAchievement ${req.params.id}] Error:`, e.message); res.status(500).json({ success: false, error: e.message }); }
    }
}

module.exports = MemberController;
