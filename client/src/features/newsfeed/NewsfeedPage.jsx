import { useState, useEffect } from 'react';
import { localApi } from '../../shared/services/api';

// Import brand icons
import iconZalo from '../../assets/icons/icon_zalo.png';
import iconFacebook from '../../assets/icons/icon_facebook.png';
import iconMessenger from '../../assets/icons/icon_messenger.png';

// Simple QR Code generator using public API
function generateQR(text, size = 200) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}

const FB_LIKE_STYLE = `
.nf-reaction-container {
    position: relative;
    display: inline-flex;
    align-items: center;
    flex: 1;
    justify-content: center;
}
.nf-reaction-picker {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 8px;
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 50px;
    padding: 6px 10px;
    display: flex;
    gap: 8px;
    box-shadow: var(--shadow-lg);
    opacity: 0;
    visibility: hidden;
    transform: translateY(10px) scale(0.9);
    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    z-index: 100;
}
.nf-reaction-container:hover .nf-reaction-picker,
.nf-reaction-picker:hover {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
    transition-delay: 0.3s; 
}
.nf-reaction-picker-btn {
    background: transparent;
    border: none;
    font-size: 28px;
    cursor: pointer;
    transition: transform 0.15s ease-out;
    padding: 0 4px;
    line-height: 1;
    position: relative;
    transform-origin: bottom center;
}
.nf-reaction-picker-btn:hover {
    transform: scale(1.3) translateY(-4px);
    z-index: 2;
}
.nf-reaction-picker-btn::after {
    content: attr(data-label);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-4px);
    background: rgba(0, 0, 0, 0.75);
    color: white;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 12px;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s 0.1s;
    pointer-events: none;
}
html.dark .nf-reaction-picker-btn::after {
    background: rgba(255, 255, 255, 0.9);
    color: black;
}
.nf-reaction-picker-btn:hover::after {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
}
.nf-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    transition: background 0.15s;
}
.nf-action-btn:hover {
    background: var(--border-subtle);
}
.nf-action-btn.reacted-❤️ { color: #e0245e; }
.nf-action-btn.reacted-👍 { color: #2563eb; }
.nf-action-btn.reacted-😂 { color: #f59e0b; }
.nf-action-btn.reacted-😮 { color: #f59e0b; }
.nf-action-btn.reacted-😢 { color: #f59e0b; }
.nf-action-btn.reacted-😡 { color: #dc2626; }

.nf-reaction-summary {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: var(--text-muted);
    margin: 8px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-subtle);
}
.nf-summary-icon {
    font-size: 18px;
    margin-right: -6px;
    position: relative;
    border: 2px solid var(--bg-card);
    border-radius: 50%;
    display: inline-flex;
    background: var(--bg-card);
    line-height: 1;
}
.nf-summary-icon:nth-child(1) { z-index: 3; }
.nf-summary-icon:nth-child(2) { z-index: 2; }
.nf-summary-icon:nth-child(3) { z-index: 1; }
.nf-actions-bar {
    display: flex;
    gap: 4px;
    padding: 0;
}
`;

function timeAgo(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return d.toLocaleDateString('vi-VN');
}

// Brand icons map
const BRAND_ICONS = { zalo: iconZalo, facebook: iconFacebook, messenger: iconMessenger };
const CONTACT_LABELS = { zalo: 'Zalo', facebook: 'Facebook', messenger: 'Messenger' };

const BrandIcon = ({ type, size = 36 }) => (
    <img src={BRAND_ICONS[type]} alt={type} width={size} height={size} style={{ borderRadius: 8 }} />
);

// Helper: get auth token
function getToken() {
    try {
        const session = JSON.parse(localStorage.getItem('vuFamilyAuth') || '{}');
        return session.token || '';
    } catch { return ''; }
}

