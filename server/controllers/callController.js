/**
 * CallController — WebRTC Signaling Server (SSE + DB Fallback)
 *
 * Signal Flow:
 *   Caller  ──POST /calls──────────────────▶  Server (insert DB + push SSE)
 *   Callee  ──GET  /calls/stream (SSE) ──▶  Server ─▶ push "incoming" event
 *   Callee  ──POST /calls/:id/answer ───▶  Server (update DB + push SSE to caller)
 *   Both    ──POST /calls/:id/signal ───▶  Server (push SSE directly, no DB read)
 *   Both    ──GET  /calls/:id/signal ───▶  DB fallback if SSE was missed
 *
 * Why SSE instead of WebSocket?
 *   - SSE works perfectly through Vercel's Edge Network and most proxies.
 *   - Unidirectional (server→client) is all we need for signaling.
 *   - WebSocket requires sticky sessions which Vercel doesn't support.
 */

const { supabase } = require('../config/supabase');
const { FEATURES } = require('../config/constants');
const CALL_CONFIG = require('../config/features/call');
const signalBus = require('../utils/signalBus');

// ─── SSE Stream Endpoint ──────────────────────────────────────────────────────

/**
 * GET /api/calls/stream
 * Establishes a persistent SSE connection for the authenticated user.
 * The client should reconnect automatically on drop (EventSource does this).
 */
async function streamEvents(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Confirm connection
    res.write('event: connected\ndata: {"ok":true}\n\n');

    const userId = String(req.user.id);
    const unsubscribe = signalBus.subscribe(userId, res);

    // Push any pending undelivered signals from DB (reconnect scenario)
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: pending } = await supabase
            .from('call_signals')
            .select('*')
            .eq('to_user_id', userId)
            .eq('delivered', false)
            .gte('created_at', fiveMinutesAgo)
            .order('created_at', { ascending: true });

        if (pending && pending.length > 0) {
            for (const sig of pending) {
                res.write(`event: signal\ndata: ${JSON.stringify(sig)}\n\n`);
            }
            // Mark as delivered
            const ids = pending.map(s => s.id);
            await supabase.from('call_signals').update({ delivered: true }).in('id', ids);
        }
    } catch (e) {
        console.warn('[SSE] Could not flush pending signals:', e.message);
    }

    req.on('close', () => {
        unsubscribe();
    });
}

// ─── Call Lifecycle ───────────────────────────────────────────────────────────

