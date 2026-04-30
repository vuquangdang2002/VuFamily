const { supabase } = require('../../database/supabase');

// Get all chat rooms for a user
async function getRooms(req, res) {
    try {
        const userId = req.user.id;

        // Find rooms the user is a member of
        const { data: userRooms, error: memberErr } = await supabase
            .from('chat_members')
            .select('room_id')
            .eq('user_id', userId);

        if (memberErr) throw memberErr;
        if (!userRooms || userRooms.length === 0) return res.json({ success: true, data: [] });

        const roomIds = userRooms.map(r => r.room_id);

        // Get room details
        const { data: rooms, error: roomErr } = await supabase
            .from('chat_rooms')
            .select('*')
            .in('id', roomIds)
            .order('updated_at', { ascending: false });

        if (roomErr) throw roomErr;

        // Fetch members for these rooms to figure out names (for direct chats)
        const { data: members, error: allMembersErr } = await supabase
            .from('chat_members')
            .select('room_id, user_id, role, users(id, username, display_name, avatar, is_online, last_active)')
            .in('room_id', roomIds);

        if (allMembersErr) throw allMembersErr;

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
        res.status(500).json({ success: false, error: e.message });
    }
}

// Get messages for a room
async function getMessages(req, res) {
    try {
        const roomId = parseInt(req.params.id);

        // Verify membership
        const { data: membership, error: membershipErr } = await supabase
            .from('chat_members')
            .select('*')
            .eq('room_id', roomId)
            .eq('user_id', req.user.id)
            .single();

        if (membershipErr || !membership) {
            return res.status(403).json({ success: false, error: 'Bạn không có quyền xem nhóm chat này' });
        }

        // Support incremental fetch: ?since=ISO_timestamp
        const sinceParam = req.query.since;
        let query = supabase
            .from('chat_messages')
            .select('*, users!chat_messages_sender_id_fkey(id, username, display_name, avatar)')
            .eq('room_id', roomId);

        if (sinceParam) {
            // Only fetch messages created after this timestamp (for incremental sync)
            query = query.gt('created_at', sinceParam);
        }

        const { data: messages, error } = await query
            .order('created_at', { ascending: true })
            .limit(100);

        if (error) throw error;

        // Update last read
        await supabase
            .from('chat_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('room_id', roomId)
            .eq('user_id', req.user.id);

        res.json({ success: true, data: messages || [] });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// Send a message
async function sendMessage(req, res) {
    try {
        const roomId = parseInt(req.params.id);
        const { content } = req.body;
        if (!content || !content.trim()) return res.status(400).json({ success: false, error: 'Tin nhắn rỗng' });

        // Verify membership
        const { data: membership, error: membershipErr } = await supabase
            .from('chat_members')
            .select('*')
            .eq('room_id', roomId)
            .eq('user_id', req.user.id)
            .single();

        if (membershipErr || !membership) {
            return res.status(403).json({ success: false, error: 'Bạn không có quyền gửi tin vào nhóm này' });
        }

        const { data: message, error } = await supabase
            .from('chat_messages')
            .insert({
                room_id: roomId,
                sender_id: req.user.id,
                content: content.trim()
            })
            .select('*, users!chat_messages_sender_id_fkey(id, username, display_name, avatar)')
            .single();

        if (error) throw error;

        // Update room updated_at
        await supabase
            .from('chat_rooms')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', roomId);

        res.json({ success: true, data: message });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// Create a new room (direct or group)
async function createRoom(req, res) {
    try {
        const { type, name, participantIds } = req.body; // participantIds should NOT include current user, we add it automatically

        if (!participantIds || participantIds.length === 0) {
            return res.status(400).json({ success: false, error: 'Phải chọn ít nhất 1 người để chat' });
        }

        const isGroup = type === 'group' || participantIds.length > 1;
        const actualType = isGroup ? 'group' : 'direct';

        // If direct, check if exists already
        if (actualType === 'direct') {
            const targetId = participantIds[0];
            // Complex to find exact intersection, but we can try to find existing direct
            const { data: myRooms } = await supabase.from('chat_members').select('room_id').eq('user_id', req.user.id);
            const { data: theirRooms } = await supabase.from('chat_members').select('room_id').eq('user_id', targetId);

            if (myRooms && theirRooms) {
                const myRoomIds = myRooms.map(r => r.room_id);
                const theirRoomIds = theirRooms.map(r => r.room_id);
                const commonRoomIds = myRoomIds.filter(id => theirRoomIds.includes(id));

                if (commonRoomIds.length > 0) {
                    const { data: existingRoom } = await supabase
                        .from('chat_rooms')
                        .select('id')
                        .in('id', commonRoomIds)
                        .eq('type', 'direct')
                        .limit(1);

                    if (existingRoom && existingRoom.length > 0) {
                        return res.json({ success: true, data: { id: existingRoom[0].id } });
                    }
                }
            }
        }

        // Create room
        const { data: newRoom, error: createErr } = await supabase
            .from('chat_rooms')
            .insert({
                name: isGroup ? (name || 'Nhóm chat mới') : '',
                type: actualType,
                created_by: req.user.id
            })
            .select('id')
            .single();

        if (createErr) throw createErr;

        // Insert members
        const membersToInsert = [req.user.id, ...participantIds].map(uid => ({
            room_id: newRoom.id,
            user_id: uid,
            role: (uid === req.user.id && actualType === 'group') ? 'admin' : 'member'
        }));

        const { error: membersErr } = await supabase.from('chat_members').insert(membersToInsert);
        if (membersErr) throw membersErr;

        res.status(201).json({ success: true, data: { id: newRoom.id } });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// Rename a room (group chat)
async function renameRoom(req, res) {
    try {
        const roomId = parseInt(req.params.id);
        const { name } = req.body;

        if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'Tên nhóm không hợp lệ' });

        // Verify membership
        const { data: membership, error: membershipErr } = await supabase
            .from('chat_members')
            .select('*')
            .eq('room_id', roomId)
            .eq('user_id', req.user.id)
            .single();

        if (membershipErr || !membership) {
            return res.status(403).json({ success: false, error: 'Bạn không có quyền sửa nhóm này' });
        }

        const { error: updateErr } = await supabase
            .from('chat_rooms')
            .update({ name: name.trim(), updated_at: new Date().toISOString() })
            .eq('id', roomId)
            .eq('type', 'group'); // Only group chats can be renamed

        if (updateErr) throw updateErr;

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// Leave a room
async function leaveRoom(req, res) {
    try {
        const roomId = parseInt(req.params.id);

        const { error } = await supabase
            .from('chat_members')
            .delete()
            .eq('room_id', roomId)
            .eq('user_id', req.user.id);

        if (error) throw error;

        // Note: We leave deleting empty rooms to a cron job, or we can check here.
        // For simplicity, just successfully remove member.
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// Kick a member from a group (Admin only)
async function kickMember(req, res) {
    try {
        const roomId = parseInt(req.params.id);
        const targetUserId = parseInt(req.params.userId);

        // Check if current user is admin
        const { data: membership } = await supabase
            .from('chat_members')
            .select('role')
            .eq('room_id', roomId)
            .eq('user_id', req.user.id)
            .single();

        if (!membership || membership.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Chỉ quản trị viên nhóm mới có quyền này' });
        }

        const { error } = await supabase
            .from('chat_members')
            .delete()
            .eq('room_id', roomId)
            .eq('user_id', targetUserId);

        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

module.exports = {
    getRooms,
    getMessages,
    sendMessage,
    createRoom,
    renameRoom,
    leaveRoom,
    kickMember
};
