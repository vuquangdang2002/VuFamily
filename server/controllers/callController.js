const { supabase } = require('../../database/supabase');

// --- Signal a new call (Send Offer) ---
async function initiateCall(req, res) {
    try {
        const { roomId, offer } = req.body;
        if (!roomId || !offer) return res.status(400).json({ success: false, error: 'roomId and offer are required' });

        // Ensure user is in room
        const { data: member } = await supabase.from('chat_members').select('*').eq('room_id', roomId).eq('user_id', req.user.id).single();
        if (!member) return res.status(403).json({ success: false, error: 'Not in this room' });

        // Create call record
        const { data: call, error } = await supabase
            .from('calls')
            .insert({
                room_id: roomId,
                caller_id: req.user.id,
                offer: offer,
                status: 'calling'
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data: call });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// --- Poll for incoming calls ---
async function pollIncoming(req, res) {
    try {
        // Find if any room I belong to has an active call that I didn't start
        const { data: myRooms, error: roomErr } = await supabase.from('chat_members').select('room_id').eq('user_id', req.user.id);
        if (roomErr) throw roomErr;

        if (!myRooms || myRooms.length === 0) return res.json({ success: true, data: null });
        const roomIds = myRooms.map(r => r.room_id);

        const { data: calls, error: callErr } = await supabase
            .from('calls')
            .select('*, caller:caller_id(id, display_name, username, avatar)')
            .in('room_id', roomIds)
            .neq('caller_id', req.user.id)
            .eq('status', 'calling')
            .order('started_at', { ascending: false })
            .limit(1);

        if (callErr) throw callErr;

        res.json({ success: true, data: calls && calls.length > 0 ? calls[0] : null });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// --- Get call details (e.g. to poll for Answer) ---
async function getCall(req, res) {
    try {
        const { data, error } = await supabase
            .from('calls')
            .select('*, caller:caller_id(id, display_name, username, avatar)')
            .eq('id', req.params.id)
            .single();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// --- Answer Call ---
async function answerCall(req, res) {
    try {
        const { answer } = req.body;
        const { error } = await supabase
            .from('calls')
            .update({ answer, status: 'ongoing' })
            .eq('id', req.params.id)
            .eq('status', 'calling'); // ensuring it wasn't cancelled

        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// --- Update Call Status (Reject/End) ---
async function updateStatus(req, res) {
    try {
        const { status } = req.body; // 'rejected', 'ended'
        const { error } = await supabase
            .from('calls')
            .update({ status, ended_at: new Date().toISOString() })
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// --- Post ICE Candidate ---
async function addCandidate(req, res) {
    try {
        const { candidate } = req.body;
        const { error } = await supabase
            .from('call_ice_candidates')
            .insert({
                call_id: req.params.id,
                sender_id: req.user.id,
                candidate: candidate
            });
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// --- Poll ICE Candidates ---
async function getCandidates(req, res) {
    try {
        const { data, error } = await supabase
            .from('call_ice_candidates')
            .select('*')
            .eq('call_id', req.params.id)
            .neq('sender_id', req.user.id);

        if (error) throw error;
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

module.exports = {
    initiateCall,
    pollIncoming,
    getCall,
    answerCall,
    updateStatus,
    addCandidate,
    getCandidates
};
