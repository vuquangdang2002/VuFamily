import React, { useState } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { api } from '../../../shared/services/api';
import { myError } from '../../../shared/utils/logger';
import { TrackingHelper } from '../../../shared/services/TrackingHelper';
import { MessageCircle, Share2, Trash2, Send, ThumbsUp, User, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../../../shared/components/ui/GlassCard';

const EMOJIS = ['❤️', '👍', '😂', '😮', '😢'];

export default function PostCard({ post, user, isAdmin, currentUserId, addToast, setPosts, onDeletePost }) {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentsLoaded, setCommentsLoaded] = useState(false);
    const [commentText, setCommentText] = useState('');

    function timeAgo(dateStr) {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - d) / 1000);
        if (diff < 60) return t('common.just_now') || 'Vừa xong';
        if (diff < 3600) return `${Math.floor(diff / 60)} ${t('common.minutes_ago') || 'phút trước'}`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('common.hours_ago') || 'giờ trước'}`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} ${t('common.days_ago') || 'ngày trước'}`;
        return d.toLocaleDateString('vi-VN');
    }

    const handleReaction = async (emoji) => {
        setPosts(prev => prev.map(p => {
            if (p.id !== post.id) return p;
            const reactions = { ...p.reactions };
            let userPreviousReaction = null;
            for (const em of Object.keys(reactions)) {
                if (reactions[em]?.users?.includes(currentUserId)) {
                    userPreviousReaction = em;
                    break;
                }
            }
            if (userPreviousReaction === emoji) {
                const r = { ...reactions[emoji] };
                r.users = r.users.filter(u => u !== currentUserId);
                r.count = Math.max(0, r.count - 1);
                reactions[emoji] = r;
            } else {
                if (userPreviousReaction) {
                    const pr = { ...reactions[userPreviousReaction] };
                    pr.users = pr.users.filter(u => u !== currentUserId);
                    pr.count = Math.max(0, pr.count - 1);
                    reactions[userPreviousReaction] = pr;
                }
                const nr = reactions[emoji] ? { ...reactions[emoji] } : { count: 0, users: [] };
                nr.users = [...nr.users, currentUserId];
                nr.count++;
                reactions[emoji] = nr;
                TrackingHelper.trackReactPost(emoji);
            }
            return { ...p, reactions };
        }));

        try { await api.reactToPost(post.id, emoji); } 
        catch (e) { myError('NEWSFEED', e); }
    };

    const toggleComments = async () => {
        const nextExpanded = !isExpanded;
        setIsExpanded(nextExpanded);
        if (nextExpanded && !commentsLoaded) {
            try {
                const json = await api.getComments(post.id);
                if (json.success) {
                    setComments(json.data || []);
                    setCommentsLoaded(true);
                }
            } catch (e) { myError('NEWSFEED', e); }
        }
    };

    const handleAddComment = async () => {
        const text = commentText.trim();
        if (!text) return;
        const tempComment = {
            id: `temp-${Date.now()}`,
            content: text,
            author: user?.displayName || t('common.you') || 'Bạn',
            author_role: user?.role || 'viewer',
            created_at: new Date().toISOString()
        };
        setComments(prev => [...prev, tempComment]);
        setCommentText('');
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
        TrackingHelper.trackCommentPost();
        try {
            const json = await api.addComment(post.id, { content: text });
            if (json.success && json.data) {
                setComments(prev => prev.map(c => c.id === tempComment.id ? json.data : c));
            } else { addToast(t('newsfeed.comment_fail') || 'Lỗi bình luận'); }
        } catch (e) { addToast(t('login.error_connection')); }
    };

    const handleDeleteComment = async (cid) => {
        if (!confirm(t('newsfeed.delete_confirm') || 'Bạn có chắc chắn muốn xóa?')) return;
        setComments(prev => prev.filter(c => c.id !== cid));
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, comment_count: Math.max(0, (p.comment_count || 0) - 1) } : p));
        try { await api.deleteComment(post.id, cid); } 
        catch (e) { addToast(t('newsfeed.delete_post_err')); }
    };

    let userReaction = null;
    for (const em of Object.keys(post.reactions || {})) {
        if (post.reactions[em]?.users?.includes(currentUserId)) {
            userReaction = em;
            break;
        }
    }

    const LABEL_MAP = {
        '❤️': t('newsfeed.love') || 'Yêu thích',
        '👍': t('newsfeed.like') || 'Thích',
        '😂': t('newsfeed.haha') || 'Haha',
        '😮': t('newsfeed.wow') || 'Wow',
        '😢': t('newsfeed.sad') || 'Buồn'
    };

    return (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-sm p-6 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#fe6e00]/20 to-amber-500/20 flex items-center justify-center border border-[#fe6e00]/30 shadow-sm shrink-0 text-[#fe6e00]">
                    {(post.author_role || post.authorRole) === 'admin' ? '👑' : <User size={18} />}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-bold text-[15px] text-white truncate flex items-center gap-2">
                        {post.author}
                        {(post.author_role || post.authorRole) === 'admin' && (
                            <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 text-[10px] uppercase font-bold tracking-wider border border-rose-500/20">Admin</span>
                        )}
                    </span>
                    <span className="text-xs font-medium text-[#8b949e]">{timeAgo(post.created_at || post.createdAt)}</span>
                </div>
                {(isAdmin || (currentUserId && post.author_id === currentUserId)) && (
                    <button 
                        className="p-2 -mr-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-colors" 
                        onClick={() => onDeletePost(post.id)} 
                        title={t('newsfeed.delete_post_title') || 'Xóa bài viết'}
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>
            
            {/* Content */}
            <div className="text-[15px] text-[#c9d1d9] whitespace-pre-wrap leading-relaxed break-words">
                {post.content}
            </div>

            {/* Summary */}
            {(Object.keys(post.reactions || {}).length > 0 || (post.comment_count > 0)) && (
                <div className="flex justify-between items-center text-[13px] pb-2 border-b border-[#30363d] text-[#8b949e] font-medium">
                    <div className="flex items-center">
                        {Object.keys(post.reactions || {}).filter(e => post.reactions[e].count > 0).slice(0, 3).map((e, idx) => (
                            <span key={e} className={`bg-[#161b22] border border-[#30363d] rounded-full p-0.5 text-xs shadow-sm ${idx > 0 ? '-ml-1.5' : ''} relative z-[${10-idx}]`}>
                                {e}
                            </span>
                        ))}
                        {Object.values(post.reactions || {}).reduce((sum, r) => sum + (r.count || 0), 0) > 0 && (
                            <span className="ml-2 font-semibold text-[#c9d1d9]">
                                {Object.values(post.reactions || {}).reduce((sum, r) => sum + (r.count || 0), 0)}
                            </span>
                        )}
                    </div>
                    <div className="cursor-pointer hover:text-[#fe6e00] transition-colors" onClick={toggleComments}>
                        {post.comment_count || 0} {t('newsfeed.comments_count') || 'bình luận'}
                    </div>
                </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-wrap gap-2 pt-1">
                <div className="relative group">
                    <div className="absolute bottom-full left-0 mb-3 hidden group-hover:flex rounded-[1.5rem] shadow-xl p-1.5 gap-1.5 z-20 bg-[#161b22] border border-[#30363d] animate-in fade-in slide-in-from-bottom-2">
                        {EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                className="w-10 h-10 rounded-full hover:scale-125 hover:bg-[#30363d] transition-all text-xl flex items-center justify-center origin-bottom"
                                onClick={() => handleReaction(emoji)}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                    <button
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-[13px] ${userReaction ? 'bg-[#fe6e00]/10 text-[#fe6e00]' : 'bg-transparent text-[#8b949e] hover:bg-[#30363d]'}`}
                        onClick={() => handleReaction(userReaction ? userReaction : '👍')}
                    >
                        {userReaction ? <span className="text-base leading-none">{userReaction}</span> : <ThumbsUp size={16} className="mb-0.5" />}
                        <span>{userReaction ? LABEL_MAP[userReaction] : (t('newsfeed.like') || 'Thích')}</span>
                    </button>
                </div>
                
                <button 
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-colors font-bold text-[13px] ${isExpanded ? 'bg-[#30363d] text-white' : 'bg-transparent text-[#8b949e] hover:bg-[#30363d]'}`}
                    onClick={toggleComments}
                >
                    <MessageCircle size={16} />
                    <span>{t('newsfeed.comment') || 'Bình luận'}</span>
                </button>

                <button 
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-transparent text-[#8b949e] hover:bg-[#30363d] transition-colors font-bold text-[13px] ml-auto" 
                    onClick={() => addToast(t('newsfeed.share_coming') || 'Tính năng chia sẻ đang phát triển')}
                >
                    <Share2 size={16} />
                    <span className="hidden sm:inline">{t('newsfeed.share') || 'Chia sẻ'}</span>
                </button>
            </div>

            {/* Comments Accordion */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden flex flex-col gap-4 border-t border-[#30363d]"
                    >
                        <div className="pt-4 flex flex-col gap-5">
                            {comments.map(c => (
                                <div key={c.id} className="flex gap-3 group/comment">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 bg-[#30363d] text-[#c9d1d9]">
                                        {(c.author_role || c.authorRole) === 'admin' ? '👑' : <User size={14} />}
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0 bg-[#0d1117] border border-[#30363d] rounded-2xl px-4 py-3 relative">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="font-bold text-[13px] text-white">
                                                {c.author}
                                            </span>
                                            <span className="text-[11px] text-[#8b949e]">
                                                {timeAgo(c.created_at || c.createdAt)}
                                            </span>
                                        </div>
                                        <div className="text-[13px] text-[#c9d1d9] leading-relaxed break-words">
                                            {c.content}
                                        </div>
                                        {isAdmin && (
                                            <button 
                                                className="absolute -right-2 -top-2 opacity-0 group-hover/comment:opacity-100 w-7 h-7 flex items-center justify-center shadow-md rounded-full bg-[#161b22] border border-[#30363d] text-rose-500 transition-all hover:scale-110" 
                                                onClick={() => handleDeleteComment(c.id)} 
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <div className="flex items-end gap-3 mt-2">
                                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-tr from-[#fe6e00]/20 to-amber-500/20 text-[#fe6e00] border border-[#fe6e00]/30 shadow-sm">
                                    {user?.role === 'admin' ? '👑' : <User size={14} />}
                                </div>
                                <div className="flex-1 flex items-end gap-2">
                                    <input 
                                        type="text"
                                        className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-full px-4 py-2.5 text-[13px] text-[#c9d1d9] placeholder:text-[#8b949e] outline-none focus:border-[#fe6e00]/50 transition-colors"
                                        placeholder={t('newsfeed.write_comment') || 'Viết bình luận...'}
                                        value={commentText}
                                        onChange={e => setCommentText(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddComment();
                                            }
                                        }}
                                    />
                                    <button 
                                        onClick={handleAddComment}
                                        disabled={!commentText.trim()}
                                        className="w-9 h-9 shrink-0 flex items-center justify-center bg-[#fe6e00] hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-[#fe6e00] text-white rounded-xl transition-colors mb-0.5 mr-0.5"
                                    >
                                        <Send size={16} className="-ml-0.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
