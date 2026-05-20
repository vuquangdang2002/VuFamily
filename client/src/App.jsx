import { useState, useCallback, useEffect } from 'react';
import { myLog, myError } from './shared/utils/logger';
// ── Features ──
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
// ── Shared ──
import Sidebar from './shared/components/Sidebar';
import Header from './shared/components/Header';
import Toolbar from './shared/components/Toolbar';
import Toast from './shared/components/Toast';
import { useTheme } from './shared/components/ThemeToggle';
import SplashLoading from './shared/components/SplashLoading';
import ForceChangePasswordModal from './features/auth/ForceChangePasswordModal';
import { api, localApi, getApiBase } from './shared/services/api';
import { clearAllCache as clearChatCache } from './shared/services/chatCache';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SplashScreen } from '@capacitor/splash-screen';
import { TrackingHelper } from './shared/services/TrackingHelper';
import { syncRemoteConfig } from './firebase.js';
import { I18nHelper } from './shared/services/i18n.js';
const AUTH_KEY = 'vuFamilyAuth';

function getStoredAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
}

export default function App() {
    const [user, setUser] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState(I18nHelper.t('splash.initializing'));
    const [members, setMembers] = useState([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(true);
    const [selected, setSelected] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const { theme, setTheme } = useTheme();
    const [activeCallRoom, setActiveCallRoom] = useState(null);
    const [verifyMsg, setVerifyMsg] = useState(null); // { success, text }

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editMember, setEditMember] = useState(null);
    const [modalParentId, setModalParentId] = useState(null);
    const [modalSpouseOfId, setModalSpouseOfId] = useState(null);
    const [profileModalOpen, setProfileModalOpen] = useState(false);

    // Sidebar + page routing
    const [activePage, setActivePage] = useState('tree');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth <= 768);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (mobile) setSidebarCollapsed(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Forced password change after auto-login
    const [forceChangePwd, setForceChangePwd] = useState(false);
    const [tempPwd, setTempPwd] = useState('');

    // ── Analytics ──
    useEffect(() => {
        TrackingHelper.trackAppOpen(window.navigator.userAgent.toLowerCase().includes('android') ? 'android' : 'web');
    }, []);

    useEffect(() => {
        if (user) {
            TrackingHelper.identifyUser(user.id || user.username, { role: user.role, name: user.displayName });
        }
    }, [user?.id, user?.username]);
    const [forceChangeError, setForceChangeError] = useState('');

    // Toast notifications
    const [toasts, setToasts] = useState([]);
    const addToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
    };

    // Yêu cầu quyền thông báo ngay khi mở app
    useEffect(() => {
        async function requestAppPermissions() {
            try {
                // Initialize Remote Config for feature flags/dynamic settings synchronously
                await syncRemoteConfig();

                if (window.Capacitor) {
                    await LocalNotifications.requestPermissions();
                } else if ('Notification' in window) {
                    await Notification.requestPermission();
                }
            } catch (e) {
                myError('APP', 'Failed to request notification permission or module load error:', e);
                // Nếu lỗi do phiên bản cũ bị cache (Failed to fetch dynamically imported module)
                if (e.name === 'TypeError' && e.message.includes('dynamically imported module')) {
                    myLog('APP', 'New version detected, reloading page...');
                    window.location.reload();
                }
            }

            // Tính năng đồng bộ: Xin quyền Microphone ngay để Native chặn popup một lần duy nhất lúc mở App
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(t => t.stop()); // Tắt mic đi luôn, chỉ lấy quyền
                } catch (e) {
                    myError('APP', 'Microphone permission not granted:', e);
                }
            }
        }
        requestAppPermissions();
    }, []);

    // ─── Global Ripple Effect ───
    useEffect(() => {
        const RIPPLE_TARGETS = 'button, .nf-tab, .sidebar-item, .action-menu-btn, .action-menu-item';
        const createRipple = (e) => {
            const target = e.target.closest(RIPPLE_TARGETS);
            if (!target) return;
            // Skip disabled buttons
            if (target.disabled) return;
            const circle = document.createElement('span');
            circle.className = 'ripple-circle';
            const rect = target.getBoundingClientRect();
            circle.style.left = `${e.clientX - rect.left}px`;
            circle.style.top = `${e.clientY - rect.top}px`;
            // Ensure overflow hidden
            const prevOverflow = target.style.overflow;
            const prevPosition = target.style.position;
            if (getComputedStyle(target).overflow === 'visible') target.style.overflow = 'hidden';
            if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
            target.appendChild(circle);
            circle.addEventListener('animationend', () => {
                circle.remove();
            }, { once: true });
        };
        document.addEventListener('click', createRipple);
        return () => document.removeEventListener('click', createRipple);
    }, []);

    // ─── Verify token on app load ───
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);

        const finishLoading = () => {
            setLoadingProgress(100);
            setLoadingStatus(I18nHelper.t('splash.done'));
            setTimeout(() => {
                setAuthChecked(true);
                // Hide native splash screen
                if (window.Capacitor) {
                    SplashScreen.hide().catch(() => { });
                }
            }, 600);
        };

        // Handle email verification link
        const verifyToken = urlParams.get('verifyToken');
        if (verifyToken) {
            setLoadingStatus(I18nHelper.t('splash.verifying_account'));
            setLoadingProgress(30);
            window.history.replaceState({}, document.title, window.location.pathname);
            fetch(`${getApiBase()}/auth/verify-email?token=${encodeURIComponent(verifyToken)}`)
                .then(r => r.json())
                .then(data => {
                    setLoadingProgress(70);
                    setVerifyMsg({ success: data.success, text: data.message || data.error || I18nHelper.t('splash.verify_processed') });
                })
                .catch(() => setVerifyMsg({ success: false, text: I18nHelper.t('splash.verify_error') }))
                .finally(() => finishLoading());
            return;
        }

        const autoUser = urlParams.get('resetUser');
        const autoPw = urlParams.get('resetPw');

        if (autoUser && autoPw) {
            setLoadingStatus(I18nHelper.t('splash.auto_login'));
            setLoadingProgress(30);
            handleLogin(autoUser, autoPw, true)
                .then(() => {
                    setLoadingProgress(70);
                    window.history.replaceState({}, document.title, window.location.pathname);
                })
                .catch(() => {
                    window.history.replaceState({}, document.title, window.location.pathname);
                })
                .finally(() => finishLoading());
            return;
        }

        setLoadingStatus(I18nHelper.t('splash.checking_session'));
        setLoadingProgress(20);
        const stored = getStoredAuth();
        if (!stored || !stored.token) {
            setLoadingProgress(100);
            setUser(null);
            finishLoading();
            return;
        }

        setLoadingStatus(I18nHelper.t('splash.authenticating'));
        setLoadingProgress(50);
        // Verify token with server
        fetch(`${getApiBase()}/auth/me`, {
            headers: { 'x-auth-token': stored.token }
        })
            .then(res => res.json())
            .then(data => {
                setLoadingProgress(80);
                if (data.success && data.data) {
                    setLoadingStatus(I18nHelper.t('splash.loading_profile'));
                    const freshUser = { ...stored, ...data.data };
                    localStorage.setItem(AUTH_KEY, JSON.stringify(freshUser));
                    setUser(freshUser);
                } else {
                    localStorage.removeItem(AUTH_KEY);
                    setUser(null);
                }
            })
            .catch(() => {
                if (stored.source === 'local') {
                    setUser(stored);
                } else {
                    localStorage.removeItem(AUTH_KEY);
                    setUser(null);
                }
            })
            .finally(() => finishLoading());
    }, []);

    // ─── Set up User Online Ping ───
    useEffect(() => {
        if (!user?.token) return;

        // Ping immediately on mount if user exists
        fetch(`${getApiBase()}/users/ping`, {
            method: 'POST',
            headers: { 'x-auth-token': user.token }
        }).catch((e) => { myError('APP', "App.jsx Promise Error:", e); });

        // Then ping every 60 seconds
        const intervalId = setInterval(() => {
            fetch(`${getApiBase()}/users/ping`, {
                method: 'POST',
                headers: { 'x-auth-token': user.token }
            }).catch((e) => { myError('APP', "App.jsx Promise Error:", e); });
        }, 60000);

        return () => clearInterval(intervalId);
    }, [user?.token]);

    // ─── Auth ───
    const handleLogin = async (username, password, isAutoReset = false) => {
        const localUsers = [
            { username: 'dangvq', password: 'DangVQ@2002', displayName: 'Vũ Quang Đáng', role: 'admin' },
            { username: 'admin', password: 'Admin@1234', displayName: 'Quản trị viên', role: 'admin' },
            { username: 'viewer', password: 'Viewer@1234', displayName: 'Khách xem', role: 'viewer' },
        ];

        try {
            const res = await fetch(`${getApiBase()}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch { throw new Error('SERVER_UNAVAILABLE'); }
            if (data.success) {
                const authData = { ...data.data, source: 'api' };
                localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
                setUser(authData);
                TrackingHelper.trackLoginSuccess('token');
                if (isAutoReset) {
                    setTempPwd(password);
                    setForceChangePwd(true);
                    addToast(t('app.login_success_reset'), 'success');
                } else {
                    addToast(t('app.login_welcome').replace('{name}', authData.displayName));
                }
                return;
            }
            throw new Error(data.error || t('app.login_failed'));
        } catch (err) {
            const isServerError = err.message === 'SERVER_UNAVAILABLE'
                || err.name === 'TypeError'
                || err.message.includes('fetch')
                || err.message.includes('Failed')
                || err.message.includes('NetworkError');
            if (isServerError) {
                const u = localUsers.find(v => v.username === username && v.password === password);
                if (u) {
                    const authData = { username: u.username, displayName: u.displayName, role: u.role, source: 'local' };
                    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
                    setUser(authData);
                    TrackingHelper.trackLoginSuccess('local');
                    addToast(t('app.login_welcome_offline').replace('{name}', u.displayName));
                    return;
                }
                addToast(t('app.login_wrong_credentials'), 'error');
                throw new Error(t('app.login_wrong_credentials'));
            }
            addToast(err.message || t('app.login_failed'), 'error');
            throw err;
        }
    };

    const handleLogout = async () => {
        if (user?.token) {
            try { await fetch(`${getApiBase()}/auth/logout`, { method: 'POST', headers: { 'x-auth-token': user.token } }); } catch { }
        }
        localStorage.removeItem(AUTH_KEY);
        // Clear chat cache on logout
        clearChatCache().catch((e) => { myError('APP', "App.jsx Logout Cache Clear Error:", e); });
        setUser(null);
        setSelected(null);
        setDetailOpen(false);
        TrackingHelper.trackLogout();
        addToast(t('app.logout_success'));

        // Let's reset URL in case of auto-login
        window.history.replaceState({}, document.title, window.location.pathname);
    };

    const handleForceChangePassword = async (newPwd, confirmNewPwd) => {
        setForceChangeError('');
        if (!newPwd || !confirmNewPwd) { setForceChangeError(t('app.force_pwd_empty')); return; }

        const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{8,})");
        if (!strongRegex.test(newPwd)) {
            setForceChangeError(t('app.force_pwd_weak'));
            return;
        }

        if (newPwd !== confirmNewPwd) { setForceChangeError(t('app.force_pwd_mismatch')); return; }

        try {
            const res = await fetch(`${getApiBase()}/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': user.token },
                body: JSON.stringify({ currentPassword: tempPwd, newPassword: newPwd })
            });
            const json = await res.json();
            if (json.success) {
                addToast(t('app.force_pwd_success'));
                setForceChangePwd(false);
                setTempPwd('');
                setForceChangeError('');
            } else {
                setForceChangeError(json.error || t('app.force_pwd_error'));
            }
        } catch (e) {
            setForceChangeError(t('app.force_pwd_conn_error'));
        }
    };

    const isAdmin = user?.role === 'admin';
    const canEdit = user?.role === 'admin' || user?.role === 'editor';

    const refresh = async () => {
        try {
            const res = await api.getMembers();
            if (res.success) {
                setMembers(res.data || []);
                if (selected) {
                    const fresh = res.data.find(m => m.id === selected.id);
                    if (fresh) setSelected(fresh);
                }
            }
        } catch (e) {
            addToast(t('app.load_tree_error'), 'error');
        } finally {
            setIsLoadingMembers(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    // ─── Tree page handlers ───
    const stats = { totalMembers: members.length, totalGenerations: Math.max(...members.map(m => m.generation || 0), 0) };
    const handleSelect = useCallback((member) => { setSelected(member); setDetailOpen(true); }, []);
    const closeDetail = () => { setDetailOpen(false); setSelected(null); };
    const handleSearch = (query) => { if (!query.trim()) { setSearchResults([]); return; } setSearchResults(localApi.search(query)); };

    const openAddModal = (parentId = null) => { setEditMember(null); setModalParentId(parentId); setModalSpouseOfId(null); setModalOpen(true); };
    const openEditModal = (id) => { const m = members.find(x => x.id === id); if (!m) return; setEditMember(m); setModalParentId(null); setModalSpouseOfId(null); setModalOpen(true); };
    const openAddSpouseModal = (memberId) => { setEditMember(null); setModalParentId(null); setModalSpouseOfId(memberId); setModalOpen(true); };
    const closeModal = () => setModalOpen(false);

    // ─── Form Submit: Admin → direct, Viewer → request ───
    const handleFormSubmit = async (data) => {
        try {
            if (data.id) {
                const original = members.find(m => m.id === data.id) || {};
                const skipFields = ['id', 'spouseId', 'parentId', 'newAchievements'];
                const keys = Object.keys(data).filter(k => !skipFields.includes(k));
                let hasChanges = false;
                const actualChanges = {};
                for (const k of keys) {
                    if (String(original[k] ?? '') !== String(data[k] ?? '')) {
                        hasChanges = true;
                        actualChanges[k] = data[k];
                    }
                }

                if (data.newAchievements && data.newAchievements.length > 0) {
                    hasChanges = true;
                }

                if (!hasChanges) {
                    addToast(t('app.no_changes'), 'error');
                    closeModal();
                    return;
                }

                if (isAdmin || canEdit) {
                    if (Object.keys(actualChanges).length > 0) {
                        const result = await api.submitRequest(data.id, actualChanges, t('app.direct_update_by') + ' ' + (isAdmin ? 'Admin' : 'Editor'));
                        await api.approveRequest(result.data.id);
                        addToast(t('app.update_success').replace('{name}', data.name));
                    }
                    if (data.newAchievements?.length > 0) {
                        for (const a of data.newAchievements) {
                            await api.addAchievement({ ...a, memberId: data.id });
                        }
                    }
                } else {
                    const result = await api.submitRequest(data.id, actualChanges, t('app.edit_member_label'));
                    addToast(result.message || t('app.edit_request_sent'), result.success ? 'success' : 'error');
                }
            } else {
                if (!canEdit) { addToast(t('app.no_add_permission'), 'error'); return; }
                const res = await api.createMember(data);
                if (data.newAchievements?.length > 0 && res.data?.id) {
                    for (const a of data.newAchievements) {
                        await api.addAchievement({ ...a, memberId: res.data.id });
                    }
                }
                const relationship = data.parentId ? 'con' : (data.spouseId ? 'vo_chong' : 'goc');
                TrackingHelper.trackAddTreeMember(relationship);
                addToast(t('app.add_success').replace('{name}', data.name));
            }
            await refresh();
            closeModal();
        } catch (e) {
            addToast(e.message || t('app.save_error'), 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!canEdit) { addToast(t('app.no_delete_permission'), 'error'); return; }
        const m = members.find(x => x.id === id);
        if (!m) return;
        const children = members.filter(x => x.parentId === id);
        const msg = children.length > 0
            ? t('app.delete_confirm_children').replace('{name}', m.name).replace('{count}', children.length)
            : t('app.delete_confirm').replace('{name}', m.name);
        if (confirm(msg)) {
            try {
                await api.deleteMember(id);
                closeDetail();
                await refresh();
                addToast(t('app.deleted').replace('{name}', m.name));
            } catch (e) {
                addToast(e.message || t('app.delete_error'), 'error');
            }
        }
    };

    const handleExport = async (format = 'json') => {
        if (format === 'csv') {
            const members = localApi.getMembers();
            if (!members.length) { addToast(t('app.no_data_export'), 'error'); return; }
            const headers = ['id', 'name', 'gender', 'birth_date', 'birth_time', 'death_date', 'birth_place', 'death_place', 'occupation', 'phone', 'email', 'address', 'note', 'photo', 'birth_order', 'child_type', 'parent_id', 'spouse_id', 'generation'];
            const csvRows = [headers.join(',')];
            members.forEach(m => {
                const row = headers.map(h => {
                    const val = m[h] ?? m[h.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] ?? '';
                    const str = String(val);
                    return str.includes(',') || str.includes('"') || str.includes('\n')
                        ? `"${str.replace(/"/g, '""')}"` : str;
                });
                csvRows.push(row.join(','));
            });
            const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `gia-pha-backup-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click(); URL.revokeObjectURL(url);
            addToast(t('app.export_csv_success'));
        } else {
            await localApi.exportJSON();
            addToast(t('app.export_json_success'));
        }
    };

    const handleImport = async (file, format = 'json') => {
        if (!canEdit) { addToast(t('app.no_import_permission'), 'error'); return; }
        if (!confirm(t('app.import_confirm'))) return;
        try {
            if (format === 'csv') {
                const text = await file.text();
                const lines = text.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
                if (lines.length < 2) throw new Error(t('app.csv_empty'));
                const headers = lines[0].split(',').map(h => h.trim());
                const members = [];
                for (let i = 1; i < lines.length; i++) {
                    // Parse CSV row (handle quoted fields)
                    const row = [];
                    let current = '', inQuotes = false;
                    for (const ch of lines[i]) {
                        if (ch === '"') { inQuotes = !inQuotes; continue; }
                        if (ch === ',' && !inQuotes) { row.push(current.trim()); current = ''; continue; }
                        current += ch;
                    }
                    row.push(current.trim());

                    const member = {};
                    headers.forEach((h, idx) => {
                        const camel = h.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
                        let val = row[idx] || '';
                        if (['id', 'gender', 'birth_order', 'parent_id', 'spouse_id', 'generation'].includes(h)) {
                            val = val ? parseInt(val) : (h === 'gender' ? 1 : null);
                        }
                        member[camel] = val;
                    });
                    if (member.name) members.push(member);
                }
                // Save to localStorage (same as importJSON does)
                localStorage.setItem('vuFamilyMembers', JSON.stringify(members));
                refresh();
                addToast(I18nHelper.t('admin.import_success') + ' (' + members.length + ' CSV)');
            } else {
                await localApi.importJSON(file);
                refresh();
                addToast(I18nHelper.t('admin.import_success'));
            }
        } catch (err) { addToast(`${t('app.error_prefix')} ${err.message}`, 'error'); }
    };
    const handleReset = () => {
        if (!isAdmin) return;
        if (confirm(t('app.reset_confirm'))) {
            localApi.resetData(); refresh(); closeDetail(); addToast(t('app.reset_success'));
        }
    };

    const pendingCount = isAdmin ? localApi.getPendingRequests().length : 0;

    // ─── Sidebar navigation handler ───
    const handleNavigate = (page) => {
        setActivePage(page);
    };

    // ─── Loading: Premium Splash Loading Screen ───
    if (!authChecked) return (
        <SplashLoading loadingProgress={loadingProgress} loadingStatus={loadingStatus} />
    );

    // ─── Login screen ───
    if (!user) return (
        <>
            <LoginPage onLogin={handleLogin} verifyMsg={verifyMsg} />
            <Toast toasts={toasts} />
        </>
    );

    // ─── Render active page content ───
    const renderPage = () => {
        switch (activePage) {
            case 'tree':
                return (
                    <div className="tree-page relative">
                        <Header stats={stats} onSearch={handleSearch} searchResults={searchResults} onSelectResult={handleSelect}
                            onAddRoot={canEdit ? () => openAddModal(null) : null}
                            onExport={canEdit ? handleExport : null}
                            onImport={canEdit ? handleImport : null}
                            onReset={isAdmin ? handleReset : null}
                            isAdmin={isAdmin} canEdit={canEdit} />
                        <Toolbar theme={theme} setTheme={setTheme} />

                        {isLoadingMembers && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm rounded-xl m-4">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 shadow-lg"></div>
                                <span className="text-white font-medium text-lg drop-shadow-md">{t('app.loading_tree')}</span>
                            </div>
                        )}

                        <TreeCanvas members={members} selectedId={selected?.id}
                            searchResultIds={searchResults.map(r => r.id)}
                            onSelectMember={handleSelect} onDeselect={closeDetail} />
                        <DetailPanel member={selected} members={members} isOpen={detailOpen} onClose={closeDetail}
                            onEdit={canEdit ? openEditModal : null} onDelete={canEdit ? handleDelete : null}
                            onAddChild={canEdit ? openAddModal : null} onAddSpouse={canEdit ? openAddSpouseModal : null}
                            onRefresh={refresh} isAdmin={isAdmin} canEdit={canEdit} onSelfEdit={openEditModal} />
                    </div>
                );
            case 'newsfeed':
                return <NewsfeedPage user={user} isAdmin={isAdmin} addToast={addToast} members={members} onNavigate={handleNavigate} />;
            case 'calendar':
                return <CalendarPage members={members} />;
            case 'history':
                return <HistoryPage isAdmin={isAdmin} user={user} onRefresh={refresh} addToast={addToast} members={members} />;
            case 'chat':
                return <ChatPage user={user} addToast={addToast} onStartCall={setActiveCallRoom} />;
            case 'requests':
                return <RequestsPage user={user} members={members} onRefresh={refresh} addToast={addToast} />;
            case 'system':
                return <SystemAdminPage addToast={addToast} />;
            case 'guide':
                return <GuidePage user={user} onNavigate={handleNavigate} />;
            default:
                return null;
        }
    };

    return (
        <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobile ? 'is-mobile' : ''}`}>
            {!isMobile && (
                <Sidebar
                    activePage={activePage}
                    onNavigate={handleNavigate}
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

            {/* Premium Glassmorphic Bottom Navigation (Mobile Only) */}
            {isMobile && (
                <div className="bottom-nav">
                    <button
                        className={`bottom-nav-item ${activePage === 'tree' && !showMobileMenu ? 'active' : ''}`}
                        onClick={() => { setActivePage('tree'); setShowMobileMenu(false); }}
                    >
                        <span className="bottom-nav-item-icon">🌳</span>
                        <span>{I18nHelper.t('nav.tree')}</span>
                    </button>
                    <button
                        className={`bottom-nav-item ${activePage === 'newsfeed' && !showMobileMenu ? 'active' : ''}`}
                        onClick={() => { setActivePage('newsfeed'); setShowMobileMenu(false); }}
                    >
                        <span className="bottom-nav-item-icon">📰</span>
                        <span>{I18nHelper.t('nav.newsfeed')}</span>
                    </button>
                    <button
                        className={`bottom-nav-item ${activePage === 'chat' && !showMobileMenu ? 'active' : ''}`}
                        onClick={() => { setActivePage('chat'); setShowMobileMenu(false); }}
                    >
                        <span className="bottom-nav-item-icon">💬</span>
                        <span>{I18nHelper.t('nav.chat')}</span>
                    </button>
                    <button
                        className={`bottom-nav-item ${activePage === 'calendar' && !showMobileMenu ? 'active' : ''}`}
                        onClick={() => { setActivePage('calendar'); setShowMobileMenu(false); }}
                    >
                        <span className="bottom-nav-item-icon">📅</span>
                        <span>{I18nHelper.t('nav.calendar')}</span>
                    </button>
                    <button
                        className={`bottom-nav-item ${showMobileMenu ? 'active' : ''}`}
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                    >
                        <span className="bottom-nav-item-icon">⚙️</span>
                        <span>{I18nHelper.t('nav.others')}</span>
                        {pendingCount > 0 && <span className="bottom-nav-badge">{pendingCount}</span>}
                    </button>
                </div>
            )}

            {/* Premium Slide-Up Bottom Sheet Menu (Mobile Only) */}
            {isMobile && showMobileMenu && (
                <div className="bottom-sheet-overlay" onClick={() => setShowMobileMenu(false)}>
                    <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="bottom-sheet-drag-handle" />
                        <div className="bottom-sheet-title">{I18nHelper.t('sidebar.admin_section')}</div>

                        <div className="bottom-sheet-grid">
                            <div className="bottom-sheet-item" onClick={() => { setProfileModalOpen(true); setShowMobileMenu(false); }}>
                                <span className="bottom-sheet-item-icon">👤</span>
                                <span>{I18nHelper.t('sidebar.profile_password')}</span>
                            </div>

                            {(user?.role === 'admin' || user?.role === 'editor') && (
                                <div className="bottom-sheet-item" onClick={() => { setActivePage('requests'); setShowMobileMenu(false); }}>
                                    <span className="bottom-sheet-item-icon">📋</span>
                                    <span>{I18nHelper.t('nav.requests')}</span>
                                    {pendingCount > 0 && <span className="bottom-nav-badge">{pendingCount}</span>}
                                </div>
                            )}

                            {isAdmin && (
                                <div className="bottom-sheet-item" onClick={() => { setActivePage('system'); setShowMobileMenu(false); }}>
                                    <span className="bottom-sheet-item-icon">⚙️</span>
                                    <span>{I18nHelper.t('nav.system')}</span>
                                </div>
                            )}

                            <div className="bottom-sheet-item" onClick={() => { setActivePage('history'); setShowMobileMenu(false); }}>
                                <span className="bottom-sheet-item-icon">📜</span>
                                <span>{I18nHelper.t('nav.history')}</span>
                            </div>

                            <div className="bottom-sheet-item" onClick={() => { setActivePage('guide'); setShowMobileMenu(false); }}>
                                <span className="bottom-sheet-item-icon">❓</span>
                                <span>{I18nHelper.t('sidebar.user_guide')}</span>
                            </div>
                        </div>

                        <button className="bottom-sheet-logout" onClick={() => { handleLogout(); setShowMobileMenu(false); }}>
                            🚪 {I18nHelper.t('app.logout')}
                        </button>
                    </div>
                </div>
            )}

            {/* Modals (always available) */}
            <MemberModal isOpen={modalOpen} onClose={closeModal} onSubmit={handleFormSubmit}
                editMember={editMember} parentId={modalParentId} spouseOfId={modalSpouseOfId} members={members} />

            <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} user={user} onAddToast={addToast}
                theme={theme} setTheme={setTheme}
                onUpdateUser={(newUserData) => {
                    const authData = { ...user, ...newUserData };
                    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
                    setUser(authData);
                }} />

            <ForceChangePasswordModal
                isOpen={forceChangePwd}
                error={forceChangeError}
                onSubmit={handleForceChangePassword}
            />

            <Toast toasts={toasts} />
            <VoiceCall user={user} activeCallRoom={activeCallRoom} onClearActiveCallRoom={() => setActiveCallRoom(null)} addToast={addToast} />
        </div>
    );
}
