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
import TopBar from '../../shared/components/TopBar';

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
        <div className="flex flex-col h-full w-full relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
            {/* Top Bar with Search */}
            <TopBar user={user} onSearch={setPostSearchQuery} />

            {/* Main Grid */}
            <div className="flex flex-1 gap-6 min-h-0 overflow-y-auto pr-2 pb-6">
                
                {/* Left Area: Newsfeed Content (70%) */}
                <div className="flex-1 flex flex-col gap-6 max-w-[70%]">
                    {/* Header Card */}
                    <div className="rounded-3xl p-6 shadow-sm flex flex-col items-start justify-center" style={{ background: 'var(--bg-card)' }}>
                        <div className="flex items-center gap-2 text-blue-600 font-medium mb-1">
                            <span className="text-xl">📄</span> NEWSFEED
                        </div>
                        <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Newsfeed</h2>
                        <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Thông báo và chia sẻ nội bộ dòng họ Vũ</p>
                    </div>

                    {/* Create Post Card */}
                    {canEdit && (
                        <div className="rounded-3xl p-6 shadow-sm flex flex-col gap-4" style={{ background: 'var(--bg-card)' }}>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{user?.role === 'admin' ? '👑' : '👤'}</span>
                                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{user?.displayName}</span>
                            </div>
                            <textarea
                                className="w-full rounded-2xl p-4 outline-none resize-none"
                                style={{ background: 'var(--input-bg)', color: 'var(--input-color)', border: '1px solid var(--border-subtle)' }}
                                placeholder={t('newsfeed.write_post')}
                                value={newPost}
                                onChange={e => setNewPost(e.target.value)}
                                rows={3}
                            />
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">{newPost.length}/500</span>
                                <button 
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition-colors disabled:opacity-50"
                                    onClick={handleCreatePost} 
                                    disabled={!newPost.trim()}
                                >
                                    📤 {t('newsfeed.post_btn')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Posts Section */}
                    {loading && posts.length === 0 ? (
                        <div className="flex items-center justify-center p-10">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
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

                {/* Right Area: News Categories (30%) */}
                <div className="w-[30%] flex-shrink-0">
                    <div className="rounded-3xl p-4 shadow-sm flex flex-col gap-2" style={{ background: 'var(--bg-card)' }}>
                        <h3 className="text-xs font-bold uppercase tracking-wider ml-4 mb-2" style={{ color: 'var(--text-muted)' }}>NEWS</h3>
                        
                        <button onClick={() => switchTab('posts')} className="flex items-center gap-3 w-full text-left p-4 rounded-2xl transition-colors font-medium" style={tab === 'posts' ? { background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 'bold' } : { color: 'var(--text-secondary)' }}>
                            <span className="text-xl">📄</span> Newsfeed
                        </button>
                        
                        <button onClick={() => switchTab('contacts')} className="flex items-center gap-3 w-full text-left p-4 rounded-2xl transition-colors font-medium" style={tab === 'contacts' ? { background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 'bold' } : { color: 'var(--text-secondary)' }}>
                            <span className="text-xl">📱</span> Danh bạ & Liên hệ
                        </button>

                        <button className="flex items-center gap-3 w-full text-left p-4 rounded-2xl transition-colors font-medium" style={{ color: 'var(--text-secondary)' }}>
                            <span className="text-xl">🏆</span> Cuộc thi nội bộ
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
