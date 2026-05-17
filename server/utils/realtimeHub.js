/**
 * realtimeHub.js — Socket.io Hub cho Chat Real-time + WebRTC Signaling
 *
 * Một kết nối WebSocket duy nhất xử lý TẤT CẢ:
 *   - Chat messages (zero-latency push, không polling)
 *   - WebRTC call signaling (offer/answer/ice)
 *   - Online presence
 *
 * Path: /hub  (tách khỏi Express routes)
 *
 * Auth: đọc users.token (giống authenticate middleware)
 */

const { Server } = require('socket.io');
const { supabase } = require('../config/supabase');
const { FEATURES } = require('../config/constants');

// ─── TURN config (đọc từ .env) ───────────────────────────────────────────────
const ICE_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        ...(process.env.TURN_URL ? [{
            urls: process.env.TURN_URL,
            username: process.env.TURN_USERNAME || '',
            credential: process.env.TURN_CREDENTIAL || '',
        }] : []),
    ],
};

// ─── In-memory state ──────────────────────────────────────────────────────────
// Map<userId, Set<socketId>>
const userSockets = new Map();

function addSocket(userId, socketId) {
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socketId);
}
function removeSocket(userId, socketId) {
    userSockets.get(userId)?.delete(socketId);
    if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
}
function isOnline(userId) {
    return (userSockets.get(String(userId))?.size || 0) > 0;
}

/**
 * Khởi tạo Socket.io Hub — gọi 1 lần trong server/index.js
 */
