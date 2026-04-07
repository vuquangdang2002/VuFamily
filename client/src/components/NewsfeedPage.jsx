import { useState, useEffect } from 'react';
import { localApi } from '../services/api';

// Import brand icons
import iconZalo from '../assets/icons/icon_zalo.png';
import iconFacebook from '../assets/icons/icon_facebook.png';
import iconMessenger from '../assets/icons/icon_messenger.png';

// Simple QR Code generator using public API
function generateQR(text, size = 200) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}

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

    // ─── Reactions ───
    const EMOJIS = ['❤️', '👍', '😂', '😮', '😢'];
    const handleReaction = async (postId, emoji) => {
        try {
            const res = await fetch(`/api/posts/${postId}/reactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({ emoji })
            });
            const json = await res.json();
            if (json.success) fetchPosts();
        } catch (e) { console.error(e); }
    };

    // ─── Comments ───
    const [expandedComments, setExpandedComments] = useState({});
    const [commentTexts, setCommentTexts] = useState({});
    const [comments, setComments] = useState({});

    const toggleComments = async (postId) => {
        const isOpen = expandedComments[postId];
        setExpandedComments(prev => ({ ...prev, [postId]: !isOpen }));
        if (!isOpen && !comments[postId]) {
            // Fetch comments
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
        try {
            const res = await fetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({ content: text })
            });
            const json = await res.json();
            if (json.success) {
                setCommentTexts(prev => ({ ...prev, [postId]: '' }));
                // Refresh comments for this post
                const res2 = await fetch(`/api/posts/${postId}/comments`);
                const json2 = await res2.json();
                if (json2.success) setComments(prev => ({ ...prev, [postId]: json2.data || [] }));
                fetchPosts(); // refresh comment count
            }
        } catch (e) { addToast('Lỗi gửi bình luận'); }
    };

    const handleDeleteComment = async (commentId, postId) => {
        try {
            const res = await fetch(`/api/comments/${commentId}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': getToken() }
            });
            const json = await res.json();
            if (json.success) {
                setComments(prev => ({
                    ...prev,
                    [postId]: (prev[postId] || []).filter(c => c.id !== commentId)
                }));
                fetchPosts();
            }
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

                                        {/* ── Reactions Bar ── */}
                                        <div className="nf-reactions-bar">
                                            <div className="nf-reactions-emojis">
                                                {EMOJIS.map(emoji => {
                                                    const r = post.reactions?.[emoji];
                                                    const count = r?.count || 0;
                                                    const userReacted = r?.users?.includes(currentUserId);
                                                    return (
                                                        <button
                                                            key={emoji}
                                                            className={`nf-reaction-btn ${userReacted ? 'active' : ''}`}
                                                            onClick={() => handleReaction(post.id, emoji)}
                                                            title={`${count} người`}
                                                        >
                                                            <span>{emoji}</span>
                                                            {count > 0 && <span className="nf-reaction-count">{count}</span>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <button
                                                className="nf-comment-toggle"
                                                onClick={() => toggleComments(post.id)}
                                            >
                                                💬 {post.comment_count || 0} bình luận
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
