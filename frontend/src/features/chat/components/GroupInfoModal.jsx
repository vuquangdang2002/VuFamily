import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { X, Users, Search, Copy, Download, Check, UserPlus, LogOut, Shield, ShieldOff, UserMinus, Link } from 'lucide-react';

export default function GroupInfoModal({
    showGroupInfo, setShowGroupInfo, activeRoom, user, allUsers,
    currentUserRole, handleKickMember, handleLeaveGroup,
    handleUpdateSettings, handleAddMember, handleUpdateMemberRole
}) {
    const { t } = useTranslation();
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [addSearchQuery, setAddSearchQuery] = useState('');
    const [selectedToAddUserIds, setSelectedToAddUserIds] = useState([]);

    useEffect(() => {
        if (!isAddingMember) { setSelectedToAddUserIds([]); setAddSearchQuery(''); }
    }, [isAddingMember]);

    const handleToggleSelectToAdd = (userId) =>
        setSelectedToAddUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);

    if (!showGroupInfo || !activeRoom) return null;

    const currentMemberIds = activeRoom.members?.map(m => m.id) || [];
    const candidateUsers = allUsers.filter(u => u.id !== user.id);
    const filteredCandidates = candidateUsers.filter(u =>
        (u.display_name || '').toLowerCase().includes(addSearchQuery.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(addSearchQuery.toLowerCase())
    );

    // Invite/QR utils
    const inviteLink = `${window.location.origin}/chat?invite=${activeRoom.inviteCode}`;
    const qrUrl120 = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(inviteLink)}`;
    const qrUrl400 = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(inviteLink)}`;

    const handleDownloadQR = async () => {
        try {
            const res = await fetch(qrUrl400);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `QR_Invite_${activeRoom.inviteCode}.png`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch { window.open(qrUrl400, '_blank'); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in" onClick={e => e.target === e.currentTarget && (setShowGroupInfo(false) || setIsAddingMember(false))}>
            <div className="bg-white dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-[2rem] shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-white/5 shrink-0">
                    <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white m-0">
                        {isAddingMember ? t('chat.add_member_modal_title') : `${t('chat.group_detail_title')} ${activeRoom.type === 'group' ? t('chat.group_label') : t('chat.conversation_label')}`}
                    </h2>
                    <button className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-500 transition-colors" onClick={() => isAddingMember ? setIsAddingMember(false) : setShowGroupInfo(false)}>
                        <X size={16} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50 dark:bg-black/10">
                    {isAddingMember ? (
                        /* ── Add member view ── */
                        <div className="flex flex-col h-full">
                            <h4 className="text-[14px] font-bold text-zinc-500 mb-3">{t('chat.select_users_hint')}</h4>
                            <div className="relative mb-4 shrink-0">
                                <Search size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                                <input type="text" className="w-full bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-[14px] font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50" placeholder={t('chat.search_members_placeholder')} value={addSearchQuery} onChange={e => setAddSearchQuery(e.target.value)} />
                            </div>
                            
                            <div className="flex flex-col gap-2 overflow-y-auto flex-1 pb-4">
                                {filteredCandidates.length === 0 ? (
                                    <div className="p-4 text-center text-[13px] font-medium text-zinc-500">Chưa tìm thấy thành viên nào phù hợp</div>
                                ) : filteredCandidates.map(u => {
                                    const isAlreadyMember = currentMemberIds.includes(u.id);
                                    const isSelected = selectedToAddUserIds.includes(u.id);
                                    return (
                                        <div key={u.id} onClick={() => !isAlreadyMember && handleToggleSelectToAdd(u.id)}
                                            className={`flex items-center justify-between p-3 border rounded-xl transition-colors ${isAlreadyMember ? 'opacity-60 bg-black/5 dark:bg-white/5 border-transparent cursor-not-allowed' : (isSelected ? 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20 cursor-pointer' : 'bg-white dark:bg-white/5 border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 cursor-pointer')}`}>
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${isAlreadyMember ? 'border-zinc-400 bg-zinc-400' : (isSelected ? 'border-blue-500 bg-blue-500' : 'border-zinc-300 dark:border-zinc-600 bg-transparent')}`}>
                                                    {isAlreadyMember && <Check size={12} className="text-white" />}
                                                    {!isAlreadyMember && isSelected && <span className="w-2 h-2 rounded-full bg-white"></span>}
                                                </div>
                                                <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-[12px] font-black shadow-sm overflow-hidden">
                                                    {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt="avatar" /> : u.display_name?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="font-bold text-[14px] truncate text-zinc-900 dark:text-white">{u.display_name || u.username}</div>
                                            </div>
                                            <div>
                                                {isAlreadyMember ? (
                                                    <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-black/5 dark:bg-white/5 text-zinc-500 border border-black/10 dark:border-white/10">Đã tham gia</span>
                                                ) : isSelected ? (
                                                    <button onClick={e => { e.stopPropagation(); handleToggleSelectToAdd(u.id); }} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors">Đã chọn</button>
                                                ) : (
                                                    <button onClick={e => { e.stopPropagation(); handleToggleSelectToAdd(u.id); }} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-transparent text-zinc-700 dark:text-zinc-300 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">+ Chọn</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* ── Group info view ── */
                        <>
                            <div className="flex flex-col items-center mb-6">
                                <div className={`w-20 h-20 rounded-full mb-3 flex items-center justify-center text-3xl font-black shadow-lg overflow-hidden ${activeRoom.type === 'group' ? 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white' : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'}`}>
                                    {activeRoom?.avatar ? <img src={activeRoom.avatar} className="w-full h-full object-cover" alt="avatar" /> : (activeRoom.type === 'group' ? <Users size={32} /> : activeRoom.display_name?.substring(0, 2).toUpperCase())}
                                </div>
                                <h3 className="m-0 text-xl font-extrabold text-zinc-900 dark:text-white">{activeRoom.display_name}</h3>
                                {activeRoom.type === 'group' && <div className="text-[14px] font-medium text-zinc-500 mt-1">{activeRoom.members?.length || 0} {t('chat.members_count')}</div>}
                            </div>

                            {activeRoom.type === 'group' && (<>
                                {/* Invite Code & QR */}
                                {activeRoom.inviteCode && (
                                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-6 mb-6 flex flex-col items-center gap-3 backdrop-blur-md shadow-inner">
                                        <div className="text-[11px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">{t('chat.invite_code_label')}</div>
                                        <div className="text-2xl font-black text-amber-700 dark:text-amber-400 tracking-widest font-mono px-6 py-2 bg-black/5 dark:bg-black/20 rounded-xl border border-amber-500/30 shadow-inner">{activeRoom.inviteCode}</div>
                                        
                                        <div className="flex gap-3 w-full mt-2">
                                            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-[12px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-xl hover:bg-amber-500/20 transition-colors"
                                                onClick={() => { navigator.clipboard.writeText(activeRoom.inviteCode); alert(t('chat.invite_code_copied') || "Đã sao chép mã mời!"); }}>
                                                <Copy size={14} /> {t('chat.copy_invite_code')}
                                            </button>
                                            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-[12px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-xl hover:bg-amber-500/20 transition-colors"
                                                onClick={() => { navigator.clipboard.writeText(inviteLink); alert(t('chat.invite_link_copied') || "Đã sao chép liên kết mời!"); }}>
                                                <Link size={14} /> {t('chat.copy_invite_link')}
                                            </button>
                                        </div>
                                        
                                        <div className="mt-3 p-3 bg-white rounded-[1rem] shadow-lg border border-black/5">
                                            <img src={qrUrl120} alt="Invite QR" className="w-[120px] h-[120px] block" />
                                        </div>
                                        
                                        <button className="w-full flex items-center justify-center gap-2 py-2.5 px-3 mt-1 text-[12px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-xl hover:bg-amber-500/20 transition-colors"
                                            onClick={handleDownloadQR}>
                                            <Download size={14} /> {t('chat.download_qr')}
                                        </button>
                                    </div>
                                )}

                                {/* Allow Add Settings */}
                                {currentUserRole === 'admin' && (
                                    <div className="bg-white/60 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl p-4 mb-4 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                        onClick={() => handleUpdateSettings(!activeRoom.allowAdd)}>
                                        <span className="text-[14px] font-bold text-zinc-700 dark:text-zinc-300">{t('chat.member_add_permission')}</span>
                                        <input type="checkbox" checked={activeRoom.allowAdd || false} readOnly className="w-5 h-5 cursor-pointer pointer-events-none accent-blue-600 rounded" />
                                    </div>
                                )}

                                {(currentUserRole === 'admin' || activeRoom.allowAdd) && (
                                    <button className="w-full flex items-center justify-center gap-2 py-3 mb-6 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl font-bold text-[14px] text-zinc-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors shadow-sm" onClick={() => setIsAddingMember(true)}>
                                        <UserPlus size={16} /> {t('chat.add_member_btn')}
                                    </button>
                                )}

                                <h4 className="text-[15px] font-extrabold text-zinc-900 dark:text-white border-b border-black/10 dark:border-white/10 pb-2 mb-4">{t('chat.group_members')}</h4>
                                <div className="flex flex-col gap-3 mb-6">
                                    {activeRoom.members?.map(m => (
                                        <div key={m.id} className="flex items-center gap-3 p-3 bg-white/40 dark:bg-black/20 rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                                            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-[14px] font-black shadow-sm overflow-hidden">
                                                {m.avatar ? <img src={m.avatar} className="w-full h-full object-cover" alt="avatar" /> : m.display_name?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-[14px] text-zinc-900 dark:text-white truncate max-w-[140px]">{m.display_name || m.username}</span>
                                                    {m.id === user.id && <span className="text-[10px] font-bold text-zinc-500">({t('chat.you') || 'Bạn'})</span>}
                                                    {m.role === 'admin' && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 px-2 py-0.5 rounded-full">QTV</span>}
                                                </div>
                                                <div className={`text-[12px] font-medium ${m.is_online ? 'text-emerald-500' : 'text-zinc-500'}`}>{m.is_online ? t('chat.online_label') : t('chat.offline_label')}</div>
                                            </div>
                                            {currentUserRole === 'admin' && m.id !== user.id && (
                                                <div className="flex gap-2 shrink-0">
                                                    {m.role === 'admin' ? (
                                                        <button className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                                                            onClick={() => handleUpdateMemberRole(m.id, 'member')}>
                                                            <ShieldOff size={12} /> Gỡ QTV
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
                                                                onClick={() => handleUpdateMemberRole(m.id, 'admin')}>
                                                                <Shield size={12} /> Bổ nhiệm
                                                            </button>
                                                            <button className="flex items-center justify-center w-7 h-7 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                                                                onClick={() => handleKickMember(m.id, m.display_name || m.username)} title={t('chat.remove_member')}>
                                                                <UserMinus size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-black/10 dark:border-white/10">
                                    <button className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-xl font-bold text-[14px] transition-colors" onClick={handleLeaveGroup}>
                                        <LogOut size={16} /> {t('chat.leave_group')}
                                    </button>
                                </div>
                            </>)}
                        </>
                    )}
                </div>

                {/* Footer for add member confirmation */}
                {isAddingMember && (
                    <div className="p-5 border-t border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/20 backdrop-blur-md shrink-0 flex gap-3">
                        <button className="flex-1 py-3 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-[14px] transition-colors" onClick={() => setIsAddingMember(false)}>
                            {t('chat.cancel_btn') || "Hủy"}
                        </button>
                        <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[14px] shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => { handleAddMember(selectedToAddUserIds); setIsAddingMember(false); }}
                            disabled={selectedToAddUserIds.length === 0}>
                            Thêm vào nhóm ({selectedToAddUserIds.length})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
