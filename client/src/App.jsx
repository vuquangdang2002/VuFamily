import { useState, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toolbar from './components/Toolbar';
import TreeCanvas from './components/TreeCanvas';
import DetailPanel from './components/DetailPanel';
import MemberModal from './components/MemberModal';
import HistoryPage from './components/HistoryPanel';
import RequestsPage from './components/RequestsPanel';
import NewsfeedPage from './components/NewsfeedPage';
import CalendarPage from './components/CalendarPage';
import AccountsPage from './components/AccountsPage';
import Toast from './components/Toast';
import { useTheme } from './components/ThemeToggle';
import { localApi } from './services/api';

const AUTH_KEY = 'vuFamilyAuth';
const API_BASE = '/api';

function getStoredAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
}

export default function App() {
    const [user, setUser] = useState(() => getStoredAuth());
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

    // Toast notifications
    const [toasts, setToasts] = useState([]);
    const addToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
    };

    // ─── Auth ───
    const handleLogin = async (username, password) => {
        const localUsers = [
            { username: 'dangvq', password: 'dangvq123', displayName: 'Vũ Quang Đáng', role: 'admin' },
            { username: 'admin', password: 'admin123', displayName: 'Quản trị viên', role: 'admin' },
            { username: 'viewer', password: 'viewer123', displayName: 'Khách xem', role: 'viewer' },
            { username: 'user', password: 'user123', displayName: 'Thành viên', role: 'user' },
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
                addToast(`Chào mừng ${authData.displayName}! Đăng nhập thành công.`);
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
                return;
            }
            addToast(err.message || 'Đăng nhập thất bại', 'error');
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

    const handleExport = async () => { await localApi.exportJSON(); addToast('Đã xuất file backup JSON!'); };
    const handleImport = async (file) => {
        if (!isAdmin) { addToast('Chỉ Admin mới có quyền nhập dữ liệu.', 'error'); return; }
        if (!confirm('Nhập dữ liệu từ file sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại.\nBạn có chắc chắn?')) return;
        try { await localApi.importJSON(file); refresh(); addToast('Đã nhập dữ liệu thành công!'); }
        catch (err) { addToast(`Lỗi: ${err.message}`, 'error'); }
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
            <Toast toasts={toasts} />
        </div>
    );
}
