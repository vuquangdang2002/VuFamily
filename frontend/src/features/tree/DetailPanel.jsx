// DetailPanel.jsx — Panel chi tiết thông tin thành viên gia phả (đã localize)
import { useState, useEffect } from 'react';
import { localApi, formatDate } from '../../shared/services/api';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Calendar, MapPin, Phone, Mail, FileText, Heart, User, Trophy, Baby, Plus, Edit2, Trash2 } from 'lucide-react';

export default function DetailPanel({ member, members, isOpen, onClose, onEdit, onDelete, onAddChild, onAddSpouse, onRefresh, isAdmin, onSelfEdit }) {
    const { t } = useTranslation();
    const [achievements, setAchievements] = useState([]);

    useEffect(() => {
        if (member) { setAchievements(localApi.getAchievements(member.id)); } else { setAchievements([]); }
    }, [member]);

    // ── Lookup dữ liệu gia đình ──
    const CATEGORY_LABELS = {
        education: t('detail.cat_education') || 'Giáo dục', 
        work: t('detail.cat_work') || 'Công việc',
        social: t('detail.cat_social') || 'Xã hội', 
        award: t('detail.cat_award') || 'Giải thưởng', 
        other: t('detail.cat_other') || 'Khác'
    };

    const spouse = member?.spouseId ? members.find(m => m.id === member.spouseId) : null;
    let children = member ? members.filter(m => m.parentId === member.id) : [];
    if (spouse) { members.filter(m => m.parentId === spouse.id).forEach(sc => { if (!children.find(c => c.id === sc.id)) children.push(sc); }); }
    children.sort((a, b) => (a.birthOrder || 99) - (b.birthOrder || 99));
    const parent = member?.parentId ? members.find(m => m.id === member.parentId) : null;

    const birthDisplay = member?.birthDate ? formatDate(member.birthDate) : (t('detail.unknown') || 'Chưa rõ');
    const birthTimeDisplay = member?.birthTime ? ` ${t('detail.at') || 'lúc'} ${member.birthTime}` : '';
    let deathDisplay = '';
    if (member?.deathDate) {
        deathDisplay = formatDate(member.deathDate);
        if (member.deathDateLunar) deathDisplay += ` (ÂL: ${member.deathDateLunar})`;
    }

    // ── Label con thứ mấy ──
    const childLabel = (() => {
        if (!parent || !member) return '';
        const orderNum = member.birthOrder || 0;
        const typeStr = member.childType === 'adopted' ? ` (${(t('detail.adopted') || 'Con nuôi').toLowerCase()})` : '';
        if (orderNum) {
            return `${t('detail.children') || 'Con'} #${orderNum} — ${parent.name}${typeStr}`;
        }
        return `${t('detail.children') || 'Con'} — ${parent.name}${typeStr}`;
    })();

    const handleDeleteAch = (achId) => {
        if (!isAdmin) return;
        if (confirm(t('detail.delete_confirm') || 'Bạn có chắc muốn xóa thành tích này?')) { 
            localApi.deleteAchievement(achId); 
            setAchievements(localApi.getAchievements(member.id)); 
        }
    };

    return (
        <AnimatePresence>
        {isOpen && member && (
        <motion.div 
            className="fixed top-4 right-4 md:top-6 md:right-6 bottom-4 md:bottom-6 w-[380px] md:w-[460px] bg-white/80 dark:bg-[#111111]/80 backdrop-blur-2xl border border-white/50 dark:border-white/10 rounded-[2rem] shadow-2xl z-[300] flex flex-col overflow-hidden"
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
            <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/20 shrink-0">
                <h3 className="font-bold text-[13px] uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    {t('detail.title') || 'Hồ sơ cá nhân'}
                </h3>
                <button 
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-600 dark:text-zinc-400 transition-colors"
                    onClick={onClose}
                >
                    <X size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 flex flex-col gap-8">
                {/* ── Header / Avatar ── */}
                <div className="flex flex-col items-center text-center">
                    {member.photo ? (
                        <div className="relative mb-4">
                            <div className="absolute inset-0 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-full blur-[10px] opacity-30"></div>
                            <img src={member.photo} alt={member.name} className="relative w-24 h-24 rounded-full object-cover border-[3px] border-amber-500 shadow-md" />
                        </div>
                    ) : (
                        <div className="relative mb-4 w-24 h-24 rounded-full flex items-center justify-center border-[3px] border-amber-500 shadow-md bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 text-amber-600 dark:text-amber-400">
                            <User size={40} />
                        </div>
                    )}
                    
                    <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white mb-1">
                        {member.name}
                    </h2>
                    
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${member.gender === 1 ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400'}`}>
                            {member.gender === 1 ? (t('detail.male') || 'Nam') : (t('detail.female') || 'Nữ')}
                        </span>
                        {member.generation && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                Đời thứ {member.generation}
                            </span>
                        )}
                    </div>

                    {member.occupation && (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                            <Briefcase size={14} className="text-amber-500" /> {member.occupation}
                        </div>
                    )}

                    {childLabel && (
                        <div className="text-[13px] font-semibold text-amber-600 dark:text-amber-400 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                            {childLabel}
                        </div>
                    )}

                    <div className="mt-3 text-[15px] font-medium text-zinc-700 dark:text-zinc-300">
                        {deathDisplay ? (
                            <span className="flex flex-col items-center gap-1">
                                <span><span className="text-zinc-400">Sinh:</span> {birthDisplay}</span>
                                <span><span className="text-zinc-400">Mất:</span> {deathDisplay}</span>
                            </span>
                        ) : birthDisplay !== (t('detail.unknown') || 'Chưa rõ') ? (
                            <span><span className="text-zinc-400">Sinh:</span> {birthDisplay}{birthTimeDisplay}</span>
                        ) : null}
                    </div>
                </div>

                {/* ── Thông tin cá nhân ── */}
                <div className="flex flex-col gap-5">
                    <h4 className="flex items-center gap-2 text-[15px] font-bold text-zinc-900 dark:text-white uppercase tracking-wide border-b border-black/5 dark:border-white/10 pb-3">
                        <User size={18} className="text-blue-500" /> {t('detail.personal_info') || 'Thông tin cá nhân'}
                    </h4>
                    
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5 bg-black/5 dark:bg-white/5 p-4 md:p-5 rounded-2xl">
                            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{t('detail.hometown') || 'Quê quán'}</span>
                            <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-200">{member.birthPlace || (t('detail.unknown') || 'Chưa rõ')}</span>
                        </div>
                        
                        {member.address && (
                            <div className="flex flex-col gap-1.5 bg-black/5 dark:bg-white/5 p-4 md:p-5 rounded-2xl">
                                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{t('detail.address') || 'Nơi ở hiện tại'}</span>
                                <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-200">{member.address}</span>
                            </div>
                        )}

                        {(member.phone || member.email) && (
                            <div className="flex flex-col gap-3 bg-black/5 dark:bg-white/5 p-4 md:p-5 rounded-2xl">
                                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{t('detail.contact') || 'Liên hệ'}</span>
                                {member.phone && (
                                    <a href={`tel:${member.phone}`} className="flex items-center gap-2 text-[15px] font-medium text-blue-600 dark:text-blue-400 hover:underline w-fit">
                                        <Phone size={16} /> {member.phone}
                                    </a>
                                )}
                                {member.email && (
                                    <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-[15px] font-medium text-blue-600 dark:text-blue-400 hover:underline w-fit">
                                        <Mail size={16} /> {member.email}
                                    </a>
                                )}
                            </div>
                        )}

                        {member.note && (
                            <div className="flex flex-col gap-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-4 md:p-5 rounded-2xl">
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5"><FileText size={14}/> {t('detail.note') || 'Ghi chú'}</span>
                                <span className="text-[15px] font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">{member.note}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Quan hệ gia đình ── */}
                <div className="flex flex-col gap-5">
                    <h4 className="flex items-center gap-2 text-[15px] font-bold text-zinc-900 dark:text-white uppercase tracking-wide border-b border-black/5 dark:border-white/10 pb-3">
                        <Heart size={18} className="text-pink-500" /> {t('detail.family_relations') || 'Quan hệ gia đình'}
                    </h4>
                    
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-4 md:p-5 rounded-2xl">
                            <span className="text-[15px] font-medium text-zinc-600 dark:text-zinc-400">{t('detail.parent') || 'Bố/mẹ'}</span>
                            <span className="text-[15px] font-bold text-zinc-900 dark:text-white">{parent ? parent.name : (t('detail.none') || 'Không')}</span>
                        </div>
                        
                        <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-4 md:p-5 rounded-2xl">
                            <span className="text-[15px] font-medium text-zinc-600 dark:text-zinc-400">{t('detail.spouse') || 'Vợ/chồng'}</span>
                            <span className="text-[15px] font-bold text-zinc-900 dark:text-white">{spouse ? spouse.name : (t('detail.not_yet') || 'Chưa có')}</span>
                        </div>
                        
                        {member.weddingDate && (
                            <div className="flex items-center justify-between bg-pink-50 dark:bg-pink-500/10 border border-pink-100 dark:border-pink-500/20 p-4 md:p-5 rounded-2xl">
                                <span className="text-[15px] font-medium text-pink-600 dark:text-pink-400 flex items-center gap-1.5"><Heart size={16} className="fill-pink-500"/> {t('detail.wedding_date') || 'Ngày cưới'}</span>
                                <span className="text-[15px] font-bold text-zinc-900 dark:text-white">{member.weddingDate}</span>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 bg-black/5 dark:bg-white/5 p-4 md:p-5 rounded-2xl">
                            <div className="flex items-center justify-between">
                                <span className="text-[15px] font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-2"><Baby size={18}/> {t('detail.children') || 'Con cái'} ({children.length})</span>
                            </div>
                            {children.length > 0 ? (
                                <div className="flex flex-col gap-2.5 mt-2">
                                    {children.map(c => (
                                        <div key={c.id} className="text-[15px] font-medium text-zinc-900 dark:text-white flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></div>
                                            {c.birthOrder ? `${c.birthOrder}. ` : ''}{c.name}
                                            {c.childType === 'adopted' && <span className="text-xs font-semibold text-zinc-500 px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">{t('detail.adopted') || 'Con nuôi'}</span>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-[15px] font-bold text-zinc-900 dark:text-white mt-1">{t('detail.none') || 'Không có'}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Thành tích ── */}
                {achievements.length > 0 && (
                    <div className="flex flex-col gap-5">
                        <h4 className="flex items-center gap-2 text-[15px] font-bold text-zinc-900 dark:text-white uppercase tracking-wide border-b border-black/5 dark:border-white/10 pb-3">
                            <Trophy size={18} className="text-yellow-500" /> {t('detail.achievements') || 'Thành tích'}
                        </h4>
                        <div className="flex flex-col gap-4">
                            {achievements.map(a => (
                                <div key={a.id} className="relative flex flex-col gap-2 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700/50 p-5 rounded-2xl shadow-sm">
                                    <div className="text-[13px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider flex items-center gap-2">
                                        <Trophy size={14} /> {CATEGORY_LABELS[a.category] || a.category}
                                        {a.startYear && <span className="text-amber-700/70 dark:text-amber-400/70 ml-1">• {a.startYear}{a.endYear ? ` - ${a.endYear}` : ` - hiện tại`}</span>}
                                    </div>
                                    <div className="text-[17px] font-bold text-zinc-900 dark:text-white mt-1">{a.title}</div>
                                    {a.organization && <div className="text-[13px] font-semibold text-zinc-600 dark:text-zinc-400">{a.organization}</div>}
                                    {a.description && <div className="text-[13px] font-medium text-zinc-500 dark:text-zinc-500 mt-1 leading-relaxed">{a.description}</div>}
                                    
                                    {isAdmin && (
                                        <button 
                                            onClick={() => handleDeleteAch(a.id)} 
                                            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 transition-colors" 
                                            title={t('action.delete') || 'Xóa'}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Action Buttons ── */}
            <div className="p-5 border-t border-black/5 dark:border-white/10 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl shrink-0 pb-6 rounded-b-[2rem]">
                {isAdmin ? (
                    <div className="grid grid-cols-2 gap-3">
                        {onEdit && (
                            <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 font-bold text-[14px] transition-colors" onClick={() => onEdit(member.id)}>
                                <Edit2 size={16} /> {t('detail.btn_edit') || 'Sửa'}
                            </button>
                        )}
                        {onAddChild && (
                            <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 font-bold text-[14px] transition-colors" onClick={() => onAddChild(member.id)}>
                                <Plus size={16} /> {t('detail.btn_add_child') || 'Thêm con'}
                            </button>
                        )}
                        {!spouse && onAddSpouse && (
                            <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 font-bold text-[14px] transition-colors" onClick={() => onAddSpouse(member.id)}>
                                <Plus size={16} /> {t('detail.btn_add_spouse') || 'Thêm vợ/chồng'}
                            </button>
                        )}
                        {onDelete && (
                            <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 font-bold text-[14px] transition-colors" onClick={() => onDelete(member.id)}>
                                <Trash2 size={16} /> {t('detail.btn_delete') || 'Xóa'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {onSelfEdit && (
                            <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/25 font-bold text-[14px] transition-all" onClick={() => onSelfEdit(member.id)}>
                                <Edit2 size={16} /> {t('detail.btn_self_edit') || 'Cập nhật thông tin của tôi'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
        )}
        </AnimatePresence>
    );
}
