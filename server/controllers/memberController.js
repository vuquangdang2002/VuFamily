// Members controller
const MemberModel = require('../models/Member');
const cache = require('../utils/apiCache');

class MemberController {
    static async getAll(req, res) {
        try {
            const cached = cache.get('members_all');
            if (cached) return res.json({ success: true, data: cached, cached: true });

            const data = await MemberModel.getAll();
            cache.set('members_all', data);
            res.json({ success: true, data });
        } catch (e) { console.error('[MemberController - getAll] Error:', e.message); res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); }
    }

    static async getById(req, res) {
        try {
            const cached = cache.get(`member_${req.params.id}`);
            if (cached) return res.json({ success: true, data: cached, cached: true });

            const member = await MemberModel.getById(req.params.id);
            if (!member) return res.status(404).json({ success: false, error: 'Không tìm thấy' });
            
            cache.set(`member_${req.params.id}`, member);
            res.json({ success: true, data: member });
        } catch (e) { console.error(`[MemberController - getById] Error:`, e.message); res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); }
    }

    static async search(req, res) {
        try { 
            const q = req.query.q || '';
            const cacheKey = `search_${q.toLowerCase()}`;
            const cached = cache.get(cacheKey);
            if (cached) return res.json({ success: true, data: cached, cached: true });

            const data = await MemberModel.search(q);
            cache.set(cacheKey, data); // Cache searches
            res.json({ success: true, data }); 
        }
        catch (e) { console.error('[MemberController - search] Error:', e.message); res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); }
    }

    static async getChildren(req, res) {
        try { res.json({ success: true, data: await MemberModel.getChildren(req.params.id) }); }
        catch (e) { console.error(`[MemberController - getChildren] Error:`, e.message); res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); }
    }

    static async create(req, res) {
        try {
            if (!req.body.name) return res.status(400).json({ success: false, error: 'Tên là bắt buộc' });
            const data = await MemberModel.create(req.body);
            cache.clear(); // Invalidate cache
            res.status(201).json({ success: true, data });
        } catch (e) { console.error('[MemberController - create] Error:', e.message); res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); }
    }

    static async update(req, res) {
        try {
            const member = await MemberModel.update(req.params.id, req.body);
            if (!member) return res.status(404).json({ success: false, error: 'Không tìm thấy' });
            cache.clear(); // Invalidate cache
            res.json({ success: true, data: member });
        } catch (e) { console.error(`[MemberController - update] Error:`, e.message); res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); }
    }

    static async delete(req, res) {
        try {
            const ok = await MemberModel.delete(req.params.id);
            if (!ok) return res.status(404).json({ success: false, error: 'Không tìm thấy' });
            cache.clear(); // Invalidate cache
            res.json({ success: true, message: 'Đã xóa' });
        } catch (e) { console.error(`[MemberController - delete] Error:`, e.message); res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); }
    }

    static async getStats(req, res) {
        try {
            const cached = cache.get('members_stats');
            if (cached) return res.json({ success: true, data: cached, cached: true });

            const data = await MemberModel.getStats();
            cache.set('members_stats', data);
            res.json({ success: true, data });
        } catch (e) { console.error('[MemberController - getStats] Error:', e.message); res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); }
    }

    // Achievements
    static async getAchievements(req, res) {
        try { res.json({ success: true, data: await MemberModel.getAchievements(req.params.id) }); }
        catch (e) { console.error(`[MemberController - getAchievements] Error:`, e.message); res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); }
    }

    static async addAchievement(req, res) {
        try {
            if (!req.body.title) return res.status(400).json({ success: false, error: 'Tên thành tích là bắt buộc' });
            const id = await MemberModel.addAchievement(req.body);
            res.status(201).json({ success: true, data: { id } });
        } catch (e) { console.error('[MemberController - addAchievement] Error:', e.message); res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); }
    }

    static async deleteAchievement(req, res) {
        try {
            await MemberModel.deleteAchievement(req.params.id);
            res.json({ success: true, message: 'Đã xóa' });
        } catch (e) { console.error(`[MemberController - deleteAchievement] Error:`, e.message); res.status(500).json({ success: false, error: e.message || 'Lỗi server' }); }
    }
}

module.exports = MemberController;
