import React, { useState } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { api } from '../../../shared/services/api';
import { myError } from '../../../shared/utils/logger';
import { TrackingHelper } from '../../../shared/services/TrackingHelper';

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
        if (diff < 60) return t('common.just_now');
        if (diff < 3600) return `${Math.floor(diff / 60)} ${t('common.minutes_ago')}`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('common.hours_ago')}`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} ${t('common.days_ago')}`;
        return d.toLocaleDateString('vi-VN');
    }

    const handleReaction = async (emoji) => {
        // Optimistic update
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

        try {
            await api.reactToPost(post.id, emoji);
        } catch (e) {
            myError('NEWSFEED', e);
        }
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
            } catch (e) {
                myError('NEWSFEED', e);
            }
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

        // Optimistically update comment count in parent
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));

        try {
            const json = await api.addComment(post.id, text);
            if (json.success && json.data) {
                setComments(prev => prev.map(c => c.id === tempComment.id ? json.data : c));
            }
        } catch (e) {
            addToast(t('chat.send_error'));
        }
    };

    const handleDeleteComment = async (commentId) => {
        setComments(prev => prev.filter(c => c.id !== commentId));
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, comment_count: Math.max(0, (p.comment_count || 1) - 1) } : p));
        try {
            await api.deleteComment(commentId);
        } catch (e) {
            addToast(t('newsfeed.delete_comment_err'));
        }
    };

    const userReaction = EMOJIS.find(e => post.reactions?.[e]?.users?.includes(currentUserId));
    const LABEL_MAP = { 
        '👍': t('newsfeed.like'), 
        '❤️': t('newsfeed.love'), 
        '😂': t('newsfeed.haha'), 
        '😮': t('newsfeed.wow'), 
        '😢': t('newsfeed.sad') 
    };

    return (
        <div className="rounded-3xl p-6 shadow-sm mb-4" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl overflow-hidden shadow-inner" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                        {(post.author_role || post.authorRole) === 'admin' ? '👑' : '👤'}
                    </div>
                    <div>
                        <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{post.author}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(post.created_at || post.createdAt)}</div>
                    </div>
                </div>
                {isAdmin && (
                    <button className="transition-colors p-2 hover:text-red-500" style={{ color: 'var(--text-muted)' }} onClick={() => onDeletePost(post.id)} title={t('newsfeed.delete_post_title')}>
                        🗑️
                    </button>
                )}
            </div>
            
            <div className="text-[15px] mb-4 whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>{post.content}</div>

            {/* Summary */}
            {(Object.keys(post.reactions || {}).length > 0 || (post.comment_count > 0)) && (
                <div className="flex justify-between items-center text-xs mb-3 pb-3" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center">
                        {Object.keys(post.reactions || {}).filter(e => post.reactions[e].count > 0).slice(0, 3).map((e) => (
                            <span key={e} className="mr-1">{e}</span>
                        ))}
                        {Object.values(post.reactions || {}).reduce((sum, r) => sum + (r.count || 0), 0) > 0 && (
                            <span className="ml-1">{Object.values(post.reactions || {}).reduce((sum, r) => sum + (r.count || 0), 0)}</span>
                        )}
                    </div>
                    <div>
                        <span className="cursor-pointer hover:underline" onClick={toggleComments}>
                            {post.comment_count || 0} {t('newsfeed.comments_count')}
                        </span>
                    </div>
                </div>
            )}

            {/* Actions Bar */}
            <div className="flex gap-2">
                <div className="relative group">
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:flex rounded-full shadow-lg p-1 gap-1 z-10 animate-fade-in-up" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                        {EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                className="w-8 h-8 rounded-full hover:scale-125 transition-all text-lg flex items-center justify-center"
                                style={{ background: 'transparent' }}
                                title={emoji === '👍' ? t('newsfeed.like') : emoji === '❤️' ? t('newsfeed.love') : emoji === '😂' ? t('newsfeed.haha') : emoji === '😮' ? t('newsfeed.wow') : t('newsfeed.sad')}
                                onClick={() => handleReaction(emoji)}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                    <button
                        className="flex items-center gap-2 px-4 py-2 rounded-xl transition-colors font-medium text-sm"
                        style={userReaction ? { color: 'var(--primary)', background: 'var(--primary-glow)' } : { color: 'var(--text-secondary)' }}
                        onClick={() => handleReaction(userReaction ? userReaction : '👍')}
                    >
                        <span className="text-lg">
                            {userReaction ? userReaction : (
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                </svg>
                            )}
                        </span>
                        <span>{userReaction ? LABEL_MAP[userReaction] : t('newsfeed.like')}</span>
                    </button>
                </div>
                
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl transition-colors font-medium text-sm" style={{ color: 'var(--text-secondary)' }} onClick={toggleComments}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span>{t('newsfeed.comment')}</span>
                </button>

                <button className="flex items-center gap-2 px-4 py-2 rounded-xl transition-colors font-medium text-sm ml-auto" style={{ color: 'var(--text-secondary)' }} onClick={() => addToast(t('newsfeed.share_coming'))}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                        <polyline points="16 6 12 2 8 6"></polyline>
                        <line x1="12" y1="2" x2="12" y2="15"></line>
                    </svg>
                </button>
            </div>

            {/* Comments Section */}
            {isExpanded && (
                <div className="mt-4 pt-4 flex flex-col gap-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {comments.map(c => (
                        <div key={c.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0" style={{ background: 'var(--bg-primary)' }}>
                                {(c.author_role || c.authorRole) === 'admin' ? '👑' : '👤'}
                            </div>
                            <div className="flex flex-col flex-1">
                                <div className="rounded-2xl p-3 relative group" style={{ background: 'var(--bg-hover)' }}>
                                    <div className="font-bold text-xs mb-1" style={{ color: 'var(--text-primary)' }}>{c.author}</div>
                                    <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.content}</div>
                                    
                                    {isAdmin && (
                                        <button 
                                            className="absolute right-2 top-2 hidden group-hover:flex w-6 h-6 items-center justify-center shadow-sm rounded-full text-red-500 text-xs" 
                                            style={{ background: 'var(--bg-card)' }}
                                            onClick={() => handleDeleteComment(c.id)} 
                                            title={t('newsfeed.delete_comment_title')}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                <span className="text-[11px] mt-1 ml-2" style={{ color: 'var(--text-muted)' }}>{timeAgo(c.created_at || c.createdAt)}</span>
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-3 items-center mt-2">
                        <input
                            className="flex-1 rounded-full px-4 py-2 outline-none text-sm"
                            style={{ background: 'var(--input-bg)', border: '1px solid var(--border-subtle)', color: 'var(--input-color)' }}
                            placeholder={t('newsfeed.comment_placeholder')}
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                        />
                        <button
                            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-50 hover:bg-blue-700 transition-colors shrink-0"
                            onClick={handleAddComment}
                            disabled={!commentText.trim()}
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
