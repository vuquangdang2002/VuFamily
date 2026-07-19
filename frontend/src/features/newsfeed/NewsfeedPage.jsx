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
import { GlassCard } from '../../shared/components/ui/GlassCard';
import { GlowingButton } from '../../shared/components/ui/GlowingButton';

let cachedPosts = null;
let lastFetchTime = 0;
const refreshIntervalMs = 5 * 60 * 1000;

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
        <div className="flex flex-col h-full w-full relative overflow-hidden bg-[#0d1117] text-[#c9d1d9]">
            {/* ── Background Elements ── */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
                <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-amber-500/10 dark:bg-amber-500/20 rounded-full blur-[120px] mix-blend-screen dark:mix-blend-lighten"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-[100px] mix-blend-screen dark:mix-blend-lighten"></div>
            </div>

            {/* Top Bar with Search */}
            <TopBar user={user} onSearch={setPostSearchQuery} />

            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row flex-1 gap-8 lg:gap-10 min-h-0 overflow-y-auto p-4 md:p-8 custom-scrollbar z-10 w-full">
                
                {/* Left Area: Content */}
                <div className="flex-1 flex flex-col gap-6 min-w-0">
                    
                    {tab === 'posts' && (
                        <>
                            {/* Header Card */}
                            <div className="bg-[#161b22] border border-[#30363d] rounded-[1.5rem] shadow-sm p-6 md:p-8 flex flex-col items-start justify-center overflow-hidden relative shrink-0">
                                <div className="relative z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-[#fe6e00]/10 text-[#fe6e00] font-bold text-xs uppercase tracking-wider mb-3 border border-[#fe6e00]/20">
                                    <span className="text-sm">📄</span> {t('newsfeed.title') || 'Bản tin dòng họ'}
                                </div>
                                <h2 className="relative z-10 text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-2">{t('newsfeed.header_title') || 'Newsfeed'}</h2>
                                <p className="relative z-10 text-[#8b949e] text-sm md:text-base font-medium">
                                    {t('newsfeed.header_desc') || 'Thông báo, cập nhật và chia sẻ nội bộ của dòng họ Vũ.'}
                                </p>
                            </div>

                            {/* Create Post Card */}
                            {canEdit && (
                                <div className="bg-[#161b22] border border-[#30363d] rounded-[1.5rem] shadow-sm p-5 md:p-6 flex flex-col gap-4 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#fe6e00]/20 to-amber-500/20 flex items-center justify-center text-[#fe6e00] border border-[#fe6e00]/30 shadow-sm">
                                            <span className="text-lg">{user?.role === 'admin' ? '👑' : '👤'}</span>
                                        </div>
                                        <span className="font-bold text-[15px] text-white">{user?.displayName}</span>
                                    </div>
                                    <textarea
                                        className="w-full rounded-xl p-4 outline-none resize-none bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] placeholder:text-[#8b949e] focus:border-[#fe6e00]/50 transition-all custom-scrollbar"
                                        placeholder={t('newsfeed.write_post') || 'Bạn muốn thông báo điều gì?'}
                                        value={newPost}
                                        onChange={e => setNewPost(e.target.value)}
                                        rows={3}
                                    />
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                                            {newPost.length} / 500
                                        </span>
                                        <GlowingButton 
                                            variant="primary"
                                            onClick={handleCreatePost} 
                                            disabled={!newPost.trim()}
                                            icon={<span className="text-base mr-1">📤</span>}
                                        >
                                            {t('newsfeed.post_btn') || 'Đăng bài'}
                                        </GlowingButton>
                                    </div>
                                </div>
                            )}

                            {/* Posts Section */}
                            {loading && posts.length === 0 ? (
                                <div className="flex items-center justify-center p-12">
                                    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-5 shrink-0">
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
                                    {filteredPosts.length === 0 && (
                                        <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-sm flex flex-col items-center justify-center p-12 text-center">
                                            <div className="w-16 h-16 bg-[#0d1117] rounded-full flex items-center justify-center mb-4 border border-[#30363d]">
                                                <span className="text-3xl opacity-50">📰</span>
                                            </div>
                                            <p className="font-medium text-[#8b949e]">{t('newsfeed.no_posts') || 'Chưa có bài đăng nào.'}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {tab === 'contacts' && (
                        <div className="h-full">
                            <ContactsTab members={members} />
                        </div>
                    )}
                </div>

                {/* Right Area: Navigation */}
                <div className="w-full lg:w-[320px] shrink-0">
                    <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-sm p-6 flex flex-col gap-2 sticky top-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8b949e] ml-4 mb-2">{t('newsfeed.categories') || 'Chuyên mục'}</h3>
                        
                        <button 
                            onClick={() => switchTab('posts')} 
                            className={`flex items-center gap-3 w-full text-left p-4 rounded-xl transition-all font-semibold text-[15px] ${tab === 'posts' ? 'bg-[#fe6e00]/10 text-[#fe6e00] shadow-sm border border-[#fe6e00]/20' : 'text-[#8b949e] hover:bg-[#0d1117]'}`}
                        >
                            <span className="text-xl">📄</span> {t('newsfeed.header_title') || 'Newsfeed'}
                        </button>
                        
                        <button 
                            onClick={() => switchTab('contacts')} 
                            className={`flex items-center gap-3 w-full text-left p-4 rounded-xl transition-all font-semibold text-[15px] ${tab === 'contacts' ? 'bg-[#fe6e00]/10 text-[#fe6e00] shadow-sm border border-[#fe6e00]/20' : 'text-[#8b949e] hover:bg-[#0d1117]'}`}
                        >
                            <span className="text-xl">📱</span> {t('newsfeed.contacts_tab') || 'Danh bạ & Liên hệ'}
                        </button>

                        <button className="flex items-center gap-3 w-full text-left p-4 rounded-xl transition-all font-semibold text-[15px] text-[#8b949e] opacity-60 cursor-not-allowed">
                            <span className="text-xl grayscale">🏆</span> {t('newsfeed.contest_tab') || 'Cuộc thi (Sắp ra mắt)'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
