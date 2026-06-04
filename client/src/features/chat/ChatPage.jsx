import React, { useState, useEffect, useRef } from 'react';
import { getApiBase } from '../../shared/services/api';
import { AuthHelper } from '../../shared/services/AuthHelper';
import {
    cacheRooms, getCachedRooms,
    cacheMessages, getCachedMessages
} from '../../shared/services/chatCache';
import { myLog, myError, myWarning } from '../../shared/utils/logger';
import { useTranslation } from '../../shared/hooks/useTranslation';

import InboxPanel from './components/InboxPanel';
import MessagePanel from './components/MessagePanel';
import ChatModals from './components/ChatModals';
import './Chat.css';

export default function ChatPage({ user, addToast, onStartCall }) {
    const { t } = useTranslation();
    const [rooms, setRooms] = useState([]);
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [, setIsCacheLoaded] = useState(false);

    // Modals & Users states
    const [showNewChat, setShowNewChat] = useState(false);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    const isFirstLoadRef = useRef(true);
    const latestMsgTimeRef = useRef(null);
    const hasShownRoomsOfflineRef = useRef(false);
    const hasShownMessagesOfflineRef = useRef(false);

    const fetchRooms = async () => {
        myLog('CHAT', '[ChatPage - fetchRooms] Syncing room list from Server...');
        try {
            const res = await fetch(`${getApiBase()}/chats`, { headers: { 'x-auth-token': AuthHelper.getToken() } });
            const json = await res.json();
            if (json.success) {
                hasShownRoomsOfflineRef.current = false;
                const serverRooms = json.data || [];
                setRooms(serverRooms);
                cacheRooms(serverRooms).catch(e => myError('CHAT', "[ChatPage] Error caching rooms:", e));
                myLog('CHAT', `[ChatPage - fetchRooms] Synced ${serverRooms.length} rooms successfully.`);
            }
        } catch (e) {
            myWarning('CHAT', '[ChatPage - fetchRooms] Offline or weak network, using cached rooms.', e);
            if (!hasShownRoomsOfflineRef.current) {
                addToast(t('chat.offline_rooms_warning'), 'warning');
                hasShownRoomsOfflineRef.current = true;
            }
        } finally {
            setLoadingRooms(false);
        }
    };

    const fetchPublicUsers = async () => {
        try {
            const res = await fetch(`${getApiBase()}/users/public`, { headers: { 'x-auth-token': AuthHelper.getToken() } });
            const json = await res.json();
            if (json.success) setAllUsers(json.data.filter(u => u.id !== user.id));
        } catch (e) {
            myError('CHAT', e);
        }
    };

    const fetchMessagesFull = async (roomId) => {
        myLog('CHAT', `[ChatPage - fetchMessagesFull] Loading full message history for Room ID: ${roomId}`);
        try {
            const res = await fetch(`${getApiBase()}/chats/${roomId}/messages`, { headers: { 'x-auth-token': AuthHelper.getToken() } });
            const json = await res.json();
            if (json.success) {
                hasShownMessagesOfflineRef.current = false;
                const serverMsgs = json.data || [];
                setMessages(serverMsgs);
                cacheMessages(roomId, serverMsgs).catch(e => myError('CHAT', "[ChatPage] Error caching messages:", e));
                myLog('CHAT', `[ChatPage - fetchMessagesFull] Loaded ${serverMsgs.length} messages successfully.`);

                if (serverMsgs.length > 0) latestMsgTimeRef.current = serverMsgs[serverMsgs.length - 1].created_at;
                isFirstLoadRef.current = false;
            }
        } catch (e) {
            myError('CHAT', e);
            if (!hasShownMessagesOfflineRef.current) {
                addToast(t('chat.offline_messages_warning'), 'warning');
                hasShownMessagesOfflineRef.current = true;
            }
        }
    };

    const fetchMessagesIncremental = async (roomId) => {
        if (!latestMsgTimeRef.current) return fetchMessagesFull(roomId);
        try {
            const since = encodeURIComponent(latestMsgTimeRef.current);
            const res = await fetch(`${getApiBase()}/chats/${roomId}/messages?since=${since}`, {
                headers: { 'x-auth-token': AuthHelper.getToken() }
            });
            const json = await res.json();
            if (json.success && json.data && json.data.length > 0) {
                hasShownMessagesOfflineRef.current = false;
                const newMsgs = json.data;
                myLog('CHAT', `[ChatPage - fetchMessagesIncremental] Found ${newMsgs.length} new messages.`);
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const unique = newMsgs.filter(m => !existingIds.has(m.id));
                    if (unique.length === 0) return prev;
                    const merged = [...prev, ...unique];
                    cacheMessages(roomId, merged).catch(e => myError('CHAT', "[ChatPage] Error caching new messages:", e));
                    return merged;
                });
                latestMsgTimeRef.current = newMsgs[newMsgs.length - 1].created_at;
            }
        } catch (e) {
            if (!hasShownMessagesOfflineRef.current) {
                addToast(t('chat.offline_messages_warning'), 'warning');
                hasShownMessagesOfflineRef.current = true;
            }
        }
    };

    // Mount: Load cached data instantly, then background sync
    useEffect(() => {
        getCachedRooms().then(cached => {
            if (cached.length > 0) {
                setRooms(cached);
                setLoadingRooms(false);
                setIsCacheLoaded(true);
            }
        }).catch((e) => { 
            myError('CHAT', "ChatPage Background Sync Error:", e); 
        });

        fetchRooms();
        fetchPublicUsers();

        const interval = setInterval(() => {
            fetchRooms();
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    // Room switch: Load cached messages first, then full fetch
    useEffect(() => {
        if (!activeRoomId) return;
        isFirstLoadRef.current = true;
        latestMsgTimeRef.current = null;

        getCachedMessages(activeRoomId).then(cached => {
            if (cached.length > 0) {
                setMessages(cached);
                latestMsgTimeRef.current = cached[cached.length - 1].created_at;
                isFirstLoadRef.current = false;
            }
        }).catch((e) => { 
            myError('CHAT', "ChatPage Background Sync-Cache Error:", e); 
        });

        fetchMessagesFull(activeRoomId);

        const interval = setInterval(() => {
            fetchMessagesIncremental(activeRoomId);
        }, 5000);

        return () => clearInterval(interval);
    }, [activeRoomId]);

    const handleCreateRoom = async () => {
        if (selectedUserIds.length === 0) return;
        try {
            const res = await fetch(`${getApiBase()}/chats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': AuthHelper.getToken() },
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
                addToast(json.error || t('chat.create_fail'), 'error');
            }
        } catch (e) {
            addToast(t('chat.connection_error'), 'error');
        }
    };

    const toggleSelectUser = (id) => setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const handleRenameGroup = async () => {
        const activeRoom = rooms.find(r => r.id === activeRoomId);
        if (activeRoom?.type !== 'group') return;
        const newName = prompt(t('chat.enter_group_name'), activeRoom.display_name || '');
        if (!newName || !newName.trim() || newName.trim() === activeRoom.display_name) return;
        try {
            const res = await fetch(`${getApiBase()}/chats/${activeRoomId}/name`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': AuthHelper.getToken() },
                body: JSON.stringify({ name: newName.trim() })
            });
            const json = await res.json();
            if (json.success) { fetchRooms(); addToast(t('chat.rename_success')); }
            else addToast(json.error || t('chat.rename_fail'), 'error');
        } catch (e) { addToast(t('chat.network_error'), 'error'); }
    };

    const handleLeaveGroup = async () => {
        if (!window.confirm(t('chat.leave_confirm'))) return;
        try {
            const res = await fetch(`${getApiBase()}/chats/${activeRoomId}/leave`, {
                method: 'POST',
                headers: { 'x-auth-token': AuthHelper.getToken() }
            });
            const json = await res.json();
            if (json.success) {
                setActiveRoomId(null); setShowGroupInfo(false); fetchRooms(); addToast(t('chat.left_group'));
            } else addToast(json.error || t('chat.leave_fail'), 'error');
        } catch (e) { addToast(t('chat.network_error'), 'error'); }
    };

    const handleKickMember = async (userId, memberName) => {
        if (!window.confirm(t('chat.kick_confirm').replace('{name}', memberName))) return;
        try {
            const res = await fetch(`${getApiBase()}/chats/${activeRoomId}/kick/${userId}`, {
                method: 'POST',
                headers: { 'x-auth-token': AuthHelper.getToken() }
            });
            const json = await res.json();
            if (json.success) {
                fetchRooms(); fetchMessagesFull(activeRoomId); addToast(t('chat.kicked_member').replace('{name}', memberName));
            } else addToast(json.error || t('chat.kick_fail'), 'error');
        } catch (e) { addToast(t('chat.connection_error'), 'error'); }
    };

    const activeRoom = rooms.find(r => r.id === activeRoomId);
    const currentUserRole = activeRoom?.type === 'group' ? (activeRoom.members?.find(m => m.id === user.id)?.role || 'member') : 'member';

    return (
        <div className="page-container no-mobile-padding" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>
            <div className={`chat-layout ${activeRoomId ? 'room-active' : ''}`}>
                <InboxPanel
                    rooms={rooms}
                    loadingRooms={loadingRooms}
                    activeRoomId={activeRoomId}
                    setActiveRoomId={setActiveRoomId}
                    setShowNewChat={setShowNewChat}
                />

                <MessagePanel
                    activeRoomId={activeRoomId}
                    activeRoom={activeRoom}
                    messages={messages}
                    setMessages={setMessages}
                    user={user}
                    onStartCall={onStartCall}
                    setShowGroupInfo={setShowGroupInfo}
                    handleRenameGroup={handleRenameGroup}
                    addToast={addToast}
                    fetchRooms={fetchRooms}
                    latestMsgTimeRef={latestMsgTimeRef}
                />
            </div>

            <ChatModals
                showNewChat={showNewChat}
                setShowNewChat={setShowNewChat}
                showGroupInfo={showGroupInfo}
                setShowGroupInfo={setShowGroupInfo}
                activeRoom={activeRoom}
                user={user}
                allUsers={allUsers}
                selectedUserIds={selectedUserIds}
                toggleSelectUser={toggleSelectUser}
                handleCreateRoom={handleCreateRoom}
                currentUserRole={currentUserRole}
                handleKickMember={handleKickMember}
                handleLeaveGroup={handleLeaveGroup}
            />

            <style>
                {`
                .form-input:focus { border-color: var(--primary); outline: none; }
                @media (max-width: 768px) {
                    .hide-on-mobile { display: none; }
                    .call-btn-mobile { padding: 6px 8px !important; font-size: 16px !important; }
                }
                `}
            </style>
        </div>
    );
}
