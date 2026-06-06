// NewsfeedPage.jsx — Bảng tin, Sự kiện & Liên hệ dòng họ (đã localize & tách nhỏ)
import { useState, useEffect, useRef } from 'react';
import { myError } from '../../shared/utils/logger';
import { api } from '../../shared/services/api';
import { ConfigAPI } from '../../config.js';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { offlineCache } from '../../shared/utils/offlineCache';
import { AuthHelper } from '../../shared/services/AuthHelper';

import PostCard from './components/PostCard';
import ContactsTab from './components/ContactsTab';
import SidebarPanel from './components/SidebarPanel';
import './Newsfeed.css';

// Biến toàn cục để cache lại bài đăng trong phiên làm việc
let cachedPosts = null;
let lastFetchTime = 0;

function getTodayLabel() {
    const d = new Date();
    return d.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function NewsfeedPage({ user, isAdmin, addToast, members = [], onNavigate }) {
    const { t } = useTranslation();
    const hasShownOfflineToastRef = useRef(false);
    const [posts, setPosts] = useState(cachedPosts || []);
    const [postSearchQuery, setPostSearchQuery] = useState('');
    const [hasNewPostsHint, setHasNewPostsHint] = useState(false);
    const [newPost, setNewPost] = useState('');
    const [tab, setTab] = useState(() => {
        const path = window.location.pathname;
        if (path === '/feed/contacts') {
            return 'contacts';
        }
        return 'posts';
    });
    const [loading, setLoading] = useState(false);

    // Sync URL with tab changes
    useEffect(() => {
        const currentPath = window.location.pathname;
        const targetPath = tab === 'contacts' ? '/feed/contacts' : '/feed/posts';
        if (currentPath !== targetPath) {
            window.history.pushState({}, '', targetPath);
        }
    }, [tab]);

    // Handle popstate for newsfeed tab transitions
    useEffect(() => {
        const handlePopState = () => {
            const path = window.location.pathname;
            if (path === '/feed/contacts') {
                setTab('contacts');
            } else if (path === '/feed/posts' || path === '/feed') {
                setTab('posts');
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const canEdit = user?.role === 'admin' || user?.role === 'editor';

    const filteredPosts = posts.filter(post => 
        (post.content || '').toLowerCase().includes(postSearchQuery.toLowerCase()) ||
        (post.author || '').toLowerCase().includes(postSearchQuery.toLowerCase())
    );

    // Stats derived from members prop
    const totalMembers = members.length;
    const generations = members.length > 0 ? Math.max(...members.map(m => m.generation || 1)) : 0;

    const currentUserId = (() => {
        try { return AuthHelper.getAuthData().id; }
        catch { return null; }
    })();

    // Fetch posts from API
    const fetchPosts = async (force = false) => {
        const refreshIntervalMs = ConfigAPI.getNumber('newsfeed_refresh_interval_ms', 5 * 60 * 1000);

        if (!force && cachedPosts && (Date.now() - lastFetchTime < refreshIntervalMs)) {
            return;
        }

        if (force || !cachedPosts) setLoading(true);
        try {
            const json = await api.getPosts();
            if (json.success) {
                hasShownOfflineToastRef.current = false;
                const newPosts = json.data || [];
                offlineCache.saveRecentPosts(newPosts).catch(err => myError('OFFLINE', 'Error caching posts:', err));

                if (!force && cachedPosts && cachedPosts.length > 0) {
                    if (newPosts.length > 0 && newPosts[0].id !== cachedPosts[0].id) {
                        setHasNewPostsHint(true);
                    } else {
                        lastFetchTime = Date.now();
                    }
                } else {
                    setPosts(newPosts);
                    cachedPosts = newPosts;
                    lastFetchTime = Date.now();
                    setHasNewPostsHint(false);
                }
            }
        } catch (e) {
            myError('NEWSFEED', 'Error fetching posts, loading offline cache:', e);
            if (!hasShownOfflineToastRef.current) {
                addToast(t('newsfeed.offline_alert'), 'warning');
                hasShownOfflineToastRef.current = true;
            }
            try {
                const cached = await offlineCache.getRecentPosts();
                if (cached && cached.length > 0) {
                    setPosts(cached);
                    cachedPosts = cached;
                }
            } catch (err) {
                myError('OFFLINE', 'Failed to retrieve cached posts:', err);
            }
        }
        setLoading(false);
    };

    useEffect(() => { fetchPosts(); }, []);

    const switchTab = (selectedTab) => {
        setTab(selectedTab);
        if (selectedTab === 'posts') fetchPosts();
    };

    const handleCreatePost = async () => {
        if (!newPost.trim()) return;
        try {
            const json = await api.createPost({ content: newPost.trim() });
            if (json.success) {
                setNewPost('');
                addToast(t('newsfeed.post_success'));
                TrackingHelper.trackCreatePost(false);
                fetchPosts(true);
            } else {
                addToast(json.error || t('newsfeed.post_fail'));
            }
        } catch (e) {
            addToast(t('login.error_connection'));
        }
    };

    const handleDeletePost = async (id) => {
        if (!confirm(t('newsfeed.delete_confirm'))) return;
        try {
            const json = await api.deletePost(id);
            if (json.success) { addToast(t('newsfeed.delete_success')); fetchPosts(true); }
        } catch (e) { addToast(t('newsfeed.delete_post_err')); }
    };

    return (
        <div className="page-container">
            {/* Dashboard Header */}
            <div className="nf-dashboard-header">
                <div className="nf-welcome-row">
                    <div>
                        <h2 className="nf-welcome-greeting">
                            {t('newsfeed.greeting')}, {user?.displayName || t('role.member')}! 👋
                        </h2>
                        <p className="nf-welcome-sub">{getTodayLabel()}</p>
                    </div>
                </div>

                {/* Stats Cards */}
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
                            <div className="nf-stat-value">
                                {members.filter(m => m.birthDate && !m.deathDate).length}
                            </div>
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

            {/* 2-Column Body (Feed + Right Panel) */}
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
                        {/* POSTS TAB */}
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

                                {posts.length > 0 && (
                                    <div style={{ marginBottom: 16 }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder={t('newsfeed.search_posts_placeholder')}
                                            value={postSearchQuery}
                                            onChange={e => setPostSearchQuery(e.target.value)}
                                            style={{
                                                width: '100%',
                                                borderRadius: 24,
                                                padding: '10px 18px',
                                                fontSize: 13,
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-subtle)',
                                                boxSizing: 'border-box'
                                            }}
                                        />
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
                                ) : filteredPosts.length === 0 ? (
                                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                                        {t('newsfeed.no_search_result')}
                                    </div>
                                ) : (
                                    <div className="nf-posts-list">
                                        {filteredPosts.map(post => (
                                            <PostCard
                                                key={post.id}
                                                post={post}
                                                user={user}
                                                isAdmin={isAdmin}
                                                currentUserId={currentUserId}
                                                addToast={addToast}
                                                setPosts={setPosts}
                                                onDeletePost={handleDeletePost}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}



                        {/* CONTACTS TAB */}
                        {tab === 'contacts' && (
                            <ContactsTab
                                isAdmin={isAdmin}
                                addToast={addToast}
                            />
                        )}
                    </div>
                </div>

                {/* Right Panel */}
                <SidebarPanel members={members} onNavigate={onNavigate} />
            </div>
        </div>
    );
}
