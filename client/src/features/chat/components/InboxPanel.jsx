import React, { useState } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';

export default function InboxPanel({
    rooms,
    loadingRooms,
    activeRoomId,
    setActiveRoomId,
    setShowNewChat
}) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredRooms = rooms.filter(room => 
        (room.display_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="chat-inbox-panel">
            <div style={{ padding: '16px 16px 12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 18, margin: 0 }}>{t('chat.messages_title')}</h2>
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setShowNewChat(true)}>
                    {t('chat.new_chat_btn')}
                </button>
            </div>

            {/* Search Input for Active Rooms */}
            <div style={{ padding: '0 16px 12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <input
                    type="text"
                    className="form-input"
                    placeholder={t('chat.search_rooms_placeholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ 
                        width: '100%', 
                        borderRadius: 20, 
                        padding: '8px 16px', 
                        fontSize: 13, 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-subtle)',
                        boxSizing: 'border-box'
                    }}
                />
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loadingRooms ? <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div> : null}
                {!loadingRooms && rooms.length === 0 && (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                        {t('chat.no_rooms')}<br /><br />
                        <button className="btn" onClick={() => setShowNewChat(true)}>{t('chat.start_messaging')}</button>
                    </div>
                )}
                {!loadingRooms && rooms.length > 0 && filteredRooms.length === 0 && (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('chat.no_search_result')}
                    </div>
                )}
                {filteredRooms.map(room => (
                    <div
                        key={room.id}
                        onClick={() => setActiveRoomId(room.id)}
                        style={{
                            padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer',
                            background: activeRoomId === room.id ? 'var(--bg-hover)' : 'transparent',
                            display: 'flex', alignItems: 'center', gap: 12
                        }}
                    >
                        <div style={{ position: 'relative', width: 40, height: 40, minWidth: 40, minHeight: 40, flexShrink: 0 }}>
                            {room.avatar ? (
                                <img src={room.avatar} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: room.type === 'group' ? 'linear-gradient(135deg, #10b981, #047857)' : 'linear-gradient(135deg, var(--gold), var(--gold-dark))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 'bold' }}>
                                    {room.type === 'group' ? '👥' : (room.display_name?.substring(0, 2).toUpperCase() || 'U')}
                                </div>
                            )}
                            {room.type === 'direct' && room.is_online && (
                                <span style={{ position: 'absolute', bottom: 1, right: 1, width: 14, height: 14, borderRadius: '50%', background: '#10b981', border: '2.5px solid var(--bg-secondary)', zIndex: 1 }}></span>
                            )}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{room.display_name || (room.type === 'group' ? t('chat.unnamed_group') : t('chat.user_label'))}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 4 }}>
                                {room.type === 'group' ? `${room.members?.length || 0} ${t('chat.members_count')}` : (room.is_online ? t('chat.active') : t('chat.offline_status'))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
