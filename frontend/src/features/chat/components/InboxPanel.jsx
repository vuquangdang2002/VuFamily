import React, { useState } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { MessageSquarePlus, Search, Users, User, Edit, MoreHorizontal, Check } from 'lucide-react';
import { parseDateSafe } from '../../../shared/utils/date';

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
    const [activeFilter, setActiveFilter] = useState('all'); // all, unread, groups

    const filteredRooms = rooms.filter(room => {
        const matchSearch = (room.display_name || '').toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchSearch) return false;

        if (activeFilter === 'groups') return room.type === 'group';
        if (activeFilter === 'unread') return false; // TODO: Implement unread logic when backend supports it

        return true;
    });

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const d = parseDateSafe(isoString);
        const now = new Date();
        const diff = now - d;
        if (diff < 24 * 60 * 60 * 1000 && now.getDate() === d.getDate()) {
            return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        }
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            return d.toLocaleDateString('vi-VN', { weekday: 'short' });
        }
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-transparent w-full">
            {/* Header */}
            <div className="px-4 pt-5 pb-3 flex items-center justify-between flex-none">
                <h2 className="text-[24px] font-black text-zinc-900 dark:text-white m-0 tracking-tight">
                    Đoạn chat
                </h2>
                <div className="flex items-center gap-2 shrink-0">
                    <button className="w-9 h-9 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 transition-colors">
                        <MoreHorizontal size={20} />
                    </button>
                    <button
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 transition-colors"
                        onClick={() => setShowNewChat(true)}
                    >
                        <Edit size={18} />
                    </button>
                </div>
            </div>

            {/* Search Input */}
            <div className="px-4 pb-3 flex-none">
                <div className="relative">
                    <Search size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        className="w-full h-9 bg-black/5 dark:bg-white/10 rounded-full pl-10 pr-4 text-[14px] font-medium text-zinc-900 dark:text-white outline-none placeholder-zinc-500 transition-all focus:bg-black/10 dark:focus:bg-white/20"
                        placeholder="Tìm kiếm trên Chat"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="px-4 pb-2 flex items-center gap-2 flex-none overflow-x-auto custom-scrollbar">
                <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-3.5 py-1.5 rounded-full text-[14px] font-bold whitespace-nowrap transition-colors ${activeFilter === 'all' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-300'}`}
                >
                    Tất cả
                </button>
                <button
                    onClick={() => setActiveFilter('unread')}
                    className={`px-3.5 py-1.5 rounded-full text-[14px] font-bold whitespace-nowrap transition-colors ${activeFilter === 'unread' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-300'}`}
                >
                    Chưa đọc
                </button>
                <button
                    onClick={() => setActiveFilter('groups')}
                    className={`px-3.5 py-1.5 rounded-full text-[14px] font-bold whitespace-nowrap transition-colors ${activeFilter === 'groups' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-300'}`}
                >
                    Nhóm
                </button>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto px-2 py-1">
                {loadingRooms ? <div className="p-4 text-center text-sm font-medium text-zinc-500">{t('common.loading')}</div> : null}

                {!loadingRooms && filteredRooms.map(room => {
                    const isActive = activeRoomId === room.id;
                    return (
                        <div
                            key={room.id}
                            onClick={() => setActiveRoomId(room.id)}
                            className={`flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer transition-colors ${isActive ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                            <div className="relative w-14 h-14 shrink-0 rounded-full shadow-sm overflow-hidden flex items-center justify-center">
                                {room.avatar ? (
                                    <img src={room.avatar} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center text-white font-black text-xl ${room.type === 'group' ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                                        {room.type === 'group' ? <Users size={24} /> : (room.display_name?.substring(0, 2).toUpperCase() || <User size={24} />)}
                                    </div>
                                )}
                                {room.type === 'direct' && room.is_online && (
                                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 z-10" />
                                )}
                            </div>

                            <div className="flex flex-col flex-1 min-w-0 justify-center h-full">
                                <div className="font-medium text-[15px] text-zinc-900 dark:text-white truncate">
                                    {room.display_name || (room.type === 'group' ? t('chat.unnamed_group') : t('chat.user_label'))}
                                </div>
                                <div className="flex items-center text-[13px] text-zinc-500 mt-0.5">
                                    <span className="truncate flex-1">
                                        {room.lastMessage?.content || (room.type === 'group' ? `${room.members?.length || 0} thành viên` : (room.is_online ? 'Đang hoạt động' : 'Ngoại tuyến'))}
                                    </span>
                                    <span className="mx-1 opacity-50">•</span>
                                    <span className="shrink-0 text-[12px]">
                                        {formatTime(room.lastMessage?.createdAt || room.updatedAt)}
                                    </span>
                                </div>
                            </div>

                            {/* Unread dot indicator (dummy for now) */}
                            {false && (
                                <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0 mx-2"></div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
