// Update Request model - Supabase version
const { supabase } = require('../../database/supabase');

class UpdateRequestModel {
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
        return data || [];
    }

    static async getByUser(userId) {
        const { data, error } = await supabase
            .from('update_requests')
            .select('*')
            .eq('user_id', parseInt(userId))
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
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
