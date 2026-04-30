// Update Request model - Supabase version
const { supabase } = require('../config/supabase');

class UpdateRequestModel {
    static async mapRequestsWithNames(requests) {
        if (!requests || requests.length === 0) return [];
        const [{ data: users }, { data: members }] = await Promise.all([
            supabase.from('users').select('id, username, display_name'),
            supabase.from('members').select('id, name')
        ]);
        return requests.map(req => {
            const user = users?.find(u => u.id === req.user_id);
            const reviewer = users?.find(u => u.id === req.reviewed_by);
            const member = members?.find(m => String(m.id) === String(req.member_id));
            return {
                id: req.id,
                memberId: req.member_id,
                memberName: member ? member.name : `ID #${req.member_id}`,
                requestedBy: user ? user.username : 'Unknown',
                requestedByName: user ? user.display_name : 'Unknown',
                requestedAt: req.created_at,
                changes: (() => {
                    let c = req.changes;
                    try {
                        if (typeof c === 'string') c = JSON.parse(c);
                        if (typeof c === 'string') c = JSON.parse(c);
                    } catch(e) {}
                    return typeof c === 'object' ? c : {};
                })(),
                note: req.note,
                status: req.status,
                rejectReason: req.reject_reason,
                reviewedBy: reviewer ? reviewer.display_name : null,
                reviewedAt: req.reviewed_at
            };
        });
    }

    static async getAll(status = null) {
        let query = supabase
            .from('update_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return this.mapRequestsWithNames(data);
    }

    static async getByUser(userId) {
        const { data, error } = await supabase
            .from('update_requests')
            .select('*')
            .eq('user_id', parseInt(userId))
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return this.mapRequestsWithNames(data);
    }

    static async create(userId, memberId, changes, note) {
        const { data, error } = await supabase
            .from('update_requests')
            .insert({
                user_id: parseInt(userId),
                member_id: parseInt(memberId),
                changes: JSON.stringify(changes),
                note: note || '',
            })
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data.id;
    }

    static async approve(requestId, adminId) {
        // Get the request
        const { data: req, error: fetchError } = await supabase
            .from('update_requests')
            .select('*')
            .eq('id', parseInt(requestId))
            .single();
        if (fetchError) throw new Error(fetchError.message);
        if (!req) return null;

        // Apply changes to the member
        const changes = JSON.parse(req.changes);
        const MemberModel = require('./Member');
        await MemberModel.update(req.member_id, changes);

        // Update request status
        const { error } = await supabase
            .from('update_requests')
            .update({
                status: 'approved',
                reviewed_by: parseInt(adminId),
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', parseInt(requestId));
        if (error) throw new Error(error.message);

        return req;
    }

    static async reject(requestId, adminId, reason) {
        const { error } = await supabase
            .from('update_requests')
            .update({
                status: 'rejected',
                reviewed_by: parseInt(adminId),
                reviewed_at: new Date().toISOString(),
                reject_reason: reason || '',
            })
            .eq('id', parseInt(requestId));
        if (error) throw new Error(error.message);
        return true;
    }
}

module.exports = UpdateRequestModel;
