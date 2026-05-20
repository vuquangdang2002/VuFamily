import { useState, useEffect } from 'react';
import { myLog, myError } from '../../shared/utils/logger';
import { getApiBase } from '../../shared/services/api';
import { AuthHelper } from '../../shared/services/AuthHelper';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { useTranslation } from '../../shared/hooks/useTranslation';

export default function SystemAdminPage({ addToast }) {
    const { t } = useTranslation();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '', displayName: '', role: 'viewer' });
    const [showCreatePw, setShowCreatePw] = useState(false);
    const [resetModal, setResetModal] = useState(null);
    const [resetPw, setResetPw] = useState('');
    const [showResetPw, setShowResetPw] = useState(false);

    // Database tools
    const [exportFormat, setExportFormat] = useState('json');
    const [exportEncrypted, setExportEncrypted] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importEncrypted, setImportEncrypted] = useState(false);
    const [isProcessingDb, setIsProcessingDb] = useState(false);

    // Tabs
    const [activeTab, setActiveTab] = useState('data');

    const allTables = ['members', 'achievements', 'users', 'posts', 'comments', 'reactions', 'chat_rooms', 'chat_room_members', 'messages', 'edit_history', 'pending_requests', 'funds_audit_logs', 'funds_transactions'];
    const [selectedTables, setSelectedTables] = useState(allTables);
    const [showTableModal, setShowTableModal] = useState(false);

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
            const res = await fetch(`${getApiBase()}/users`, {
                headers: { 'x-auth-token': AuthHelper.getToken() }
            });
            const json = await res.json();
            if (json.success) setUsers(json.data || []);
        } catch (e) { myError('SYSTEM_ADMIN', e); }
        setLoading(false);
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleCreate = async () => {
        if (!newUser.username || !newUser.password) {
            addToast(t('admin.err_required'), 'error');
            return;
        }

        const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{8,})");
        if (!strongRegex.test(newUser.password)) {
            addToast(t('admin.err_weak_password'), 'error');
            return;
        }
        try {
            const res = await fetch(`${getApiBase()}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': AuthHelper.getToken() },
                body: JSON.stringify(newUser)
            });
            const json = await res.json();
            if (json.success) {
                TrackingHelper.trackCreateAccount(newUser.role);
                addToast(t('admin.create_success'));
                setShowCreate(false);
                setNewUser({ username: '', password: '', displayName: '', role: 'viewer' });
                fetchUsers();
            } else {
                addToast(json.error || t('admin.create_fail'), 'error');
            }
        } catch (e) { addToast(t('admin.conn_error'), 'error'); }
    };

    const handleDelete = async (id, username) => {
        if (!confirm(t('system.delete_confirm').replace('{username}', username))) return;
        try {
            const res = await fetch(`${getApiBase()}/users/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': AuthHelper.getToken() }
            });
            const json = await res.json();
            if (json.success) {
                TrackingHelper.trackBanAccount(id);
                addToast(t('admin.delete_success'));
                fetchUsers();
            } else {
                addToast(json.error || t('admin.delete_fail'), 'error');
            }
        } catch (e) { addToast(t('admin.conn_error'), 'error'); }
    };

    const handleResetPassword = async () => {
        if (!resetPw) { addToast(t('admin.reset_pw_empty'), 'error'); return; }

        const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{8,})");
        if (!strongRegex.test(resetPw)) {
            addToast(t('admin.err_weak_password'), 'error');
            return;
        }
        try {
            const res = await fetch(`${getApiBase()}/users/${resetModal.id}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': AuthHelper.getToken() },
                body: JSON.stringify({ newPassword: resetPw })
            });
            const json = await res.json();
            if (json.success) {
                addToast(`${t('admin.reset_pw_success')} ${resetModal.username}`);
                setResetModal(null);
                setResetPw('');
            } else {
                addToast(json.error || t('admin.reset_pw_fail'), 'error');
            }
        } catch (e) { addToast(t('admin.conn_error'), 'error'); }
    };

    const handleEditUser = async () => {
        try {
            const res = await fetch(`${getApiBase()}/users/${editModal.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': AuthHelper.getToken() },
                body: JSON.stringify(editUser)
            });
            const json = await res.json();
            if (json.success) {
                addToast(t('admin.update_success'));
                setEditModal(null);
                fetchUsers();
            } else {
                addToast(json.error || t('admin.update_fail'), 'error');
            }
        } catch (e) {
            addToast(t('admin.update_conn_error'), 'error');
        }
    };

    const handleExportDb = async () => {
        try {
            setIsProcessingDb(true);
            const res = await fetch(`${getApiBase()}/database/export?format=${exportFormat}&isEncrypted=${exportEncrypted}&tables=${selectedTables.join(',')}`, {
                headers: { 'x-auth-token': AuthHelper.getToken() }
            });
            if (!res.ok) {
                const text = await res.text();
                addToast(t('admin.export_fail') + ' ' + text, 'error');
                setIsProcessingDb(false);
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vufamily_backup_${new Date().toISOString().split('T')[0]}.${exportFormat}${exportEncrypted ? '_encrypted' : ''}.zip`;
            a.click();
            window.URL.revokeObjectURL(url);
            addToast(t('admin.export_success'));
        } catch (e) {
            addToast(t('admin.conn_error'), 'error');
        } finally {
            setIsProcessingDb(false);
        }
    };

    const handleImportDb = async () => {
        if (!importFile) {
            addToast(t('admin.import_file_required'), 'error');
            return;
        }
        if (!confirm(t('system.import_confirm'))) return;

        try {
            setIsProcessingDb(true);
            const formData = new FormData();
            formData.append('file', importFile);
            formData.append('isEncrypted', importEncrypted);
            formData.append('tables', selectedTables.join(','));

            const res = await fetch(`${getApiBase()}/database/import`, {
                method: 'POST',
                headers: { 'x-auth-token': AuthHelper.getToken() },
                body: formData
            });
            const json = await res.json();
            if (json.success) {
                addToast(json.message || t('admin.import_success'), 'success');
                setImportFile(null);
                fetchUsers();
            } else {
                addToast(json.error || t('admin.import_fail'), 'error');
            }
        } catch (e) {
            addToast(t('admin.conn_error'), 'error');
        } finally {
            setIsProcessingDb(false);
            document.getElementById('import-file-input').value = '';
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>{t('system.page_title')}</h2>
                <p className="page-subtitle">{t('system.page_subtitle')}</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border-subtle)', marginBottom: 24, padding: '0 20px' }}>
                <button
                    className={`btn ${activeTab === 'data' ? 'active' : ''}`}
                    onClick={() => setActiveTab('data')}
                    style={{ background: 'transparent', border: 'none', padding: '12px 0', borderBottom: activeTab === 'data' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'data' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'data' ? 600 : 500, borderRadius: 0 }}
                >
                    {t('system.tab_data')}
                </button>
                <button
                    className={`btn ${activeTab === 'accounts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('accounts')}
                    style={{ background: 'transparent', border: 'none', padding: '12px 0', borderBottom: activeTab === 'accounts' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'accounts' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'accounts' ? 600 : 500, borderRadius: 0 }}
                >
                    {t('system.tab_accounts')}
                </button>
            </div>

            <div className="page-body">
                {activeTab === 'data' && (
                    <div style={{ marginBottom: 24 }}>
                        {/* Database section */}
                        <div style={{ padding: 16, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)', flex: 1 }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>{t('system.db_title')}</h3>

                        {/* Bảng dữ liệu được chọn */}
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                            <div>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{t('system.selected_label')}</span>
                                <span style={{ fontSize: 13, color: 'var(--primary)', marginLeft: 8 }}>{selectedTables.length === allTables.length ? t('system.all_tables') : `${selectedTables.length} ${t('system.tables_count')}`}</span>
                            </div>
                            <button className="btn" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setShowTableModal(true)}>{t('system.config_tables')}</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {/* Export */}
                            <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                <p style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600 }}>{t('system.export_title')}</p>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                    <select className="form-input" value={exportFormat} onChange={e => setExportFormat(e.target.value)} style={{ padding: '6px 10px', fontSize: 13, width: 90 }}>
                                        <option value="json">JSON</option>
                                        <option value="csv">CSV</option>
                                    </select>
                                    <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <input type="checkbox" checked={exportEncrypted} onChange={e => setExportEncrypted(e.target.checked)} />
                                        {t('system.encrypt_content')}
                                    </label>
                                </div>
                                <button className="btn btn-primary" onClick={handleExportDb} disabled={isProcessingDb} style={{ width: '100%', padding: '6px 0', fontSize: 13 }}>
                                    {isProcessingDb ? t('system.processing') : t('system.export_btn')}
                                </button>
                            </div>

                            {/* Import */}
                            <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                <p style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600 }}>{t('system.import_title')}</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                                    <input id="import-file-input" type="file" accept=".zip" onChange={e => setImportFile(e.target.files[0])} style={{ fontSize: 12, width: '100%' }} />
                                    <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <input type="checkbox" checked={importEncrypted} onChange={e => setImportEncrypted(e.target.checked)} />
                                        {t('system.decrypt_label')}
                                    </label>
                                </div>
                                <button className="btn" onClick={handleImportDb} disabled={isProcessingDb || !importFile} style={{ width: '100%', padding: '6px 0', fontSize: 13, background: 'var(--accent-error)', color: '#fff', border: 'none' }}>
                                    {isProcessingDb ? t('system.processing') : t('system.import_btn')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                )}

                {activeTab === 'accounts' && (
                <div>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
                            {showCreate ? t('system.close_btn') : t('system.create_account_btn')}
                        </button>
                    </div>

                    {/* Create form */}
                    {showCreate && (
                    <div style={{ marginBottom: 24, padding: 24, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t('system.create_title')}</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>{t('system.username_label')} <span style={{color: 'var(--accent-error)'}}>*</span></label>
                                <input className="form-input" placeholder={t('system.enter_username')}
                                    value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>{t('system.password_label')} <span style={{color: 'var(--accent-error)'}}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input className="form-input" type={showCreatePw ? 'text' : 'password'} placeholder={t('system.enter_password')}
                                        value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', paddingRight: 40, borderRadius: 'var(--radius-md)' }} />
                                    <button type="button" onClick={() => setShowCreatePw(!showCreatePw)}
                                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.6, padding: 4 }}
                                        title={showCreatePw ? t('system.hide_password') : t('system.show_password')}>
                                        {showCreatePw ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>{t('system.display_name')}</label>
                                <input className="form-input" placeholder={t('system.display_name_example')}
                                    value={newUser.displayName} onChange={e => setNewUser({ ...newUser, displayName: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>{t('system.role_label')}</label>
                                <select className="form-input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                                    <option value="viewer">{t('system.role_viewer')}</option>
                                    <option value="editor">{t('system.role_editor')}</option>
                                    <option value="admin">{t('system.role_admin')}</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button className="btn" style={{ padding: '8px 20px', borderRadius: 'var(--radius-md)' }} onClick={() => setShowCreate(false)}>{t('system.cancel')}</button>
                            <button className="btn btn-primary" style={{ padding: '8px 20px', borderRadius: 'var(--radius-md)', fontWeight: 600 }} onClick={handleCreate}>{t('system.create_submit')}</button>
                        </div>
                    </div>
                )}

                {/* Users table */}
                {loading ? (
                    <div className="empty-state"><p>{t('system.loading')}</p></div>
                ) : (
                    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{t('system.user_list')}</h3>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '4px 10px', borderRadius: '20px' }}>{t('system.total_label')} {users.length}</span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left' }}>
                                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('system.col_id')}</th>
                                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('system.col_username')}</th>
                                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('system.col_display_name')}</th>
                                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('system.col_role')}</th>
                                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('system.col_status')}</th>
                                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('system.col_activity')}</th>
                                    <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>{t('system.col_actions')}</th>
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
                                                    <span style={{ color: '#ef4444', fontWeight: 500, fontSize: 13 }}>{t('system.status_banned')}</span>
                                                ) : (
                                                    <span style={{ color: '#10b981', fontWeight: 500, fontSize: 13 }}>{t('system.status_active')}</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                                                {actuallyOnline ? t('system.online_now') : (u.last_active ? `${t('system.last_active')} ${new Date(u.last_active).toLocaleString('vi-VN')}` : t('system.never_active'))}
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                <div className="action-menu-container relative flex justify-center" style={{ position: 'relative' }}>
                                                    <button
                                                        style={{ padding: '8px', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                        onClick={() => setActionMenuId(actionMenuId === u.id ? null : u.id)}
                                                        title={t('system.action_tooltip')}
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="12" r="1" />
                                                            <circle cx="19" cy="12" r="1" />
                                                            <circle cx="5" cy="12" r="1" />
                                                        </svg>
                                                    </button>
                                                    {actionMenuId === u.id && (
                                                        <div style={{ position: 'absolute', right: '50%', top: '100%', transform: 'translateX(50%)', marginTop: 4, width: 180, background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)', overflow: 'hidden', zIndex: 50, display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
                                                            <button
                                                                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--primary)'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                                                                onClick={() => { setEditModal(u); setEditUser({ displayName: u.display_name, role: u.role, status: u.status || 'active' }); setActionMenuId(null); }}
                                                            >
                                                                <span>✏️</span> {t('system.edit_info')}
                                                            </button>
                                                            <button
                                                                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = '#F59E0B'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                                                                onClick={() => { setResetModal(u); setResetPw(''); setActionMenuId(null); }}
                                                            >
                                                                <span>🔑</span> {t('system.change_password')}
                                                            </button>
                                                            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 12px' }}></div>
                                                            <button
                                                                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px', fontSize: 14, fontWeight: 500, color: 'var(--accent-error)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                                                onClick={() => { handleDelete(u.id, u.username); setActionMenuId(null); }}
                                                            >
                                                                <span>🗑️</span> {t('system.delete_account')}
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
                </div>
                )}
                </div>
                )}
            </div>

            {/* Reset password modal */}
            {resetModal && (
                <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setResetModal(null)}>
                    <div className="modal" style={{ width: 400 }}>
                        <div className="modal-header">
                            <h2>{t('system.reset_pw_title')}</h2>
                            <button className="detail-close" onClick={() => setResetModal(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: 12 }}>
                                {t('system.reset_pw_desc')} <strong>{resetModal.display_name || resetModal.username}</strong> ({resetModal.username})
                            </p>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="form-input"
                                    type={showResetPw ? 'text' : 'password'}
                                    placeholder={t('system.reset_pw_placeholder')}
                                    value={resetPw}
                                    onChange={e => setResetPw(e.target.value)}
                                    autoFocus
                                    style={{ paddingRight: 40 }}
                                />
                                <button type="button" onClick={() => setShowResetPw(!showResetPw)}
                                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.6, padding: 4 }}
                                    title={showResetPw ? t('system.hide_password') : t('system.show_password')}>
                                    {showResetPw ? '🙈' : '👁️'}
                                </button>
                            </div>
                            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn" onClick={() => setResetModal(null)}>{t('system.cancel')}</button>
                                <button className="btn btn-primary" onClick={handleResetPassword}>{t('system.reset_pw_submit')}</button>
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
                            <h2>{t('system.edit_title')}</h2>
                            <button className="detail-close" onClick={() => setEditModal(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: 12, color: 'var(--text-muted)' }}>
                                {t('system.edit_desc')} <strong>{editModal.username}</strong>
                            </p>
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label">{t('system.edit_display_name')}</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder={t('system.edit_display_placeholder')}
                                    value={editUser.displayName}
                                    onChange={e => setEditUser({ ...editUser, displayName: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label">{t('system.edit_role')}</label>
                                <select className="form-input" value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value })}>
                                    <option value="viewer">{t('system.role_viewer')}</option>
                                    <option value="editor">{t('system.role_editor')}</option>
                                    <option value="admin">{t('system.role_admin')}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('system.edit_status_label')}</label>
                                <select className="form-input" value={editUser.status} onChange={e => setEditUser({ ...editUser, status: e.target.value })}>
                                    <option value="active">{t('system.edit_status_active')}</option>
                                    <option value="banned">{t('system.edit_status_banned')}</option>
                                </select>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{t('system.edit_status_hint')}</p>
                            </div>
                            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn" onClick={() => setEditModal(null)}>{t('system.cancel')}</button>
                                <button className="btn btn-primary" onClick={handleEditUser}>{t('system.save_changes')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* DB Table Config Modal */}
            {showTableModal && (
                <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowTableModal(false)}>
                    <div className="modal" style={{ width: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h2>{t('system.table_config_title')}</h2>
                            <button className="detail-close" onClick={() => setShowTableModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ overflowY: 'auto' }}>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                                {t('system.table_config_desc')}
                            </p>

                            <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
                                <button className="btn" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setSelectedTables(allTables)}>{t('system.select_all')}</button>
                                <button className="btn" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setSelectedTables([])}>{t('system.deselect_all')}</button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                                {allTables.map(t => (
                                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', padding: '6px 8px', borderRadius: 4, background: selectedTables.includes(t) ? 'var(--bg-hover)' : 'transparent' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedTables.includes(t)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedTables([...selectedTables, t]);
                                                else setSelectedTables(selectedTables.filter(x => x !== t));
                                            }}
                                        />
                                        {t}
                                    </label>
                                ))}
                            </div>

                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="btn btn-primary" onClick={() => setShowTableModal(false)}>{t('system.done')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
