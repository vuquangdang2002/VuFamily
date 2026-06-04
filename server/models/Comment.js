// Comment model — Supabase (with author JOIN from users table)
const { supabase } = require('../config/supabase');

const CommentModel = {
    async getByPostId(postId) {
        const { data, error } = await supabase
            .from('comments')
            .select('*, users!comments_user_id_fkey(display_name, role)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return (data || []).map(c => ({
            ...c,
            author: c.users?.display_name || c.author || 'Ẩn danh',
            author_role: c.users?.role || c.author_role || 'viewer',
            users: undefined
        }));
    },

    async create(postId, content, author, authorRole, userId) {
        const { data, error } = await supabase
            .from('comments')
            .insert({ post_id: postId, content, author, author_role: authorRole, user_id: userId })
            .select('*, users!comments_user_id_fkey(display_name, role)')
            .single();
        if (error) throw error;
        return {
            ...data,
            author: data.users?.display_name || author,
            author_role: data.users?.role || authorRole,
            users: undefined
        };
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
