// Reaction model — Supabase
const { supabase } = require('../config/supabase');

const ReactionModel = {
    // Get reactions grouped by emoji for a post
    async getByPostId(postId) {
        const { data, error } = await supabase
            .from('reactions')
            .select('*')
            .eq('post_id', postId);
        if (error) throw error;
        return data || [];
    },

    // Toggle reaction: add if not exists, remove if exists
    async toggle(postId, userId, emoji) {
        // Check if reaction exists
        const { data: existing } = await supabase
            .from('reactions')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .eq('emoji', emoji)
            .single();

        if (existing) {
            // Remove reaction
            const { error } = await supabase.from('reactions').delete().eq('id', existing.id);
            if (error) throw error;
            return { action: 'removed' };
        } else {
            // Add reaction
            const { error } = await supabase
                .from('reactions')
                .insert({ post_id: postId, user_id: userId, emoji });
            if (error) throw error;
            return { action: 'added' };
        }
    }
};

module.exports = ReactionModel;
