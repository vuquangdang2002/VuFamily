import React, { useState } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';

/**
 * NewChatModal — modal for starting a new 1-on-1 or group chat.
 * Props: showNewChat, setShowNewChat, allUsers, selectedUserIds, toggleSelectUser, handleCreateRoom
 */
export default function NewChatModal({ showNewChat, setShowNewChat, allUsers, selectedUserIds, toggleSelectUser, handleCreateRoom }) {
    const { t } = useTranslation();
    const [userSearchQuery, setUserSearchQuery] = useState('');

    if (!showNewChat) return null;

    const filteredUsers = allUsers.filter(u =>
        (u.display_name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(userSearchQuery.toLowerCase())
    );

    return (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowNewChat(false)}>
            <div className="modal" style={{ width: 440, display: 'flex', flexDirection: 'column', maxHeight: '85vh', overflow: 'hidden' }}>
                <div className="modal-header">
                    <h2>{t('chat.start_chat_title')}</h2>
                    <button className="detail-close" onClick={() => { setShowNewChat(false); setUserSearchQuery(''); }}>✕</button>
                </div>

                {/* Search & Chips — Fixed below header */}
                <div style={{ padding: '16px 24px 12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>{t('chat.select_users_hint')}</p>
                    <div style={{ marginBottom: 12 }}>
                        <input type="text" className="form-input" placeholder={t('chat.search_members_placeholder')} value={userSearchQuery}
                            onChange={e => setUserSearchQuery(e.target.value)}
                            style={{ width: '100%', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', boxSizing: 'border-box' }} />
                    </div>
                    {selectedUserIds.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, maxHeight: '90px', overflowY: 'auto' }}>
                            {selectedUserIds.map(id => {
                                const u = allUsers.find(m => m.id === id);
                                if (!u) return null;
                                return (
                                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 20, fontSize: 12 }}>
                                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>
                                            {u.avatar ? <img src={u.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="avatar" /> : u.display_name?.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name || u.username}</span>
                                        <button onClick={() => toggleSelectUser(u.id)} style={{ border: 'none', background: 'transparent', padding: '0 2px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 10, fontWeight: 'bold' }}>✕</button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Scrollable member list */}
                <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {filteredUsers.length === 0 ? (
                            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{t('chat.no_member_found')}</div>
                        ) : filteredUsers.map(u => (
                            <div key={u.id} onClick={() => toggleSelectUser(u.id)}
                                style={{ padding: '10px 12px', border: '1px solid', borderColor: selectedUserIds.includes(u.id) ? 'var(--primary)' : 'var(--border-subtle)', background: selectedUserIds.includes(u.id) ? 'rgba(37,99,235,0.05)' : 'transparent', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s ease' }}>
                                <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid', borderColor: selectedUserIds.includes(u.id) ? 'var(--primary)' : '#cbd5e1', background: selectedUserIds.includes(u.id) ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {selectedUserIds.includes(u.id) && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }}></span>}
                                </div>
                                <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: '50%', background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                    {u.avatar ? <img src={u.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="avatar" /> : u.display_name?.substring(0, 2).toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500 }}>{u.display_name || u.username}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.is_online ? t('chat.online_label') : t('chat.offline_label')}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Fixed footer */}
                <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px 24px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'center' }}>
                    <button className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', opacity: selectedUserIds.length === 0 ? 0.55 : 1, pointerEvents: selectedUserIds.length === 0 ? 'none' : 'auto' }}
                        onClick={handleCreateRoom} disabled={selectedUserIds.length === 0}>
                        {t('chat.start_chat_btn')} {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
}
