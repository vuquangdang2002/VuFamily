import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { getApiBase } from '../../../shared/services/api';
import { AuthHelper } from '../../../shared/services/AuthHelper';
import { cacheSingleMessage } from '../../../shared/services/chatCache';
import { TrackingHelper } from '../../../shared/services/TrackingHelper';
import { myError } from '../../../shared/utils/logger';
import { ChevronLeft, Phone, Video, Info, Edit2, Send, Users, MessageSquarePlus } from 'lucide-react';

function formatMessageContent(content) {
    if (!content) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: 'inherit',
                        textDecoration: 'underline',
                        wordBreak: 'break-all'
                    }}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
}

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

        const content = inputText.trim();
        setInputText(''); // optimistic input clear

        // 1. Instant 0ms Optimistic UI Message Object
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const tempMsg = {
            id: tempId,
            room_id: activeRoomId,
            sender_id: user.id,
            content: content,
            created_at: new Date().toISOString(),
            sending: true,
            users: {
                display_name: user.display_name || user.displayName || user.username,
                username: user.username,
                avatar: user.avatar
            }
        };

        // Appends to UI in 0ms!
        setMessages(prev => [...prev, tempMsg]);
        scrollToBottom();

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
                // Replace temp message with server confirmed message
                setMessages(prev => prev.map(m => m.id === tempId ? json.data : m));
                TrackingHelper.trackSendChatMessage(activeRoom?.type || 'direct');
                cacheSingleMessage(activeRoomId, json.data).catch((err) => { 
                    myError('CHAT', "ChatPage Background Sync Error:", err); 
                });
                if (latestMsgTimeRef) {
                    latestMsgTimeRef.current = json.data.created_at;
                }
                fetchRooms(); // to update read/last msg time
            } else {
                // Remove temp message if failed
                setMessages(prev => prev.filter(m => m.id !== tempId));
                addToast(json.error || t('chat.send_fail') || 'Không thể gửi tin nhắn.', 'error');
            }
        } catch (err) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            addToast(t('chat.network_error') || 'Lỗi kết nối mạng.', 'error');
        }
    };

    if (!activeRoomId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 bg-transparent">
                <div className="w-16 h-16 rounded-[1.5rem] bg-black/5 dark:bg-white/5 flex items-center justify-center mb-4 shadow-sm">
                    <MessageSquarePlus size={32} className="opacity-50" />
                </div>
                <span className="font-bold">{t('chat.select_room')}</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-transparent w-full relative">
            {/* Chat header */}
            <div className="px-4 py-3 flex items-center gap-3 border-b border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/20 backdrop-blur-xl shrink-0 z-10 shadow-sm">
                <button className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-600 dark:text-zinc-300 transition-colors" onClick={() => fetchRooms()}>
                    <ChevronLeft size={24} />
                </button>
                <div className={`relative w-11 h-11 shrink-0 rounded-[1rem] shadow-sm overflow-hidden flex items-center justify-center text-white font-black text-sm ${activeRoom?.type === 'group' ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                    {activeRoom?.avatar ? (
                        <img src={activeRoom.avatar} className="w-full h-full object-cover" alt="avatar" />
                    ) : (
                        activeRoom?.type === 'group' ? <Users size={18} /> : activeRoom?.display_name?.substring(0, 2).toUpperCase()
                    )}
                    {activeRoom?.type === 'direct' && activeRoom.is_online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 z-10" />
                    )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                        <h3 className="m-0 font-extrabold text-[15px] text-zinc-900 dark:text-white truncate">{activeRoom?.display_name || t('chat.group_label')}</h3>
                        {activeRoom?.type === 'group' && (
                            <button className="w-6 h-6 flex items-center justify-center rounded-md bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-500 transition-colors shrink-0" title={t('chat.rename_group')} onClick={handleRenameGroup}>
                                <Edit2 size={12} />
                            </button>
                        )}
                    </div>
                    {activeRoom?.type === 'direct' && (
                        <span className={`text-[12px] font-medium truncate ${activeRoom.is_online ? 'text-emerald-500' : 'text-zinc-500'}`}>
                            {activeRoom.is_online ? t('chat.online_status') : t('chat.offline_status')}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <button className="flex items-center justify-center w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 transition-colors" title={t('chat.call_voice')} onClick={() => onStartCall({ ...activeRoom, requestVideo: false })}>
                        <Phone size={18} />
                    </button>
                    <button className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30 transition-colors shadow-sm" title={t('chat.call_video')} onClick={() => onStartCall({ ...activeRoom, requestVideo: true })}>
                        <Video size={18} />
                    </button>
                    <button className="flex items-center justify-center w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 transition-colors" title={t('chat.group_detail')} onClick={() => setShowGroupInfo(true)}>
                        <Info size={18} />
                    </button>
                </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 block space-y-4" id="message-list">
                {messages.length === 0 && (
                    <div className="m-auto text-[13px] font-medium text-zinc-500 bg-white/40 dark:bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-sm">
                        {t('chat.first_message')}
                    </div>
                )}
                {messages.map((msg) => {
                    const trimmedContent = (msg.content || '').trim();
                    const isSystem = trimmedContent.startsWith('===') && trimmedContent.endsWith('===');
                    
                    if (isSystem) {
                        return (
                            <div key={msg.id} className="flex justify-center my-2 w-full">
                                <div className="bg-black/5 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 text-[11px] font-bold px-4 py-1.5 rounded-full border border-black/5 dark:border-white/5 text-center max-w-[85%] shadow-sm">
                                    {trimmedContent.replace(/===/g, '').trim()}
                                </div>
                            </div>
                        );
                    }

                    const isMe = msg.sender_id === user.id;
                    const sender = msg.users || {};
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {!isMe && activeRoom?.type === 'group' && (
                                <span className="text-[11px] font-bold text-zinc-500 mb-1 ml-11">
                                    {sender.display_name || sender.username}
                                </span>
                            )}
                            <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                {!isMe && (
                                    <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-[11px] font-black shadow-sm overflow-hidden">
                                        {sender.avatar ? (
                                            <img src={sender.avatar} className="w-full h-full object-cover" alt="avatar" />
                                        ) : (
                                            sender.display_name?.substring(0, 2).toUpperCase()
                                        )}
                                    </div>
                                )}
                                <div className={`px-4 py-2.5 text-[14px] leading-relaxed break-words shadow-sm ${
                                    isMe 
                                        ? 'bg-blue-600 text-white rounded-[1.25rem] rounded-br-[0.25rem]' 
                                        : 'bg-white dark:bg-[#222222] border border-black/5 dark:border-white/5 text-zinc-900 dark:text-white rounded-[1.25rem] rounded-bl-[0.25rem]'
                                }`}>
                                    {formatMessageContent(msg.content)}
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-zinc-400 mt-1 mx-2">
                                {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Chat input */}
            <div className="p-4 border-t border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/40 backdrop-blur-xl shrink-0 z-10">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <input
                        className="flex-1 bg-white dark:bg-black/60 border border-black/10 dark:border-white/10 rounded-full px-5 py-3.5 text-[14px] font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                        placeholder={t('chat.input_msg')}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                    />
                    <button type="submit" disabled={!inputText.trim()} className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                        <Send size={18} className="ml-1" />
                    </button>
                </form>
            </div>
        </div>
    );
}
