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
import MobileNavigation from './shared/components/MobileNavigation';
import MobileBottomSheet from './shared/components/MobileBottomSheet';

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
        return PATH_TO_PAGE[path] || 'tree';
    });
    const [activeCallRoom, setActiveCallRoom] = useState(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth <= 768);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // Sync activePage state with window.location.pathname on popstate (browser navigation)
    useEffect(() => {
        const handlePopState = () => {
            let path = window.location.pathname;
            if (path.length > 1 && path.endsWith('/')) {
                path = path.slice(0, -1);
            }
            const page = PATH_TO_PAGE[path] || 'tree';
            setActivePage(page);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Sync window.location.pathname when activePage changes
    useEffect(() => {
        const currentPath = window.location.pathname;
        const targetPath = PAGE_TO_PATH[activePage] || '/';
        if (currentPath !== targetPath) {
            const query = targetPath === '/chat' ? window.location.search : '';
            window.history.pushState({}, '', targetPath + query);
        }
    }, [activePage]);

    // Track analytics app open
    useEffect(() => {
        TrackingHelper.trackAppOpen(
            window.navigator.userAgent.toLowerCase().includes('android') ? 'android' : 'web'
        );
    }, []);

    // Responsive design resize handler
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (mobile) setSidebarCollapsed(true);
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
                    <div className="tree-page relative">
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
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm rounded-xl m-4">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 shadow-lg"></div>
                                <span className="text-white font-medium text-lg drop-shadow-md">{t('app.loading_tree')}</span>
                            </div>
                        )}

                        <TreeCanvas 
                            members={members} 
                            selectedId={selected?.id}
                            searchResultIds={searchResults.map(r => r.id)}
                            onSelectMember={handleSelect} 
                            onDeselect={closeDetail} 
                        />
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
        return (
            <>
                <LoginPage onLogin={handleLogin} verifyMsg={verifyMsg} />
                <Toast toasts={toasts} />
            </>
        );
    }

    return (
        <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobile ? 'is-mobile' : ''}`}>
            {!isMobile && (
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
            )}
            <main className="main-content">
                {renderPage()}
            </main>

            {/* Mobile Navigation */}
            {isMobile && (
                <MobileNavigation
                    activePage={activePage}
                    setActivePage={setActivePage}
                    showMobileMenu={showMobileMenu}
                    setShowMobileMenu={setShowMobileMenu}
                    pendingCount={pendingCount}
                />
            )}

            {/* Mobile Bottom Sheet Menu */}
            {isMobile && (
                <MobileBottomSheet
                    showMobileMenu={showMobileMenu}
                    setShowMobileMenu={setShowMobileMenu}
                    setActivePage={setActivePage}
                    setProfileModalOpen={setProfileModalOpen}
                    user={user}
                    isAdmin={isAdmin}
                    pendingCount={pendingCount}
                    theme={theme}
                    setTheme={setTheme}
                    handleLogout={handleLogout}
                />
            )}

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
            <VoiceCall 
                user={user} 
                activeCallRoom={activeCallRoom} 
                onClearActiveCallRoom={() => setActiveCallRoom(null)} 
                addToast={addToast} 
            />
        </div>
    );
}
