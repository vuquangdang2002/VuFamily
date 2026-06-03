import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { getApiBase } from '../../../shared/services/api';
import { AuthHelper } from '../../../shared/services/AuthHelper';
import { cacheSingleMessage } from '../../../shared/services/chatCache';
import { TrackingHelper } from '../../../shared/services/TrackingHelper';
import { myError } from '../../../shared/utils/logger';

export default function MessagePanel({
    activeRoomId,
    activeRoom,
    messages,
    setMessages,
    user,
    onStartCall,
    setShowGroupInfo,
    handleRenameGroup,
    addToast,
    fetchRooms,
    latestMsgTimeRef
}) {
    const { t } = useTranslation();
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // Scroll to bottom when activeRoomId changes or messages change
    useEffect(() => {
        scrollToBottom();
    }, [activeRoomId, messages.length]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !activeRoomId) return;

        const content = inputText;
        setInputText(''); // optimistic clear

        try {
            const res = await fetch(`${getApiBase()}/chats/${activeRoomId}/messages`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'x-auth-token': AuthHelper.getToken() 
                },
                body: JSON.stringify({ content })
            });
            const json = await res.json();
            if (json.success) {
                // Immediately append + cache
                setMessages(prev => [...prev, json.data]);
                TrackingHelper.trackSendChatMessage(activeRoom?.type || 'direct');
                cacheSingleMessage(activeRoomId, json.data).catch((err) => { 
                    myError('CHAT', "ChatPage Background Sync Error:", err); 
                });
                if (latestMsgTimeRef) {
                    latestMsgTimeRef.current = json.data.created_at;
                }
                scrollToBottom();
                fetchRooms(); // to update read/last msg time
            } else {
                addToast(json.error || t('chat.send_fail'), 'error');
            }
        } catch (err) {
            addToast(t('chat.network_error'), 'error');
        }
    };

    if (!activeRoomId) {
        return (
            <div className="chat-messages-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                {t('chat.select_room')}
            </div>
        );
    }

    return (
        <div className="chat-messages-panel">
            {/* Chat header */}
            <div className="chat-msg-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)' }}>
                <button className="btn" style={{ padding: '4px 8px', borderRadius: '50%', border: 'none', background: 'transparent', fontSize: '20px' }} onClick={() => fetchRooms() /* Back button dummy or just dummy click */}>
                    ‹
                </button>
                <div style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, flexShrink: 0, borderRadius: '50%', background: activeRoom?.type === 'group' ? 'linear-gradient(135deg, #10b981, #047857)' : 'linear-gradient(135deg, var(--gold), var(--gold-dark))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 'bold' }}>
                    {activeRoom?.avatar ? (
                        <img src={activeRoom.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="avatar" />
                    ) : (
                        activeRoom?.type === 'group' ? '👥' : activeRoom?.display_name?.substring(0, 2).toUpperCase()
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <h3 style={{ margin: 0, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeRoom?.display_name || t('chat.group_label')}</h3>
                        {activeRoom?.type === 'group' && (
                            <button className="btn" title={t('chat.rename_group')} style={{ padding: '2px 6px', fontSize: 12, background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 4, flexShrink: 0 }} onClick={handleRenameGroup}>✏️</button>
                        )}
                    </div>
                    {activeRoom?.type === 'direct' && (
                        <span style={{ fontSize: 12, color: activeRoom.is_online ? '#10b981' : 'var(--text-muted)', whiteSpace: 'nowrap', display: 'block' }}>
                            {activeRoom.is_online ? t('chat.online_status') : t('chat.offline_status')}
                        </span>
                    )}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="btn call-btn-mobile" title={t('chat.call_voice')} style={{ padding: '6px 10px' }} onClick={() => onStartCall({ ...activeRoom, requestVideo: false })}>
                        📞 <span className="hide-on-mobile">{t('chat.call_voice')}</span>
                    </button>
                    <button className="btn btn-primary call-btn-mobile" title={t('chat.call_video')} style={{ padding: '6px 10px' }} onClick={() => onStartCall({ ...activeRoom, requestVideo: true })}>
                        📹 <span className="hide-on-mobile">{t('chat.call_video')}</span>
                    </button>
                    <button className="btn btn-icon" title={t('chat.group_detail')} style={{ fontSize: 18, padding: '4px' }} onClick={() => setShowGroupInfo(true)}>ℹ️</button>
                </div>
            </div>

            {/* Messages Container */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {messages.length === 0 && (
                    <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>{t('chat.first_message')}</div>
                )}
                {messages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    const sender = msg.users || {};
                    return (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                            {!isMe && activeRoom?.type === 'group' && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, marginLeft: 44 }}>
                                    {sender.display_name || sender.username}
                                </span>
                            )}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                {!isMe && (
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                        {sender.avatar ? (
                                            <img src={sender.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="avatar" />
                                        ) : (
                                            sender.display_name?.substring(0, 2).toUpperCase()
                                        )}
                                    </div>
                                )}
                                <div style={{
                                    background: isMe ? 'var(--primary)' : 'var(--bg-secondary)',
                                    color: isMe ? '#fff' : 'var(--text-primary)',
                                    padding: '10px 14px', borderRadius: 16,
                                    borderBottomRightRadius: isMe ? 4 : 16,
                                    borderBottomLeftRadius: !isMe ? 4 : 16,
                                    maxWidth: '400px', wordBreak: 'break-word',
                                    border: isMe ? 'none' : '1px solid var(--border-subtle)'
                                }}>
                                    {msg.content}
                                </div>
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                                {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Chat input */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-primary)' }}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8 }}>
                    <input
                        className="form-input"
                        style={{ flex: 1, borderRadius: 24, padding: '12px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                        placeholder={t('chat.input_msg')}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                    />
                    <button type="submit" disabled={!inputText.trim()} className="btn btn-primary" style={{ borderRadius: 24, padding: '0 24px' }}>
                        {t('chat.send_btn')}
                    </button>
                </form>
            </div>
        </div>
    );
}
