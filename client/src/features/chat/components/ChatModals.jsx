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
    handleLeaveGroup,
    handleUpdateSettings,
    handleAddMember
}) {
    const { t } = useTranslation();
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [addSearchQuery, setAddSearchQuery] = useState('');

    const filteredUsers = allUsers.filter(u => 
        (u.display_name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(userSearchQuery.toLowerCase())
    );

    return (
        <>
            {/* NEW CHAT MODAL */}
            {showNewChat && (
                <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowNewChat(false)}>
                    <div className="modal" style={{ width: 440, display: 'flex', flexDirection: 'column', maxHeight: '85vh', overflow: 'hidden' }}>
                        <div className="modal-header">
                            <h2>{t('chat.start_chat_title')}</h2>
                            <button className="detail-close" onClick={() => { setShowNewChat(false); setUserSearchQuery(''); }}>✕</button>
                        </div>
                        
                        {/* Search and Selected Users Area (Fixed below Header) */}
                        <div style={{ padding: '16px 24px 12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>{t('chat.select_users_hint')}</p>

                            {/* User Search Input */}
                            <div style={{ marginBottom: 12 }}>
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

                            {/* Selected User Chips */}
                            {selectedUserIds.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, maxHeight: '90px', overflowY: 'auto' }}>
                                    {selectedUserIds.map(id => {
                                        const u = allUsers.find(member => member.id === id);
                                        if (!u) return null;
                                        return (
                                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 20, fontSize: 12 }}>
                                                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>
                                                    {u.avatar ? <img src={u.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="avatar" /> : u.display_name?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name || u.username}</span>
                                                <button 
                                                    onClick={() => toggleSelectUser(u.id)}
                                                    style={{ border: 'none', background: 'transparent', padding: '0 2px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 10, fontWeight: 'bold' }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Scrollable Members List */}
                        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
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
                                                borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                                                transition: 'all 0.15s ease'
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
                        </div>

                        {/* Fixed Footer at the bottom */}
                        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px 24px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'center' }}>
                            <button 
                                className="btn btn-primary" 
                                style={{ 
                                    width: '100%', 
                                    justifyContent: 'center',
                                    opacity: selectedUserIds.length === 0 ? 0.55 : 1,
                                    pointerEvents: selectedUserIds.length === 0 ? 'none' : 'auto',
                                    cursor: selectedUserIds.length === 0 ? 'not-allowed' : 'pointer'
                                }} 
                                onClick={handleCreateRoom}
                                disabled={selectedUserIds.length === 0}
                            >
                                {t('chat.start_chat_btn')} {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GROUP INFO MODAL */}
            {showGroupInfo && activeRoom && (
                <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && (setShowGroupInfo(false) || setIsAddingMember(false))}>
                    <div className="modal" style={{ width: 440, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div className="modal-header">
                            <h2>{t('chat.group_detail_title')} {activeRoom.type === 'group' ? t('chat.group_label') : t('chat.conversation_label')}</h2>
                            <button className="detail-close" onClick={() => { setShowGroupInfo(false); setIsAddingMember(false); }}>✕</button>
                        </div>
                        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            {isAddingMember ? (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{t('chat.add_member_modal_title')}</h4>
                                        <button className="btn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => setIsAddingMember(false)}>✕ Quay lại</button>
                                    </div>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder={t('chat.search_members_placeholder')}
                                        value={addSearchQuery}
                                        onChange={e => setAddSearchQuery(e.target.value)}
                                        style={{ marginBottom: 12, borderRadius: 8, padding: '8px 12px', fontSize: 13, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', boxSizing: 'border-box', width: '100%' }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '45vh', overflowY: 'auto' }}>
                                        {(() => {
                                            const currentMemberIds = activeRoom.members?.map(m => m.id) || [];
                                            const nonMembers = allUsers.filter(u => !currentMemberIds.includes(u.id));
                                            const filtered = nonMembers.filter(u => 
                                                (u.display_name || '').toLowerCase().includes(addSearchQuery.toLowerCase()) ||
                                                (u.username || '').toLowerCase().includes(addSearchQuery.toLowerCase())
                                            );
                                            
                                            if (filtered.length === 0) {
                                                return (
                                                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                                        Chưa tìm thấy người phù hợp hoặc tất cả đã tham gia nhóm.
                                                    </div>
                                                );
                                            }
                                            return filtered.map(u => (
                                                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                                                        <div style={{ width: 28, height: 28, minWidth: 28, borderRadius: '50%', background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                                                            {u.avatar ? <img src={u.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="avatar" /> : u.display_name?.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name || u.username}</div>
                                                    </div>
                                                    <button 
                                                        className="btn btn-primary" 
                                                        style={{ padding: '4px 10px', fontSize: 11 }}
                                                        onClick={() => {
                                                            handleAddMember(u.id);
                                                            setIsAddingMember(false);
                                                        }}
                                                    >
                                                        Thêm
                                                    </button>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <>
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
                                            {/* Invite Code & QR Link */}
                                            {activeRoom.inviteCode && (
                                                <div style={{ 
                                                    background: 'var(--bg-secondary)', 
                                                    border: '1px solid var(--border-subtle)', 
                                                    borderRadius: 12, 
                                                    padding: 16, 
                                                    marginBottom: 16,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: 8
                                                }}>
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('chat.invite_code_label')}</div>
                                                    <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-primary)' }}>
                                                        {activeRoom.inviteCode}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                                        <button 
                                                            className="btn" 
                                                            style={{ padding: '6px 12px', fontSize: 12 }}
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(activeRoom.inviteCode);
                                                                alert(t('chat.invite_code_copied') || "Đã sao chép mã mời!");
                                                            }}
                                                        >
                                                            📋 {t('chat.copy_invite_code')}
                                                        </button>
                                                        <button 
                                                            className="btn" 
                                                            style={{ padding: '6px 12px', fontSize: 12 }}
                                                            onClick={() => {
                                                                const inviteLink = `${window.location.origin}/chat?invite=${activeRoom.inviteCode}`;
                                                                navigator.clipboard.writeText(inviteLink);
                                                                alert(t('chat.invite_link_copied') || "Đã sao chép liên kết mời!");
                                                            }}
                                                        >
                                                            🔗 {t('chat.copy_invite_link')}
                                                        </button>
                                                    </div>
                                                    
                                                    {/* QR Code */}
                                                    <img 
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`${window.location.origin}/chat?invite=${activeRoom.inviteCode}`)}`} 
                                                        alt="Invite QR" 
                                                        style={{ width: 110, height: 110, borderRadius: 8, marginTop: 8, border: '4px solid #fff' }} 
                                                    />
                                                </div>
                                            )}

                                            {/* Allow Add Settings (Admin only) */}
                                            {currentUserRole === 'admin' && (
                                                <div style={{ 
                                                    background: 'var(--bg-secondary)', 
                                                    border: '1px solid var(--border-subtle)', 
                                                    borderRadius: 12, 
                                                    padding: '10px 16px', 
                                                    marginBottom: 16,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}>
                                                    <span style={{ fontSize: 13, fontWeight: 500 }}>{t('chat.member_add_permission')}</span>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={activeRoom.allowAdd || false}
                                                        onChange={(e) => handleUpdateSettings(e.target.checked)}
                                                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                                                    />
                                                </div>
                                            )}

                                            {/* Add member button */}
                                            {(currentUserRole === 'admin' || activeRoom.allowAdd) && (
                                                <button 
                                                    className="btn" 
                                                    style={{ width: '100%', marginBottom: 16, display: 'flex', justifyContent: 'center' }} 
                                                    onClick={() => { setIsAddingMember(true); setAddSearchQuery(''); }}
                                                >
                                                    {t('chat.add_member_btn')}
                                                </button>
                                            )}

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
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
