const ChatModel = require('../models/ChatModel');
const { FEATURES } = require('../config/constants');
const CHAT_CONFIG = require('../config/features/chat');

/**
 * [API] Lấy danh sách toàn bộ phòng chat của người dùng hiện tại
 * Kèm theo thông tin thành viên và trạng thái online.
 */
async function getRooms(req, res) {
    console.log(`[ChatController - getRooms] Bắt đầu lấy danh sách phòng chat cho User ID: ${req.user.id}`);
    try {
        const userId = req.user.id;
        const result = await ChatModel.getUserRooms(userId);
        
        if (!result || result.length === 0) return res.json({ success: true, data: [] });

        const { rooms, members } = result;

        console.log(`[ChatController - getRooms] Đã tìm thấy ${rooms.length} phòng chat và ${members.length} thành viên liên quan.`);

        // Bước 2: Lắp ráp (Enrich) dữ liệu phòng chat với thông tin chi tiết của các thành viên
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

        console.log(`[ChatController - getRooms] Trả về thành công danh sách phòng chat cho User ID: ${userId}`);
        res.json({ success: true, data: enrichedRooms });
    } catch (e) {
        console.error(`[ChatController - getRooms] Lỗi khi lấy danh sách phòng chat cho User ID: ${req.user?.id}`, e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

/**
 * [API] Lấy lịch sử tin nhắn của một phòng chat cụ thể
 * Hỗ trợ phân trang và đồng bộ dữ liệu mới (Incremental Fetch) qua tham số `since`.
 */
async function getMessages(req, res) {
    console.log(`[ChatController - getMessages] Đang lấy tin nhắn cho Phòng ID: ${req.params.id}, User ID: ${req.user.id}`);
    try {
        const roomId = parseInt(req.params.id);
        const userId = req.user.id;

        // Bước 1: Kiểm tra xem người dùng có thực sự nằm trong phòng chat này không (Bảo mật Role-based)
        const membership = await ChatModel.getMembership(roomId, userId);

        if (!membership) {
            console.warn(`[ChatController - getMessages] CẢNH BÁO: User ID ${userId} cố gắng truy cập trái phép vào Phòng ID ${roomId}`);
            return res.status(403).json({ success: false, error: 'Bạn không có quyền xem nhóm chat này' });
        }

        // Support incremental fetch: ?since=ISO_timestamp
        const sinceParam = req.query.since;
        
        // Feature flag: limit history if archive is disabled
        const limit = FEATURES.ENABLE_CHAT_HISTORY_ARCHIVE ? CHAT_CONFIG.MAX_MESSAGES_PER_PAGE : CHAT_CONFIG.FALLBACK_LIMIT;

        const messages = await ChatModel.getMessages(roomId, sinceParam, limit);

        // Cập nhật trạng thái "Đã xem" (Last Read) cho người dùng này
        await ChatModel.updateLastRead(roomId, userId);

        console.log(`[ChatController - getMessages] Trả về ${messages?.length || 0} tin nhắn cho Phòng ID: ${roomId}`);
        res.json({ success: true, data: messages || [] });
    } catch (e) {
        console.error(`[ChatController - getMessages] LỖI NGHIÊM TRỌNG tại Phòng ID ${req.params.id}:`, e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

/**
 * [API] Gửi một tin nhắn mới vào phòng chat
 * Sau khi lưu thành công, Hub (WebSockets) sẽ làm nhiệm vụ broadcast tin nhắn này cho những người khác.
 */
async function sendMessage(req, res) {
    console.log(`[ChatController - sendMessage] User ID: ${req.user.id} đang gửi tin nhắn vào Phòng ID: ${req.params.id}`);
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

        // Lưu tin nhắn vào Database
        const message = await ChatModel.saveMessage(roomId, userId, content.trim());
        
        // Cập nhật thời gian hoạt động cuối cùng của phòng chat để đẩy phòng lên đầu danh sách
        await ChatModel.updateRoomTimestamp(roomId);

        console.log(`[ChatController - sendMessage] Gửi tin nhắn thành công. Message ID: ${message.id}`);
        res.json({ success: true, data: message });
    } catch (e) {
        console.error(`[ChatController - sendMessage] LỖI khi gửi tin nhắn tại Phòng ID ${req.params.id}:`, e);
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
