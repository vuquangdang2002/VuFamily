// NewsfeedPage.jsx — Bảng tin & Liên hệ dòng họ (đã localize)
import { useState, useEffect, useRef } from 'react';
import { myLog, myError } from '../../shared/utils/logger';
import { localApi, api } from '../../shared/services/api';
import { ConfigAPI } from '../../config.js';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { useTranslation } from '../../shared/hooks/useTranslation';

import iconZalo from '../../assets/icons/icon_zalo.png';
import iconFacebook from '../../assets/icons/icon_facebook.png';
import iconMessenger from '../../assets/icons/icon_messenger.png';

function generateQR(text, size = 200) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}

import './Newsfeed.css';
import { AuthHelper } from '../../shared/services/AuthHelper';

// timeAgo sẽ được tạo bên trong component để dùng t()

// Brand icons map
const BRAND_ICONS = { zalo: iconZalo, facebook: iconFacebook, messenger: iconMessenger };
const CONTACT_LABELS = { zalo: 'Zalo', facebook: 'Facebook', messenger: 'Messenger' };

const BrandIcon = ({ type, size = 36 }) => (
    <img src={BRAND_ICONS[type]} alt={type} width={size} height={size} style={{ borderRadius: 8 }} />
);

// Helper: get auth token
function getToken() {
    try {
        const session = AuthHelper.getAuthData();
        return session.token || '';
    } catch { return ''; }
}

// Biến toàn cục để cache lại bài đăng trong phiên làm việc
let cachedPosts = null;
let lastFetchTime = 0;