export default function NewsfeedPage({ user, isAdmin, addToast }) {
    const [posts, setPosts] = useState([]);
    const [contacts, setContacts] = useState(() => localApi.getContacts());
    const [newPost, setNewPost] = useState('');
    const [editingContact, setEditingContact] = useState(null);
    const [editUrl, setEditUrl] = useState('');
    const [qrModal, setQrModal] = useState(null);
    const [tab, setTab] = useState('posts');
    const [loading, setLoading] = useState(false);

    // Fetch posts from API
    const fetchPosts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/posts');
            const json = await res.json();
            if (json.success) setPosts(json.data || []);
        } catch (e) { console.error('Error fetching posts:', e); }
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
            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({ content: newPost.trim() })
            });
            const json = await res.json();
            if (json.success) {
                setNewPost('');
                addToast('Đã đăng bài thành công!');
                fetchPosts();
            } else {
                addToast(json.error || 'Lỗi đăng bài');
            }
        } catch (e) { addToast('Lỗi kết nối server'); }
    };

    const handleDeletePost = async (id) => {
        if (!confirm('Xóa bài đăng này?')) return;
        try {
            const res = await fetch(`/api/posts/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': getToken() }
            });
            const json = await res.json();
            if (json.success) {
                addToast('Đã xóa bài đăng.');
                fetchPosts();
            }
        } catch (e) { addToast('Lỗi xóa bài'); }
    };

    // ─── Reactions (optimistic) ───
    const EMOJIS = ['❤️', '👍', '😂', '😮', '😢'];
    const handleReaction = async (postId, emoji) => {
        // Optimistic update
        setPosts(prev => prev.map(post => {
            if (post.id !== postId) return post;
            const reactions = { ...post.reactions };
            
            // Allow only 1 reaction per user: check if user already reacted
            let userPreviousReaction = null;
            for (const em of Object.keys(reactions)) {
                if (reactions[em]?.users?.includes(currentUserId)) {
                    userPreviousReaction = em;
                    break;
                }
            }

            if (userPreviousReaction === emoji) {
                // Toggle off
                const r = { ...reactions[emoji] };
                r.users = r.users.filter(u => u !== currentUserId);
                r.count = Math.max(0, r.count - 1);
                reactions[emoji] = r;
            } else {
                // Remove previous reaction if any
                if (userPreviousReaction) {
                    const pr = { ...reactions[userPreviousReaction] };
                    pr.users = pr.users.filter(u => u !== currentUserId);
                    pr.count = Math.max(0, pr.count - 1);
                    reactions[userPreviousReaction] = pr;
                }
                // Add new reaction
                const nr = reactions[emoji] ? { ...reactions[emoji] } : { count: 0, users: [] };
                nr.users = [...nr.users, currentUserId];
                nr.count++;
                reactions[emoji] = nr;
            }
            return { ...post, reactions };
        }));

        // Sync with server (fire-and-forget)
        try {
            await fetch(`/api/posts/${postId}/reactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({ emoji })
            });
        } catch (e) { console.error(e); }
    };

    // ─── Comments (optimistic) ───
    const [expandedComments, setExpandedComments] = useState({});
    const [commentTexts, setCommentTexts] = useState({});
    const [comments, setComments] = useState({});

    const toggleComments = async (postId) => {
        const isOpen = expandedComments[postId];
        setExpandedComments(prev => ({ ...prev, [postId]: !isOpen }));
        if (!isOpen && !comments[postId]) {
            try {
                const res = await fetch(`/api/posts/${postId}/comments`);
                const json = await res.json();
                if (json.success) setComments(prev => ({ ...prev, [postId]: json.data || [] }));
            } catch (e) { console.error(e); }
        }
    };

    const handleAddComment = async (postId) => {
        const text = (commentTexts[postId] || '').trim();
        if (!text) return;

        // Optimistic: add comment immediately
        const tempComment = {
            id: `temp-${Date.now()}`,
            content: text,
            author: user?.displayName || 'Bạn',
            author_role: user?.role || 'viewer',
            created_at: new Date().toISOString()
        };
        setComments(prev => ({
            ...prev,
            [postId]: [...(prev[postId] || []), tempComment]
        }));
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p
        ));
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));

        // Sync with server
        try {
            const res = await fetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({ content: text })
            });
            const json = await res.json();
            if (json.success && json.data) {
                // Replace temp comment with real one
                setComments(prev => ({
                    ...prev,
                    [postId]: (prev[postId] || []).map(c =>
                        c.id === tempComment.id ? json.data : c
                    )
                }));
            }
        } catch (e) { addToast('Lỗi gửi bình luận'); }
    };

    const handleDeleteComment = async (commentId, postId) => {
        // Optimistic remove
        setComments(prev => ({
            ...prev,
            [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
        }));
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, comment_count: Math.max(0, (p.comment_count || 1) - 1) } : p
        ));

        try {
            await fetch(`/api/comments/${commentId}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': getToken() }
            });
        } catch (e) { addToast('Lỗi xóa bình luận'); }
    };

    // Helper: get current user ID
    const currentUserId = (() => {
        try { return JSON.parse(localStorage.getItem('vuFamilyAuth') || '{}').id; }
        catch { return null; }
    })();

    const handleStartEdit = (c) => {
        setEditingContact(c.id);
        setEditUrl(c.url || '');
    };

    const handleSaveUrl = (c) => {
        localApi.updateContact(c.id, { ...c, url: editUrl });
        setContacts(localApi.getContacts());
        setEditingContact(null);
        addToast('Đã cập nhật link!');
    };

    return (
        <div className="page-container">
            <style>{FB_LIKE_STYLE}</style>
            <div className="page-header">
                <h2>📰 Bảng tin dòng họ</h2>
                <p className="page-subtitle">Thông tin, liên hệ và hoạt động của dòng họ</p>
            </div>

            {/* Tab Navigation */}
            <div className="nf-tabs">
                <button className={`nf-tab ${tab === 'posts' ? 'active' : ''}`} onClick={() => switchTab('posts')}>
                    📝 Bài đăng
                </button>
                <button className={`nf-tab ${tab === 'contacts' ? 'active' : ''}`} onClick={() => switchTab('contacts')}>
                    📱 Liên hệ
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
                                placeholder="Chia sẻ thông tin với dòng họ..."
                                value={newPost}
                                onChange={e => setNewPost(e.target.value)}
                                rows={3}
                            />
                            <div className="nf-create-footer">
                                <span className="nf-char-count">{newPost.length}/500</span>
                                <button className="btn btn-primary" onClick={handleCreatePost} disabled={!newPost.trim()}>
                                    📤 Đăng bài
                                </button>
                            </div>
                        </div>

                        {posts.length === 0 ? (
                            <div className="empty-state">
                                <span style={{ fontSize: 48 }}>📭</span>
                                <h3>Chưa có bài đăng nào</h3>
                                <p>Hãy là người đầu tiên chia sẻ thông tin!</p>
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
                                                <button className="nf-post-delete" onClick={() => handleDeletePost(post.id)} title="Xóa bài đăng">
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
                                                    {post.comment_count || 0} bình luận
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
                                                            data-label={emoji === '👍' ? 'Thích' : emoji === '❤️' ? 'Yêu thích' : emoji === '😂' ? 'Haha' : emoji === '😮' ? 'Hahaha' : 'Buồn'} 
                                                            onClick={() => handleReaction(post.id, emoji)}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                                {(() => {
                                                    const userReaction = EMOJIS.find(e => post.reactions?.[e]?.users?.includes(currentUserId));
                                                    const LABEL_MAP = { '👍': 'Thích', '❤️': 'Yêu thích', '😂': 'Haha', '😮': 'Wow', '😢': 'Buồn' };
                                                    return (
                                                        <button 
                                                            className={`nf-action-btn ${userReaction ? 'reacted-' + userReaction : ''}`}
                                                            onClick={() => handleReaction(post.id, userReaction ? userReaction : '👍')}
                                                        >
                                                            <span style={{ fontSize: 18 }}>{userReaction ? userReaction : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>}</span>
                                                            <span>{userReaction ? LABEL_MAP[userReaction] : 'Thích'}</span>
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                            <button className="nf-action-btn" onClick={() => toggleComments(post.id)}>
                                                <span style={{ fontSize: 18 }}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></span>
                                                <span>Bình luận</span>
                                            </button>
                                            <button className="nf-action-btn" onClick={() => addToast('Tính năng chia sẻ sắp ra mắt')}>
                                                <span style={{ fontSize: 18 }}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg></span>
                                                <span>Chia sẻ</span>
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
                                                                <button className="nf-comment-del" onClick={() => handleDeleteComment(c.id, post.id)} title="Xóa">✕</button>
                                                            )}
                                                        </div>
                                                        <div className="nf-comment-text">{c.content}</div>
                                                    </div>
                                                ))}
                                                <div className="nf-comment-input-wrap">
                                                    <input
                                                        className="nf-comment-input"
                                                        placeholder="Viết bình luận..."
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
                                                    placeholder="Nhập link..."
                                                    autoFocus
                                                    style={{ fontSize: 12, padding: '4px 8px', marginTop: 4 }}
                                                />
                                                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                                    <button className="btn btn-primary btn-sm" onClick={() => handleSaveUrl(c)}>Lưu</button>
                                                    <button className="btn btn-sm" onClick={() => setEditingContact(null)}>Hủy</button>
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
                                                    🔗 Mở
                                                </a>
                                                <button className="btn btn-sm" onClick={() => setQrModal(c)}>
                                                    📱 QR
                                                </button>
                                            </>
                                        ) : (
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Chưa có link</span>
                                        )}
                                        {isAdmin && editingContact !== c.id && (
                                            <button className="btn btn-sm" onClick={() => handleStartEdit(c)}>✏️ Sửa link</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

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
                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Quét mã QR để mở liên kết</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
