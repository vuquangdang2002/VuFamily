/**
 * callSignaling.js — Socket.io Signaling Server cho WebRTC
 *
 * Kiến trúc Hybrid:
 *  - 1-1 call : P2P thuần (server chỉ relay signal, KHÔNG xử lý media)
 *  - Group call: Mesh (mỗi client kết nối với nhau, server relay signal)
 *
 * Tại sao Socket.io thay vì SSE?
 *  - Bidirectional: server có thể push event bất kỳ lúc nào
 *  - Auto-reconnect với exponential backoff
 *  - Fallback HTTP Long-polling nếu WebSocket bị chặn
 *  - Room management built-in (join/leave)
 *
 * Flow tổng quát:
 *  1. Client connect → authenticate → join personal room (userId)
 *  2. Caller: emit 'call:start' → server notify all room members
 *  3. Callee: emit 'call:accept' → server notify caller
 *  4. Both: emit 'call:signal' (offer/answer/ice) → server relay đến target
 *  5. Either: emit 'call:end' → server notify all, cleanup
 */

const { Server } = require('socket.io');
const { supabase } = require('../config/supabase');
const { FEATURES } = require('../config/constants');

// ─── ICE Config (public STUN + dự phòng TURN) ────────────────────────────────
// Thêm TURN credentials thực vào .env để hoạt động qua 4G/corporate firewall
const ICE_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        // TURN server (cần cấu hình trong .env để hoạt động qua NAT cứng)
        ...(process.env.TURN_URL ? [{
            urls: process.env.TURN_URL,
            username: process.env.TURN_USERNAME || '',
            credential: process.env.TURN_CREDENTIAL || '',
        }] : []),
    ],
};

// ─── In-memory state (reset khi server restart, phù hợp với scope hiện tại) ──
const connectedUsers = new Map();  // socketId → { userId, displayName }
const activeRooms = new Map();     // callRoomId → Set<socketId>

/** Lấy userId từ socket đã xác thực */
const uid = (socket) => connectedUsers.get(socket.id)?.userId;

/**
 * Khởi tạo Socket.io server và gắn vào HTTP server.
 * Gọi hàm này 1 lần duy nhất trong server/index.js.
 */