/** POST /api/calls — Start a new call */
async function initiateCall(req, res) {
    try {
        if (!FEATURES.ENABLE_CALL_SYSTEM) {
            return res.status(503).json({ success: false, error: 'Hệ thống gọi điện đang bảo trì.' });
        }

        const { roomId } = req.body;
        if (!roomId) return res.status(400).json({ success: false, error: 'roomId required' });

        // Verify caller is in the room
        const { data: membership } = await supabase
            .from('chat_members')
            .select('user_id')
            .eq('room_id', roomId)
            .eq('user_id', req.user.id)
            .single();

        if (!membership) return res.status(403).json({ success: false, error: 'Bạn không có trong phòng này.' });

        // Create call record
        const { data: call, error } = await supabase
            .from('calls')
            .insert({ room_id: roomId, caller_id: req.user.id, status: 'calling' })
            .select('*')
            .single();

        if (error) throw error;

        // Push incoming-call event via SSE to all room members (except caller)
        const { data: members } = await supabase
            .from('chat_members')
            .select('user_id')
            .eq('room_id', roomId)
            .neq('user_id', req.user.id);

        const notification = { ...call, caller: { id: req.user.id, display_name: req.user.display_name, username: req.user.username } };
        if (members) {
            for (const m of members) {
                signalBus.publish(String(m.user_id), 'incoming', notification);
            }
        }

        res.status(201).json({ success: true, data: call });
    } catch (e) {
        console.error('[Call] initiateCall error:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
}

/** PUT /api/calls/:id/answer — Callee accepts */
async function answerCall(req, res) {
    try {
        const { data: call } = await supabase
            .from('calls')
            .update({ status: 'ongoing' })
            .eq('id', req.params.id)
            .select('caller_id, room_id')
            .single();

        if (call) {
            // Notify caller via SSE that callee answered
            signalBus.publish(String(call.caller_id), 'call_answered', {
                callId: req.params.id,
                by: req.user.id
            });
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

/** PUT /api/calls/:id/status — End / Reject / Miss */
async function updateStatus(req, res) {
    try {
        const { status } = req.body;
        const { data: call } = await supabase
            .from('calls')
            .update({ status, ended_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .select('caller_id, room_id')
            .single();

        if (call) {
            // Notify all room members via SSE
            const { data: members } = await supabase
                .from('chat_members')
                .select('user_id')
                .eq('room_id', call.room_id);

            if (members) {
                for (const m of members) {
                    signalBus.publish(String(m.user_id), 'call_ended', {
                        callId: req.params.id,
                        status,
                        by: req.user.id
                    });
                }
            }
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

/** GET /api/calls/:id — Get call state (used as fallback) */
async function getCall(req, res) {
    try {
        const { data } = await supabase
            .from('calls')
            .select('*, caller:caller_id(id, display_name, username, avatar)')
            .eq('id', req.params.id)
            .single();
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

// ─── WebRTC Signaling (Offer / Answer / ICE) ─────────────────────────────────

/**
 * POST /api/calls/:id/signal
 * Delivers a WebRTC signal (offer | answer | ice-candidate) to the target user.
 *
 * Strategy:
 *  1. Try SSE push (zero-latency, in-memory).
 *  2. If user not online via SSE → persist to DB (they'll pull on reconnect).
 */
async function addSignal(req, res) {
    try {
        const { toUserId, type, payload } = req.body;
        if (!toUserId || !type || payload === undefined) {
            return res.status(400).json({ success: false, error: 'toUserId, type, payload required' });
        }

        const signal = {
            call_id: req.params.id,
            from_user_id: req.user.id,
            to_user_id: String(toUserId),
            type,
            payload,
            created_at: new Date().toISOString()
        };

        // 1. Try SSE delivery first (microseconds latency)
        const delivered = signalBus.publish(String(toUserId), 'signal', signal);

        // 2. Always persist for reliability (DB is the fallback / audit log)
        const { data: inserted } = await supabase
            .from('call_signals')
            .insert({ ...signal, delivered })
            .select('id')
            .single();

        res.json({ success: true, delivered, id: inserted?.id });
    } catch (e) {
        console.error('[Call] addSignal error:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
}

/**
 * GET /api/calls/:id/signals
 * DB fallback: returns undelivered signals for current user.
 * Marks them delivered after reading.
 * This is only hit when SSE connection was interrupted.
 */
async function getSignals(req, res) {
    try {
        const { data: signals } = await supabase
            .from('call_signals')
            .select('*')
            .eq('call_id', req.params.id)
            .eq('to_user_id', req.user.id)
            .eq('delivered', false)
            .order('created_at', { ascending: true });

        if (signals && signals.length > 0) {
            const ids = signals.map(s => s.id);
            await supabase.from('call_signals').update({ delivered: true }).in('id', ids);
        }

        res.json({ success: true, data: signals || [] });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

// ─── Incoming Poll (HTTP fallback for clients without SSE) ────────────────────

/** GET /api/calls/incoming — For browsers that don't support SSE (very rare) */
async function pollIncoming(req, res) {
    try {
        if (!FEATURES.ENABLE_CALL_SYSTEM) return res.json({ success: true, data: null });

        const { data: myRooms } = await supabase
            .from('chat_members')
            .select('room_id')
            .eq('user_id', req.user.id);

        if (!myRooms || myRooms.length === 0) return res.json({ success: true, data: null });

        const roomIds = myRooms.map(r => r.room_id);
        const { data: calls } = await supabase
            .from('calls')
            .select('*, caller:caller_id(id, display_name, username, avatar)')
            .in('room_id', roomIds)
            .neq('caller_id', req.user.id)
            .in('status', ['calling', 'ongoing'])
            .order('started_at', { ascending: false })
            .limit(1);

        if (!calls || calls.length === 0) return res.json({ success: true, data: null });

        const incomingCall = calls[0];
        if (incomingCall.status === 'calling') {
            const elapsedMs = Date.now() - new Date(incomingCall.started_at).getTime();
            if (elapsedMs > CALL_CONFIG.CALL_RINGING_TIMEOUT_MS) {
                await supabase.from('calls')
                    .update({ status: 'missed', ended_at: new Date().toISOString() })
                    .eq('id', incomingCall.id);
                await supabase.from('chat_messages').insert({
                    room_id: incomingCall.room_id,
                    sender_id: incomingCall.caller_id,
                    content: '📞 Cuộc gọi nhỡ'
                });
                return res.json({ success: true, data: null });
            }
        }

        res.json({ success: true, data: incomingCall });
    } catch (e) {
        console.error('[Call] pollIncoming error:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
}

// ─── Legacy (kept for backward compat) ───────────────────────────────────────

async function addCandidate(req, res) {
    // Redirect to unified signal endpoint logic
    req.body.type = 'ice-candidate';
    req.body.payload = req.body.candidate;
    return addSignal(req, res);
}

async function getCandidates(req, res) {
    // Now merged into getSignals
    res.json({ success: true, data: [] });
}

module.exports = {
    streamEvents,
    initiateCall,
    answerCall,
    updateStatus,
    getCall,
    addSignal,
    getSignals,
    pollIncoming,
    addCandidate,
    getCandidates,
};
