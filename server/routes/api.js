// API routes for family members
const express = require('express');
const router = express.Router();
const MemberController = require('../controllers/memberController');
const { authenticate, optionalAuth, requireAdmin, login, logout, getMe, getUsers, createUser, deleteUser, changePassword } = require('../middleware/auth');
const UpdateRequestModel = require('../models/UpdateRequest');

// ─── Auth (public) ───
router.post('/auth/login', login);

// ─── Auth (authenticated) ───
router.post('/auth/logout', authenticate, logout);
router.get('/auth/me', authenticate, getMe);
router.post('/auth/change-password', authenticate, changePassword);

// ─── User Management (admin only) ───
router.get('/users', authenticate, requireAdmin, getUsers);
router.post('/users', authenticate, requireAdmin, createUser);
router.delete('/users/:id', authenticate, requireAdmin, deleteUser);

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

module.exports = router;