function initRealtimeHub(httpServer) {
    const io = new Server(httpServer, {
        path: '/hub',
        cors: { origin: '*', methods: ['GET', 'POST'] },
        transports: ['websocket', 'polling'],
        pingInterval: 25000,
        pingTimeout: 10000,
    });

    // ── Auth middleware ───────────────────────────────────────────────────────
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token) return next(new Error('NO_TOKEN'));

            // Giống authenticate() trong auth.js — dùng users.token
            const { data: user, error } = await supabase
                .from('users')
                .select('id, display_name, username, role, avatar')
                .eq('token', token)
                .single();

            if (error || !user) return next(new Error('INVALID_TOKEN'));
            socket.user = user;
            next();
        } catch (e) {
            next(new Error('AUTH_ERROR'));
        }
    });

    // ── Connection ────────────────────────────────────────────────────────────
    io.on('connection', (socket) => {
        const user = socket.user;
        const userId = String(user.id);

        addSocket(userId, socket.id);
        socket.join(`user:${userId}`);  // Personal room

        // Broadcast online status
        io.emit('presence:update', { userId, online: true });
        console.log(`[Hub] ✅ Kết nối thành công - User ID: ${userId} (${user.display_name}) - Socket: ${socket.id}`);

        // ── Join chat room channels ───────────────────────────────────────────
        socket.on('chat:join', async ({ roomId }) => {
            try {
                const { data: membership } = await supabase
                    .from('chat_members')
                    .select('user_id')
                    .eq('room_id', roomId)
                    .eq('user_id', user.id)
                    .single();

                if (membership) {
                    socket.join(`room:${roomId}`);
                }
            } catch (e) { /* ignore */ }
        });

        // ── Send message (real-time, zero-latency) ────────────────────────────
        socket.on('chat:send', async ({ roomId, content }, ack) => {
            if (!content?.trim()) return ack?.({ error: 'Tin nhắn rỗng' });
            try {
                // Verify membership
                const { data: membership } = await supabase
                    .from('chat_members')
                    .select('user_id')
                    .eq('room_id', roomId)
                    .eq('user_id', user.id)
                    .single();

                if (!membership) return ack?.({ error: 'Không có quyền' });

                // Save to DB
                const { data: msg, error } = await supabase
                    .from('chat_messages')
                    .insert({
                        room_id: roomId,
                        sender_id: user.id,
                        content: content.trim(),
                    })
                    .select('*, users:sender_id(id, display_name, username, avatar)')
                    .single();

                if (error) throw error;

                // Update room timestamp
                await supabase.from('chat_rooms').update({ updated_at: new Date().toISOString() }).eq('id', roomId);

                // PUSH to all room members instantly (no polling needed)
                io.to(`room:${roomId}`).emit('chat:message', msg);

                ack?.({ success: true, data: msg });
            } catch (e) {
                console.error('[Hub] chat:send error:', e.message);
                ack?.({ error: e.message });
            }
        });

        // ── WebRTC Call: Start ────────────────────────────────────────────────
        socket.on('call:start', async ({ roomId, callType = 'voice' }, ack) => {
            if (!FEATURES.ENABLE_CALL_SYSTEM) return ack?.({ error: 'Tính năng bảo trì' });
            try {
                const { data: membership } = await supabase
                    .from('chat_members').select('user_id')
                    .eq('room_id', roomId).eq('user_id', user.id).single();

                if (!membership) return ack?.({ error: 'Không trong phòng này' });

                const { data: call, error } = await supabase
                    .from('calls')
                    .insert({ room_id: roomId, caller_id: user.id, status: 'calling' })
                    .select('*').single();

                if (error) throw error;

                const { data: members } = await supabase
                    .from('chat_members').select('user_id').eq('room_id', roomId).neq('user_id', user.id);

                const peerCount = (members?.length || 0) + 1;
                const mode = peerCount <= 2 ? 'p2p' : 'mesh';

                const notification = {
                    callId: call.id, roomId, callType, mode,
                    caller: { id: user.id, displayName: user.display_name, avatar: user.avatar },
                };

                // Push incoming event to each member
                console.log(`[Hub] Broadcasting call:incoming to ${members?.length || 0} members in room ${roomId}`);
                members?.forEach(m => {
                    console.log(`[Hub] Emitting to user:${m.user_id}`);
                    io.to(`user:${m.user_id}`).emit('call:incoming', notification);
                });

                ack?.({ success: true, call, mode, iceConfig: ICE_CONFIG });
            } catch (e) {
                console.error('[Hub] call:start error:', e.message);
                ack?.({ error: e.message });
            }
        });

        // ── WebRTC Call: Accept ───────────────────────────────────────────────
        socket.on('call:accept', async ({ callId }, ack) => {
            try {
                const { data: call } = await supabase
                    .from('calls').update({ status: 'ongoing' })
                    .eq('id', callId).select('caller_id, room_id').single();

                if (call) {
                    io.to(`user:${call.caller_id}`).emit('call:accepted', {
                        callId, by: { id: user.id, displayName: user.display_name }
                    });
                }
                ack?.({ success: true, iceConfig: ICE_CONFIG });
            } catch (e) { ack?.({ error: e.message }); }
        });

        // ── WebRTC Call: Reject ───────────────────────────────────────────────
        socket.on('call:reject', async ({ callId }, ack) => {
            try {
                const { data: call } = await supabase
                    .from('calls').update({ status: 'rejected', ended_at: new Date().toISOString() })
                    .eq('id', callId).select('caller_id').single();

                if (call) io.to(`user:${call.caller_id}`).emit('call:rejected', { callId, by: user.id });
                ack?.({ success: true });
            } catch (e) { ack?.({ error: e.message }); }
        });

        // ── WebRTC Signal relay (offer/answer/ice) — zero-latency ─────────────
        socket.on('call:signal', ({ toUserId, signal }, ack) => {
            io.to(`user:${toUserId}`).emit('call:signal', {
                fromUserId: user.id,
                fromDisplayName: user.display_name,
                signal,
            });
            ack?.({ success: true });
        });

        // ── WebRTC Call: End ──────────────────────────────────────────────────
        socket.on('call:end', async ({ callId, roomId, duration = 0 }, ack) => {
            try {
                await supabase.from('calls').update({
                    status: 'ended', ended_at: new Date().toISOString()
                }).eq('id', callId);

                if (duration > 0) {
                    const m = Math.floor(duration / 60);
                    const s = duration % 60;
                    await supabase.from('chat_messages').insert({
                        room_id: roomId,
                        sender_id: user.id,
                        content: `📞 Cuộc gọi kết thúc (${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}).`,
                    });
                }

                const { data: members } = await supabase
                    .from('chat_members').select('user_id').eq('room_id', roomId);
                members?.forEach(m => io.to(`user:${m.user_id}`).emit('call:ended', { callId, by: user.id }));

                ack?.({ success: true });
            } catch (e) { ack?.({ error: e.message }); }
        });

        // ── Disconnect ────────────────────────────────────────────────────────
        socket.on('disconnect', () => {
            removeSocket(userId, socket.id);
            if (!isOnline(userId)) {
                io.emit('presence:update', { userId, online: false });
                // Update last_active in DB (fire & forget)
                supabase.from('users').update({ is_online: false, last_active: new Date().toISOString() })
                    .eq('id', user.id).then(() => {}).catch(() => {});
            }
            console.log(`[Hub] ❌ Ngắt kết nối - User ID: ${userId} (${user.display_name})`);
        });
    });

    return io;
}

module.exports = { initRealtimeHub };
