import { useState, useEffect } from 'react';
import { useTheme } from './shared/components/ThemeToggle';
import { localApi } from './shared/services/api';
import { I18nHelper } from './shared/services/i18n.js';
import { TrackingHelper } from './shared/services/TrackingHelper';
import { ConfigAPI } from './config.js';
import { useTranslation } from './shared/hooks/useTranslation';

// ── Custom Hooks ──
import useAuthSystem from './shared/hooks/useAuthSystem';
import useMemberSystem from './shared/hooks/useMemberSystem';

// ── Feature Pages ──
import LoginPage from './features/auth/LoginPage';
import TreeCanvas from './features/tree/TreeCanvas';
import DetailPanel from './features/tree/DetailPanel';
import MemberModal from './features/tree/MemberModal';
import NewsfeedPage from './features/newsfeed/NewsfeedPage';
import CalendarPage from './features/calendar/CalendarPage';
import SystemAdminPage from './features/system/SystemAdminPage';
import ProfileModal from './features/auth/ProfileModal';
import HistoryPage from './features/history/HistoryPanel';
import RequestsPage from './features/requests/RequestsPanel';
import ChatPage from './features/chat/ChatPage';
import VoiceCall from './features/chat/VoiceCall';
import IncomingCallModal from './features/chat/components/IncomingCallModal';
import GuidePage from './features/guide/GuidePage';
import FinancePage from './features/finance/FinancePage';
import HomePage from './features/home/HomePage';

// ── Shared Layout Components ──
import Sidebar from './shared/components/Sidebar';
import Header from './shared/components/Header';
import Toolbar from './shared/components/Toolbar';
import Toast from './shared/components/Toast';
import SplashLoading from './shared/components/SplashLoading';
import ForceChangePasswordModal from './features/auth/ForceChangePasswordModal';
import { syncCoordinator } from './shared/services/syncCoordinator';

// ── Routing Constants & Helper ──
const PAGE_TO_PATH = {
    home: '/',
    tree: '/tree',
    newsfeed: '/feed',
    calendar: '/calendar',
    requests: '/requests',
    system: '/system',
    history: '/history',
    chat: '/chat',
    finance: '/finance',
    guide: '/guide',
};

const PATH_TO_PAGE = {
    '/': 'home',
    '/index.html': 'home',
    '/home': 'home',
    '/tree': 'tree',
    '/feed': 'newsfeed',
    '/newsfeed': 'newsfeed',
    '/calendar': 'calendar',
    '/requests': 'requests',
    '/system': 'system',
    '/history': 'history',
    '/chat': 'chat',
    '/finance': 'finance',
    '/guide': 'guide',
};

