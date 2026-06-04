import React, { useState } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';

export default function ChatModals({
    showNewChat,
    setShowNewChat,
    showGroupInfo,
    setShowGroupInfo,
    activeRoom,
    user,
    allUsers,
    selectedUserIds,
    toggleSelectUser,
    handleCreateRoom,
    currentUserRole,
    handleKickMember,
    handleLeaveGroup
}) {
    const { t } = useTranslation();
    const [userSearchQuery, setUserSearchQuery] = useState('');

    const filteredUsers = allUsers.filter(u => 
        (u.display_name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(userSearchQuery.toLowerCase())
    );

    return (
        <>
            {/* NEW CHAT MODAL */}
            {showNewChat && (
                <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowNewChat(false)}>
                    <div className="modal" style={{ width: 440 }}>
                        <div className="modal-header">
                            <h2>{t('chat.start_chat_title')}</h2>
                            <button className="detail-close" onClick={() => { setShowNewChat(false); setUserSearchQuery(''); }}>✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>{t('chat.select_users_hint')}</p>

                            {/* User Search Input */}
                            <div style={{ marginBottom: 16 }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder={t('chat.search_members_placeholder')}
                                    value={userSearchQuery}
                                    onChange={e => setUserSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        borderRadius: 8,
                                        padding: '8px 12px',
                                        fontSize: 13,
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-subtle)',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {filteredUsers.length === 0 ? (
                                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                        {t('chat.no_member_found')}
                                    </div>
                                ) : (
                                    filteredUsers.map(u => (
                                        <div key={u.id}
                                            onClick={() => toggleSelectUser(u.id)}
                                            style={{
                                                padding: '10px 12px', border: '1px solid',
                                                borderColor: selectedUserIds.includes(u.id) ? 'var(--primary)' : 'var(--border-subtle)',
                                                background: selectedUserIds.includes(u.id) ? 'rgba(37,99,235,0.05)' : 'transparent',
                                                borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12
                                            }}
                                        >
                                            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid', borderColor: selectedUserIds.includes(u.id) ? 'var(--primary)' : '#cbd5e1', background: selectedUserIds.includes(u.id) ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {selectedUserIds.includes(u.id) && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }}></span>}
                                            </div>
                                            <div style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, flexShrink: 0, borderRadius: '50%', background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                                {u.avatar ? <img src={u.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="avatar" /> : u.display_name?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 500 }}>{u.display_name || u.username}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    {u.is_online ? t('chat.online_label') : t('chat.offline_label')}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {selectedUserIds.length > 0 && (
                                <button className="btn btn-primary" style={{ width: '100%', marginTop: 24, justifyContent: 'center' }} onClick={handleCreateRoom}>
                                    {t('chat.start_chat_btn')} ({selectedUserIds.length})
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* GROUP INFO MODAL */}
            {showGroupInfo && activeRoom && (
                <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowGroupInfo(false)}>
                    <div className="modal" style={{ width: 440 }}>
                        <div className="modal-header">
                            <h2>{t('chat.group_detail_title')} {activeRoom.type === 'group' ? t('chat.group_label') : t('chat.conversation_label')}</h2>
                            <button className="detail-close" onClick={() => setShowGroupInfo(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                                <div style={{ width: 80, height: 80, borderRadius: '50%', background: activeRoom.type === 'group' ? 'linear-gradient(135deg, #10b981, #047857)' : 'linear-gradient(135deg, var(--gold), var(--gold-dark))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 'bold', marginBottom: 12 }}>
                                    {activeRoom?.avatar ? <img src={activeRoom.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="avatar" /> : (activeRoom.type === 'group' ? '👥' : activeRoom.display_name?.substring(0, 2).toUpperCase())}
                                </div>
                                <h3 style={{ margin: 0, fontSize: 20 }}>{activeRoom.display_name}</h3>
                                {activeRoom.type === 'group' && (
                                    <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{activeRoom.members?.length || 0} {t('chat.members_count')}</div>
                                )}
                            </div>

                            {activeRoom.type === 'group' && (
                                <>
                                    <h4 style={{ fontSize: 15, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, marginBottom: 16 }}>{t('chat.group_members')}</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                                        {activeRoom.members?.map(m => (
                                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                                                    {m.avatar ? <img src={m.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="avatar" /> : m.display_name?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {m.id === user.id ? t('chat.you') : (m.display_name || m.username)}
                                                        {m.role === 'admin' && <span style={{ fontSize: 10, background: 'var(--primary)', color: '#fff', padding: '2px 6px', borderRadius: 10 }}>{t('chat.admin_role')}</span>}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.is_online ? t('chat.online_label') : t('chat.offline_label')}</div>
                                                </div>
                                                {currentUserRole === 'admin' && m.id !== user.id && m.role !== 'admin' && (
                                                    <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleKickMember(m.id, m.display_name || m.username)}>
                                                        {t('chat.remove_member')}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                                        <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} onClick={handleLeaveGroup}>
                                            {t('chat.leave_group')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