function getTodayLabel() {
    const d = new Date();
    return d.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function NewsfeedPage({ user, isAdmin, addToast, members = [], onNavigate }) {
    const { t } = useTranslation();

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
    const [posts, setPosts] = useState(cachedPosts || []);
    const [hasNewPostsHint, setHasNewPostsHint] = useState(false);
    const [contacts, setContacts] = useState(() => localApi.getContacts());
    const [newPost, setNewPost] = useState('');
    const [editingContact, setEditingContact] = useState(null);
    const [editUrl, setEditUrl] = useState('');
    const [qrModal, setQrModal] = useState(null);
    const [tab, setTab] = useState('posts');
    const [loading, setLoading] = useState(false);

    // Stats derived from members prop
    const totalMembers = members.length;
    const generations = members.length > 0 ? Math.max(...members.map(m => m.generation || 1)) : 0;

    // Upcoming birthdays in next 30 days
    const upcomingBirthdays = (() => {
        const today = new Date();
        const inDays = (d) => {
            const date = new Date(d);
            const next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
            if (next < today) next.setFullYear(today.getFullYear() + 1);
            return Math.ceil((next - today) / 86400000);
        };
        return members
            .filter(m => m.birthDate && !m.deathDate)
            .map(m => ({ name: m.name, date: m.birthDate, days: inDays(m.birthDate), type: 'sinh nhật' }))
            .filter(m => m.days <= 30)
            .sort((a, b) => a.days - b.days)
            .slice(0, 4);
    })();

    // Fetch posts from API
    const fetchPosts = async (force = false) => {
        // Đọc trực tiếp cấu hình hiện hành từ ConfigAPI
        const refreshIntervalMs = ConfigAPI.getNumber('newsfeed_refresh_interval_ms', 5 * 60 * 1000);

        if (!force && cachedPosts && (Date.now() - lastFetchTime < refreshIntervalMs)) {
            return; // Dùng cache, không gọi API nếu chưa quá thời gian cấu hình
        }

        if (force || !cachedPosts) setLoading(true);
        try {
            const json = await api.getPosts();
            if (json.success) {
                const newPosts = json.data || [];

                // Nếu fetch ngầm (background) và thấy có bài đăng mới ở đầu danh sách
                if (!force && cachedPosts && cachedPosts.length > 0) {
                    if (newPosts.length > 0 && newPosts[0].id !== cachedPosts[0].id) {
                        setHasNewPostsHint(true);
                    } else {
                        // Cập nhật lastFetchTime để không hỏi lại liên tục
                        lastFetchTime = Date.now();
                    }
                } else {
                    // Update cache và state ngay lập tức
                    setPosts(newPosts);
                    cachedPosts = newPosts;
                    lastFetchTime = Date.now();
                    setHasNewPostsHint(false);
                }
            }
        } catch (e) { myError('NEWSFEED', 'Error fetching posts:', e); }
        setLoading(false);
    };

    useEffect(() => { fetchPosts(); }, []);

    // Refresh data when switching tabs
    const switchTab = (t) => {
        setTab(t);
        if (t === 'contacts') setContacts(localApi.getContacts());
        if (t === 'posts') fetchPosts();
    };

    const handleCreatePost = async () => {
        if (!newPost.trim()) return;
        try {
            const json = await api.createPost({ content: newPost.trim() });
            if (json.success) {
                setNewPost('');
                addToast(t('newsfeed.post_success'));
                TrackingHelper.trackCreatePost(false); // Update to true if image upload is added
                fetchPosts(true);
            } else {
                addToast(json.error || t('newsfeed.post_fail'));
            }
        } catch (e) { addToast(t('login.error_connection')); }
    };

    const handleDeletePost = async (id) => {
        if (!confirm(t('newsfeed.delete_confirm'))) return;
        try {
            const json = await api.deletePost(id);
            if (json.success) {
                addToast(t('newsfeed.delete_success'));
                fetchPosts(true);
            }
        } catch (e) { addToast(t('newsfeed.delete_post_err')); }
    };

    // ─── Reactions (optimistic) ───
    const EMOJIS = ['❤️', '👍', '😂', '😮', '😢'];
    const handleReaction = async (postId, emoji) => {
        setPosts(prev => prev.map(post => {
            if (post.id !== postId) return post;
            const reactions = { ...post.reactions };
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
            return { ...post, reactions };
        }));
        try {
            await api.reactToPost(postId, emoji);
        } catch (e) { myError('NEWSFEED', e); }
    };

    // ─── Comments ───
    const [expandedComments, setExpandedComments] = useState({});
    const [commentTexts, setCommentTexts] = useState({});
    const [comments, setComments] = useState({});

    const toggleComments = async (postId) => {
        const isOpen = expandedComments[postId];
        setExpandedComments(prev => ({ ...prev, [postId]: !isOpen }));
        if (!isOpen && !comments[postId]) {
            try {
                const json = await api.getComments(postId);
                if (json.success) setComments(prev => ({ ...prev, [postId]: json.data || [] }));
            } catch (e) { myError('NEWSFEED', e); }
        }
    };

    const handleAddComment = async (postId) => {
        const text = (commentTexts[postId] || '').trim();
        if (!text) return;
        const tempComment = {
            id: `temp-${Date.now()}`,
            content: text,
            author: user?.displayName || 'Bạn',
            author_role: user?.role || 'viewer',
            created_at: new Date().toISOString()
        };
        setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), tempComment] }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));
        try {
            const json = await api.addComment(postId, text);
            if (json.success && json.data) {
                setComments(prev => ({
                    ...prev,
                    [postId]: (prev[postId] || []).map(c => c.id === tempComment.id ? json.data : c)
                }));
            }
        } catch (e) { addToast(t('chat.send_error')); }
    };

    const handleDeleteComment = async (commentId, postId) => {
        setComments(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c.id !== commentId) }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: Math.max(0, (p.comment_count || 1) - 1) } : p));
        try {
            await api.deleteComment(commentId);
        } catch (e) { addToast(t('newsfeed.delete_comment_err')); }
    };

    const currentUserId = (() => {
        try { return AuthHelper.getAuthData().id; }
        catch { return null; }
    })();

    const handleStartEdit = (c) => { setEditingContact(c.id); setEditUrl(c.url || ''); };
    const handleSaveUrl = (c) => {
        localApi.updateContact(c.id, { ...c, url: editUrl });
        setContacts(localApi.getContacts());
        setEditingContact(null);
        addToast(t('profile.toast_update_success'));
    };

    return (
        <div className="page-container">

            {/* ── Uizard-style Dashboard Header ── */}
            <div className="nf-dashboard-header">
                <div className="nf-welcome-row">
                    <div>
                        <h2 className="nf-welcome-greeting">
                            {t('newsfeed.greeting')}, {user?.displayName || t('role.member')}! 👋
                        </h2>
                        <p className="nf-welcome-sub">{getTodayLabel()}</p>
                    </div>
                </div>

                {/* Stats Cards — Uizard "Your stats" pattern */}
                <div className="nf-stat-cards">
                    <div className="nf-stat-card">
                        <div className="nf-stat-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>👥</div>
                        <div className="nf-stat-body">
                            <div className="nf-stat-value">{totalMembers}</div>
                            <div className="nf-stat-label">{t('newsfeed.stats_members')}</div>
                        </div>
                    </div>
                    <div className="nf-stat-card">
                        <div className="nf-stat-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>🌿</div>
                        <div className="nf-stat-body">
                            <div className="nf-stat-value">{generations}</div>
                            <div className="nf-stat-label">{t('newsfeed.stats_generations')}</div>
                        </div>
                    </div>
                    <div className="nf-stat-card">
                        <div className="nf-stat-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>🎂</div>
                        <div className="nf-stat-body">
                            <div className="nf-stat-value">{upcomingBirthdays.length}</div>
                            <div className="nf-stat-label">{t('newsfeed.upcoming_birthdays')}</div>
                        </div>
                    </div>
                    <div className="nf-stat-card">
                        <div className="nf-stat-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>📝</div>
                        <div className="nf-stat-body">
                            <div className="nf-stat-value">{posts.length}</div>
                            <div className="nf-stat-label">{t('newsfeed.tab_posts')}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 2-Column Body (Feed + Right Panel) ── */}
            <div className="nf-body-grid">
                {/* Left: Tab + Feed */}
                <div>
                    {/* Tab Navigation */}
                    <div className="nf-tabs">
                        <button className={`nf-tab ${tab === 'posts' ? 'active' : ''}`} onClick={() => switchTab('posts')}>
                            📝 {t('newsfeed.tab_posts')}
                        </button>
                        <button className={`nf-tab ${tab === 'contacts' ? 'active' : ''}`} onClick={() => switchTab('contacts')}>
                            📱 {t('newsfeed.tab_contacts')}
                        </button>
                    </div>

                    <div className="page-body">
                        {/* ── POSTS TAB ── */}
                        {tab === 'posts' && (
                            <div className="nf-posts-section">
                                <div className="nf-create-post">
                                    <div className="nf-create-header">
                                        <span className="nf-author-avatar">{user?.role === 'admin' ? '👑' : '👤'}</span>
                                        <span className="nf-author-name">{user?.displayName}</span>
                                    </div>
                                    <textarea
                                        className="nf-post-input"
                                        placeholder={t('newsfeed.write_post')}
                                        value={newPost}
                                        onChange={e => setNewPost(e.target.value)}
                                        rows={3}
                                    />
                                    <div className="nf-create-footer">
                                        <span className="nf-char-count">{newPost.length}/500</span>
                                        <button className="btn btn-primary" onClick={handleCreatePost} disabled={!newPost.trim()}>
                                            📤 {t('newsfeed.post_btn')}
                                        </button>
                                    </div>
                                </div>

                                {hasNewPostsHint && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                                        <button
                                            onClick={() => fetchPosts(true)}
                                            style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 24, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            <span style={{ fontSize: 16 }}>↑</span> {t('newsfeed.new_posts_hint')}
                                        </button>
                                    </div>
                                )}

                                {loading && posts.length === 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                                        <div className="nf-spinner"></div>
                                        <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>{t('common.loading')}</span>
                                    </div>
                                ) : posts.length === 0 ? (
                                    <div className="empty-state">
                                        <span style={{ fontSize: 48 }}>📭</span>
                                        <h3>{t('newsfeed.empty')}</h3>
                                    </div>
                                ) : (
                                    <div className="nf-posts-list">
                                        {posts.map(post => (
                                            <div key={post.id} className="nf-post-card">
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
                                                        <button className="nf-post-delete" onClick={() => handleDeletePost(post.id)} title={t('newsfeed.delete_post_title')}>
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
                                                        <span style={{ cursor: 'pointer' }} onClick={() => toggleComments(post.id)}>
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
                                                                    onClick={() => handleReaction(post.id, emoji)}
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        {(() => {
                                                            const userReaction = EMOJIS.find(e => post.reactions?.[e]?.users?.includes(currentUserId));
                                                            const LABEL_MAP = { '👍': t('newsfeed.like'), '❤️': t('newsfeed.love'), '😂': t('newsfeed.haha'), '😮': t('newsfeed.wow'), '😢': t('newsfeed.sad') };
                                                            return (
                                                                <button
                                                                    className={`nf-action-btn ${userReaction ? 'reacted-' + userReaction : ''}`}
                                                                    onClick={() => handleReaction(post.id, userReaction ? userReaction : '👍')}
                                                                >
                                                                    <span style={{ fontSize: 18 }}>{userReaction ? userReaction : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>}</span>
                                                                    <span>{userReaction ? LABEL_MAP[userReaction] : t('newsfeed.like')}</span>
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>
                                                    <button className="nf-action-btn" onClick={() => toggleComments(post.id)}>
                                                        <span style={{ fontSize: 18 }}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span>
                                                        <span>{t('newsfeed.comment')}</span>
                                                    </button>
                                                    <button className="nf-action-btn" onClick={() => addToast(t('newsfeed.share_coming'))}>
                                                        <span style={{ fontSize: 18 }}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg></span>
                                                        <span>{t('newsfeed.share')}</span>
                                                    </button>
                                                </div>

                                                {/* ── Comments Section ── */}
                                                {expandedComments[post.id] && (
                                                    <div className="nf-comments-section">
                                                        {(comments[post.id] || []).map(c => (
                                                            <div key={c.id} className="nf-comment">
                                                                <div className="nf-comment-header">
                                                                    <span className="nf-comment-avatar">
                                                                        {(c.author_role) === 'admin' ? '👑' : '👤'}
                                                                    </span>
                                                                    <span className="nf-comment-author">{c.author}</span>
                                                                    <span className="nf-comment-time">{timeAgo(c.created_at)}</span>
                                                                    {isAdmin && (
                                                                        <button className="nf-comment-del" onClick={() => handleDeleteComment(c.id, post.id)} title={t('newsfeed.delete_comment_title')}>✕</button>
                                                                    )}
                                                                </div>
                                                                <div className="nf-comment-text">{c.content}</div>
                                                            </div>
                                                        ))}
                                                        <div className="nf-comment-input-wrap">
                                                            <input
                                                                className="nf-comment-input"
                                                                placeholder={t('newsfeed.comment_placeholder')}
                                                                value={commentTexts[post.id] || ''}
                                                                onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                                onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                                                            />
                                                            <button
                                                                className="nf-comment-send"
                                                                onClick={() => handleAddComment(post.id)}
                                                                disabled={!(commentTexts[post.id] || '').trim()}
                                                            >
                                                                ➤
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── CONTACTS TAB ── */}
                        {tab === 'contacts' && (
                            <div className="nf-contacts-section">
                                <div className="nf-contacts-grid">
                                    {contacts.map(c => (
                                        <div key={c.id} className="nf-contact-card">
                                            <div className="nf-contact-icon-wrap">
                                                <BrandIcon type={c.type} size={40} />
                                            </div>
                                            <div className="nf-contact-info">
                                                <div className="nf-contact-type">{CONTACT_LABELS[c.type] || c.type}</div>
                                                <div className="nf-contact-name">{c.name}</div>
                                                {editingContact === c.id ? (
                                                    <div className="nf-contact-edit-row">
                                                        <input
                                                            className="form-input"
                                                            value={editUrl}
                                                            onChange={e => setEditUrl(e.target.value)}
                                                            placeholder={t('newsfeed.enter_link')}
                                                            autoFocus
                                                            style={{ fontSize: 12, padding: '4px 8px', marginTop: 4 }}
                                                        />
                                                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                                            <button className="btn btn-primary btn-sm" onClick={() => handleSaveUrl(c)}>{t('newsfeed.save')}</button>
                                                            <button className="btn btn-sm" onClick={() => setEditingContact(null)}>{t('newsfeed.cancel')}</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    c.url && <div className="nf-contact-url">{c.url}</div>
                                                )}
                                            </div>
                                            <div className="nf-contact-actions">
                                                {c.url ? (
                                                    <>
                                                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
                                                            {t('newsfeed.open')}
                                                        </a>
                                                        <button className="btn btn-sm" onClick={() => setQrModal(c)}>
                                                            {t('newsfeed.qr')}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('newsfeed.no_contacts')}</span>
                                                )}
                                                {isAdmin && editingContact !== c.id && (
                                                    <button className="btn btn-sm" onClick={() => handleStartEdit(c)}>{t('newsfeed.edit_link_btn')}</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* ── End page-body ── */}
                </div>
                {/* ── End left column ── */}

                {/* ── Right Panel ── */}
                <div className="nf-right-panel">
                    {/* Upcoming birthdays */}
                    <div className="nf-panel-card">
                        <p className="nf-panel-title">{t('newsfeed.upcoming_birthdays')}</p>
                        {upcomingBirthdays.length === 0 ? (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('newsfeed.no_birthdays_30')}</p>
                        ) : (
                            <div className="nf-event-list">
                                {upcomingBirthdays.map((b, i) => (
                                    <div key={i} className="nf-event-item">
                                        <div className="nf-event-dot" />
                                        <div>
                                            <div className="nf-event-name">{b.name}</div>
                                            <div className="nf-event-date">{b.days === 0 ? `${t('newsfeed.today_birthday')} 🎉` : `${b.days} ${t('newsfeed.days_left')}`}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="nf-panel-card">
                        <p className="nf-panel-title">⚡ {t('newsfeed.quick_access')}</p>
                        <div className="nf-quick-actions">
                            <button className="nf-quick-btn" onClick={() => onNavigate && onNavigate('tree')}>
                                <span className="nf-quick-btn-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>🌳</span>
                                {t('nav.tree')}
                            </button>
                            <button className="nf-quick-btn" onClick={() => onNavigate && onNavigate('chat')}>
                                <span className="nf-quick-btn-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>💬</span>
                                {t('nav.chat')}
                            </button>
                            <button className="nf-quick-btn" onClick={() => onNavigate && onNavigate('calendar')}>
                                <span className="nf-quick-btn-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>📅</span>
                                {t('nav.calendar')}
                            </button>
                        </div>
                    </div>
                </div>
                {/* ── End right panel ── */}
            </div>
            {/* ── End nf-body-grid ── */}

            {/* QR Code Modal */}
            {qrModal && (
                <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setQrModal(null)}>
                    <div className="modal" style={{ width: 340, textAlign: 'center' }}>
                        <div className="modal-header">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BrandIcon type={qrModal.type} size={24} />
                                {qrModal.name}
                            </h2>
                            <button className="detail-close" onClick={() => setQrModal(null)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                            <img src={generateQR(qrModal.url)} alt="QR Code"
                                style={{ width: 200, height: 200, borderRadius: 12, border: '1px solid var(--border-subtle)' }} />
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', wordBreak: 'break-all' }}>{qrModal.url}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('newsfeed.scan_qr')}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