export default function App() {
    const { theme, setTheme } = useTheme();
    const { t, lang, changeLanguage } = useTranslation();

    // ── Auth System Hook ──
    const {
        user,
        setUser,
        authChecked,
        loadingProgress,
        loadingStatus,
        forceChangePwd,
        setForceChangePwd,
        forceChangeError,
        verifyMsg,
        toasts,
        addToast,
        handleLogin,
        handleLogout,
        handleForceChangePassword,
        isAdmin,
        canEdit
    } = useAuthSystem();

    // ── Member & Tree System Hook ──
    const {
        members,
        isLoadingMembers,
        selected,
        detailOpen,
        searchResults,
        setSearchResults,
        modalOpen,
        editMember,
        modalParentId,
        modalSpouseOfId,
        refresh,
        handleSelect,
        closeDetail,
        handleSearch,
        openAddModal,
        openEditModal,
        openAddSpouseModal,
        closeModal,
        handleFormSubmit,
        handleDelete,
        handleExport,
        handleImport,
        handleReset
    } = useMemberSystem(user, addToast);

    // ── Routing & Call State ──
    const [activePage, setActivePage] = useState(() => {
        let path = window.location.pathname;
        if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        
        // Match exact or prefix
        if (path === '/' || path === '/index.html' || path === '/home') return 'home';
        if (path.startsWith('/tree')) return 'tree';
        if (path.startsWith('/feed') || path.startsWith('/newsfeed')) return 'newsfeed';
        if (path.startsWith('/calendar')) return 'calendar';
        if (path.startsWith('/requests')) return 'requests';
        if (path.startsWith('/system')) return 'system';
        if (path.startsWith('/history')) return 'history';
        if (path.startsWith('/chat')) return 'chat';
        if (path.startsWith('/finance')) return 'finance';
        if (path.startsWith('/guide')) return 'guide';
        
        return 'home';
    });
    const [activeCallRoom, setActiveCallRoom] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth <= 768);

    // Call Signaling Methods
    const handleStartCall = async (room) => {
        try {
            const token = localStorage.getItem('vuFamilyToken');
            const res = await fetch('/api/calls/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ roomId: room.id, requestVideo: room.requestVideo })
            });
            const json = await res.json();
            if (json.success) {
                setActiveCallRoom(json.data);
            } else {
                setActiveCallRoom({ id: room.id, display_name: room.display_name, requestVideo: room.requestVideo });
            }
        } catch (e) {
            setActiveCallRoom({ id: room.id, display_name: room.display_name, requestVideo: room.requestVideo });
        }
    };

    const handleAcceptCall = async () => {
        if (!incomingCall) return;
        try {
            const token = localStorage.getItem('vuFamilyToken');
            await fetch('/api/calls/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ callId: incomingCall.callId, action: 'accept' })
            });
            setActiveCallRoom(incomingCall);
        } catch (e) {
            setActiveCallRoom(incomingCall);
        } finally {
            setIncomingCall(null);
        }
    };

    const handleRejectCall = async () => {
        if (!incomingCall) return;
        try {
            const token = localStorage.getItem('vuFamilyToken');
            await fetch('/api/calls/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ callId: incomingCall.callId, action: 'reject' })
            });
        } catch (e) {
        } finally {
            setIncomingCall(null);
        }
    };    // Real-time Global Call Listener
    useEffect(() => {
        if (!user) return;
        const unsubscribe = syncCoordinator.subscribe('calls', (session) => {
            if (session) {
                if (session.callerId !== user.id && session.status === 'ringing') {
                    setIncomingCall(session);
                } else if (session.status === 'rejected' && activeCallRoom?.callId === session.callId) {
                    addToast(t('call.rejected') || 'Cuộc gọi bị từ chối', 'info');
                    setActiveCallRoom(null);
                    setIncomingCall(null);
                } else if (session.status === 'ended') {
                    if (activeCallRoom?.callId === session.callId) {
                        addToast(t('call.ended') || 'Cuộc gọi kết thúc', 'info');
                        setActiveCallRoom(null);
                    }
                    setIncomingCall(null);
                }
            } else {
                setIncomingCall(null);
            }
        });

        return unsubscribe;
    }, [user, activeCallRoom]);
    // Sync activePage and sub-resource selections from window.location.pathname on popstate (browser navigation)
    useEffect(() => {
        const handlePopState = () => {
            let path = window.location.pathname;
            if (path.length > 1 && path.endsWith('/')) {
                path = path.slice(0, -1);
            }
            
            let page = 'home';
            if (path === '/' || path === '/index.html' || path === '/home') page = 'home';
            else if (path.startsWith('/tree')) page = 'tree';
            else if (path.startsWith('/feed') || path.startsWith('/newsfeed')) page = 'newsfeed';
            else if (path.startsWith('/calendar')) page = 'calendar';
            else if (path.startsWith('/requests')) page = 'requests';
            else if (path.startsWith('/system')) page = 'system';
            else if (path.startsWith('/history')) page = 'history';
            else if (path.startsWith('/chat')) page = 'chat';
            else if (path.startsWith('/finance')) page = 'finance';
            else if (path.startsWith('/guide')) page = 'guide';
            
            setActivePage(page);

            // Handle tree subpath selection on popstate
            if (page === 'tree') {
                const pathParts = path.split('/');
                if (pathParts[1] === 'tree' && pathParts[2]) {
                    const memberId = pathParts[2];
                    const member = members.find(m => String(m.id) === memberId);
                    if (member) {
                        handleSelect(member);
                    }
                } else {
                    closeDetail();
                }
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [members, handleSelect, closeDetail]);

    // Sync window.location.pathname when activePage changes
    useEffect(() => {
        const currentPath = window.location.pathname;
        const targetPath = PAGE_TO_PATH[activePage] || '/';
        
        let isMatching = currentPath === targetPath;
        if (!isMatching) {
            if (targetPath === '/' && (currentPath === '/' || currentPath === '/home')) {
                isMatching = true;
            } else if (targetPath !== '/') {
                isMatching = currentPath.startsWith(targetPath + '/') || currentPath === targetPath;
            }
        }
        
        if (!isMatching) {
            const query = targetPath === '/chat' ? window.location.search : '';
            window.history.pushState({}, '', targetPath + query);
        }
    }, [activePage]);

    // Sync tree selection from URL on members load
    useEffect(() => {
        if (activePage === 'tree' && members.length > 0) {
            const pathParts = window.location.pathname.split('/');
            if (pathParts[1] === 'tree' && pathParts[2]) {
                const memberId = pathParts[2];
                if (String(selected?.id) !== memberId) {
                    const member = members.find(m => String(m.id) === memberId);
                    if (member) {
                        handleSelect(member);
                    }
                }
            }
        }
    }, [activePage, members, selected, handleSelect]);

    // Sync URL with tree selection changes
    useEffect(() => {
        if (activePage === 'tree') {
            const currentPath = window.location.pathname;
            if (selected) {
                const targetPath = `/tree/${selected.id}`;
                if (currentPath !== targetPath) {
                    window.history.pushState({}, '', targetPath);
                }
            } else {
                const targetPath = '/tree';
                if (currentPath.startsWith('/tree/') && currentPath !== targetPath) {
                    window.history.pushState({}, '', targetPath);
                }
            }
        }
    }, [activePage, selected]);

    // Track analytics app open
    useEffect(() => {
        TrackingHelper.trackAppOpen(
            window.navigator.userAgent.toLowerCase().includes('android') ? 'android' : 'web'
        );
    }, []);

    // Redirect to home if logged in but stuck on login/register page
    useEffect(() => {
        if (user && (activePage === 'login' || activePage === 'register')) {
            setActivePage('home');
        }
    }, [user, activePage]);

    // Responsive design resize handler
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) setSidebarCollapsed(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Global Ripple Effect
    useEffect(() => {
        const RIPPLE_TARGETS = 'button, .nf-tab, .sidebar-item, .action-menu-btn, .action-menu-item';
        const createRipple = (e) => {
            const target = e.target.closest(RIPPLE_TARGETS);
            if (!target || target.disabled) return;
            const circle = document.createElement('span');
            circle.className = 'ripple-circle';
            const rect = target.getBoundingClientRect();
            circle.style.left = `${e.clientX - rect.left}px`;
            circle.style.top = `${e.clientY - rect.top}px`;
            if (getComputedStyle(target).overflow === 'visible') target.style.overflow = 'hidden';
            if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
            target.appendChild(circle);
            circle.addEventListener('animationend', () => circle.remove(), { once: true });
        };
        document.addEventListener('click', createRipple);
        return () => document.removeEventListener('click', createRipple);
    }, []);

    const stats = { 
        totalMembers: members.length, 
        totalGenerations: Math.max(...members.map(m => m.generation || 0), 0) 
    };

    const pendingCount = isAdmin ? localApi.getPendingRequests().length : 0;
    const [profileModalOpen, setProfileModalOpen] = useState(false);

    const renderPage = () => {
        switch (activePage) {
            case 'home':
                return <HomePage user={user} members={members} onNavigate={setActivePage} addToast={addToast} />;
            case 'tree':
                return (
                    <div className="w-full h-full relative overflow-hidden bg-[#F2F2F7] dark:bg-black">
                        <Header 
                            stats={stats} 
                            onSearch={handleSearch} 
                            searchResults={searchResults} 
                            onSelectResult={handleSelect}
                            onAddRoot={canEdit ? () => openAddModal(null) : null}
                            onExport={canEdit ? handleExport : null}
                            onImport={canEdit ? handleImport : null}
                            onReset={isAdmin ? handleReset : null}
                            isAdmin={isAdmin} 
                            canEdit={canEdit} 
                        />
                        <Toolbar theme={theme} setTheme={setTheme} />

                        {isLoadingMembers && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-md">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 shadow-lg"></div>
                                <span className="text-zinc-800 dark:text-zinc-200 font-medium text-lg drop-shadow-md">{t('app.loading_tree') || 'Đang tải gia phả...'}</span>
                            </div>
                        )}

                        <div className="w-full h-full absolute inset-0 z-0 bg-black">
                            <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#fe6e00]/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
                            <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
                            <TreeCanvas 
                                members={members} 
                                selectedId={selected?.id}
                                searchResultIds={searchResults.map(r => r.id)}
                                onSelectMember={handleSelect} 
                                onDeselect={closeDetail} 
                            />
                        </div>
                        <DetailPanel 
                            member={selected} 
                            members={members} 
                            isOpen={detailOpen} 
                            onClose={closeDetail}
                            onEdit={canEdit ? openEditModal : null} 
                            onDelete={canEdit ? handleDelete : null}
                            onAddChild={canEdit ? openAddModal : null} 
                            onAddSpouse={canEdit ? openAddSpouseModal : null}
                            onRefresh={refresh} 
                            isAdmin={isAdmin} 
                            canEdit={canEdit} 
                            onSelfEdit={openEditModal} 
                        />
                    </div>
                );
            case 'newsfeed':
                return <NewsfeedPage user={user} isAdmin={isAdmin} addToast={addToast} members={members} onNavigate={setActivePage} />;
            case 'calendar':
                return <CalendarPage members={members} user={user} addToast={addToast} />;
            case 'history':
                return <HistoryPage isAdmin={isAdmin} user={user} onRefresh={refresh} addToast={addToast} members={members} />;
            case 'chat':
                return <ChatPage user={user} addToast={addToast} onStartCall={setActiveCallRoom} />;
            case 'finance':
                return <FinancePage user={user} addToast={addToast} />;
            case 'requests':
                return <RequestsPage user={user} members={members} onRefresh={refresh} addToast={addToast} />;
            case 'system':
                return <SystemAdminPage addToast={addToast} />;
            case 'guide':
                return <GuidePage user={user} onNavigate={setActivePage} />;
            default:
                return null;
        }
    };

    if (!authChecked) {
        return <SplashLoading loadingProgress={loadingProgress} loadingStatus={loadingStatus} />;
    }

    if (!user) {
        if (activePage === 'home') {
            return (
                <>
                    <HomePage 
                        user={null} 
                        members={members} 
                        onNavigate={(page) => {
                            if (page === 'login' || page === 'register') {
                                setActivePage(page);
                            } else {
                                setActivePage('login');
                            }
                        }} 
                        addToast={addToast} 
                    />
                    <Toast toasts={toasts} />
                </>
            );
        }
        return (
            <>
                <LoginPage 
                    onLogin={async (u, p, a) => {
                        await handleLogin(u, p, a);
                        if (activePage === 'login' || activePage === 'register') {
                            setActivePage('home');
                        }
                    }} 
                    verifyMsg={verifyMsg} 
                    initialRegisterMode={activePage === 'register'}
                    onGoBack={() => setActivePage('home')}
                />
                <Toast toasts={toasts} />
            </>
        );
    }

    return (
        <div className="flex h-[100dvh] w-screen bg-zinc-50 dark:bg-black overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
            <Sidebar
                activePage={activePage}
                onNavigate={setActivePage}
                isAdmin={isAdmin}
                user={user}
                onLogout={handleLogout}
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                pendingCount={pendingCount}
                onOpenProfile={() => setProfileModalOpen(true)}
                theme={theme}
                setTheme={setTheme}
            />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-zinc-50 dark:bg-[#050505]">
                {/* Background Glassmorphic Glows */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
                    <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-amber-500/10 dark:bg-[#fe6e00]/10 blur-[100px] animate-pulse" style={{ animationDuration: '8s' }}></div>
                    <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-orange-500/10 dark:bg-amber-500/5 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }}></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-yellow-500/5 dark:bg-[#fe6e00]/5 blur-[90px] animate-pulse" style={{ animationDuration: '15s' }}></div>
                </div>

                <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
                    {renderPage()}
                </div>
            </main>

            {/* Modals */}
            <MemberModal 
                isOpen={modalOpen} 
                onClose={closeModal} 
                onSubmit={handleFormSubmit}
                editMember={editMember} 
                parentId={modalParentId} 
                spouseOfId={modalSpouseOfId} 
                members={members} 
            />

            <ProfileModal 
                isOpen={profileModalOpen} 
                onClose={() => setProfileModalOpen(false)} 
                user={user} 
                onAddToast={addToast}
                theme={theme} 
                setTheme={setTheme}
                onUpdateUser={(newUserData) => {
                    const authData = { ...user, ...newUserData };
                    localStorage.setItem('vuFamilyAuth', JSON.stringify(authData));
                    setUser(authData);
                }} 
            />

            <ForceChangePasswordModal
                isOpen={forceChangePwd}
                error={forceChangeError}
                onSubmit={handleForceChangePassword}
            />

            <Toast toasts={toasts} />

            <IncomingCallModal 
                incomingCall={incomingCall} 
                onAccept={handleAcceptCall} 
                onReject={handleRejectCall} 
            />

            <VoiceCall 
                user={user} 
                activeCallRoom={activeCallRoom} 
                onClearActiveCallRoom={() => {
                    if (activeCallRoom?.callId) {
                        fetch('/api/calls/end', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('vuFamilyToken') },
                            body: JSON.stringify({ callId: activeCallRoom.callId })
                        }).catch(() => {});
                    }
                    setActiveCallRoom(null);
                }} 
                addToast={addToast} 
            />
        </div>
    );
}
