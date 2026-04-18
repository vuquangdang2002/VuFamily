import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../../shared/services/api';

function getToken() {
    try { return JSON.parse(localStorage.getItem('vuFamilyAuth') || '{}').token || ''; }
    catch { return ''; }
}

export default function ChatPage({ user, addToast, onStartCall }) {
    const [rooms, setRooms] = useState([]);
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loadingRooms, setLoadingRooms] = useState(true);

    // Select participants for new chat
    const [showNewChat, setShowNewChat] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    const messagesEndRef = useRef(null);
    const isFirstLoadRef = useRef(true);

    const fetchRooms = async () => {
        try {
            const res = await fetch(`${API_BASE}/chats`, { headers: { 'x-auth-token': getToken() } });
            const json = await res.json();
            if (json.success) setRooms(json.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingRooms(false);
        }
    };

    const fetchPublicUsers = async () => {
        try {
            const res = await fetch(`${API_BASE}/users/public`, { headers: { 'x-auth-token': getToken() } });
            const json = await res.json();
            if (json.success) {
                // exclude self
                setAllUsers(json.data.filter(u => u.id !== user.id));
            }
        } catch (e) { }
    };

    const fetchMessages = async (roomId) => {
        try {
            const res = await fetch(`${API_BASE}/chats/${roomId}/messages`, { headers: { 'x-auth-token': getToken() } });
            const json = await res.json();
            if (json.success) {
                setMessages(json.data || []);
                if (isFirstLoadRef.current) {
                    scrollToBottom();
                    isFirstLoadRef.current = false;
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchRooms();
        fetchPublicUsers();

        // Polling rooms for updates
        const interval = setInterval(() => {
            fetchRooms();
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!activeRoomId) return;
        isFirstLoadRef.current = true;
        fetchMessages(activeRoomId);

        // Polling messages
        const interval = setInterval(() => {
            fetchMessages(activeRoomId);
        }, 2000); // 2s short polling

        return () => clearInterval(interval);
    }, [activeRoomId]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !activeRoomId) return;

        const content = inputText;
        setInputText(''); // optimistic clear

        try {
            const res = await fetch(`${API_BASE}/chats/${activeRoomId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({ content })
            });
            const json = await res.json();
            if (json.success) {
                // Immediately append
                setMessages(prev => [...prev, json.data]);
                scrollToBottom();
                fetchRooms(); // to update read/last msg time
            } else {
                addToast(json.error || 'Lỗi gửi tin', 'error');
            }
        } catch (e) {
            addToast('Lỗi kết nối mạng', 'error');
        }
    };

    const handleCreateRoom = async () => {
        if (selectedUserIds.length === 0) return;

        try {
            const res = await fetch(`${API_BASE}/chats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({
                    type: selectedUserIds.length > 1 ? 'group' : 'direct',
                    participantIds: selectedUserIds
                })
            });
            const json = await res.json();
            if (json.success) {
                await fetchRooms();
                setActiveRoomId(json.data.id);
                setShowNewChat(false);
                setSelectedUserIds([]);
            } else {
                addToast(json.error || 'Lỗi tạo nhóm chat', 'error');
            }
        } catch (e) {
            addToast('Lỗi kết nối', 'error');
        }
    };

    const toggleSelectUser = (id) => {
        setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleRenameGroup = async () => {
        const activeRoom = rooms.find(r => r.id === activeRoomId);
        if (activeRoom?.type !== 'group') return;

        const newName = prompt('Nhập tên nhóm mới:', activeRoom.display_name || '');
        if (!newName || newName.trim() === '' || newName.trim() === activeRoom.display_name) return;

        try {
            const res = await fetch(`${API_BASE}/chats/${activeRoomId}/name`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({ name: newName.trim() })
            });
            const json = await res.json();
            if (json.success) {
                fetchRooms();
                addToast('Đã đổi tên nhóm thành công');
            } else {
                addToast(json.error || 'Lỗi đổi tên nhóm', 'error');
            }
        } catch (e) {
            addToast('Lỗi kết nối mạng', 'error');
        }
    };

    const activeRoom = rooms.find(r => r.id === activeRoomId);

    return (
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>
            <div className={`chat-layout ${activeRoomId ? 'room-active' : ''}`}>
                {/* INBOX PANEL */}
                <div className="chat-inbox-panel">
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: 18, margin: 0 }}>💬 Tin nhắn</h2>
                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setShowNewChat(true)}>
                            + Chat mới
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loadingRooms ? <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : null}
                        {!loadingRooms && rooms.length === 0 && (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                                Chưa có cuộc trò chuyện nào.<br /><br />
                                <button className="btn" onClick={() => setShowNewChat(true)}>Bắt đầu nhắn tin</button>
                            </div>
                        )}
                        {rooms.map(room => (
                            <div
                                key={room.id}
                                onClick={() => setActiveRoomId(room.id)}
                                style={{
                                    padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer',
                                    background: activeRoomId === room.id ? 'var(--bg-hover)' : 'transparent',
                                    display: 'flex', alignItems: 'center', gap: 12
                                }}
                            >
                                <div style={{ position: 'relative', width: 40, height: 40 }}>
                                    {room.avatar ? (
                                        <img src={room.avatar} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: room.type === 'group' ? 'linear-gradient(135deg, #10b981, #047857)' : 'linear-gradient(135deg, var(--gold), var(--gold-dark))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 'bold' }}>
                                            {room.type === 'group' ? '👥' : (room.display_name?.substring(0, 2).toUpperCase() || 'U')}
                                        </div>
                                    )}
                                    {room.type === 'direct' && room.is_online && (
                                        <span style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: '#10b981', border: '2px solid var(--bg-secondary)' }}></span>
                                    )}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{room.display_name || (room.type === 'group' ? 'Nhóm không tên' : 'Người dùng')}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 4 }}>
                                        {room.type === 'group' ? `${room.members?.length || 0} thành viên` : (room.is_online ? 'Hoạt động' : 'Ngoại tuyến')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MESSAGES PANEL */}
                <div className="chat-messages-panel">
                    {activeRoomId ? (
                        <>
                            {/* Chat header */}
                            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)' }}>
                                <button className="btn" style={{ padding: '4px 8px', borderRadius: '50%', border: 'none', background: 'transparent', fontSize: '20px' }} onClick={() => setActiveRoomId(null)}>
                                    ‹
                                </button>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: activeRoom?.type === 'group' ? 'linear-gradient(135deg, #10b981, #047857)' : 'linear-gradient(135deg, var(--gold), var(--gold-dark))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 'bold' }}>
                                    {activeRoom?.avatar ? <img src={activeRoom.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (activeRoom?.type === 'group' ? '👥' : activeRoom?.display_name?.substring(0, 2).toUpperCase())}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <h3 style={{ margin: 0, fontSize: 16 }}>{activeRoom?.display_name || 'Nhóm'}</h3>
                                        {activeRoom?.type === 'group' && (
                                            <button className="btn" title="Đổi tên nhóm" style={{ padding: '2px 6px', fontSize: 12, background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 4 }} onClick={handleRenameGroup}>✏️</button>
                                        )}
                                    </div>
                                    {activeRoom?.type === 'direct' && (
                                        <span style={{ fontSize: 12, color: activeRoom.is_online ? '#10b981' : 'var(--text-muted)' }}>
                                            {activeRoom.is_online ? '🟢 Đang trực tuyến' : '⚪ Ngoại tuyến'}
                                        </span>
                                    )}
                                </div>
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                                    <button className="btn" title="Gọi thoại" style={{ padding: '6px 12px' }} onClick={() => onStartCall(activeRoom)}>📞 Gọi</button>
                                </div>
                            </div>

                            {/* Messages Container */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {messages.length === 0 && (
                                    <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>Hãy là người nhắn tin đầu tiên!</div>
                                )}
                                {messages.map((msg, idx) => {
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
                                                        {sender.avatar ? <img src={sender.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : sender.display_name?.substring(0, 2).toUpperCase()}
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
                                        placeholder="Nhắn tin..."
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                    />
                                    <button type="submit" disabled={!inputText.trim()} className="btn btn-primary" style={{ borderRadius: 24, padding: '0 24px' }}>
                                        Gửi ➢
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div style={{ m: 'auto', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            Chọn một phòng chat hoặc bấm + Chat mới
                        </div>
                    )}
                </div>
            </div>

            {/* NEW CHAT MODAL */}
            {showNewChat && (
                <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowNewChat(false)}>
                    <div className="modal" style={{ width: 440 }}>
                        <div className="modal-header">
                            <h2>Bắt đầu trò chuyện</h2>
                            <button className="detail-close" onClick={() => setShowNewChat(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Chọn người dùng (nhiều người sẽ tạo nhóm):</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {allUsers.map(u => (
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
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                            {u.avatar ? <img src={u.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : u.display_name?.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500 }}>{u.display_name || u.username}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {u.is_online ? '🟢 Đang Online' : '⚪ Ngoại tuyến'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selectedUserIds.length > 0 && (
                                <button className="btn btn-primary" style={{ width: '100%', marginTop: 24, justifyContent: 'center' }} onClick={handleCreateRoom}>
                                    Bắt đầu Chat ({selectedUserIds.length})
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <style>
                {`
                /* Some flex utilities inside component */
                .form-input:focus { border-color: var(--primary); outline: none; }
                `}
            </style>
        </div>
    );
}
