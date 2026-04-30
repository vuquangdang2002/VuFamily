const ChatModel = require('../models/ChatModel');
const { FEATURES } = require('../config/constants');
const CHAT_CONFIG = require('../config/features/chat');

// Get all chat rooms for a user
async function getRooms(req, res) {
    try {
        const userId = req.user.id;
        const result = await ChatModel.getUserRooms(userId);
        
        if (!result || result.length === 0) return res.json({ success: true, data: [] });

        const { rooms, members } = result;

        // Enrich rooms with members
        const enrichedRooms = rooms.map(room => {
            const roomMembers = members.filter(m => m.room_id === room.id);
            let display_name = room.name;
            let avatar = null;
            let is_online = false;

            // If direct chat, name is the OTHER person's name
            if (room.type === 'direct') {
                const other = roomMembers.find(m => m.user_id !== userId);
                if (other && other.users) {
                    display_name = other.users.display_name || other.users.username;
                    avatar = other.users.avatar;
                    // Check if they are actually online (pinged in last 5 mins)
                    is_online = other.users.is_online && (new Date() - new Date(other.users.last_active)) < 5 * 60000;
                }
            }

            return {
                ...room,
                display_name,
                avatar,
                is_online,
                members: roomMembers.map(m => ({ ...m.users, role: m.role || 'member' }))
            };
        });

        res.json({ success: true, data: enrichedRooms });
    } catch (e) {
        console.error('[ChatController - getRooms] Lỗi:', e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

// Get messages for a room
async function getMessages(req, res) {
    try {
        const roomId = parseInt(req.params.id);
        const userId = req.user.id;

        // Verify membership
        const membership = await ChatModel.getMembership(roomId, userId);

        if (!membership) {
            return res.status(403).json({ success: false, error: 'Bạn không có quyền xem nhóm chat này' });
        }

        // Support incremental fetch: ?since=ISO_timestamp
        const sinceParam = req.query.since;
        
        // Feature flag: limit history if archive is disabled
        const limit = FEATURES.ENABLE_CHAT_HISTORY_ARCHIVE ? CHAT_CONFIG.MAX_MESSAGES_PER_PAGE : CHAT_CONFIG.FALLBACK_LIMIT;

        const messages = await ChatModel.getMessages(roomId, sinceParam, limit);

        // Update last read
        await ChatModel.updateLastRead(roomId, userId);

        res.json({ success: true, data: messages || [] });
    } catch (e) {
        console.error(`[ChatController - getMessages] Lỗi room ${req.params.id}:`, e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

// Send a message
async function sendMessage(req, res) {
    try {
        const roomId = parseInt(req.params.id);
        const userId = req.user.id;
        const { content } = req.body;
        
        if (!content || !content.trim()) return res.status(400).json({ success: false, error: 'Tin nhắn rỗng' });

        // Verify membership
        const membership = await ChatModel.getMembership(roomId, userId);

        if (!membership) {
            return res.status(403).json({ success: false, error: 'Bạn không có quyền gửi tin vào nhóm này' });
        }

        const message = await ChatModel.saveMessage(roomId, userId, content.trim());
        await ChatModel.updateRoomTimestamp(roomId);

        res.json({ success: true, data: message });
    } catch (e) {
        console.error(`[ChatController - sendMessage] Lỗi room ${req.params.id}:`, e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

// Create a new room (direct or group)
async function createRoom(req, res) {
    try {
        const userId = req.user.id;
        const { type, name, participantIds } = req.body; 

        if (!participantIds || participantIds.length === 0) {
            return res.status(400).json({ success: false, error: 'Phải chọn ít nhất 1 người để chat' });
        }

        const isGroup = type === 'group' || participantIds.length > 1;
        const actualType = isGroup ? 'group' : 'direct';

        // If direct, check if exists already
        if (actualType === 'direct') {
            const targetId = participantIds[0];
            const existingRoom = await ChatModel.checkExistingDirectRoom(userId, targetId);
            
            if (existingRoom) {
                return res.json({ success: true, data: { id: existingRoom.id } });
            }
        }

        // Create room
        const newRoom = await ChatModel.createRoom(actualType, name);

        // Add members
        const allMemberIds = [userId, ...participantIds];
        const memberData = allMemberIds.map(id => ({
            room_id: newRoom.id,
            user_id: id,
            role: id === userId && isGroup ? 'admin' : 'member' // Creator is admin if group
        }));

        await ChatModel.addMembers(memberData);

        res.json({ success: true, data: newRoom });
    } catch (e) {
        console.error('[ChatController - createRoom] Lỗi:', e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

// Update room name
async function updateRoomName(req, res) {
    try {
        const roomId = parseInt(req.params.id);
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, error: 'Tên không hợp lệ' });
        }

        // Verify membership & role
        const membership = await ChatModel.getMembership(roomId, req.user.id);
        if (!membership) {
            return res.status(403).json({ success: false, error: 'Không có quyền truy cập' });
        }

        await ChatModel.updateRoomName(roomId, name.trim());
        await ChatModel.updateRoomTimestamp(roomId);

        res.json({ success: true });
    } catch (e) {
        console.error('[ChatController - updateRoomName] Lỗi:', e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

// Leave room
async function leaveRoom(req, res) {
    try {
        const roomId = parseInt(req.params.id);
        const userId = req.user.id;

        await ChatModel.removeMember(roomId, userId);

        res.json({ success: true, message: 'Đã rời phòng' });
    } catch (e) {
        console.error('[ChatController - leaveRoom] Lỗi:', e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

// Kick member
async function kickMember(req, res) {
    try {
        const roomId = parseInt(req.params.id);
        const targetUserId = parseInt(req.params.userId);
        const myId = req.user.id;

        // Verify I am admin
        const myMembership = await ChatModel.getMembership(roomId, myId);
        if (!myMembership || myMembership.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Chỉ quản trị viên nhóm mới có quyền này' });
        }

        await ChatModel.removeMember(roomId, targetUserId);

        res.json({ success: true, message: 'Đã mời thành viên rời nhóm' });
    } catch (e) {
        console.error('[ChatController - kickMember] Lỗi:', e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

module.exports = {
    getRooms,
    getMessages,
    sendMessage,
    createRoom,
    updateRoomName,
    leaveRoom,
    kickMember
};
