const ChatModel = require('../models/ChatModel');

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

        // Enrich room data with member details
        const enrichedRooms = rooms.map(room => {
            const roomMembers = members.filter(m => m.room_id === room.id);
            let display_name = room.name;
            let avatar = null;
            let is_online = false;
            let inviteCode = '';
            let allowAdd = false;

            if (room.type === 'direct') {
                const other = roomMembers.find(m => m.user_id !== userId);
                if (other && other.users) {
                    display_name = other.users.display_name || other.users.username;
                    avatar = other.users.avatar;
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

        if (actualType === 'direct') {
            const targetId = participantIds[0];
            const existingRoom = await ChatModel.checkExistingDirectRoom(userId, targetId);
            
            if (existingRoom) {
                return res.json({ success: true, data: { id: existingRoom.id } });
            }
        }

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

        const newRoom = await ChatModel.createRoom(actualType, finalName);

        const allMemberIds = [userId, ...participantIds];
        const memberData = allMemberIds.map(id => ({
            room_id: newRoom.id,
            user_id: id,
            role: id === userId && isGroup ? 'admin' : 'member'
        }));

        await ChatModel.addMembers(memberData);

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

        const membership = await ChatModel.getMembership(roomId, userId);
        if (!membership) {
            return res.status(404).json({ success: false, error: 'Bạn không phải thành viên của nhóm này' });
        }

        const wasAdmin = membership.role === 'admin';

        await ChatModel.removeMember(roomId, userId);

        const userDisplay = req.user.display_name || req.user.username || 'Thành viên';
        await ChatModel.saveMessage(roomId, userId, `=== ${userDisplay} đã rời khỏi nhóm ===`);

        if (wasAdmin) {
            const remainingMembers = await ChatModel.getRoomMembers(roomId);
            if (remainingMembers.length > 0) {
                const hasOtherAdmin = remainingMembers.some(m => m.role === 'admin');
                if (!hasOtherAdmin) {
                    const randomIndex = Math.floor(Math.random() * remainingMembers.length);
                    const promotedMember = remainingMembers[randomIndex];
                    
                    await ChatModel.updateMemberRole(roomId, promotedMember.user_id, 'admin');

                    const promotedUser = promotedMember.users || {};
                    const promotedDisplay = promotedUser.display_name || promotedUser.username || 'Thành viên';
                    await ChatModel.saveMessage(roomId, userId, `=== ${promotedDisplay} đã được chọn làm Quản trị viên mới của nhóm ===`);
                }
            }
        }

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
        const { userId, userIds } = req.body;
        const myId = req.user.id;

        const targetUserIds = userIds ? userIds : (userId ? [userId] : []);

        if (targetUserIds.length === 0) {
            return res.status(400).json({ success: false, error: 'Thiếu thông tin người cần thêm' });
        }

        const room = await ChatModel.getRoomById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy nhóm' });
        }

        if (room.type !== 'group') {
            return res.status(400).json({ success: false, error: 'Chỉ có thể thêm thành viên vào nhóm chat' });
        }

        const myMembership = await ChatModel.getMembership(roomId, myId);
        if (!myMembership) {
            return res.status(403).json({ success: false, error: 'Bạn không có quyền truy cập nhóm này' });
        }

        let canAdd = myMembership.role === 'admin';
        if (!canAdd && room.name && room.name.startsWith('{') && room.name.endsWith('}')) {
            try {
                const parsed = JSON.parse(room.name);
                if (parsed.aa) {
                    canAdd = true;
                }
            } catch (e) {
                // ignore
            }
        }

        if (!canAdd) {
            return res.status(403).json({ success: false, error: 'Chỉ quản trị viên mới có quyền thêm thành viên vào nhóm này' });
        }

        const idsToAdd = [];
        for (const id of targetUserIds) {
            const existingMembership = await ChatModel.getMembership(roomId, id);
            if (!existingMembership) {
                idsToAdd.push(id);
            }
        }

        if (idsToAdd.length === 0) {
            return res.status(400).json({ success: false, error: 'Tất cả người chọn đều đã là thành viên của nhóm' });
        }

        const newMembersData = idsToAdd.map(id => ({
            room_id: roomId,
            user_id: id,
            role: 'member'
        }));
        await ChatModel.addMembers(newMembersData);

        const usersInfo = await ChatModel.getUsersInfo(idsToAdd);
        const targetNames = usersInfo ? usersInfo.map(u => u.display_name || u.username) : [];
        const targetDisplay = targetNames.join(', ');
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

        const rooms = await ChatModel.getAllGroupRooms();

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
                    // ignore
                }
            }
        }

        if (!targetRoom) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy nhóm với mã mời này' });
        }

        const existingMembership = await ChatModel.getMembership(targetRoom.id, userId);
        if (existingMembership) {
            return res.json({ success: true, data: { id: targetRoom.id } });
        }

        await ChatModel.addMembers([{
            room_id: targetRoom.id,
            user_id: userId,
            role: 'member'
        }]);

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

// Update member role (promote/demote)
async function changeMemberRole(req, res) {
    try {
        const roomId = parseInt(req.params.id);
        const targetUserId = parseInt(req.params.userId);
        const { role } = req.body;
        const myId = req.user.id;

        if (!role || (role !== 'admin' && role !== 'member')) {
            return res.status(400).json({ success: false, error: 'Vai trò không hợp lệ' });
        }

        const myMembership = await ChatModel.getMembership(roomId, myId);
        if (!myMembership || myMembership.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Chỉ quản trị viên nhóm mới có quyền này' });
        }

        const targetMembership = await ChatModel.getMembership(roomId, targetUserId);
        if (!targetMembership) {
            return res.status(404).json({ success: false, error: 'Người dùng không phải thành viên nhóm này' });
        }

        if (targetMembership.role === role) {
            return res.json({ success: true, message: 'Vai trò không thay đổi' });
        }

        if (targetUserId === myId && role === 'member') {
            const adminCount = await ChatModel.countAdmins(roomId);
            if (adminCount <= 1) {
                return res.status(400).json({ success: false, error: 'Nhóm phải có ít nhất một quản trị viên' });
            }
        }

        await ChatModel.updateMemberRole(roomId, targetUserId, role);

        const targetUser = await ChatModel.getUserInfo(targetUserId);
        const targetDisplay = targetUser ? (targetUser.display_name || targetUser.username) : 'Thành viên';
        const myDisplay = req.user.display_name || req.user.username || 'Quản trị';

        const actionText = role === 'admin' ? 'đã bổ nhiệm làm Quản trị viên' : 'đã gỡ quyền Quản trị viên';
        await ChatModel.saveMessage(roomId, myId, `=== ${myDisplay} ${actionText} của ${targetDisplay} ===`);
        await ChatModel.updateRoomTimestamp(roomId);

        res.json({ success: true });
    } catch (e) {
        console.error('[ChatController - changeMemberRole] Error:', e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

module.exports = {
    getRooms,
    createRoom,
    updateRoomName,
    leaveRoom,
    kickMember,
    addMember,
    joinRoomByInviteCode,
    updateRoomSettings,
    changeMemberRole
};
