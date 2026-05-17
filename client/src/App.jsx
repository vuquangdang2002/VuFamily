import { useState, useCallback, useEffect } from 'react';
import { myLog, myError } from './shared/utils/logger';
// ── Features ──
import LoginPage from './features/auth/LoginPage';
import TreeCanvas from './features/tree/TreeCanvas';
import DetailPanel from './features/tree/DetailPanel';
import MemberModal from './features/tree/MemberModal';
import NewsfeedPage from './features/newsfeed/NewsfeedPage';
import CalendarPage from './features/calendar/CalendarPage';
import AccountsPage from './features/accounts/AccountsPage';
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
import { api, localApi, API_BASE } from './shared/services/api';
import { clearAllCache as clearChatCache } from './shared/services/chatCache';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SplashScreen } from '@capacitor/splash-screen';
import { Analytics } from './shared/services/analytics';
const AUTH_KEY = 'vuFamilyAuth';

function getStoredAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
}

export default function App() {
    const [user, setUser] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState('Đang khởi tạo ứng dụng...');
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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Forced password change after auto-login
    const [forceChangePwd, setForceChangePwd] = useState(false);
    const [tempPwd, setTempPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmNewPwd, setConfirmNewPwd] = useState('');
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);

    // ── Analytics ──
    useEffect(() => {
        Analytics.trackEvent('app_open', { platform: window.navigator.userAgent.toLowerCase().includes('android') ? 'android' : 'web' });
    }, []);

    useEffect(() => {
        if (user) {
            Analytics.identifyUser(user.id || user.username, { role: user.role, name: user.displayName });
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
                if (window.Capacitor) {
                    await LocalNotifications.requestPermissions();
                } else if ('Notification' in window) {
                    await Notification.requestPermission();
                }
            } catch (e) {
                myError('APP', 'Không thể xin quyền thông báo:', e);
            }

            // Tính năng đồng bộ: Xin quyền Microphone ngay để Native chặn popup một lần duy nhất lúc mở App
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(t => t.stop()); // Tắt mic đi luôn, chỉ lấy quyền
                } catch (e) {
                    myError('APP', 'Chưa có quyền Micro:', e);
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
            setLoadingStatus('Hoàn tất!');
            setTimeout(() => {
                setAuthChecked(true);
                // Hide native splash screen
                if (window.Capacitor) {
                    SplashScreen.hide().catch(() => {});
                }
            }, 600);
        };

        // Handle email verification link
        const verifyToken = urlParams.get('verifyToken');
        if (verifyToken) {
            setLoadingStatus('Đang xác nhận tài khoản...');
            setLoadingProgress(30);
            window.history.replaceState({}, document.title, window.location.pathname);
            fetch(`${API_BASE}/auth/verify-email?token=${encodeURIComponent(verifyToken)}`)
                .then(r => r.json())
                .then(data => {
                    setLoadingProgress(70);
                    setVerifyMsg({ success: data.success, text: data.message || data.error || 'Đã xử lý xác nhận' });
                })
                .catch(() => setVerifyMsg({ success: false, text: 'Lỗi kết nối khi xác nhận email' }))
                .finally(() => finishLoading());
            return;
        }

        const autoUser = urlParams.get('resetUser');
        const autoPw = urlParams.get('resetPw');

        if (autoUser && autoPw) {
            setLoadingStatus('Đang đăng nhập tự động...');
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

        setLoadingStatus('Kiểm tra phiên đăng nhập...');
        setLoadingProgress(20);
        const stored = getStoredAuth();
        if (!stored || !stored.token) {
            setLoadingProgress(100);
            setUser(null);
            finishLoading();
            return;
        }

        setLoadingStatus('Xác thực với máy chủ...');
        setLoadingProgress(50);
        // Verify token with server
        fetch(`${API_BASE}/auth/me`, {
            headers: { 'x-auth-token': stored.token }
        })
            .then(res => res.json())
            .then(data => {
                setLoadingProgress(80);
                if (data.success && data.data) {
                    setLoadingStatus('Đang nạp hồ sơ người dùng...');
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
        fetch(`${API_BASE}/users/ping`, {
            method: 'POST',
            headers: { 'x-auth-token': user.token }
        }).catch((e) => { myError('APP', "App.jsx Promise Error:", e); });

        // Then ping every 60 seconds
        const intervalId = setInterval(() => {
            fetch(`${API_BASE}/users/ping`, {
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
            const res = await fetch(`${API_BASE}/auth/login`, {
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
                Analytics.trackEvent('login_success', { method: 'token', role: authData.role });
                if (isAutoReset) {
                    setTempPwd(password);
                    setForceChangePwd(true);
                    addToast('Đăng nhập thành công từ liên kết. Vui lòng đổi mật khẩu mới.', 'success');
                } else {
                    addToast(`Chào mừng ${authData.displayName}! Đăng nhập thành công.`);
                }
                return;
            }
            throw new Error(data.error || 'Đăng nhập thất bại');
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
                    Analytics.trackEvent('login_success', { method: 'local', role: authData.role });
                    addToast(`Chào mừng ${u.displayName}! (Chế độ offline)`);
                    return;
                }
                addToast('Sai tên đăng nhập hoặc mật khẩu', 'error');
                throw new Error('Sai tên đăng nhập hoặc mật khẩu');
            }
            addToast(err.message || 'Đăng nhập thất bại', 'error');
            throw err;
        }
    };

    const handleLogout = async () => {
        if (user?.token) {
            try { await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { 'x-auth-token': user.token } }); } catch { }
        }
        localStorage.removeItem(AUTH_KEY);
        // Clear chat cache on logout
        clearChatCache().catch((e) => { myError('APP', "App.jsx Logout Cache Clear Error:", e); });
        setUser(null);
        setSelected(null);
        setDetailOpen(false);
        Analytics.trackEvent('logout');
        addToast('Đã đăng xuất thành công');

        // Let's reset URL in case of auto-login
        window.history.replaceState({}, document.title, window.location.pathname);
    };

    const handleForceChangePassword = async () => {
        setForceChangeError('');
        if (!newPwd || !confirmNewPwd) { setForceChangeError('Vui lòng nhập đầy đủ mật khẩu mới'); return; }

        const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{8,})");
        if (!strongRegex.test(newPwd)) {
            setForceChangeError('Mật khẩu yếu, chưa đủ bảo mật. Hãy xem lại yêu cầu ở trên.');
            return;
        }

        if (newPwd !== confirmNewPwd) { setForceChangeError('Mật khẩu nhập lại không khớp'); return; }

        try {
            const res = await fetch(`${API_BASE}/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': user.token },
                body: JSON.stringify({ currentPassword: tempPwd, newPassword: newPwd })
            });
            const json = await res.json();
            if (json.success) {
                addToast('Đã đổi mật khẩu bắt buộc thành công!');
                setForceChangePwd(false);
                setNewPwd('');
                setConfirmNewPwd('');
                setTempPwd('');
                setForceChangeError('');
            } else {
                setForceChangeError(json.error || 'Lỗi đổi mật khẩu');
            }
        } catch (e) {
            setForceChangeError('Lỗi kết nối khi đổi mật khẩu');
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
            addToast('Lỗi tải gia phả từ máy chủ', 'error');
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

                if (!hasChanges) {
                    addToast('Không có thông tin nào được thay đổi.', 'error');
                    closeModal();
                    return;
                }

                if (isAdmin || canEdit) {
                    const result = await api.submitRequest(data.id, actualChanges, 'Cập nhật trực tiếp bởi ' + (isAdmin ? 'Admin' : 'Editor'));
                    await api.approveRequest(result.data.id);
                    addToast(`Đã cập nhật thông tin "${data.name}" thành công!`);
                } else {
                    const result = await api.submitRequest(data.id, actualChanges, 'Chỉnh sửa thành viên');
                    addToast(result.message || 'Đã gửi yêu cầu', result.success ? 'success' : 'error');
                }
            } else {
                if (!canEdit) { addToast('Chỉ Biên tập viên hoặc Admin mới có quyền thêm thành viên mới.', 'error'); return; }
                const res = await api.createMember(data);
                if (data.newAchievements?.length > 0 && res.data?.id) {
                    for (const a of data.newAchievements) {
                        await api.addAchievement({ ...a, memberId: res.data.id });
                    }
                }
                addToast(`Đã thêm thành viên "${data.name}" thành công!`);
            }
            await refresh();
            closeModal();
        } catch (e) {
            addToast(e.message || 'Lỗi khi lưu thông tin', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!canEdit) { addToast('Chỉ Biên tập viên hoặc Admin mới có quyền xóa thành viên.', 'error'); return; }
        const m = members.find(x => x.id === id);
        if (!m) return;
        const children = members.filter(x => x.parentId === id);
        const msg = children.length > 0
            ? `Xóa "${m.name}"?\n\n⚠️ ${children.length} con sẽ mất liên kết cha/mẹ.\nThao tác này là vĩnh viễn (không thể hoàn tác).`
            : `Xóa "${m.name}"?\n\nThao tác này là vĩnh viễn (không thể hoàn tác).`;
        if (confirm(msg)) {
            try {
                await api.deleteMember(id);
                closeDetail();
                await refresh();
                addToast(`Đã xóa "${m.name}".`);
            } catch (e) {
                addToast(e.message || 'Lỗi khi xóa', 'error');
            }
        }
    };

    const handleExport = async (format = 'json') => {
        if (format === 'csv') {
            const members = localApi.getMembers();
            if (!members.length) { addToast('Không có dữ liệu để xuất', 'error'); return; }
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
            addToast('Đã xuất file backup CSV!');
        } else {
            await localApi.exportJSON();
            addToast('Đã xuất file backup JSON!');
        }
    };

    const handleImport = async (file, format = 'json') => {
        if (!canEdit) { addToast('Chỉ Biên tập viên hoặc Admin mới có quyền nhập dữ liệu.', 'error'); return; }
        if (!confirm('Nhập dữ liệu từ file sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại.\nBạn có chắc chắn?')) return;
        try {
            if (format === 'csv') {
                const text = await file.text();
                const lines = text.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
                if (lines.length < 2) throw new Error('File CSV trống hoặc không hợp lệ');
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
                addToast(`Đã nhập ${members.length} thành viên từ CSV!`);
            } else {
                await localApi.importJSON(file);
                refresh();
                addToast('Đã nhập dữ liệu JSON thành công!');
            }
        } catch (err) { addToast(`Lỗi: ${err.message}`, 'error'); }
    };
    const handleReset = () => {
        if (!isAdmin) return;
        if (confirm('Khôi phục dữ liệu mẫu?\n\n⚠️ Mọi thay đổi sẽ bị mất!')) {
            localApi.resetData(); refresh(); closeDetail(); addToast('Đã khôi phục dữ liệu mẫu.');
        }
    };

    const pendingCount = isAdmin ? localApi.getPendingRequests().length : 0;

    // ─── Sidebar navigation handler ───
    const handleNavigate = (page) => {
        setActivePage(page);
    };

    // ─── Loading: Premium Splash Loading Screen ───
    if (!authChecked) return (
        <div className="splash-loading-container">
            <div className="splash-content">
                <div className="splash-logo">🏛️</div>
                <h1 className="splash-title">VuFamily</h1>
                
                <div className="progress-wrapper">
                    <div className="progress-bar-container">
                        <div 
                            className="progress-bar-fill" 
                            style={{ width: `${loadingProgress}%` }}
                        ></div>
                    </div>
                    <div className="progress-info">
                        <span className="status-text">{loadingStatus}</span>
                        <span className="percentage">{Math.round(loadingProgress)}%</span>
                    </div>
                </div>
            </div>

            <style>{`
                .splash-loading-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    width: 100vw;
                    background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
                    color: white;
                    overflow: hidden;
                    position: fixed;
                    top: 0;
                    left: 0;
                    z-index: 9999;
                }
                .splash-content {
                    text-align: center;
                    width: 80%;
                    max-width: 400px;
                    animation: fadeIn 0.8s ease-out;
                }
                .splash-logo {
                    font-size: 64px;
                    margin-bottom: 16px;
                    animation: pulse 2s infinite ease-in-out;
                    filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.5));
                }
                .splash-title {
                    font-size: 28px;
                    font-weight: 700;
                    letter-spacing: 2px;
                    margin-bottom: 40px;
                    background: linear-gradient(to right, #60a5fa, #3b82f6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .progress-wrapper {
                    width: 100%;
                }
                .progress-bar-container {
                    height: 6px;
                    width: 100%;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    overflow: hidden;
                    margin-bottom: 12px;
                    box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
                }
                .progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #3b82f6, #60a5fa);
                    border-radius: 10px;
                    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
                }
                .progress-info {
                    display: flex;
                    justify-content: space-between;
                    font-size: 13px;
                    color: #94a3b8;
                    font-weight: 500;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                }
            `}</style>
        </div>
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
                                <span className="text-white font-medium text-lg drop-shadow-md">Đang tải gia phả...</span>
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
            case 'accounts':
                return <AccountsPage addToast={addToast} />;
            case 'guide':
                return <GuidePage user={user} onNavigate={handleNavigate} />;
            default:
                return null;
        }
    };

    return (
        <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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
            />
            <main className="main-content">
                {renderPage()}
            </main>

            {/* Theme toggle — always visible */}
            <button
                className="theme-toggle-float"
                onClick={(e) => setTheme(theme === 'light' ? 'dark' : 'light', e)}
                title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}
            >
                <span className="theme-toggle-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
            </button>

            {/* Modals (always available) */}
            <MemberModal isOpen={modalOpen} onClose={closeModal} onSubmit={handleFormSubmit}
                editMember={editMember} parentId={modalParentId} spouseOfId={modalSpouseOfId} members={members} />

            <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} user={user} onAddToast={addToast}
                onUpdateUser={(newUserData) => {
                    const authData = { ...user, ...newUserData };
                    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
                    setUser(authData);
                }} />

            {/* Forced Change Password Modal */}
            {forceChangePwd && (
                <div className="modal-overlay open" style={{ zIndex: 9999 }}>
                    <div className="modal" style={{ width: 400 }}>
                        <div className="modal-header">
                            <h2 style={{ fontSize: 18 }}>🔒 Đổi mật khẩu bắt buộc</h2>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                                Đây là mật khẩu tạo tự động. Vì lý do bảo mật, bạn bắt buộc phải tạo mật khẩu riêng biệt trước khi tiếp tục.
                                <br /><br />
                                <span style={{ color: '#eab308' }}>⚠️ Yêu cầu: Ít nhất 8 ký tự, bao gồm chữ HOA, chữ thường, số và ký tự đặc biệt (!@#$...).</span>
                            </p>

                            {forceChangeError && <div className="login-error" style={{ marginBottom: 12 }}>⚠️ {forceChangeError}</div>}

                            <div style={{ marginBottom: 12, position: 'relative' }}>
                                <input className="form-input" type={showNewPwd ? "text" : "password"} placeholder="Mật khẩu mới..."
                                    value={newPwd} onChange={e => setNewPwd(e.target.value)} autoFocus style={{ paddingRight: 40 }} />
                                <button type="button" onClick={() => setShowNewPwd(!showNewPwd)}
                                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.6, padding: 4 }}>
                                    {showNewPwd ? '🙈' : '👁️'}
                                </button>
                            </div>
                            <div style={{ marginBottom: 16, position: 'relative' }}>
                                <input className="form-input" type={showConfirmPwd ? "text" : "password"} placeholder="Nhập lại mật khẩu mới..."
                                    value={confirmNewPwd} onChange={e => setConfirmNewPwd(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleForceChangePassword()} style={{ paddingRight: 40 }} />
                                <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.6, padding: 4 }}>
                                    {showConfirmPwd ? '🙈' : '👁️'}
                                </button>
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleForceChangePassword}>
                                Xác nhận đổi mật khẩu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toast toasts={toasts} />
            <VoiceCall user={user} activeCallRoom={activeCallRoom} onClearActiveCallRoom={() => setActiveCallRoom(null)} addToast={addToast} />
        </div>
    );
}
