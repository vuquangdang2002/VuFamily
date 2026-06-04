// Post model — Supabase (with author JOIN from users table)
const { supabase } = require('../config/supabase');

const PostModel = {
    async getAll() {
        const { data, error } = await supabase
            .from('posts')
            .select('*, users!posts_user_id_fkey(display_name, role)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        // Flatten user info into post object
        return (data || []).map(post => ({
            ...post,
            author: post.users?.display_name || post.author || 'Ẩn danh',
            author_role: post.users?.role || post.author_role || 'viewer',
            users: undefined
        }));
    },

    async create(content, author, authorRole, userId) {
        const { data, error } = await supabase
            .from('posts')
            .insert({ content, author, author_role: authorRole, user_id: userId })
            .select('*, users!posts_user_id_fkey(display_name, role)')
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
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }
};

module.exports = PostModel;
