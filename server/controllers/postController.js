const PostModel = require('../models/Post');
const CommentModel = require('../models/Comment');
const ReactionModel = require('../models/Reaction');
const { supabase } = require('../config/supabase');

class PostController {
    static async getAllPosts(req, res) {
        try {
            const posts = await PostModel.getAll();
            if (!posts.length) return res.json({ success: true, data: [] });

            const postIds = posts.map(p => p.id);

            // Batch: 2 queries instead of 2N
            const [reactionsRes, commentsRes] = await Promise.all([
                supabase.from('reactions').select('*').in('post_id', postIds),
                supabase.from('comments').select('post_id').in('post_id', postIds)
            ]);

            // Group reactions by post_id
            const reactionsByPost = {};
            (reactionsRes.data || []).forEach(r => {
                if (!reactionsByPost[r.post_id]) reactionsByPost[r.post_id] = [];
                reactionsByPost[r.post_id].push(r);
            });

            // Count comments by post_id
            const commentCountByPost = {};
            (commentsRes.data || []).forEach(c => {
                commentCountByPost[c.post_id] = (commentCountByPost[c.post_id] || 0) + 1;
            });

            // Merge
            const enriched = posts.map(post => {
                const reactions = reactionsByPost[post.id] || [];
                const reactionSummary = {};
                reactions.forEach(r => {
                    if (!reactionSummary[r.emoji]) reactionSummary[r.emoji] = { count: 0, users: [] };
                    reactionSummary[r.emoji].count++;
                    reactionSummary[r.emoji].users.push(r.user_id);
                });
                return { ...post, reactions: reactionSummary, comment_count: commentCountByPost[post.id] || 0 };
            });

            res.json({ success: true, data: enriched });
        } catch (e) { 
            console.error('[PostController - getAllPosts] Error:', e.message); 
            res.status(500).json({ success: false, error: e.message }); 
        }
    }

    static async createPost(req, res) {
        try {
            const { content } = req.body;
            if (!content || !content.trim()) return res.status(400).json({ success: false, error: 'Nội dung không được trống' });
            const post = await PostModel.create(
                content.trim(),
                req.user.display_name || req.user.username,
                req.user.role,
                req.user.id
            );
            res.status(201).json({ success: true, data: post });
        } catch (e) { 
            console.error('[PostController - createPost] Error:', e.message); 
            res.status(500).json({ success: false, error: e.message }); 
        }
    }

    static async deletePost(req, res) {
        try {
            await PostModel.delete(req.params.id);
            res.json({ success: true, message: 'Đã xóa bài đăng' });
        } catch (e) { 
            console.error('[PostController - deletePost] Error:', e.message); 
            res.status(500).json({ success: false, error: e.message }); 
        }
    }

    static async getComments(req, res) {
        try {
            const data = await CommentModel.getByPostId(parseInt(req.params.id));
            res.json({ success: true, data });
        } catch (e) { 
            console.error('[PostController - getComments] Error:', e.message); 
            res.status(500).json({ success: false, error: e.message }); 
        }
    }

    static async createComment(req, res) {
        try {
            const { content } = req.body;
            if (!content || !content.trim()) return res.status(400).json({ success: false, error: 'Nội dung không được trống' });
            const comment = await CommentModel.create(
                parseInt(req.params.id),
                content.trim(),
                req.user.display_name || req.user.username,
                req.user.role,
                req.user.id,
                req.user.avatar
            );
            res.status(201).json({ success: true, data: comment });
        } catch (e) { 
            console.error('[PostController - createComment] Error:', e.message); 
            res.status(500).json({ success: false, error: e.message }); 
        }
    }

    static async deleteComment(req, res) {
        try {
            await CommentModel.delete(parseInt(req.params.id));
            res.json({ success: true });
        } catch (e) { 
            console.error('[PostController - deleteComment] Error:', e.message); 
            res.status(500).json({ success: false, error: e.message }); 
        }
    }

    static async toggleReaction(req, res) {
        try {
            const postId = parseInt(req.params.id);
            const { emoji } = req.body;
            const userId = req.user.id;
            
            await ReactionModel.toggle(postId, userId, emoji);
            
            // Get updated reactions
            const reactions = await ReactionModel.getByPostId(postId);
            const reactionSummary = {};
            reactions.forEach(r => {
                if (!reactionSummary[r.emoji]) reactionSummary[r.emoji] = { count: 0, users: [] };
                reactionSummary[r.emoji].count++;
                reactionSummary[r.emoji].users.push(r.user_id);
            });
            
            res.json({ success: true, data: reactionSummary });
        } catch (e) { 
            console.error('[PostController - toggleReaction] Error:', e.message); 
            res.status(500).json({ success: false, error: e.message }); 
        }
    }
}

module.exports = PostController;
