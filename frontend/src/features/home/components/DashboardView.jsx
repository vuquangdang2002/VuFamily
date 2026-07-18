import React from 'react';
import { Network, Newspaper, MessageSquare, Calendar, Wallet, Users, LayoutList, HelpCircle, ChevronRight, Cake, Flame, Quote, Sparkles, Heart, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../../shared/hooks/useTranslation.js';
import '../styles/DashboardView.css';

const cardVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }, hover: { y: -4, scale: 1.01, transition: { duration: 0.2, ease: "easeOut" } } };
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };

export default function DashboardView({ user, greetingText, dateDisplay, totalMembers, totalGenerations, combinedEvents, hasEvents, onNavigate }) {
    const { t } = useTranslation();

    return (
        <motion.div 
            className="dashboard-container custom-scrollbar"
            initial="hidden" animate="visible" variants={containerVariants}
        >
            {/* ── Welcome Hero Banner ── */}
            <motion.div className="dashboard-hero" variants={cardVariants}>
                <div className="relative z-10 flex flex-col gap-3 max-w-2xl">
                    <div className="dashboard-pill">
                        <Sparkles size={14} /> {t('dashboard.family_name') || 'Gia tộc Vũ tộc'}
                    </div>
                    <h1 className="dashboard-title">
                        {greetingText}, <span className="text-[#fe6e00]">{user?.displayName || user?.username}</span>!
                    </h1>
                    <p className="dashboard-subtitle">
                        {t('dashboard.welcome_subtitle') || 'Chào mừng bạn trở lại không gian sinh hoạt số của Dòng Họ Vũ.'}
                    </p>
                    {dateDisplay.lunar && (
                        <div className="dashboard-date">
                            <span className="flex items-center gap-1.5 text-blue-400"><Calendar size={16} /> {dateDisplay.solar}</span>
                            <span className="text-[#30363d]">|</span>
                            <span className="text-[#fe6e00]">{t('dashboard.lunar_calendar') || 'Âm lịch:'} {dateDisplay.lunar}</span>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* ── Quick Navigation Dashboard Grid ── */}
            <div className="flex flex-col gap-4">
                <h3 className="dashboard-grid-title"><LayoutList size={20} className="text-[#8b949e]" /> {t('dashboard.main_features') || 'Tính năng chính'}</h3>
                <motion.div className="dashboard-grid" variants={containerVariants}>
                    {[
                        { id: 'tree', title: t('dashboard.feature_tree_title') || 'Phả đồ Dòng họ', desc: t('dashboard.feature_tree_desc') || 'Khám phá sơ đồ phả hệ, tra cứu nguồn cội và các nhánh gia tộc.', icon: Network, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                        { id: 'newsfeed', title: t('dashboard.feature_newsfeed_title') || 'Bản tin Gia đình', desc: t('dashboard.feature_newsfeed_desc') || 'Cập nhật tin tức, hoạt động, thông báo quan trọng từ dòng họ.', icon: Newspaper, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                        { id: 'chat', title: t('dashboard.feature_chat_title') || 'Trò chuyện', desc: t('dashboard.feature_chat_desc') || 'Nhắn tin tức thời, chia sẻ hình ảnh và gọi thoại/video.', icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                        { id: 'calendar', title: t('dashboard.feature_calendar_title') || 'Lịch & Sự kiện', desc: t('dashboard.feature_calendar_desc') || 'Theo dõi ngày giỗ, sinh nhật và sự kiện chung sắp diễn ra.', icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                        { id: 'finance', title: t('dashboard.feature_finance_title') || 'Quỹ Tài chính', desc: t('dashboard.feature_finance_desc') || 'Quản lý đóng góp, báo cáo thu chi minh bạch của dòng họ.', icon: Wallet, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                        { id: 'guide', title: t('dashboard.feature_guide_title') || 'Hướng dẫn', desc: t('dashboard.feature_guide_desc') || 'Cách dùng gia phả, tạo chat, quản lý quỹ dòng họ.', icon: HelpCircle, color: 'text-zinc-400', bg: 'bg-zinc-500/10' }
                    ].map((feature) => (
                        <motion.div 
                            key={feature.id}
                            className="dashboard-card group"
                            variants={cardVariants}
                            whileHover="hover"
                            onClick={() => onNavigate(feature.id)}
                        >
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${feature.bg} ${feature.color}`}>
                                <feature.icon size={24} />
                            </div>
                            <h4 className="text-lg font-bold mb-2 text-white">{feature.title}</h4>
                            <p className="text-sm text-[#8b949e] leading-relaxed mb-4 flex-1">{feature.desc}</p>
                            <div className="flex items-center text-sm font-semibold text-[#8b949e] group-hover:text-white transition-colors mt-auto pt-2">
                                {t('dashboard.explore') || 'Khám phá'} <ChevronRight size={16} className="ml-1" />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* ── Bottom Section with Events and Stats ── */}
            <motion.div className="dashboard-bottom-grid" variants={containerVariants}>
                {/* Upcoming Events Column */}
                <motion.div className="dashboard-events-panel" variants={cardVariants}>
                    <div className="dashboard-events-header">
                        <h3 className="font-bold text-white flex items-center gap-2"><Calendar size={18} className="text-purple-400" /> Sự kiện sắp tới</h3>
                        <button className="text-sm font-medium text-[#fe6e00] hover:text-[#e06100]" onClick={() => onNavigate('calendar')}>Xem tất cả</button>
                    </div>
                    
                    <div className="dashboard-events-body custom-scrollbar">
                        {!hasEvents ? (
                            <div className="h-full flex flex-col items-center justify-center text-[#8b949e]">
                                <Sparkles size={32} className="mb-3 opacity-50" />
                                <p className="text-sm">Không có sự kiện nào trong 30 ngày tới.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {combinedEvents.map((ev, i) => {
                                    let icon = <Cake size={20} />;
                                    let bgCls = "bg-pink-500/10 text-pink-400";
                                    let title = null;
                                    let subtitle = "";

                                    if (ev.type === 'anniversary') {
                                        icon = <Flame size={20} />;
                                        bgCls = "bg-orange-500/10 text-orange-400";
                                        title = <>Ngày giỗ <span className="font-semibold text-white">{ev.member.name}</span></>;
                                        subtitle = `Âm: ${ev.lunarStr} • Dương: ${ev.solarAnniversary}`;
                                    } else if (ev.type === 'birthday') {
                                        icon = <Cake size={20} />;
                                        bgCls = "bg-pink-500/10 text-pink-400";
                                        title = <>Sinh nhật <span className="font-semibold text-white">{ev.member.name}</span></>;
                                        subtitle = `${ev.fullDate} ${ev.age !== null ? `• Tuổi: ${ev.age}` : ''}`;
                                    } else if (ev.type === 'wedding') {
                                        icon = <Heart size={20} />;
                                        bgCls = "bg-rose-500/10 text-rose-400";
                                        title = <>Kỷ niệm cưới <span className="font-semibold text-white">{ev.member.name}</span></>;
                                        subtitle = `Kỷ niệm ${ev.years} năm • Ngày: ${ev.displayDate}`;
                                    } else if (ev.type === 'day30') {
                                        icon = <Sparkles size={20} />;
                                        bgCls = "bg-emerald-500/10 text-emerald-400";
                                        title = <>Đầy tháng bé <span className="font-semibold text-white">{ev.member.name}</span></>;
                                        subtitle = `Ngày: ${ev.displayDate}`;
                                    } else if (ev.type === 'year1') {
                                        icon = <Award size={20} />;
                                        bgCls = "bg-blue-500/10 text-blue-400";
                                        title = <>Thôi nôi bé <span className="font-semibold text-white">{ev.member.name}</span></>;
                                        subtitle = `Ngày: ${ev.displayDate}`;
                                    }

                                    return (
                                        <div key={`${ev.type}-${i}`} className="dashboard-event-item">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bgCls}`}>
                                                {icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-[#c9d1d9] truncate">{title}</div>
                                                <div className="text-xs text-[#8b949e] mt-1">{subtitle}</div>
                                            </div>
                                            <div className="shrink-0">
                                                {ev.daysUntil === 0 ? (
                                                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Hôm nay</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#0d1117] border border-[#30363d] text-[#c9d1d9]">Còn {ev.daysUntil} ngày</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Family Stats Column */}
                <motion.div className="dashboard-stats-panel" variants={containerVariants}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="dashboard-stats-card">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                                <Users size={20} />
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">{totalMembers}</div>
                            <div className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Thành viên</div>
                        </div>
                        <div className="dashboard-stats-card">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                                <Network size={20} />
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">{totalGenerations}</div>
                            <div className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Thế hệ</div>
                        </div>
                    </div>

                    <div className="dashboard-quote">
                        <Quote size={40} className="absolute -top-2 -left-2 text-[#fe6e00]/10" />
                        <p className="relative z-10 text-white text-sm italic leading-relaxed pl-4 border-l-2 border-[#fe6e00]/50 mb-3">
                            "Con người có tổ có tông,<br />
                            Như cây có cội, như sông có nguồn."
                        </p>
                        <span className="relative z-10 self-end text-xs font-medium text-[#8b949e]">— Ca dao Việt Nam</span>
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
