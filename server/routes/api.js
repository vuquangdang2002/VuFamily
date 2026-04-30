// API routes for family members
const express = require('express');
const router = express.Router();
const MemberController = require('../controllers/memberController');
const { authenticate, requireAdmin, requireEditorOrAdmin, getUsers, createUser, updateUser, deleteUser, changePassword, resetPassword, forgotPassword, updateProfile, register, verifyEmail } = require('../middleware/auth');
const UpdateRequestModel = require('../models/UpdateRequest');
const AuthController = require('../controllers/authController');

// ─── Auth (public) ───
router.post('/auth/login', AuthController.login);
router.post('/auth/register', register);
router.post('/auth/forgot-password', forgotPassword);
router.get('/auth/verify-email', verifyEmail);

// ─── Auth (authenticated) ───
router.post('/auth/logout', authenticate, AuthController.logout);
router.get('/auth/me', authenticate, AuthController.getMe);
router.post('/auth/change-password', authenticate, changePassword);
router.put('/auth/profile', authenticate, updateProfile);
router.post('/users/ping', authenticate, AuthController.ping);

// ─── Avatar Upload (raw binary) ───
router.post('/auth/avatar', authenticate, require('express').raw({ type: 'image/*', limit: '5mb' }), async (req, res) => {
    try {
        const buffer = req.body;
        if (!buffer || !buffer.length) return res.status(400).json({ success: false, error: 'Không có dữ liệu ảnh' });

        const contentType = req.headers['content-type'] || 'image/jpeg';
        const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
        const fileName = `${req.user.id}_${Date.now()}.${ext}`;

        const { supabase } = require('../config/supabase');
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
router.get('/users/public', authenticate, require('../middleware/auth').getPublicUsers);
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

// Write operations: admin/editor can directly modify, viewer sends request
router.post('/members', authenticate, requireEditorOrAdmin, MemberController.create);
router.put('/members/:id', authenticate, requireEditorOrAdmin, MemberController.update);
router.delete('/members/:id', authenticate, requireEditorOrAdmin, MemberController.delete);

// Achievements (editor or admin)
router.post('/achievements', authenticate, requireEditorOrAdmin, MemberController.addAchievement);
router.delete('/achievements/:id', authenticate, requireEditorOrAdmin, MemberController.deleteAchievement);

// ─── Update Requests (viewer submits, admin reviews) ───
const UpdateRequestController = require('../controllers/updateRequestController');

router.get('/requests', authenticate, UpdateRequestController.getRequests);
router.get('/requests/pending', authenticate, requireEditorOrAdmin, UpdateRequestController.getPendingRequests);
router.post('/requests', authenticate, UpdateRequestController.createRequest);
router.post('/requests/:id/approve', authenticate, requireEditorOrAdmin, UpdateRequestController.approveRequest);
router.post('/requests/:id/reject', authenticate, requireEditorOrAdmin, UpdateRequestController.rejectRequest);

// ─── Posts (Bảng tin - shared newsfeed) ───
const PostController = require('../controllers/postController');

router.get('/posts', PostController.getAllPosts);
router.post('/posts', authenticate, PostController.createPost);
router.delete('/posts/:id', authenticate, requireAdmin, PostController.deletePost);

// ─── Comments (bình luận bài đăng) ───
router.get('/posts/:id/comments', PostController.getComments);
router.post('/posts/:id/comments', authenticate, PostController.createComment);
router.delete('/comments/:id', authenticate, requireAdmin, PostController.deleteComment);

// ─── Reactions (cảm xúc bài đăng) ───
router.post('/posts/:id/reactions', authenticate, PostController.toggleReaction);

// ─── Chat System ───
const { getRooms, getMessages, sendMessage, createRoom, updateRoomName, leaveRoom, kickMember } = require('../controllers/chatController');

router.get('/chats', authenticate, getRooms);
router.post('/chats', authenticate, createRoom);
router.get('/chats/:id/messages', authenticate, getMessages);
router.post('/chats/:id/messages', authenticate, sendMessage);
router.put('/chats/:id/name', authenticate, updateRoomName);
router.post('/chats/:id/leave', authenticate, leaveRoom);
router.post('/chats/:id/kick/:userId', authenticate, kickMember);

// ─── Voice Calls (WebRTC Signaling) ───
const CallController = require('../controllers/callController');
router.post('/calls', authenticate, CallController.initiateCall);
router.get('/calls/incoming', authenticate, CallController.pollIncoming);
router.get('/calls/:id', authenticate, CallController.getCall);
router.put('/calls/:id/answer', authenticate, CallController.answerCall);
router.put('/calls/:id/status', authenticate, CallController.updateStatus);
router.post('/calls/:id/candidates', authenticate, CallController.addCandidate);
router.get('/calls/:id/candidates', authenticate, CallController.getCandidates);
router.post('/calls/:id/signals', authenticate, CallController.addSignal);
router.get('/calls/:id/signals', authenticate, CallController.getSignals);

module.exports = router;
