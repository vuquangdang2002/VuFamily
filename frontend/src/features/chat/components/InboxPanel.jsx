import React, { useState } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { MessageSquarePlus, KeyRound, Search, Users, User } from 'lucide-react';

export default function InboxPanel({
    rooms,
    loadingRooms,
    activeRoomId,
    setActiveRoomId,
    setShowNewChat,
    handleJoinRoom
}) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredRooms = rooms.filter(room => 
        (room.display_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-transparent w-full">
            <div className="px-5 pt-6 pb-4 flex items-center justify-between gap-3 flex-none flex-wrap">
                <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white m-0 truncate">
                    {t('chat.messages_title')}
                </h2>
                <div className="flex gap-2 flex-none">
                    <button 
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 transition-colors" 
                        title={t('chat.join_by_code_title')} 
                        onClick={() => {
                            const code = prompt(t('chat.enter_invite_code_prompt'));
                            if (code && code.trim()) {
                                handleJoinRoom(code.trim());
                            }
                        }}
                    >
                        <KeyRound size={16} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[13px] bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-colors" onClick={() => setShowNewChat(true)}>
                        <MessageSquarePlus size={16} /> <span className="hidden sm:inline">{t('chat.new_chat_btn')}</span>
                    </button>
                </div>
            </div>

            {/* Search Input for Active Rooms */}
            <div className="px-5 pb-4 border-b border-black/5 dark:border-white/5 flex-none">
                <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                    <input
                        type="text"
                        className="w-full h-11 bg-black/5 dark:bg-[#161b22] border border-black/10 dark:border-[#30363d] rounded-2xl pl-11 pr-4 text-[13px] font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#fe6e00]/50 transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]"
                        placeholder={t('chat.search_rooms_placeholder')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
                {loadingRooms ? <div className="p-4 text-center text-sm font-medium text-zinc-500">{t('common.loading')}</div> : null}
                {!loadingRooms && rooms.length === 0 && (
                    <div className="p-8 flex flex-col items-center justify-center text-center">
                        <MessageSquarePlus size={32} className="text-zinc-300 dark:text-zinc-700 mb-3" />
                        <div className="text-sm font-medium text-zinc-500 mb-4">{t('chat.no_rooms')}</div>
                        <button className="px-4 py-2 rounded-xl font-bold text-[13px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 transition-colors" onClick={() => setShowNewChat(true)}>
                            {t('chat.start_messaging')}
                        </button>
                    </div>
                )}
                {!loadingRooms && rooms.length > 0 && filteredRooms.length === 0 && (
                    <div className="p-6 text-center text-[13px] font-medium text-zinc-500">
                        {t('chat.no_search_result')}
                    </div>
                )}
                {filteredRooms.map(room => (
                    <div
                        key={room.id}
                        onClick={() => setActiveRoomId(room.id)}
                        className={`flex items-center gap-3 px-5 py-3 mx-2 my-1 rounded-2xl cursor-pointer transition-colors ${activeRoomId === room.id ? 'bg-blue-50/80 dark:bg-blue-500/20' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                        <div className="relative w-11 h-11 shrink-0 rounded-[1rem] shadow-sm overflow-hidden flex items-center justify-center">
                            {room.avatar ? (
                                <img src={room.avatar} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center text-white font-black text-sm ${room.type === 'group' ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                                    {room.type === 'group' ? <Users size={18} /> : (room.display_name?.substring(0, 2).toUpperCase() || <User size={18} />)}
                                </div>
                            )}
                            {room.type === 'direct' && room.is_online && (
                                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 z-10" />
                            )}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                            <div className={`font-bold text-[14px] truncate ${activeRoomId === room.id ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-900 dark:text-white'}`}>
                                {room.display_name || (room.type === 'group' ? t('chat.unnamed_group') : t('chat.user_label'))}
                            </div>
                            <div className={`text-[12px] truncate flex items-center gap-1 ${activeRoomId === room.id ? 'text-blue-500/80 dark:text-blue-300/80' : 'text-zinc-500'}`}>
                                {room.type === 'group' ? `${room.members?.length || 0} ${t('chat.members_count')}` : (room.is_online ? <span className="text-emerald-500 font-medium">{t('chat.active')}</span> : t('chat.offline_status'))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