function initCallSignaling(httpServer) {
    const io = new Server(httpServer, {
        path: '/call-signal',           // Tách biệt khỏi route Express
        cors: { origin: '*', methods: ['GET', 'POST'] },
        transports: ['websocket', 'polling'], // WebSocket ưu tiên, polling fallback
        pingInterval: 25000,
        pingTimeout: 10000,
    });

    // ── Middleware xác thực ─────────────────────────────────────────────────
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token) return next(new Error('NO_TOKEN'));

            const { data: session, error } = await supabase
                .from('user_sessions')
                .select('user_id, users(id, display_name, username, role, avatar)')
                .eq('token', token)
                .single();

            if (error || !session) return next(new Error('INVALID_TOKEN'));

            socket.user = session.users;
            next();
        } catch (e) {
            next(new Error('AUTH_ERROR'));
        }
    });

    // ── Connection handler ──────────────────────────────────────────────────
    io.on('connection', (socket) => {
        const user = socket.user;
        connectedUsers.set(socket.id, {
            userId: String(user.id),
            displayName: user.display_name,
        });

        // Mỗi user join vào room cá nhân → dễ push event đến đúng người
        socket.join(`user:${user.id}`);

        console.log(`[Signal] ✅ ${user.display_name} connected (${socket.id})`);

        // ── call:start — Bắt đầu cuộc gọi ─────────────────────────────────
        socket.on('call:start', async ({ roomId, callType = 'voice' }, ack) => {
            if (!FEATURES.ENABLE_CALL_SYSTEM) {
                return ack?.({ error: 'Tính năng đang bảo trì.' });
            }
            try {
                // Kiểm tra tư cách thành viên
                const { data: membership } = await supabase
                    .from('chat_members')
                    .select('user_id')
                    .eq('room_id', roomId)
                    .eq('user_id', user.id)
                    .single();

                if (!membership) return ack?.({ error: 'Bạn không trong phòng này.' });

                // Tạo call record
                const { data: call, error } = await supabase
                    .from('calls')
                    .insert({ room_id: roomId, caller_id: user.id, status: 'calling' })
                    .select('*')
                    .single();

                if (error) throw error;

                // Lấy danh sách thành viên
                const { data: members } = await supabase
                    .from('chat_members')
                    .select('user_id')
                    .eq('room_id', roomId)
                    .neq('user_id', user.id);

                // Phân loại: P2P (1-1) hay Mesh (group)
                const peerCount = (members?.length || 0) + 1;
                const mode = peerCount <= 2 ? 'p2p' : 'mesh';

                // Notify các thành viên còn lại
                const notification = {
                    callId: call.id,
                    roomId,
                    callType,
                    mode,
                    caller: {
                        id: user.id,
                        displayName: user.display_name,
                        avatar: user.avatar,
                    },
                };

                members?.forEach(m => {
                    io.to(`user:${m.user_id}`).emit('call:incoming', notification);
                });

                ack?.({ success: true, call, mode, iceConfig: ICE_CONFIG });
            } catch (e) {
                console.error('[Signal] call:start error:', e.message);
                ack?.({ error: e.message });
            }
        });

        // ── call:accept — Callee chấp nhận ────────────────────────────────
        socket.on('call:accept', async ({ callId }, ack) => {
            try {
                const { data: call } = await supabase
                    .from('calls')
                    .update({ status: 'ongoing' })
                    .eq('id', callId)
                    .select('caller_id, room_id')
                    .single();

                if (call) {
                    io.to(`user:${call.caller_id}`).emit('call:accepted', {
                        callId,
                        by: { id: user.id, displayName: user.display_name },
                    });
                }
                ack?.({ success: true, iceConfig: ICE_CONFIG });
            } catch (e) { ack?.({ error: e.message }); }
        });

        // ── call:reject — Callee từ chối ───────────────────────────────────
        socket.on('call:reject', async ({ callId }, ack) => {
            try {
                const { data: call } = await supabase
                    .from('calls')
                    .update({ status: 'rejected', ended_at: new Date().toISOString() })
                    .eq('id', callId)
                    .select('caller_id')
                    .single();

                if (call) {
                    io.to(`user:${call.caller_id}`).emit('call:rejected', { callId, by: user.id });
                }
                ack?.({ success: true });
            } catch (e) { ack?.({ error: e.message }); }
        });

        // ── call:signal — WebRTC offer/answer/ice-candidate relay ──────────
        // Server KHÔNG xử lý nội dung, chỉ forward đến đúng người
        socket.on('call:signal', ({ toUserId, signal }, ack) => {
            io.to(`user:${toUserId}`).emit('call:signal', {
                fromUserId: user.id,
                fromDisplayName: user.display_name,
                signal,
            });
            ack?.({ success: true });
        });

        // ── call:end — Kết thúc cuộc gọi ──────────────────────────────────
        socket.on('call:end', async ({ callId, roomId, duration = 0 }, ack) => {
            try {
                await supabase.from('calls').update({
                    status: 'ended',
                    ended_at: new Date().toISOString(),
                }).eq('id', callId);

                // Ghi tin nhắn tổng kết vào chat
                if (duration > 0) {
                    const m = Math.floor(duration / 60);
                    const s = duration % 60;
                    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                    await supabase.from('chat_messages').insert({
                        room_id: roomId,
                        sender_id: user.id,
                        content: `📞 Cuộc gọi kết thúc (${timeStr}).`,
                    });
                }

                // Notify toàn bộ phòng
                const { data: members } = await supabase
                    .from('chat_members')
                    .select('user_id')
                    .eq('room_id', roomId);

                members?.forEach(m => {
                    io.to(`user:${m.user_id}`).emit('call:ended', { callId, by: user.id });
                });

                ack?.({ success: true });
            } catch (e) { ack?.({ error: e.message }); }
        });

        // ── Disconnect ─────────────────────────────────────────────────────
        socket.on('disconnect', () => {
            connectedUsers.delete(socket.id);
            console.log(`[Signal] ❌ ${user.display_name} disconnected`);
        });
    });

    return io;
}

module.exports = { initCallSignaling };
