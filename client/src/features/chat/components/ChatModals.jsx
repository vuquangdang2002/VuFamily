import React, { useState, useEffect } from 'react';
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
    handleAddMember,
    handleUpdateMemberRole
}) {
    const { t } = useTranslation();
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [addSearchQuery, setAddSearchQuery] = useState('');
    const [selectedToAddUserIds, setSelectedToAddUserIds] = useState([]);

    useEffect(() => {
        if (!isAddingMember) {
            setSelectedToAddUserIds([]);
            setAddSearchQuery('');
        }
    }, [isAddingMember]);

    const handleToggleSelectToAdd = (userId) => {
        setSelectedToAddUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

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
                            <h2>{isAddingMember ? t('chat.add_member_modal_title') : `${t('chat.group_detail_title')} ${activeRoom.type === 'group' ? t('chat.group_label') : t('chat.conversation_label')}`}</h2>
                            <button className="detail-close" onClick={() => { 
                                if (isAddingMember) {
                                    setIsAddingMember(false);
                                } else {
                                    setShowGroupInfo(false);
                                }
                            }}>✕</button>
                        </div>
                        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            {isAddingMember ? (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{t('chat.select_users_hint')}</h4>
                                    </div>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder={t('chat.search_members_placeholder')}
                                        value={addSearchQuery}
                                        onChange={e => setAddSearchQuery(e.target.value)}
                                        style={{ marginBottom: 16, borderRadius: 8, padding: '8px 12px', fontSize: 13, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', boxSizing: 'border-box', width: '100%' }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '42vh', overflowY: 'auto' }}>
                                        {(() => {
                                            const currentMemberIds = activeRoom.members?.map(m => m.id) || [];
                                            const selectionUsers = allUsers.filter(u => u.id !== user.id);
                                            const filtered = selectionUsers.filter(u => 
                                                (u.display_name || '').toLowerCase().includes(addSearchQuery.toLowerCase()) ||
                                                (u.username || '').toLowerCase().includes(addSearchQuery.toLowerCase())
                                            );
                                            
                                            if (filtered.length === 0) {
                                                return (
                                                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                                        Chưa tìm thấy thành viên nào phù hợp
                                                    </div>
                                                );
                                            }
                                            return filtered.map(u => {
                                                const isAlreadyMember = currentMemberIds.includes(u.id);
                                                const isSelected = selectedToAddUserIds.includes(u.id);
                                                return (
                                                    <div 
                                                        key={u.id} 
                                                        onClick={() => !isAlreadyMember && handleToggleSelectToAdd(u.id)}
                                                        style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'space-between', 
                                                            padding: '10px 12px', 
                                                            background: isAlreadyMember ? 'rgba(255, 255, 255, 0.02)' : (isSelected ? 'rgba(37,99,235,0.08)' : 'transparent'), 
                                                            border: '1px solid',
                                                            borderColor: isSelected ? 'var(--primary)' : 'var(--border-subtle)', 
                                                            borderRadius: 8,
                                                            cursor: isAlreadyMember ? 'not-allowed' : 'pointer',
                                                            opacity: isAlreadyMember ? 0.65 : 1,
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                                                            {/* Custom Checkbox */}
                                                            <div style={{ 
                                                                width: 18, 
                                                                height: 18, 
                                                                borderRadius: '50%', 
                                                                border: '2px solid', 
                                                                borderColor: isAlreadyMember ? '#64748b' : (isSelected ? 'var(--primary)' : '#cbd5e1'), 
                                                                background: isAlreadyMember ? '#64748b' : (isSelected ? 'var(--primary)' : 'transparent'), 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                justifyContent: 'center',
                                                                flexShrink: 0 
                                                            }}>
                                                                {isAlreadyMember && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                                                                {!isAlreadyMember && isSelected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }}></span>}
                                                            </div>

                                                            <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: '50%', background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                                                                {u.avatar ? <img src={u.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="avatar" /> : u.display_name?.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name || u.username}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                                            {isAlreadyMember ? (
                                                                <button 
                                                                    className="btn" 
                                                                    disabled 
                                                                    style={{ 
                                                                        padding: '4px 10px', 
                                                                        fontSize: 11, 
                                                                        fontWeight: 600, 
                                                                        background: 'rgba(255,255,255,0.03)', 
                                                                        color: 'var(--text-muted)', 
                                                                        border: '1px solid var(--border-subtle)',
                                                                        cursor: 'not-allowed',
                                                                        pointerEvents: 'none'
                                                                    }}
                                                                >
                                                                    Đã tham gia
                                                                </button>
                                                            ) : isSelected ? (
                                                                <button 
                                                                    className="btn btn-primary" 
                                                                    onClick={(e) => { e.stopPropagation(); handleToggleSelectToAdd(u.id); }}
                                                                    style={{ 
                                                                        padding: '4px 10px', 
                                                                        fontSize: 11, 
                                                                        fontWeight: 600, 
                                                                        background: 'var(--primary)', 
                                                                        color: '#fff',
                                                                        border: 'none',
                                                                        borderRadius: 6
                                                                    }}
                                                                >
                                                                    Đã chọn
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    className="btn" 
                                                                    onClick={(e) => { e.stopPropagation(); handleToggleSelectToAdd(u.id); }}
                                                                    style={{ 
                                                                        padding: '4px 10px', 
                                                                        fontSize: 11, 
                                                                        fontWeight: 600, 
                                                                        background: 'transparent', 
                                                                        color: 'var(--text-primary)', 
                                                                        border: '1px solid var(--border-subtle)',
                                                                        borderRadius: 6
                                                                    }}
                                                                >
                                                                    + Chọn
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            });
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
                                                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.02) 100%)', 
                                                    border: '1px solid rgba(212, 175, 55, 0.25)', 
                                                    borderRadius: 16, 
                                                    padding: '24px 20px', 
                                                    marginBottom: 20,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
                                                    backdropFilter: 'blur(8px)'
                                                }}>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                                                        {t('chat.invite_code_label')}
                                                    </div>
                                                    <div style={{ 
                                                        fontSize: 24, 
                                                        fontWeight: 800, 
                                                        color: 'var(--gold)', 
                                                        letterSpacing: 3, 
                                                        fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
                                                        padding: '8px 24px',
                                                        background: 'rgba(0, 0, 0, 0.2)',
                                                        borderRadius: 10,
                                                        border: '1px dashed rgba(212, 175, 55, 0.4)',
                                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                                                        textShadow: '0 0 12px rgba(212, 175, 55, 0.3)'
                                                    }}>
                                                        {activeRoom.inviteCode}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 4 }}>
                                                        <button 
                                                            className="btn" 
                                                            style={{ 
                                                                flex: 1, 
                                                                padding: '10px 14px', 
                                                                fontSize: 12, 
                                                                fontWeight: 600,
                                                                justifyContent: 'center',
                                                                background: 'rgba(212, 175, 55, 0.12)',
                                                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                                                color: 'var(--gold)',
                                                                borderRadius: 8,
                                                                transition: 'all 0.2s ease',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(activeRoom.inviteCode);
                                                                alert(t('chat.invite_code_copied') || "Đã sao chép mã mời!");
                                                            }}
                                                        >
                                                            📋 {t('chat.copy_invite_code')}
                                                        </button>
                                                        <button 
                                                            className="btn" 
                                                            style={{ 
                                                                flex: 1, 
                                                                padding: '10px 14px', 
                                                                fontSize: 12, 
                                                                fontWeight: 600,
                                                                justifyContent: 'center',
                                                                background: 'rgba(212, 175, 55, 0.12)',
                                                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                                                color: 'var(--gold)',
                                                                borderRadius: 8,
                                                                transition: 'all 0.2s ease',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => {
                                                                const inviteLink = `${window.location.origin}/chat?invite=${activeRoom.inviteCode}`;
                                                                navigator.clipboard.writeText(inviteLink);
                                                                alert(t('chat.invite_link_copied') || "Đã sao chép liên kết mời!");
                                                            }}
                                                        >
                                                            🔗 {t('chat.copy_invite_link')}
                                                        </button>
                                                    </div>
                                                    
                                                    {/* QR Code Container */}
                                                    <div style={{ 
                                                        marginTop: 10, 
                                                        padding: 12, 
                                                        background: '#ffffff', 
                                                        borderRadius: 14, 
                                                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '1px solid rgba(255,255,255,0.1)'
                                                    }}>
                                                        <img 
                                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}/chat?invite=${activeRoom.inviteCode}`)}`} 
                                                            alt="Invite QR" 
                                                            style={{ width: 120, height: 120, display: 'block' }} 
                                                        />
                                                    </div>

                                                    {/* Download QR Button */}
                                                    <button 
                                                        className="btn" 
                                                        style={{ 
                                                            marginTop: 4, 
                                                            padding: '10px 14px', 
                                                            fontSize: 12, 
                                                            fontWeight: 600,
                                                            justifyContent: 'center',
                                                            background: 'rgba(212, 175, 55, 0.12)',
                                                            border: '1px solid rgba(212, 175, 55, 0.3)',
                                                            color: 'var(--gold)',
                                                            borderRadius: 8,
                                                            transition: 'all 0.2s ease',
                                                            cursor: 'pointer',
                                                            width: '100%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 6
                                                        }}
                                                        onClick={async () => {
                                                            try {
                                                                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${window.location.origin}/chat?invite=${activeRoom.inviteCode}`)}`;
                                                                const res = await fetch(qrUrl);
                                                                const blob = await res.blob();
                                                                const url = window.URL.createObjectURL(blob);
                                                                const a = document.createElement('a');
                                                                a.href = url;
                                                                a.download = `QR_Invite_${activeRoom.inviteCode}.png`;
                                                                document.body.appendChild(a);
                                                                a.click();
                                                                document.body.removeChild(a);
                                                                window.URL.revokeObjectURL(url);
                                                            } catch (err) {
                                                                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${window.location.origin}/chat?invite=${activeRoom.inviteCode}`)}`;
                                                                window.open(qrUrl, '_blank');
                                                            }
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(212, 175, 55, 0.2)';
                                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(212, 175, 55, 0.12)';
                                                            e.currentTarget.style.transform = 'none';
                                                        }}
                                                    >
                                                        📥 {t('chat.download_qr')}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Allow Add Settings (Admin only) */}
                                            {currentUserRole === 'admin' && (
                                                <div 
                                                    style={{ 
                                                        background: 'var(--bg-secondary)', 
                                                        border: '1px solid var(--border-subtle)', 
                                                        borderRadius: 12, 
                                                        padding: '12px 16px', 
                                                        marginBottom: 16,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => handleUpdateSettings(!activeRoom.allowAdd)}
                                                >
                                                    <span style={{ fontSize: 13, fontWeight: 500 }}>{t('chat.member_add_permission')}</span>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={activeRoom.allowAdd || false}
                                                        readOnly
                                                        style={{ width: 18, height: 18, cursor: 'pointer', pointerEvents: 'none' }}
                                                    />
                                                </div>
                                            )}

                                            {/* Add member button */}
                                            {(currentUserRole === 'admin' || activeRoom.allowAdd) && (
                                                <button 
                                                    className="btn" 
                                                    style={{ width: '100%', marginBottom: 16, display: 'flex', justifyContent: 'center' }} 
                                                    onClick={() => { setIsAddingMember(true); }}
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
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                                                                    {m.display_name || m.username}
                                                                </span>
                                                                {m.id === user.id && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(Bạn)</span>}
                                                                {m.role === 'admin' && <span style={{ fontSize: 10, background: 'var(--primary)', color: '#fff', padding: '2px 6px', borderRadius: 10 }}>{t('chat.admin_role')}</span>}
                                                            </div>
                                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.is_online ? t('chat.online_label') : t('chat.offline_label')}</div>
                                                        </div>
                                                        {currentUserRole === 'admin' && m.id !== user.id && (
                                                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                                {m.role === 'admin' ? (
                                                                    <button 
                                                                        className="btn" 
                                                                        style={{ 
                                                                            padding: '4px 8px', 
                                                                            fontSize: 12,
                                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                            color: '#ef4444',
                                                                            borderRadius: 6,
                                                                            cursor: 'pointer'
                                                                        }} 
                                                                        onClick={() => handleUpdateMemberRole(m.id, 'member')}
                                                                    >
                                                                        Gỡ QTV
                                                                    </button>
                                                                ) : (
                                                                    <>
                                                                        <button 
                                                                            className="btn" 
                                                                            style={{ 
                                                                                padding: '4px 8px', 
                                                                                fontSize: 12,
                                                                                background: 'rgba(212, 175, 55, 0.1)',
                                                                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                                                                color: 'var(--gold)',
                                                                                borderRadius: 6,
                                                                                cursor: 'pointer'
                                                                            }} 
                                                                            onClick={() => handleUpdateMemberRole(m.id, 'admin')}
                                                                        >
                                                                            Bổ nhiệm
                                                                        </button>
                                                                        <button 
                                                                            className="btn btn-danger" 
                                                                            style={{ padding: '4px 8px', fontSize: 12, cursor: 'pointer' }} 
                                                                            onClick={() => handleKickMember(m.id, m.display_name || m.username)}
                                                                        >
                                                                            {t('chat.remove_member')}
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
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

                        {/* Fixed Footer for Member Selection Confirmations */}
                        {isAddingMember && (
                            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px 24px', background: 'var(--bg-secondary)', display: 'flex', gap: 12 }}>
                                <button 
                                    className="btn" 
                                    style={{ flex: 1, justifyContent: 'center' }} 
                                    onClick={() => setIsAddingMember(false)}
                                >
                                    {t('chat.cancel_btn') || "Hủy"}
                                </button>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ 
                                        flex: 1, 
                                        justifyContent: 'center',
                                        opacity: selectedToAddUserIds.length === 0 ? 0.55 : 1,
                                        pointerEvents: selectedToAddUserIds.length === 0 ? 'none' : 'auto',
                                        cursor: selectedToAddUserIds.length === 0 ? 'not-allowed' : 'pointer'
                                    }} 
                                    onClick={() => {
                                        handleAddMember(selectedToAddUserIds);
                                        setIsAddingMember(false);
                                    }}
                                    disabled={selectedToAddUserIds.length === 0}
                                >
                                    Thêm vào nhóm ({selectedToAddUserIds.length})
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
