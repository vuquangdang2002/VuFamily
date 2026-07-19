import React, { useState, useEffect, useRef } from 'react';
import { getApiBase } from '../../shared/services/api';
import { AuthHelper } from '../../shared/services/AuthHelper';
import {
    cacheRooms, getCachedRooms,
    cacheMessages, getCachedMessages
} from '../../shared/services/chatCache';
import { myLog, myError, myWarning } from '../../shared/utils/logger';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { syncCoordinator } from '../../shared/services/syncCoordinator';

import InboxPanel from './components/InboxPanel';
import MessagePanel from './components/MessagePanel';
import ChatModals from './components/ChatModals';

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

                if (serverMsgs.length > 0) {
                    latestMsgTimeRef.current = serverMsgs[serverMsgs.length - 1].created_at;
                    syncCoordinator.setLatestMsgTime(roomId, latestMsgTimeRef.current);
                }
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

        const unsubscribe = syncCoordinator.subscribe('rooms', (data) => {
            setRooms(data);
            setLoadingRooms(false);
            cacheRooms(data).catch(() => {});
        });

        return unsubscribe;
    }, []);

    // Room switch: Load cached messages first, then full fetch
    useEffect(() => {
        if (!activeRoomId) {
            syncCoordinator.setActiveRoomId(null);
            return;
        }

        syncCoordinator.setActiveRoomId(activeRoomId);
        isFirstLoadRef.current = true;
        latestMsgTimeRef.current = null;

        getCachedMessages(activeRoomId).then(cached => {
            if (cached.length > 0) {
                setMessages(cached);
                const lastTime = cached[cached.length - 1].created_at;
                latestMsgTimeRef.current = lastTime;
                syncCoordinator.setLatestMsgTime(activeRoomId, lastTime);
                isFirstLoadRef.current = false;
            }
        }).catch((e) => { 
            myError('CHAT', "ChatPage Background Sync-Cache Error:", e); 
        });

        fetchMessagesFull(activeRoomId);

        const unsubscribe = syncCoordinator.subscribe('messages', (roomId, data) => {
            if (roomId !== activeRoomId) return;
            if (data && data.length > 0) {
                hasShownMessagesOfflineRef.current = false;
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const unique = data.filter(m => !existingIds.has(m.id));
                    if (unique.length === 0) return prev;
                    const merged = [...prev, ...unique];
                    cacheMessages(roomId, merged).catch(e => myError('CHAT', "[ChatPage] Error caching new messages:", e));
                    
                    const lastTime = data[data.length - 1].created_at;
                    latestMsgTimeRef.current = lastTime;
                    syncCoordinator.setLatestMsgTime(roomId, lastTime);
                    return merged;
                });
            }
        });

        return () => {
            unsubscribe();
            syncCoordinator.setActiveRoomId(null);
        };
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

    const handleJoinRoom = async (inviteCode) => {
        try {
            const res = await fetch(`${getApiBase()}/chats/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': AuthHelper.getToken() },
                body: JSON.stringify({ inviteCode })
            });
            const json = await res.json();
            if (json.success) {
                await fetchRooms();
                setActiveRoomId(json.data.id);
                addToast(t('chat.rename_success'));
            } else {
                addToast(json.error || t('chat.connection_error'), 'error');
            }
        } catch (e) {
            addToast(t('chat.connection_error'), 'error');
        }
    };

    const handleUpdateSettings = async (allowAdd) => {
        // Optimistic update for instant visual feedback
        setRooms(prev => prev.map(r => r.id === activeRoomId ? { ...r, allowAdd } : r));

        try {
            const res = await fetch(`${getApiBase()}/chats/${activeRoomId}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': AuthHelper.getToken() },
                body: JSON.stringify({ allowAdd })
            });
            const json = await res.json();
            if (!json.success) {
                // Rollback on failure
                setRooms(prev => prev.map(r => r.id === activeRoomId ? { ...r, allowAdd: !allowAdd } : r));
                addToast(json.error || t('chat.rename_fail'), 'error');
            } else {
                // Silently refresh rooms in background
                fetchRooms();
            }
        } catch (e) {
            // Rollback on connection error
            setRooms(prev => prev.map(r => r.id === activeRoomId ? { ...r, allowAdd: !allowAdd } : r));
            addToast(t('chat.network_error'), 'error');
        }
    };

    const handleAddMember = async (targetUserIds) => {
        const ids = Array.isArray(targetUserIds) ? targetUserIds : [targetUserIds];
        try {
            const res = await fetch(`${getApiBase()}/chats/${activeRoomId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': AuthHelper.getToken() },
                body: JSON.stringify({ userIds: ids })
            });
            const json = await res.json();
            if (json.success) {
                await fetchRooms();
                await fetchMessagesFull(activeRoomId);
                addToast(t('chat.add_member_success'));
            } else {
                addToast(t('chat.add_member_fail').replace('{error}', json.error), 'error');
            }
        } catch (e) {
            addToast(t('chat.connection_error'), 'error');
        }
    };

    const handleUpdateMemberRole = async (targetUserId, role) => {
        try {
            const res = await fetch(`${getApiBase()}/chats/${activeRoomId}/members/${targetUserId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': AuthHelper.getToken() },
                body: JSON.stringify({ role })
            });
            const json = await res.json();
            if (json.success) {
                await fetchRooms();
                addToast(role === 'admin' ? "Đã bổ nhiệm Quản trị viên thành công!" : "Đã gỡ quyền Quản trị viên thành công!");
            } else {
                addToast(json.error || t('chat.connection_error'), 'error');
            }
        } catch (e) {
            addToast(t('chat.connection_error'), 'error');
        }
    };

    // Parse invite code from URL query parameter on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const inviteCode = params.get('invite');
        if (inviteCode && inviteCode.trim()) {
            window.history.replaceState({}, document.title, window.location.pathname);
            // Delay slightly to wait for auth/rooms load
            setTimeout(() => {
                handleJoinRoom(inviteCode.trim());
            }, 500);
        }
    }, []);

    // Parse room ID from path if present (e.g. /chat/123) on mount
    useEffect(() => {
        const pathParts = window.location.pathname.split('/');
        if (pathParts[1] === 'chat' && pathParts[2]) {
            const rId = isNaN(pathParts[2]) ? pathParts[2] : Number(pathParts[2]);
            setActiveRoomId(rId);
        }
    }, []);

    // Sync window.location.pathname when activeRoomId changes
    useEffect(() => {
        const currentPath = window.location.pathname;
        if (activeRoomId) {
            const targetPath = `/chat/${activeRoomId}`;
            if (currentPath !== targetPath) {
                window.history.pushState({}, '', targetPath);
            }
        } else {
            if (currentPath.startsWith('/chat/') && currentPath !== '/chat') {
                window.history.pushState({}, '', '/chat');
            }
        }
    }, [activeRoomId]);

    // Listen to popstate specifically for Chat room transitions
    useEffect(() => {
        const handlePopState = () => {
            const pathParts = window.location.pathname.split('/');
            if (pathParts[1] === 'chat') {
                const rId = pathParts[2] ? (isNaN(pathParts[2]) ? pathParts[2] : Number(pathParts[2])) : null;
                setActiveRoomId(rId);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const activeRoom = rooms.find(r => r.id === activeRoomId);
    const currentUserRole = activeRoom?.type === 'group' ? (activeRoom.members?.find(m => m.id === user.id)?.role || 'member') : 'member';

    return (
        <div className="h-full w-full p-4 md:p-6 lg:p-8 overflow-hidden flex flex-col relative">
            <div className="flex-1 min-h-0 flex flex-col md:flex-row relative rounded-[1.5rem] bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-sm overflow-hidden">
                {/* Inbox Panel - Hidden on mobile if a room is active */}
                <div className={`w-full md:w-[320px] lg:w-[360px] h-full shrink-0 border-r border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/20 ${activeRoomId ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
                    <InboxPanel
                        rooms={rooms}
                        loadingRooms={loadingRooms}
                        activeRoomId={activeRoomId}
                        setActiveRoomId={setActiveRoomId}
                        setShowNewChat={setShowNewChat}
                        handleJoinRoom={handleJoinRoom}
                    />
                </div>

                {/* Message Panel - Hidden on mobile if NO room is active */}
                <div className={`flex-1 h-full bg-transparent ${!activeRoomId ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
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
                handleUpdateSettings={handleUpdateSettings}
                handleAddMember={handleAddMember}
                handleUpdateMemberRole={handleUpdateMemberRole}
            />
        </div>
    );
}
