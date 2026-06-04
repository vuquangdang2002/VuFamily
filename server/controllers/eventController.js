// Event Controller — CRUD + Register/Unregister for family events
const { supabase } = require('../config/supabase');
const cache = require('../utils/apiCache');

class EventController {
    /**
     * GET /api/events — Get all events with creator info
     */
    static async getAll(req, res) {
        try {
            const cached = cache.get('events_all');
            if (cached) return res.json({ success: true, data: cached, cached: true });

            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('event_date', { ascending: true });

            if (error) throw error;

            // Parse description JSON for each event
            const events = (data || []).map(ev => {
                let meta = {};
                try { meta = JSON.parse(ev.description || '{}'); } catch (_) { meta = { note: ev.description }; }
                return {
                    ...ev,
                    location: meta.location || '',
                    time: meta.time || '',
                    recurrence: meta.recurrence || 'none',
                    note: meta.note || '',
                    subscribers: meta.subscribers || [],
                    created_by_name: meta.created_by_name || ''
                };
            });

            cache.set('events_all', events);
            res.json({ success: true, data: events });
        } catch (e) {
            console.error('[EventController - getAll] Error:', e.message);
            res.status(500).json({ success: false, error: e.message });
        }
    }

    /**
     * POST /api/events — Create a new event (editor/admin only)
     */
    static async create(req, res) {
        try {
            const { title, event_date, event_type, location, time, recurrence, note } = req.body;
            if (!title || !title.trim()) {
                return res.status(400).json({ success: false, error: 'Tiêu đề sự kiện không được trống' });
            }
            if (!event_date) {
                return res.status(400).json({ success: false, error: 'Ngày sự kiện không được trống' });
            }

            // Store extended info in description as JSON
            const description = JSON.stringify({
                location: location || '',
                time: time || '',
                recurrence: recurrence || 'none',
                note: note || '',
                subscribers: [],
                created_by_name: req.user.display_name || req.user.username
            });

            const { data, error } = await supabase
                .from('events')
                .insert({
                    title: title.trim(),
                    event_date,
                    event_type: event_type || 'meeting',
                    description,
                    member_id: null
                })
                .select()
                .single();

            if (error) throw error;

            cache.clear();

            // Parse back for response
            let meta = {};
            try { meta = JSON.parse(data.description || '{}'); } catch (_) {}
            res.status(201).json({
                success: true,
                data: {
                    ...data,
                    location: meta.location || '',
                    time: meta.time || '',
                    recurrence: meta.recurrence || 'none',
                    note: meta.note || '',
                    subscribers: meta.subscribers || [],
                    created_by_name: meta.created_by_name || ''
                }
            });
        } catch (e) {
            console.error('[EventController - create] Error:', e.message);
            res.status(500).json({ success: false, error: e.message });
        }
    }

    /**
     * DELETE /api/events/:id — Delete an event (admin only)
     */
    static async delete(req, res) {
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', req.params.id);
            if (error) throw error;
            cache.clear();
            res.json({ success: true, message: 'Đã xóa sự kiện' });
        } catch (e) {
            console.error('[EventController - delete] Error:', e.message);
            res.status(500).json({ success: false, error: e.message });
        }
    }

    /**
     * POST /api/events/:id/register — Register current user for an event
     */
    static async register(req, res) {
        try {
            const eventId = parseInt(req.params.id);
            const userId = req.user.id;
            const userName = req.user.display_name || req.user.username;

            // Get current event
            const { data: event, error: fetchError } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();
            if (fetchError) throw fetchError;

            let meta = {};
            try { meta = JSON.parse(event.description || '{}'); } catch (_) { meta = { note: event.description }; }

            const subscribers = meta.subscribers || [];
            // Check if already registered
            if (subscribers.some(s => s.id === userId)) {
                return res.json({ success: true, message: 'Đã đăng ký trước đó', data: { subscribers } });
            }

            subscribers.push({ id: userId, name: userName, registered_at: new Date().toISOString() });
            meta.subscribers = subscribers;

            const { error: updateError } = await supabase
                .from('events')
                .update({ description: JSON.stringify(meta) })
                .eq('id', eventId);
            if (updateError) throw updateError;

            cache.clear();
            res.json({ success: true, data: { subscribers } });
        } catch (e) {
            console.error('[EventController - register] Error:', e.message);
            res.status(500).json({ success: false, error: e.message });
        }
    }

    /**
     * POST /api/events/:id/unregister — Unregister current user from an event
     */
    static async unregister(req, res) {
        try {
            const eventId = parseInt(req.params.id);
            const userId = req.user.id;

            const { data: event, error: fetchError } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();
            if (fetchError) throw fetchError;

            let meta = {};
            try { meta = JSON.parse(event.description || '{}'); } catch (_) { meta = { note: event.description }; }

            meta.subscribers = (meta.subscribers || []).filter(s => s.id !== userId);

            const { error: updateError } = await supabase
                .from('events')
                .update({ description: JSON.stringify(meta) })
                .eq('id', eventId);
            if (updateError) throw updateError;

            cache.clear();
            res.json({ success: true, data: { subscribers: meta.subscribers } });
        } catch (e) {
            console.error('[EventController - unregister] Error:', e.message);
            res.status(500).json({ success: false, error: e.message });
        }
    }
}

module.exports = EventController;
