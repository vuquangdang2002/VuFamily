import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useTranslation } from '../../../shared/hooks/useTranslation';

export default function GroupCallModal({ room, onClose, onStartCall }) {
    const { t } = useTranslation();
    const [members, setMembers] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const token = localStorage.getItem('vuFamilyToken');
                const res = await fetch(`/api/chats/rooms/${room.id}`, {
                    headers: { 'x-auth-token': token }
                });
                const data = await res.json();
                if (data.success) {
                    const currentUser = JSON.parse(localStorage.getItem('vuFamilyUser'));
                    // Filter out current user from members
                    const otherMembers = (data.data.participants || []).filter(m => m.user_id !== currentUser?.id);
                    setMembers(otherMembers);
                    // By default, no one is selected, or everyone is selected?
                    // Let's default to empty, so user has to choose. Or default to all.
                    // Based on messenger, it usually defaults to none, user picks.
                    setSelectedIds(otherMembers.map(m => m.user_id)); 
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchMembers();
    }, [room.id]);

    const handleToggleSelect = (userId) => {
        setSelectedIds(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId) 
                : [...prev, userId]
        );
    };

    const handleRemoveTag = (userId) => {
        setSelectedIds(prev => prev.filter(id => id !== userId));
    };

    const handleCall = (requestVideo) => {
        if (selectedIds.length === 0) return;
        onStartCall({ ...room, requestVideo, selectedUserIds: selectedIds });
        onClose();
    };

    const filteredMembers = members.filter(m => {
        const name = m.full_name || m.username || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10">
                    <h3 className="text-[17px] font-bold text-zinc-900 dark:text-white mx-auto">{t('chat.group_call_title') || 'Gọi cho thành viên nhóm'}</h3>
                    <button 
                        onClick={onClose}
                        className="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Selected Tags Area */}
                <div className="p-4 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-medium text-zinc-500">Đang đổ chuông</span>
                        <div className="flex flex-wrap gap-1.5 flex-1 max-h-20 overflow-y-auto custom-scrollbar">
                            {selectedIds.length === 0 && (
                                <span className="text-sm text-zinc-400 italic">Chưa chọn ai</span>
                            )}
                            {selectedIds.map(id => {
                                const m = members.find(x => x.user_id === id);
                                if (!m) return null;
                                const shortName = (m.full_name || m.username).split(' ').pop();
                                return (
                                    <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 text-sm font-medium">
                                        {shortName}
                                        <button onClick={() => handleRemoveTag(id)} className="hover:text-blue-900 dark:hover:text-blue-200">
                                            <X size={12} />
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="px-4 py-2 border-b border-black/5 dark:border-white/5">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm thành viên..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-sm font-medium outline-none text-zinc-900 dark:text-white placeholder-zinc-500 focus:bg-black/10 dark:focus:bg-white/10 transition-colors"
                        />
                    </div>
                </div>

                {/* Member List */}
                <div className="flex-1 overflow-y-auto max-h-60 p-2 custom-scrollbar">
                    {loading ? (
                        <div className="p-4 text-center text-sm text-zinc-500">Đang tải thành viên...</div>
                    ) : filteredMembers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-zinc-500">Không tìm thấy thành viên nào.</div>
                    ) : (
                        <div className="space-y-1">
                            {filteredMembers.map(m => (
                                <label key={m.user_id} className="flex items-center justify-between p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors">
                                    <div className="flex items-center gap-3">
                                        <img 
                                            src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name || m.username)}`} 
                                            alt={m.full_name || m.username} 
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div>
                                            <div className="font-semibold text-[15px] text-zinc-900 dark:text-white">{m.full_name || m.username}</div>
                                            <div className="text-xs text-zinc-500">@{m.username}</div>
                                        </div>
                                    </div>
                                    <div className="pr-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(m.user_id)}
                                            onChange={() => handleToggleSelect(m.user_id)}
                                            className="w-5 h-5 rounded-md border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800"
                                        />
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-black/5 dark:bg-white/5 flex gap-3">
                    <button
                        onClick={() => handleCall(false)}
                        disabled={selectedIds.length === 0}
                        className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white font-bold text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Gọi Thoại
                    </button>
                    <button
                        onClick={() => handleCall(true)}
                        disabled={selectedIds.length === 0}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Gọi Video
                    </button>
                </div>
            </div>
        </div>
    );
}
