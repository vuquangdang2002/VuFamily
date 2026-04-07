// Post model — Supabase
const supabase = require('../../database/supabase');

const PostModel = {
    async getAll() {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async create(content, author, authorRole, userId) {
        const { data, error } = await supabase
            .from('posts')
            .insert({ content, author, author_role: authorRole, user_id: userId })
            .select()
            .single();
        if (error) throw error;
        return data;
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
