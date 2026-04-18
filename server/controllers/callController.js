const { supabase } = require('../../database/supabase');

// --- Signal a new call (Send Offer or just start the context) ---
async function initiateCall(req, res) {
    try {
        const { roomId, offer } = req.body;
        if (!roomId) return res.status(400).json({ success: false, error: 'roomId required' });

        const { data: member } = await supabase.from('chat_members').select('*').eq('room_id', roomId).eq('user_id', req.user.id).single();
        if (!member) return res.status(403).json({ success: false, error: 'Not in this room' });

        const { data: call, error } = await supabase.from('calls').insert({
            room_id: roomId,
            caller_id: req.user.id,
            status: 'calling',
            offer: offer || ''
        }).select().single();

        if (error) throw error;
        res.status(201).json({ success: true, data: call });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// --- Poll for incoming calls ---
async function pollIncoming(req, res) {
    try {
        const { data: myRooms } = await supabase.from('chat_members').select('room_id').eq('user_id', req.user.id);
        if (!myRooms || myRooms.length === 0) return res.json({ success: true, data: null });
        const roomIds = myRooms.map(r => r.room_id);

        const { data: calls } = await supabase.from('calls')
            .select('*, caller:caller_id(id, display_name, username, avatar)')
            .in('room_id', roomIds)
            .neq('caller_id', req.user.id)
            .in('status', ['calling', 'ongoing']) // Allow joining ongoing group calls
            .order('started_at', { ascending: false })
            .limit(1);

        res.json({ success: true, data: calls && calls.length > 0 ? calls[0] : null });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

async function getCall(req, res) {
    try {
        const { data } = await supabase.from('calls').select('*, caller:caller_id(id, display_name, username, avatar)').eq('id', req.params.id).single();
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

async function answerCall(req, res) {
    try {
        const { answer } = req.body;
        await supabase.from('calls').update({ answer: answer || '', status: 'ongoing' }).eq('id', req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

async function updateStatus(req, res) {
    try {
        const { status } = req.body;
        await supabase.from('calls').update({ status, ended_at: new Date().toISOString() }).eq('id', req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

async function addCandidate(req, res) {
    try {
        const { candidate, toUserId } = req.body;
        await supabase.from('call_ice_candidates').insert({
            call_id: req.params.id,
            sender_id: req.user.id,
            to_user_id: toUserId || null,
            candidate: candidate
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

async function getCandidates(req, res) {
    try {
        const { data } = await supabase.from('call_ice_candidates').select('*').eq('call_id', req.params.id).eq('to_user_id', req.user.id);
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

// === NEW MESH APIS ===
async function addSignal(req, res) {
    try {
        const { toUserId, type, payload } = req.body;
        await supabase.from('call_signals').insert({
            call_id: req.params.id,
            from_user_id: req.user.id,
            to_user_id: toUserId,
            type,
            payload
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

async function getSignals(req, res) {
    try {
        const { data: signals } = await supabase.from('call_signals')
            .select('*, from_user:from_user_id(id, display_name, username, avatar)')
            .eq('call_id', req.params.id)
            .eq('to_user_id', req.user.id)
            .order('created_at', { ascending: true });

        const { data: candidates } = await supabase.from('call_ice_candidates')
            .select('*')
            .eq('call_id', req.params.id)
            .eq('to_user_id', req.user.id)
            .order('created_at', { ascending: true });

        res.json({ success: true, data: { signals, candidates } });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

module.exports = {
    initiateCall,
    pollIncoming,
    getCall,
    answerCall,
    updateStatus,
    addCandidate,
    getCandidates,
    addSignal,
    getSignals
};
