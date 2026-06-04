const { supabase } = require('../config/supabase');
const { encryptText, decryptText } = require('../utils/cryptoUtils');

class ChatModel {
    static async getUserRooms(userId) {
        // Find rooms the user is a member of
        const { data: userRooms, error: memberErr } = await supabase
            .from('chat_members')
            .select('room_id')
            .eq('user_id', userId);

        if (memberErr) throw memberErr;
        if (!userRooms || userRooms.length === 0) return [];

        const roomIds = userRooms.map(r => r.room_id);

        // Get room details
        const { data: rooms, error: roomErr } = await supabase
            .from('chat_rooms')
            .select('*')
            .in('id', roomIds)
            .order('updated_at', { ascending: false });

        if (roomErr) throw roomErr;

        // Fetch members for these rooms
        const { data: members, error: allMembersErr } = await supabase
            .from('chat_members')
            .select('room_id, user_id, role, users(id, username, display_name, avatar, is_online, last_active)')
            .in('room_id', roomIds);

        if (allMembersErr) throw allMembersErr;

        return { rooms, members };
    }

    static async getMembership(roomId, userId) {
        const { data: membership, error } = await supabase
            .from('chat_members')
            .select('*')
            .eq('room_id', roomId)
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // Ignore not found error
        return membership;
    }

    static async getMessages(roomId, sinceParam, limit = 100) {
        let query = supabase
            .from('chat_messages')
            .select('*, users!chat_messages_sender_id_fkey(id, username, display_name, avatar)')
            .eq('room_id', roomId);

        if (sinceParam) {
            query = query.gt('created_at', sinceParam);
        }

        const { data: messages, error } = await query
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) throw error;
        
        // Decrypt messages
        return messages.map(m => ({
            ...m,
            content: decryptText(m.content)
        }));
    }

    static async updateLastRead(roomId, userId) {
        const { error } = await supabase
            .from('chat_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('room_id', roomId)
            .eq('user_id', userId);
            
        if (error) throw error;
    }

    static async saveMessage(roomId, senderId, content) {
        const encryptedContent = encryptText(content);
        const { data: message, error } = await supabase
            .from('chat_messages')
            .insert({
                room_id: roomId,
                sender_id: senderId,
                content: encryptedContent
            })
            .select('*, users!chat_messages_sender_id_fkey(id, username, display_name, avatar)')
            .single();

        if (error) throw error;
        
        // Decrypt the content to send back to clients
        return {
            ...message,
            content: decryptText(message.content)
        };
    }

    static async updateRoomTimestamp(roomId) {
        const { error } = await supabase
            .from('chat_rooms')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', roomId);
            
        if (error) throw error;
    }

    static async checkExistingDirectRoom(userId, targetId) {
        const { data: myRooms } = await supabase.from('chat_members').select('room_id').eq('user_id', userId);
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
                    return existingRoom[0];
                }
            }
        }
        return null;
    }

    static async createRoom(type, name) {
        const { data: newRoom, error } = await supabase
            .from('chat_rooms')
            .insert({ type, name: name || null })
            .select('*')
            .single();

        if (error) throw error;
        return newRoom;
    }

    static async addMembers(members) {
        const { error } = await supabase
            .from('chat_members')
            .insert(members);
            
        if (error) throw error;
    }

    static async updateRoomName(roomId, newName) {
        const { error } = await supabase
            .from('chat_rooms')
            .update({ name: newName })
            .eq('id', roomId);
            
        if (error) throw error;
    }

    static async removeMember(roomId, userId) {
        const { error } = await supabase
            .from('chat_members')
            .delete()
            .eq('room_id', roomId)
            .eq('user_id', userId);
            
        if (error) throw error;
    }

    static async getRoomById(roomId) {
        const { data, error } = await supabase
            .from('chat_rooms')
            .select('*')
            .eq('id', roomId)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async getAllGroupRooms() {
        const { data, error } = await supabase
            .from('chat_rooms')
            .select('*')
            .eq('type', 'group');
        if (error) throw error;
        return data;
    }

    static async getUserInfo(userId) {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, display_name, avatar')
            .eq('id', userId)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    static async getUsersInfo(userIds) {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, display_name, avatar')
            .in('id', userIds);
        if (error) throw error;
        return data;
    }
}

module.exports = ChatModel;
