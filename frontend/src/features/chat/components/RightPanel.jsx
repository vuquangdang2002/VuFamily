import React, { useState } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { Lock, UserCircle, BellOff, Search, Pin, Palette, Smile, Edit3, Image as ImageIcon, Shield, AlertTriangle, UserMinus, ChevronDown, ChevronRight, X, LogOut, Users } from 'lucide-react';

const AccordionItem = ({ title, icon: Icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-black/5 dark:border-white/5 last:border-0">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100 font-bold text-sm">
                    {title}
                </div>
                {isOpen ? <ChevronDown size={18} className="text-zinc-400" /> : <ChevronRight size={18} className="text-zinc-400" />}
            </button>
            {isOpen && (
                <div className="px-2 pb-2">
                    {children}
                </div>
            )}
        </div>
    );
};

const ActionButton = ({ icon: Icon, label, onClick, colorClass = "text-zinc-700 dark:text-zinc-300" }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group w-16">
        <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 group-hover:bg-black/10 dark:group-hover:bg-white/20 flex items-center justify-center transition-colors">
            <Icon size={18} className={colorClass} />
        </div>
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 text-center leading-tight">
            {label}
        </span>
    </button>
);

const MenuItem = ({ icon: Icon, label, onClick, className = "" }) => (
    <button 
        onClick={onClick} 
        className={`w-full px-3 py-2.5 flex items-center gap-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-medium text-zinc-700 dark:text-zinc-300 ${className}`}
    >
        <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
            <Icon size={14} />
        </div>
        {label}
    </button>
);

export default function RightPanel({ activeRoom, user, onClose, handleRenameGroup, handleLeaveGroup }) {
    const { t } = useTranslation();

    if (!activeRoom) return null;

    const isGroup = activeRoom.type === 'group';
    const roomName = activeRoom.display_name || t('chat.group_label');

    return (
        <div className="w-full h-full flex flex-col bg-transparent overflow-y-auto custom-scrollbar relative">
            {/* Mobile Close Button */}
            <button 
                onClick={onClose} 
                className="lg:hidden absolute top-4 left-4 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"
            >
                <X size={18} />
            </button>

            {/* Header / Avatar */}
            <div className="flex flex-col items-center pt-8 pb-6 px-4">
                <div className={`relative w-20 h-20 rounded-full shadow-md overflow-hidden flex items-center justify-center text-white font-black text-2xl mb-4 ${isGroup ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                    {activeRoom.avatar ? (
                        <img src={activeRoom.avatar} className="w-full h-full object-cover" alt="avatar" />
                    ) : (
                        isGroup ? <UserCircle size={40} /> : roomName.substring(0, 2).toUpperCase()
                    )}
                    {activeRoom.type === 'direct' && activeRoom.is_online && (
                        <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 z-10" />
                    )}
                </div>
                
                <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white text-center mb-1">
                    {roomName}
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full mb-6">
                    <Lock size={12} />
                    Được mã hóa đầu cuối
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-start justify-center gap-4 w-full">
                    {activeRoom.type === 'direct' && (
                        <ActionButton icon={UserCircle} label="Trang cá nhân" />
                    )}
                    <ActionButton icon={BellOff} label="Tắt thông báo" />
                    <ActionButton icon={Search} label="Tìm kiếm" />
                </div>
            </div>

            {/* Accordions */}
            <div className="flex-1 flex flex-col px-2">
                <AccordionItem title="Thông tin về đoạn chat">
                    <MenuItem icon={Pin} label="Xem tin nhắn đã ghim" />
                </AccordionItem>

                <AccordionItem title="Tùy chỉnh đoạn chat" defaultOpen={true}>
                    {isGroup && (
                        <>
                            <MenuItem icon={Edit3} label="Đổi tên đoạn chat" onClick={handleRenameGroup} />
                            <MenuItem icon={ImageIcon} label="Thay đổi ảnh" />
                        </>
                    )}
                    <MenuItem icon={Palette} label="Đổi chủ đề" />
                    <MenuItem icon={Smile} label="Thay đổi biểu tượng cảm xúc" />
                    <MenuItem icon={Edit3} label="Chỉnh sửa biệt danh" />
                </AccordionItem>

                {isGroup && (
                    <AccordionItem title="Thành viên trong đoạn chat">
                        <MenuItem icon={Users} label="Xem thành viên" />
                    </AccordionItem>
                )}

                <AccordionItem title="File phương tiện, file và liên kết">
                    <MenuItem icon={ImageIcon} label="File phương tiện và file" />
                </AccordionItem>

                <AccordionItem title="Quyền riêng tư và hỗ trợ">
                    <MenuItem icon={BellOff} label="Tắt thông báo" />
                    {isGroup && (
                        <MenuItem icon={LogOut} label="Rời khỏi nhóm" onClick={handleLeaveGroup} className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" />
                    )}
                    <MenuItem icon={Shield} label="Quyền riêng tư" />
                    <MenuItem icon={AlertTriangle} label="Báo cáo" className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" />
                </AccordionItem>
            </div>
            <div className="h-8 shrink-0"></div>
        </div>
    );
}
