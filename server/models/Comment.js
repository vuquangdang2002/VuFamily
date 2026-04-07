// Comment model — Supabase
const { supabase } = require('../../database/supabase');

const CommentModel = {
    async getByPostId(postId) {
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async create(postId, content, author, authorRole, userId) {
        const { data, error } = await supabase
            .from('comments')
            .insert({ post_id: postId, content, author, author_role: authorRole, user_id: userId })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async delete(id) {
        const { error } = await supabase.from('comments').delete().eq('id', id);
        if (error) throw error;
    },

    async countByPostId(postId) {
        const { count, error } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);
        if (error) throw error;
        return count || 0;
    }
};

module.exports = CommentModel;
