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
            author: user?.displayName || 'Bạn',
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
        <div className="nf-post-card">
            <div className="nf-post-header">
                <div className="nf-post-author">
                    <span className="nf-author-avatar">
                        {(post.author_role || post.authorRole) === 'admin' ? '👑' : '👤'}
                    </span>
                    <div>
                        <div className="nf-author-name">{post.author}</div>
                        <div className="nf-post-time">{timeAgo(post.created_at || post.createdAt)}</div>
                    </div>
                </div>
                {isAdmin && (
                    <button className="nf-post-delete" onClick={() => onDeletePost(post.id)} title={t('newsfeed.delete_post_title')}>
                        🗑️
                    </button>
                )}
            </div>
            <div className="nf-post-content">{post.content}</div>

            {/* ── Summary & Actions Bar ── */}
            <div className="nf-reaction-summary">
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    {Object.keys(post.reactions || {}).filter(e => post.reactions[e].count > 0).slice(0, 3).map((e) => (
                        <span key={e} className="nf-summary-icon">{e}</span>
                    ))}
                    {Object.values(post.reactions || {}).reduce((sum, r) => sum + (r.count || 0), 0) > 0 && (
                        <span style={{ marginLeft: 8 }}>
                            {Object.values(post.reactions || {}).reduce((sum, r) => sum + (r.count || 0), 0)}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ cursor: 'pointer' }} onClick={toggleComments}>
                        {post.comment_count || 0} {t('newsfeed.comments_count')}
                    </span>
                </div>
            </div>

            <div className="nf-actions-bar">
                <div className="nf-reaction-container">
                    <div className="nf-reaction-picker">
                        {EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                className="nf-reaction-picker-btn"
                                data-label={emoji === '👍' ? t('newsfeed.like') : emoji === '❤️' ? t('newsfeed.love') : emoji === '😂' ? t('newsfeed.haha') : emoji === '😮' ? t('newsfeed.wow') : t('newsfeed.sad')}
                                onClick={() => handleReaction(emoji)}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                    <button
                        className={`nf-action-btn ${userReaction ? 'reacted-' + userReaction : ''}`}
                        onClick={() => handleReaction(userReaction ? userReaction : '👍')}
                    >
                        <span style={{ fontSize: 18 }}>
                            {userReaction ? userReaction : (
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                </svg>
                            )}
                        </span>
                        <span>{userReaction ? LABEL_MAP[userReaction] : t('newsfeed.like')}</span>
                    </button>
                </div>
                <button className="nf-action-btn" onClick={toggleComments}>
                    <span style={{ fontSize: 18 }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </span>
                    <span>{t('newsfeed.comment')}</span>
                </button>
                <button className="nf-action-btn" onClick={() => addToast(t('newsfeed.share_coming'))}>
                    <span style={{ fontSize: 18 }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                            <polyline points="16 6 12 2 8 6"></polyline>
                            <line x1="12" y1="2" x2="12" y2="15"></line>
                        </svg>
                    </span>
                    <span>{t('newsfeed.share')}</span>
                </button>
            </div>

            {/* ── Comments Section ── */}
            {isExpanded && (
                <div className="nf-comments-section">
                    {comments.map(c => (
                        <div key={c.id} className="nf-comment">
                            <div className="nf-comment-header">
                                <span className="nf-comment-avatar">
                                    {(c.author_role || c.authorRole) === 'admin' ? '👑' : '👤'}
                                </span>
                                <span className="nf-comment-author">{c.author}</span>
                                <span className="nf-comment-time">{timeAgo(c.created_at || c.createdAt)}</span>
                                {isAdmin && (
                                    <button className="nf-comment-del" onClick={() => handleDeleteComment(c.id)} title={t('newsfeed.delete_comment_title')}>✕</button>
                                )}
                            </div>
                            <div className="nf-comment-text">{c.content}</div>
                        </div>
                    ))}
                    <div className="nf-comment-input-wrap">
                        <input
                            className="nf-comment-input"
                            placeholder={t('newsfeed.comment_placeholder')}
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                        />
                        <button
                            className="nf-comment-send"
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
