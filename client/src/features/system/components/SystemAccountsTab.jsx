import React, { useState, useEffect } from 'react';
import { getApiBase } from '../../../shared/services/api';
import { AuthHelper } from '../../../shared/services/AuthHelper';
import { TrackingHelper } from '../../../shared/services/TrackingHelper';
import { useTranslation } from '../../../shared/hooks/useTranslation';

export default function SystemAccountsTab({ users, loading, fetchUsers, addToast }) {
    const { t } = useTranslation();
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
                fetchUsers?.();
            } else {
                addToast(json.error || t('admin.create_fail'), 'error');
            }
        } catch (e) {
            addToast(t('admin.conn_error'), 'error');
        }
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
                fetchUsers?.();
            } else {
                addToast(json.error || t('admin.delete_fail'), 'error');
            }
        } catch (e) {
            addToast(t('admin.conn_error'), 'error');
        }
    };

    const handleResetPassword = async () => {
        if (!resetPw) {
            addToast(t('admin.reset_pw_empty'), 'error');
            return;
        }

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
        } catch (e) {
            addToast(t('admin.conn_error'), 'error');
        }
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
                fetchUsers?.();
            } else {
                addToast(json.error || t('admin.update_fail'), 'error');
            }
        } catch (e) {
            addToast(t('admin.update_conn_error'), 'error');
        }
    };

    return (
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
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>{t('system.username_label')} <span style={{ color: 'var(--accent-error)' }}>*</span></label>
                            <input className="form-input" placeholder={t('system.enter_username')}
                                value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>{t('system.password_label')} <span style={{ color: 'var(--accent-error)' }}>*</span></label>
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
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
        </div>
    );
}
