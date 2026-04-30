import { useState, useEffect } from 'react';
import { API_BASE } from '../../shared/services/api';

function getToken() {
    try { return JSON.parse(localStorage.getItem('vuFamilyAuth') || '{}').token || ''; }
    catch { return ''; }
}

export default function AccountsPage({ addToast }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '', displayName: '', role: 'viewer' });
    const [showCreatePw, setShowCreatePw] = useState(false);
    const [resetModal, setResetModal] = useState(null);
    const [resetPw, setResetPw] = useState('');
    const [showResetPw, setShowResetPw] = useState(false);

    // Edit modal
    const [editModal, setEditModal] = useState(null);
    const [editUser, setEditUser] = useState({ displayName: '', role: 'viewer', status: 'active' });

    // Action menu
    const [actionMenuId, setActionMenuId] = useState(null);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e) => {
            if (!e.target.closest('.action-menu-container')) {
                setActionMenuId(null);
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/users`, {
                headers: { 'x-auth-token': getToken() }
            });
            const json = await res.json();
            if (json.success) setUsers(json.data || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleCreate = async () => {
        if (!newUser.username || !newUser.password) {
            addToast('Tên đăng nhập và mật khẩu là bắt buộc', 'error');
            return;
        }

        const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{8,})");
        if (!strongRegex.test(newUser.password)) {
            addToast('Mật khẩu phải từ 8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt', 'error');
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify(newUser)
            });
            const json = await res.json();
            if (json.success) {
                addToast('Đã tạo tài khoản thành công!');
                setShowCreate(false);
                setNewUser({ username: '', password: '', displayName: '', role: 'viewer' });
                fetchUsers();
            } else {
                addToast(json.error || 'Lỗi tạo tài khoản', 'error');
            }
        } catch (e) { addToast('Lỗi kết nối server', 'error'); }
    };

    const handleDelete = async (id, username) => {
        if (!confirm(`Xóa tài khoản "${username}"? Hành động này không thể hoàn tác.`)) return;
        try {
            const res = await fetch(`${API_BASE}/users/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': getToken() }
            });
            const json = await res.json();
            if (json.success) {
                addToast('Đã xóa tài khoản');
                fetchUsers();
            } else {
                addToast(json.error || 'Lỗi xóa tài khoản', 'error');
            }
        } catch (e) { addToast('Lỗi kết nối server', 'error'); }
    };

    const handleResetPassword = async () => {
        if (!resetPw) { addToast('Vui lòng nhập mật khẩu mới', 'error'); return; }

        const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{8,})");
        if (!strongRegex.test(resetPw)) {
            addToast('Mật khẩu phải từ 8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt', 'error');
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/users/${resetModal.id}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({ newPassword: resetPw })
            });
            const json = await res.json();
            if (json.success) {
                addToast(`Đã đặt lại mật khẩu cho ${resetModal.username}`);
                setResetModal(null);
                setResetPw('');
            } else {
                addToast(json.error || 'Lỗi đặt lại mật khẩu', 'error');
            }
        } catch (e) { addToast('Lỗi kết nối server', 'error'); }
    };

    const handleEditUser = async () => {
        try {
            const res = await fetch(`${API_BASE}/users/${editModal.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify(editUser)
            });
            const json = await res.json();
            if (json.success) {
                addToast('Đã cập nhật thông tin tài khoản!');
                setEditModal(null);
                fetchUsers();
            } else {
                addToast(json.error || 'Lỗi cập nhật tài khoản', 'error');
            }
        } catch (e) {
            addToast('Lỗi kết nối khi cập nhật tài khoản', 'error');
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>👥 Quản lý tài khoản</h2>
                <p className="page-subtitle">Thêm, xóa, đặt lại mật khẩu cho người dùng</p>
            </div>

            <div className="page-body">
                {/* Create button */}
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
                        {showCreate ? '✕ Đóng' : '➕ Tạo tài khoản mới'}
                    </button>
                </div>

                {/* Create form */}
                {showCreate && (
                    <div className="nf-create-post" style={{ marginBottom: 20 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Tạo tài khoản mới</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                                <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Tên đăng nhập *</label>
                                <input className="form-input" placeholder="username"
                                    value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Mật khẩu *</label>
                                <div style={{ position: 'relative' }}>
                                    <input className="form-input" type={showCreatePw ? 'text' : 'password'} placeholder="password"
                                        value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                        style={{ paddingRight: 40 }} />
                                    <button type="button" onClick={() => setShowCreatePw(!showCreatePw)}
                                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.6, padding: 4 }}
                                        title={showCreatePw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                                        {showCreatePw ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Tên hiển thị</label>
                                <input className="form-input" placeholder="Nguyễn Văn A"
                                    value={newUser.displayName} onChange={e => setNewUser({ ...newUser, displayName: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Quyền</label>
                                <select className="form-input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                    <option value="viewer">Thành viên (viewer)</option>
                                    <option value="editor">Biên tập viên (editor)</option>
                                    <option value="admin">Quản trị viên (admin)</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ marginTop: 12, textAlign: 'right' }}>
                            <button className="btn" style={{ marginRight: 8 }} onClick={() => setShowCreate(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleCreate}>✅ Tạo tài khoản</button>
                        </div>
                    </div>
                )}

                {/* Users table */}
                {loading ? (
                    <div className="empty-state"><p>Đang tải...</p></div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left' }}>
                                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>ID</th>
                                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Tên đăng nhập</th>
                                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Tên hiển thị</th>
                                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Quyền</th>
                                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Trạng thái</th>
                                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Hoạt động</th>
                                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => {
                                    const isOfflineLongTime = u.last_active ? (new Date() - new Date(u.last_active)) > 5 * 60000 : true;
                                    const actuallyOnline = u.is_online && !isOfflineLongTime;

                                    return (
                                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                            <td style={{ padding: '10px 12px' }}>{u.id}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ position: 'relative' }}>
                                                        {u.avatar ? (
                                                            <img src={u.avatar} alt={u.username} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold' }}>
                                                                {u.username.substring(0, 2).toUpperCase()}
                                                            </div>
                                                        )}
                                                        {actuallyOnline && (
                                                            <span style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: '#10b981', border: '2px solid var(--bg-primary, #0f172a)' }}></span>
                                                        )}
                                                    </div>
                                                    <span style={{ fontWeight: 500 }}>{u.username}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>{u.display_name}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                                    background: u.role === 'admin' ? 'rgba(37,99,235,0.15)' : u.role === 'editor' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                                                    color: u.role === 'admin' ? '#2563eb' : u.role === 'editor' ? '#10b981' : '#64748b'
                                                }}>
                                                    {u.role === 'admin' ? '👑 Admin' : u.role === 'editor' ? '✏️ Editor' : '👤 Viewer'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                                {u.status === 'banned' ? (
                                                    <span style={{ color: '#ef4444', fontWeight: 500, fontSize: 13 }}>Khóa (Banned)</span>
                                                ) : (
                                                    <span style={{ color: '#10b981', fontWeight: 500, fontSize: 13 }}>Bình thường</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                                                {actuallyOnline ? '🟢 Đang Online' : (u.last_active ? `Lần cuối: ${new Date(u.last_active).toLocaleString('vi-VN')}` : 'Chưa từng')}
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                <div className="action-menu-container">
                                                    <button
                                                        className="action-menu-btn"
                                                        onClick={() => setActionMenuId(actionMenuId === u.id ? null : u.id)}
                                                        title="Thao tác"
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="12" r="1" />
                                                            <circle cx="19" cy="12" r="1" />
                                                            <circle cx="5" cy="12" r="1" />
                                                        </svg>
                                                    </button>
                                                    {actionMenuId === u.id && (
                                                        <div className="action-menu-dropdown">
                                                            <button className="action-menu-item" onClick={() => { setEditModal(u); setEditUser({ displayName: u.display_name, role: u.role, status: u.status || 'active' }); setActionMenuId(null); }}>
                                                                ✏️ Sửa
                                                            </button>
                                                            <button className="action-menu-item" onClick={() => { setResetModal(u); setResetPw(''); setActionMenuId(null); }}>
                                                                🔑 Reset mật khẩu
                                                            </button>
                                                            <button className="action-menu-item danger" onClick={() => { handleDelete(u.id, u.username); setActionMenuId(null); }}>
                                                                🗑️ Xóa
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Reset password modal */}
            {resetModal && (
                <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setResetModal(null)}>
                    <div className="modal" style={{ width: 400 }}>
                        <div className="modal-header">
                            <h2>🔑 Đặt lại mật khẩu</h2>
                            <button className="detail-close" onClick={() => setResetModal(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: 12 }}>
                                Đặt lại mật khẩu cho tài khoản <strong>{resetModal.display_name || resetModal.username}</strong> ({resetModal.username})
                            </p>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="form-input"
                                    type={showResetPw ? 'text' : 'password'}
                                    placeholder="Nhập mật khẩu mới..."
                                    value={resetPw}
                                    onChange={e => setResetPw(e.target.value)}
                                    autoFocus
                                    style={{ paddingRight: 40 }}
                                />
                                <button type="button" onClick={() => setShowResetPw(!showResetPw)}
                                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.6, padding: 4 }}
                                    title={showResetPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                                    {showResetPw ? '🙈' : '👁️'}
                                </button>
                            </div>
                            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn" onClick={() => setResetModal(null)}>Hủy</button>
                                <button className="btn btn-primary" onClick={handleResetPassword}>Đặt lại mật khẩu</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User modal */}
            {editModal && (
                <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setEditModal(null)}>
                    <div className="modal" style={{ width: 400 }}>
                        <div className="modal-header">
                            <h2>✏️ Chỉnh sửa tài khoản</h2>
                            <button className="detail-close" onClick={() => setEditModal(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: 12, color: 'var(--text-muted)' }}>
                                Sửa thông tin tài khoản <strong>{editModal.username}</strong>
                            </p>
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label">Tên hiển thị</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="Tên hiển thị..."
                                    value={editUser.displayName}
                                    onChange={e => setEditUser({ ...editUser, displayName: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label">Quyền</label>
                                <select className="form-input" value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value })}>
                                    <option value="viewer">Thành viên (viewer)</option>
                                    <option value="editor">Biên tập viên (editor)</option>
                                    <option value="admin">Quản trị viên (admin)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Trạng thái (Khóa tài khoản)</label>
                                <select className="form-input" value={editUser.status} onChange={e => setEditUser({ ...editUser, status: e.target.value })}>
                                    <option value="active">Bình thường</option>
                                    <option value="banned">Khóa (Banned)</option>
                                </select>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Nếu đặt thành "Khóa", người dùng sẽ không thể đăng nhập hoặc bị văng ra ngoài.</p>
                            </div>
                            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn" onClick={() => setEditModal(null)}>Hủy</button>
                                <button className="btn btn-primary" onClick={handleEditUser}>Lưu thay đổi</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
