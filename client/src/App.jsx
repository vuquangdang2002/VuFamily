import { useState, useCallback, useEffect } from 'react';
// ── Features ──
import LoginPage from './features/auth/LoginPage';
import TreeCanvas from './features/tree/TreeCanvas';
import DetailPanel from './features/tree/DetailPanel';
import MemberModal from './features/tree/MemberModal';
import NewsfeedPage from './features/newsfeed/NewsfeedPage';
import CalendarPage from './features/calendar/CalendarPage';
import AccountsPage from './features/accounts/AccountsPage';
import HistoryPage from './features/history/HistoryPanel';
import RequestsPage from './features/requests/RequestsPanel';
// ── Shared ──
import Sidebar from './shared/components/Sidebar';
import Header from './shared/components/Header';
import Toolbar from './shared/components/Toolbar';
import Toast from './shared/components/Toast';
import { useTheme } from './shared/components/ThemeToggle';
import { localApi } from './shared/services/api';

const AUTH_KEY = 'vuFamilyAuth';
const API_BASE = '/api';

function getStoredAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
}

export default function App() {
    const [user, setUser] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [members, setMembers] = useState(() => localApi.getMembers());
    const [selected, setSelected] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const { theme, setTheme } = useTheme();

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editMember, setEditMember] = useState(null);
    const [modalParentId, setModalParentId] = useState(null);
    const [modalSpouseOfId, setModalSpouseOfId] = useState(null);

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
    const [forceChangeError, setForceChangeError] = useState('');

    // Toast notifications
    const [toasts, setToasts] = useState([]);
    const addToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
    };

    // ─── Verify token on app load ───
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const autoUser = urlParams.get('resetUser');
        const autoPw = urlParams.get('resetPw');

        if (autoUser && autoPw) {
            handleLogin(autoUser, autoPw, true)
                .then(() => {
                    window.history.replaceState({}, document.title, window.location.pathname);
                })
                .catch(() => {
                    // if it fails, clear the URL as well so they are not stuck
                    window.history.replaceState({}, document.title, window.location.pathname);
                })
                .finally(() => setAuthChecked(true));
            return;
        }

        const stored = getStoredAuth();
        if (!stored || !stored.token) {
            // No stored session or offline session → show login
            setUser(null);
            setAuthChecked(true);
            return;
        }
        // Verify token with server
        fetch(`${API_BASE}/auth/me`, {
            headers: { 'x-auth-token': stored.token }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data) {
                    // Token valid → restore session
                    setUser(stored);
                } else {
                    // Token expired/invalid → clear and show login
                    localStorage.removeItem(AUTH_KEY);
                    setUser(null);
                }
            })
            .catch(() => {
                // Server unreachable → allow offline access if stored
                if (stored.source === 'local') {
                    setUser(stored);
                } else {
                    localStorage.removeItem(AUTH_KEY);
                    setUser(null);
                }
            })
            .finally(() => setAuthChecked(true));
    }, []);

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
        setUser(null);
        setSelected(null);
        setDetailOpen(false);
        addToast('Đã đăng xuất thành công');
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

    const refresh = () => {
        setMembers(localApi.getMembers());
        if (selected) setSelected(localApi.getMember(selected.id));
    };

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
    const handleFormSubmit = (data) => {
        if (data.id) {
            if (isAdmin) {
                localApi.update(data.id, data, user);
                addToast(`Đã cập nhật thông tin "${data.name}" thành công!`);
            } else {
                const result = localApi.submitRequest(data.id, data, user);
                addToast(result.message, result.success ? 'success' : 'error');
            }
        } else {
            if (!isAdmin) { addToast('Chỉ Admin mới có quyền thêm thành viên mới.', 'error'); return; }
            const newM = localApi.create(data, user);
            if (data.newAchievements?.length > 0) {
                data.newAchievements.forEach(a => localApi.addAchievement({ ...a, memberId: newM.id }));
            }
            addToast(`Đã thêm thành viên "${newM.name}" thành công!`);
        }
        refresh();
        closeModal();
    };

    const handleDelete = (id) => {
        if (!isAdmin) { addToast('Chỉ Admin mới có quyền xóa thành viên.', 'error'); return; }
        const m = members.find(x => x.id === id);
        if (!m) return;
        const children = members.filter(x => x.parentId === id);
        const msg = children.length > 0
            ? `Xóa "${m.name}"?\n\n⚠️ ${children.length} con sẽ mất liên kết cha/mẹ.\nThao tác này sẽ được ghi lại trong lịch sử.`
            : `Xóa "${m.name}"?\n\nThao tác này sẽ được ghi lại trong lịch sử.`;
        if (confirm(msg)) {
            localApi.delete(id, user);
            closeDetail();
            refresh();
            addToast(`Đã xóa "${m.name}". Có thể hoàn tác trong Lịch sử.`);
        }
    };

    const handleExport = async (format = 'json') => {
        if (format === 'csv') {
            const members = localApi.getMembers();
            if (!members.length) { addToast('Không có dữ liệu để xuất', 'error'); return; }
            const headers = ['id','name','gender','birth_date','birth_time','death_date','birth_place','death_place','occupation','phone','email','address','note','photo','birth_order','child_type','parent_id','spouse_id','generation'];
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
            a.href = url; a.download = `gia-pha-backup-${new Date().toISOString().slice(0,10)}.csv`;
            a.click(); URL.revokeObjectURL(url);
            addToast('Đã xuất file backup CSV!');
        } else {
            await localApi.exportJSON();
            addToast('Đã xuất file backup JSON!');
        }
    };

    const handleImport = async (file, format = 'json') => {
        if (!isAdmin) { addToast('Chỉ Admin mới có quyền nhập dữ liệu.', 'error'); return; }
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
                        if (['id','gender','birth_order','parent_id','spouse_id','generation'].includes(h)) {
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

    // ─── Loading: verifying auth ───
    if (!authChecked) return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100vh', background: 'var(--bg-primary, #0f172a)',
            color: 'var(--text-primary, #e2e8f0)', flexDirection: 'column', gap: 16
        }}>
            <div style={{ fontSize: 48, animation: 'spin 1s linear infinite' }}>🏛️</div>
            <p style={{ fontSize: 14, opacity: 0.7 }}>Đang xác thực...</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    // ─── Login screen ───
    if (!user) return (
        <>
            <LoginPage onLogin={handleLogin} />
            <Toast toasts={toasts} />
        </>
    );

    // ─── Render active page content ───
    const renderPage = () => {
        switch (activePage) {
            case 'tree':
                return (
                    <div className="tree-page">
                        <Header stats={stats} onSearch={handleSearch} searchResults={searchResults} onSelectResult={handleSelect}
                            onAddRoot={isAdmin ? () => openAddModal(null) : null}
                            onExport={isAdmin ? handleExport : null}
                            onImport={isAdmin ? handleImport : null}
                            onReset={isAdmin ? handleReset : null}
                            isAdmin={isAdmin} />
                        <Toolbar theme={theme} setTheme={setTheme} />
                        <TreeCanvas members={members} selectedId={selected?.id}
                            searchResultIds={searchResults.map(r => r.id)}
                            onSelectMember={handleSelect} onDeselect={closeDetail} />
                        <DetailPanel member={selected} members={members} isOpen={detailOpen} onClose={closeDetail}
                            onEdit={isAdmin ? openEditModal : null} onDelete={isAdmin ? handleDelete : null}
                            onAddChild={isAdmin ? openAddModal : null} onAddSpouse={isAdmin ? openAddSpouseModal : null}
                            onRefresh={refresh} isAdmin={isAdmin} onSelfEdit={openEditModal} />
                    </div>
                );
            case 'newsfeed':
                return <NewsfeedPage user={user} isAdmin={isAdmin} addToast={addToast} />;
            case 'calendar':
                return <CalendarPage members={members} />;
            case 'history':
                return <HistoryPage isAdmin={isAdmin} user={user} onRefresh={refresh} addToast={addToast} />;
            case 'requests':
                return <RequestsPage user={user} onRefresh={refresh} addToast={addToast} />;
            case 'accounts':
                return <AccountsPage addToast={addToast} />;
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
            />
            <main className="main-content">
                {renderPage()}
            </main>

            {/* Theme toggle — always visible */}
            <button
                className="theme-toggle-float"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}
            >
                {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {/* Modals (always available) */}
            <MemberModal isOpen={modalOpen} onClose={closeModal} onSubmit={handleFormSubmit}
                editMember={editMember} parentId={modalParentId} spouseOfId={modalSpouseOfId} members={members} />
            
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
                                <br/><br/>
                                <span style={{color: '#eab308'}}>⚠️ Yêu cầu: Ít nhất 8 ký tự, bao gồm chữ HOA, chữ thường, số và ký tự đặc biệt (!@#$...).</span>
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
        </div>
    );
}
