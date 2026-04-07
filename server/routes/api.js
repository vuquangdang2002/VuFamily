// API routes for family members
const express = require('express');
const router = express.Router();
const MemberController = require('../controllers/memberController');
const { authenticate, optionalAuth, requireAdmin, login, logout, getMe, getUsers, createUser, updateUser, deleteUser, changePassword, resetPassword, forgotPassword, updateProfile } = require('../middleware/auth');
const UpdateRequestModel = require('../models/UpdateRequest');

// ─── Auth (public) ───
router.post('/auth/login', login);
router.post('/auth/forgot-password', forgotPassword);

// ─── Auth (authenticated) ───
router.post('/auth/logout', authenticate, logout);
router.get('/auth/me', authenticate, getMe);
router.post('/auth/change-password', authenticate, changePassword);
router.put('/auth/profile', authenticate, updateProfile);

// ─── Avatar Upload (raw binary) ───
router.post('/auth/avatar', authenticate, require('express').raw({ type: 'image/*', limit: '5mb' }), async (req, res) => {
    try {
        const buffer = req.body;
        if (!buffer || !buffer.length) return res.status(400).json({ success: false, error: 'Không có dữ liệu ảnh' });

        const contentType = req.headers['content-type'] || 'image/jpeg';
        const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
        const fileName = `${req.user.id}_${Date.now()}.${ext}`;

        const { supabase } = require('../../database/supabase');
        const { error } = await supabase.storage
            .from('avatars')
            .upload(fileName, buffer, { contentType, upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

        res.json({ success: true, url: publicUrl });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// ─── User Management (admin only) ───
router.get('/users', authenticate, requireAdmin, getUsers);
router.post('/users', authenticate, requireAdmin, createUser);
router.put('/users/:id', authenticate, requireAdmin, updateUser);
router.delete('/users/:id', authenticate, requireAdmin, deleteUser);
router.post('/users/:id/reset-password', authenticate, requireAdmin, resetPassword);

// ─── Stats (public for read-only) ───
router.get('/stats', MemberController.getStats);

// ─── Members (read = public, write = auth required) ───
router.get('/members/search', MemberController.search);
router.get('/members', MemberController.getAll);
router.get('/members/:id', MemberController.getById);
router.get('/members/:id/children', MemberController.getChildren);
router.get('/members/:id/achievements', MemberController.getAchievements);

// Write operations: admin can directly modify, viewer sends request
router.post('/members', authenticate, requireAdmin, MemberController.create);
router.put('/members/:id', authenticate, requireAdmin, MemberController.update);
router.delete('/members/:id', authenticate, requireAdmin, MemberController.delete);

// Achievements (admin only)
router.post('/achievements', authenticate, requireAdmin, MemberController.addAchievement);
router.delete('/achievements/:id', authenticate, requireAdmin, MemberController.deleteAchievement);

// ─── Update Requests (viewer submits, admin reviews) ───
router.get('/requests', authenticate, async (req, res) => {
    try {
        const data = req.user.role === 'admin'
            ? await UpdateRequestModel.getAll()
            : await UpdateRequestModel.getByUser(req.user.id);
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/requests/pending', authenticate, requireAdmin, async (req, res) => {
    try {
        const data = await UpdateRequestModel.getAll('pending');
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/requests', authenticate, async (req, res) => {
    try {
        const { memberId, changes, note } = req.body;
        if (!memberId || !changes) return res.status(400).json({ success: false, error: 'Thiếu thông tin' });
        const id = await UpdateRequestModel.create(req.user.id, memberId, changes, note);
        res.status(201).json({ success: true, data: { id }, message: 'Đã gửi yêu cầu cập nhật. Vui lòng chờ Admin duyệt.' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/requests/:id/approve', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await UpdateRequestModel.approve(req.params.id, req.user.id);
        if (!result) return res.status(404).json({ success: false, error: 'Không tìm thấy yêu cầu' });
        res.json({ success: true, message: 'Đã duyệt yêu cầu cập nhật' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/requests/:id/reject', authenticate, requireAdmin, async (req, res) => {
    try {
        await UpdateRequestModel.reject(req.params.id, req.user.id, req.body.reason);
        res.json({ success: true, message: 'Đã từ chối yêu cầu' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── Posts (Bảng tin - shared newsfeed) ───
const PostModel = require('../models/Post');
const CommentModel = require('../models/Comment');
const ReactionModel = require('../models/Reaction');

router.get('/posts', async (req, res) => {
    try {
        const posts = await PostModel.getAll();
        if (!posts.length) return res.json({ success: true, data: [] });

        const postIds = posts.map(p => p.id);
        const { supabase } = require('../../database/supabase');

        // Batch: 2 queries instead of 2N
        const [reactionsRes, commentsRes] = await Promise.all([
            supabase.from('reactions').select('*').in('post_id', postIds),
            supabase.from('comments').select('post_id').in('post_id', postIds)
        ]);

        // Group reactions by post_id
        const reactionsByPost = {};
        (reactionsRes.data || []).forEach(r => {
            if (!reactionsByPost[r.post_id]) reactionsByPost[r.post_id] = [];
            reactionsByPost[r.post_id].push(r);
        });

        // Count comments by post_id
        const commentCountByPost = {};
        (commentsRes.data || []).forEach(c => {
            commentCountByPost[c.post_id] = (commentCountByPost[c.post_id] || 0) + 1;
        });

        // Merge
        const enriched = posts.map(post => {
            const reactions = reactionsByPost[post.id] || [];
            const reactionSummary = {};
            reactions.forEach(r => {
                if (!reactionSummary[r.emoji]) reactionSummary[r.emoji] = { count: 0, users: [] };
                reactionSummary[r.emoji].count++;
                reactionSummary[r.emoji].users.push(r.user_id);
            });
            return { ...post, reactions: reactionSummary, comment_count: commentCountByPost[post.id] || 0 };
        });

        res.json({ success: true, data: enriched });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/posts', authenticate, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) return res.status(400).json({ success: false, error: 'Nội dung không được trống' });
        const post = await PostModel.create(
            content.trim(),
            req.user.display_name || req.user.username,
            req.user.role,
            req.user.id
        );
        res.status(201).json({ success: true, data: post });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/posts/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        await PostModel.delete(req.params.id);
        res.json({ success: true, message: 'Đã xóa bài đăng' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── Comments (bình luận bài đăng) ───
router.get('/posts/:id/comments', async (req, res) => {
    try {
        const data = await CommentModel.getByPostId(parseInt(req.params.id));
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/posts/:id/comments', authenticate, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) return res.status(400).json({ success: false, error: 'Nội dung không được trống' });
        const comment = await CommentModel.create(
            parseInt(req.params.id),
            content.trim(),
            req.user.display_name || req.user.username,
            req.user.role,
            req.user.id
        );
        res.status(201).json({ success: true, data: comment });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/comments/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        await CommentModel.delete(parseInt(req.params.id));
        res.json({ success: true, message: 'Đã xóa bình luận' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ─── Reactions (cảm xúc bài đăng) ───
router.post('/posts/:id/reactions', authenticate, async (req, res) => {
    try {
        const { emoji } = req.body;
        if (!emoji) return res.status(400).json({ success: false, error: 'Emoji is required' });
        const result = await ReactionModel.toggle(
            parseInt(req.params.id),
            req.user.id,
            emoji
        );
        res.json({ success: true, ...result });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
