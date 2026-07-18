import React, { useState } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { X, Search, User } from 'lucide-react';

export default function NewChatModal({ showNewChat, setShowNewChat, allUsers, selectedUserIds, toggleSelectUser, handleCreateRoom }) {
    const { t } = useTranslation();
    const [userSearchQuery, setUserSearchQuery] = useState('');

    if (!showNewChat) return null;

    const filteredUsers = allUsers.filter(u =>
        (u.display_name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(userSearchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in" onClick={e => e.target === e.currentTarget && setShowNewChat(false)}>
            <div className="bg-white dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-[2rem] shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-white/5 shrink-0">
                    <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white m-0">
                        {t('chat.start_chat_title')}
                    </h2>
                    <button className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-500 transition-colors" onClick={() => { setShowNewChat(false); setUserSearchQuery(''); }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Search & Chips */}
                <div className="p-5 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/20 shrink-0">
                    <p className="text-[13px] font-medium text-zinc-500 mb-3">{t('chat.select_users_hint')}</p>
                    <div className="relative mb-3">
                        <Search size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                        <input type="text" className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-[14px] font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50" placeholder={t('chat.search_members_placeholder')} value={userSearchQuery}
                            onChange={e => setUserSearchQuery(e.target.value)} />
                    </div>
                    {selectedUserIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 max-h-[90px] overflow-y-auto">
                            {selectedUserIds.map(id => {
                                const u = allUsers.find(m => m.id === id);
                                if (!u) return null;
                                return (
                                    <div key={u.id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-full text-[12px] font-bold text-blue-700 dark:text-blue-400">
                                        <div className="w-5 h-5 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-[10px] shadow-sm overflow-hidden">
                                            {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt="avatar" /> : u.display_name?.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className="max-w-[100px] truncate">{u.display_name || u.username}</span>
                                        <button onClick={() => toggleSelectUser(u.id)} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-blue-500/30 text-blue-500 transition-colors">
                                            <X size={10} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Scrollable member list */}
                <div className="flex-1 overflow-y-auto p-4 bg-zinc-50/50 dark:bg-black/10">
                    <div className="flex flex-col gap-2">
                        {filteredUsers.length === 0 ? (
                            <div className="p-4 text-center text-[13px] font-medium text-zinc-500">{t('chat.no_member_found')}</div>
                        ) : filteredUsers.map(u => {
                            const isSelected = selectedUserIds.includes(u.id);
                            return (
                                <div key={u.id} onClick={() => toggleSelectUser(u.id)}
                                    className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20' : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10'}`}>
                                    <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'}`}>
                                        {isSelected && <span className="w-2 h-2 rounded-full bg-white"></span>}
                                    </div>
                                    <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-[14px] font-black shadow-sm overflow-hidden">
                                        {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt="avatar" /> : u.display_name?.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`font-bold truncate ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-900 dark:text-white'}`}>{u.display_name || u.username}</div>
                                        <div className={`text-[12px] font-medium truncate ${u.is_online ? 'text-emerald-500' : 'text-zinc-500'}`}>{u.is_online ? t('chat.online_label') : t('chat.offline_label')}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Fixed footer */}
                <div className="p-5 border-t border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/20 backdrop-blur-md shrink-0">
                    <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleCreateRoom} disabled={selectedUserIds.length === 0}>
                        {t('chat.start_chat_btn')} {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
}
