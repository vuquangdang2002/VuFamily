const ChatModel = require('../models/ChatModel');
const { FEATURES } = require('../config/constants');
const CHAT_CONFIG = require('../config/features/chat');

/**
 * [API] Lấy danh sách toàn bộ phòng chat của người dùng hiện tại
 * Kèm theo thông tin thành viên và trạng thái online.
 */
async function getRooms(req, res) {
    console.log(`[ChatController - getRooms] Fetching chat rooms for User ID: ${req.user.id}`);
    try {
        const userId = req.user.id;
        const result = await ChatModel.getUserRooms(userId);
        
        if (!result || result.length === 0) return res.json({ success: true, data: [] });

        const { rooms, members } = result;

        console.log(`[ChatController - getRooms] Found ${rooms.length} rooms and ${members.length} members.`);

        // Bước 2: Lắp ráp (Enrich) dữ liệu phòng chat với thông tin chi tiết của các thành viên
        const enrichedRooms = rooms.map(room => {
            const roomMembers = members.filter(m => m.room_id === room.id);
            let display_name = room.name;
            let avatar = null;
            let is_online = false;
            let inviteCode = '';
            let allowAdd = false;

            // If direct chat, name is the OTHER person's name
            if (room.type === 'direct') {
                const other = roomMembers.find(m => m.user_id !== userId);
                if (other && other.users) {
                    display_name = other.users.display_name || other.users.username;
                    avatar = other.users.avatar;
                    // Check if they are actually online (pinged in last 5 mins)
                    is_online = other.users.is_online && (new Date() - new Date(other.users.last_active)) < 5 * 60000;
                }
            } else if (room.type === 'group' && room.name && room.name.startsWith('{') && room.name.endsWith('}')) {
                try {
                    const parsed = JSON.parse(room.name);
                    display_name = parsed.n || 'Nhóm';
                    inviteCode = parsed.ic || '';
                    allowAdd = !!parsed.aa;
                } catch (e) {
                    // ignore
                }
            }

            return {
                ...room,
                display_name,
                avatar,
                is_online,
                inviteCode,
                allowAdd,
                members: roomMembers.map(m => ({ ...m.users, role: m.role || 'member' }))
            };
        });

        console.log(`[ChatController - getRooms] Successfully returned chat rooms for User ID: ${userId}`);
        res.json({ success: true, data: enrichedRooms });
    } catch (e) {
        console.error(`[ChatController - getRooms] Error fetching chat rooms for User ID: ${req.user?.id}`, e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

/**
 * [API] Lấy lịch sử tin nhắn của một phòng chat cụ thể
 * Hỗ trợ phân trang và đồng bộ dữ liệu mới (Incremental Fetch) qua tham số `since`.
 */
async function getMessages(req, res) {
    console.log(`[ChatController - getMessages] Fetching messages for Room ID: ${req.params.id}, User ID: ${req.user.id}`);
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

        console.log(`[ChatController - getMessages] Returning ${messages?.length || 0} messages for Room ID: ${roomId}`);
        res.json({ success: true, data: messages || [] });
    } catch (e) {
        console.error(`[ChatController - getMessages] CRITICAL ERROR at Room ID ${req.params.id}:`, e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

/**
 * [API] Gửi một tin nhắn mới vào phòng chat
 * Sau khi lưu thành công, Hub (WebSockets) sẽ làm nhiệm vụ broadcast tin nhắn này cho những người khác.
 */
async function sendMessage(req, res) {
    console.log(`[ChatController - sendMessage] User ID: ${req.user.id} sending message to Room ID: ${req.params.id}`);
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

        console.log(`[ChatController - sendMessage] Sent successfully. Message ID: ${message.id}`);
        res.json({ success: true, data: message });
    } catch (e) {
        console.error(`[ChatController - sendMessage] ERROR sending message to Room ID ${req.params.id}:`, e);
        console.error(`[ChatController - sendMessage] Error room ${req.params.id}:`, e);
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

        // Determine group name and serialize settings
        let finalName = name;
        if (isGroup) {
            const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            if (!finalName || !finalName.trim()) {
                const allMemberIds = [userId, ...participantIds];
                const usersInfo = await ChatModel.getUsersInfo(allMemberIds);
                const names = usersInfo ? usersInfo.map(u => u.display_name || u.username) : [];
                const generatedTitle = `Nhóm ${names.join(', ')}`.substring(0, 80);
                finalName = JSON.stringify({ n: generatedTitle, ic: inviteCode, aa: false });
            } else {
                finalName = JSON.stringify({ n: finalName.trim(), ic: inviteCode, aa: false });
            }
        }

        // Create room
        const newRoom = await ChatModel.createRoom(actualType, finalName);

        // Add members
        const allMemberIds = [userId, ...participantIds];
        const memberData = allMemberIds.map(id => ({
            room_id: newRoom.id,
            user_id: id,
            role: id === userId && isGroup ? 'admin' : 'member' // Creator is admin if group
        }));

        await ChatModel.addMembers(memberData);

        // Parse and enrich newRoom object to return it correctly
        let display_name = newRoom.name;
        let inviteCode = '';
        let allowAdd = false;

        if (newRoom.type === 'group' && newRoom.name && newRoom.name.startsWith('{') && newRoom.name.endsWith('}')) {
            try {
                const parsed = JSON.parse(newRoom.name);
                display_name = parsed.n || 'Nhóm';
                inviteCode = parsed.ic || '';
                allowAdd = !!parsed.aa;
            } catch (e) {
                // ignore
            }
        }

        res.json({ 
            success: true, 
            data: { 
                ...newRoom, 
                display_name, 
                inviteCode, 
                allowAdd 
            } 
        });
    } catch (e) {
        console.error('[ChatController - createRoom] Error:', e);
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

        const room = await ChatModel.getRoomById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy phòng' });
        }

        let finalName = name.trim();
        if (room.type === 'group') {
            let inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            let allowAdd = false;
            if (room.name && room.name.startsWith('{') && room.name.endsWith('}')) {
                try {
                    const parsed = JSON.parse(room.name);
                    if (parsed.ic) inviteCode = parsed.ic;
                    if (parsed.aa !== undefined) allowAdd = parsed.aa;
                } catch (e) {
                    // ignore
                }
            }
            finalName = JSON.stringify({ n: finalName, ic: inviteCode, aa: allowAdd });
        }

        await ChatModel.updateRoomName(roomId, finalName);
        await ChatModel.updateRoomTimestamp(roomId);

        res.json({ success: true });
    } catch (e) {
        console.error('[ChatController - updateRoomName] Error:', e);
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
        console.error('[ChatController - leaveRoom] Error:', e);
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
        console.error('[ChatController - kickMember] Error:', e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

// Add member to group
async function addMember(req, res) {
    try {
        const roomId = parseInt(req.params.id);
        const { userId } = req.body;
        const myId = req.user.id;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'Thiếu thông tin người cần thêm' });
        }

        const room = await ChatModel.getRoomById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy nhóm' });
        }

        if (room.type !== 'group') {
            return res.status(400).json({ success: false, error: 'Chỉ có thể thêm thành viên vào nhóm chat' });
        }

        // Verify my membership & role
        const myMembership = await ChatModel.getMembership(roomId, myId);
        if (!myMembership) {
            return res.status(403).json({ success: false, error: 'Bạn không có quyền truy cập nhóm này' });
        }

        // Check permission: must be admin OR room must allow members to add
        let canAdd = myMembership.role === 'admin';
        if (!canAdd && room.name && room.name.startsWith('{') && room.name.endsWith('}')) {
            try {
                const parsed = JSON.parse(room.name);
                if (parsed.aa) { // aa = allowAdd
                    canAdd = true;
                }
            } catch (e) {
                // ignore
            }
        }

        if (!canAdd) {
            return res.status(403).json({ success: false, error: 'Chỉ quản trị viên mới có quyền thêm thành viên vào nhóm này' });
        }

        // Check if target user is already a member
        const existingMembership = await ChatModel.getMembership(roomId, userId);
        if (existingMembership) {
            return res.status(400).json({ success: false, error: 'Người này đã là thành viên của nhóm' });
        }

        // Add member
        await ChatModel.addMembers([{
            room_id: roomId,
            user_id: userId,
            role: 'member'
        }]);

        // Send a system message indicating they were added
        const targetUser = await ChatModel.getUserInfo(userId);
        const targetDisplay = targetUser?.display_name || targetUser?.username || 'Thành viên mới';
        const myDisplay = req.user.display_name || req.user.username || 'Thành viên';
        
        await ChatModel.saveMessage(roomId, myId, `=== ${myDisplay} đã thêm ${targetDisplay} vào nhóm ===`);
        await ChatModel.updateRoomTimestamp(roomId);

        res.json({ success: true });
    } catch (e) {
        console.error('[ChatController - addMember] Error:', e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

// Join room by invite code
async function joinRoomByInviteCode(req, res) {
    try {
        const userId = req.user.id;
        const { inviteCode } = req.body;

        if (!inviteCode || inviteCode.trim() === '') {
            return res.status(400).json({ success: false, error: 'Mã mời không hợp lệ' });
        }

        // Fetch all group rooms
        const rooms = await ChatModel.getAllGroupRooms();

        // Find the room with the matching invite code in its JSON name
        let targetRoom = null;
        for (const room of rooms) {
            if (room.name && room.name.startsWith('{') && room.name.endsWith('}')) {
                try {
                    const parsed = JSON.parse(room.name);
                    if (parsed.ic && parsed.ic.toUpperCase() === inviteCode.trim().toUpperCase()) {
                        targetRoom = room;
                        break;
                    }
                } catch (e) {
                    // ignore parse error
                }
            }
        }

        if (!targetRoom) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy nhóm với mã mời này' });
        }

        // Check if user is already a member
        const existingMembership = await ChatModel.getMembership(targetRoom.id, userId);
        if (existingMembership) {
            return res.json({ success: true, data: { id: targetRoom.id } });
        }

        // Add user as member
        await ChatModel.addMembers([{
            room_id: targetRoom.id,
            user_id: userId,
            role: 'member'
        }]);

        // Send a system message indicating they joined
        const userDisplay = req.user.display_name || req.user.username || 'Thành viên';
        await ChatModel.saveMessage(targetRoom.id, userId, `=== ${userDisplay} đã tham gia nhóm bằng mã mời ===`);
        await ChatModel.updateRoomTimestamp(targetRoom.id);

        res.json({ success: true, data: { id: targetRoom.id } });
    } catch (e) {
        console.error('[ChatController - joinRoomByInviteCode] Error:', e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

// Update room settings (allowAdd)
async function updateRoomSettings(req, res) {
    try {
        const roomId = parseInt(req.params.id);
        const { allowAdd } = req.body;

        if (allowAdd === undefined) {
            return res.status(400).json({ success: false, error: 'Thiếu thông tin cài đặt' });
        }

        // Verify membership & admin role
        const membership = await ChatModel.getMembership(roomId, req.user.id);
        if (!membership || membership.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Chỉ quản trị viên mới có quyền thay đổi cài đặt' });
        }

        const room = await ChatModel.getRoomById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy phòng' });
        }

        if (room.type !== 'group') {
            return res.status(400).json({ success: false, error: 'Phòng không phải là nhóm chat' });
        }

        let title = room.name || 'Nhóm';
        let inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        if (room.name && room.name.startsWith('{') && room.name.endsWith('}')) {
            try {
                const parsed = JSON.parse(room.name);
                if (parsed.n) title = parsed.n;
                if (parsed.ic) inviteCode = parsed.ic;
            } catch (e) {
                // ignore
            }
        }

        const finalName = JSON.stringify({ n: title, ic: inviteCode, aa: !!allowAdd });

        await ChatModel.updateRoomName(roomId, finalName);
        await ChatModel.updateRoomTimestamp(roomId);

        res.json({ success: true });
    } catch (e) {
        console.error('[ChatController - updateRoomSettings] Error:', e);
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
    kickMember,
    addMember,
    joinRoomByInviteCode,
    updateRoomSettings
};
