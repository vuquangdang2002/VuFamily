import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { Solar } from '../../shared/utils/lunar.js';
import { ganZhiToViet, lunarMonthName } from '../../shared/utils/vietLunar.js';
import { request } from '../../shared/services/api/request';
import { Network, Newspaper, MessageSquare, Calendar, Wallet, Users, LayoutList, HelpCircle, ChevronRight, Cake, Flame, Quote, Sparkles, LogIn, UserPlus, Image, Heart, Award } from 'lucide-react';
import { motion } from 'framer-motion';

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    hover: { y: -4, scale: 1.01, transition: { duration: 0.2, ease: "easeOut" } }
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function HomePage({ user, members, onNavigate, addToast }) {
    const { t } = useTranslation();

    // ── Time & Date Greetings ──
    const greetingText = useMemo(() => {
        const hr = new Date().getHours();
        if (hr < 12) return t('home.greeting_morning') || 'Chào buổi sáng';
        if (hr < 18) return t('home.greeting_afternoon') || 'Chào buổi chiều';
        return t('home.greeting_evening') || 'Chào buổi tối';
    }, [t]);

    const dateDisplay = useMemo(() => {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const solarStr = today.toLocaleDateString('vi-VN', options);
        
        let lunarStr = '';
        try {
            const solar = Solar.fromYmd(today.getFullYear(), today.getMonth() + 1, today.getDate());
            const lunar = solar.getLunar();
            const day = lunar.getDay();
            const month = lunar.getMonth();
            const yearGanZhi = ganZhiToViet(lunar.getYearInGanZhi());
            const monthName = lunarMonthName(month);
            lunarStr = `Ngày ${day} tháng ${monthName} năm ${yearGanZhi}`;
        } catch (e) {
            console.error('Error generating lunar date greeting:', e);
        }
        
        return { solar: solarStr, lunar: lunarStr };
    }, []);

    // ── Tree Stats ──
    const totalMembers = members.length;
    const totalGenerations = useMemo(() => {
        if (members.length === 0) return 0;
        return Math.max(...members.map(m => m.generation || 0), 0);
    }, [members]);

    // ── Upcoming Events (API-driven) ──
    const [anniversaries, setAnniversaries] = useState({
        birthdays: [],
        weddingAnniversaries: [],
        deathAnniversaries: [],
        day30Events: [],
        year1Events: []
    });
    const [loadingEvents, setLoadingEvents] = useState(true);

    useEffect(() => {
        if (!user) return;
        request('/events/anniversaries?daysAhead=30')
            .then(json => {
                if (json.success) setAnniversaries(json.data);
            })
            .catch(err => console.error('Failed to fetch anniversaries:', err))
            .finally(() => setLoadingEvents(false));
    }, [user]);

    const combinedEvents = useMemo(() => {
        const list = [];
        anniversaries.deathAnniversaries.forEach(ev => list.push({ ...ev, type: 'anniversary' }));
        anniversaries.birthdays.forEach(ev => list.push({ ...ev, type: 'birthday' }));
        anniversaries.weddingAnniversaries.forEach(ev => list.push({ ...ev, type: 'wedding' }));
        anniversaries.day30Events.forEach(ev => list.push({ ...ev, type: 'day30' }));
        anniversaries.year1Events.forEach(ev => list.push({ ...ev, type: 'year1' }));
        
        return list.sort((a, b) => a.daysUntil - b.daysUntil);
    }, [anniversaries]);

    const hasEvents = combinedEvents.length > 0;

    // ── PUBLIC GUEST LANDING VIEW ──
    if (!user) {
        return (
            <div className="flex flex-col min-h-screen w-full bg-[#F2F2F7] dark:bg-black text-zinc-900 dark:text-zinc-100 overflow-y-auto overflow-x-hidden">
                {/* Landing Header */}
                <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-black/70 border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                            族
                        </div>
                        <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400">
                            VŨ GIA
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => onNavigate('login')}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-2xl text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                        >
                            <LogIn size={16} /> Đăng nhập
                        </button>
                        <button 
                            onClick={() => onNavigate('register')}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all transform active:scale-95"
                        >
                            <UserPlus size={16} /> Đăng ký
                        </button>
                    </div>
                </header>

                <motion.div 
                    className="max-w-6xl mx-auto p-6 md:p-12 flex flex-col gap-12 md:gap-16 w-full"
                    initial="hidden" animate="visible" variants={containerVariants}
                >
                    {/* Hero Section */}
                    <motion.div 
                        className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-[#1C1C1E] p-8 md:p-16 shadow-xl border border-black/5 dark:border-white/5 text-center flex flex-col items-center gap-6"
                        variants={cardVariants}
                    >
                        <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20">
                            <Sparkles size={14} /> Kính Tổ Tế Tông • Tương Thân Tương Ái
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight md:leading-tight max-w-3xl">
                            Kết Nối Cội Nguồn <br className="hidden md:inline" />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300">
                                Gìn Giữ Gia Phong
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
                            Không gian số kết nối các thế hệ Vũ Tộc. Nơi dòng họ lưu giữ phả đồ số hóa, chia sẻ khoảnh khắc sum vầy và tôn vinh truyền thống hiếu học.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 w-full justify-center">
                            <button 
                                onClick={() => onNavigate('login')}
                                className="w-full sm:w-auto px-8 py-4 font-extrabold rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:scale-102 hover:shadow-xl hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                Khám phá phả hệ <ChevronRight size={18} />
                            </button>
                            <button 
                                onClick={() => onNavigate('register')}
                                className="w-full sm:w-auto px-8 py-4 font-bold rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-white border border-black/5 dark:border-white/5 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                            >
                                Gửi yêu cầu gia nhập
                            </button>
                        </div>

                        {/* Background decor */}
                        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
                            <div className="absolute top-[-30%] left-[-10%] w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[120px]"></div>
                            <div className="absolute bottom-[-30%] right-[-10%] w-[350px] h-[350px] bg-indigo-500/20 rounded-full blur-[120px]"></div>
                        </div>
                    </motion.div>

                    {/* Family Moments Section (Khoảnh khắc gia đình) */}
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
                                <Image className="text-blue-500" size={26} /> Khoảnh khắc gia tộc
                            </h2>
                            <p className="text-zinc-500 dark:text-zinc-400">Những sự kiện, kỷ niệm đẹp được lưu lại và chia sẻ cùng con cháu.</p>
                        </div>
                        <motion.div 
                            className="grid grid-cols-1 md:grid-cols-3 gap-6"
                            variants={containerVariants}
                        >
                            {[
                                { title: "Lễ Tế Tổ & Khuyến Học", desc: "Họp mặt tế lễ Tổ tiên thường niên và trao quỹ khuyến học nâng bước con cháu đỗ đạt thành tài.", date: "Đầu xuân hàng năm", icon: Award, color: "from-amber-500 to-orange-600" },
                                { title: "Mừng Thọ Các Cụ Cao Niên", desc: "Lễ chúc thọ ấm cúng thể hiện lòng hiếu thảo, cầu mong vạn sự bình an cho ông bà cha mẹ dòng tộc.", date: "Tết Nguyên Đán", icon: Heart, color: "from-rose-500 to-pink-600" },
                                { title: "Hội Ngộ Chi Nhánh Gia Tộc", desc: "Dịp gặp mặt kết nối các gia đình xa xứ, chia sẻ câu chuyện cuộc sống và cùng hướng về nguồn cội.", date: "Tháng 8 Âm lịch", icon: Users, color: "from-blue-500 to-indigo-600" }
                            ].map((moment, idx) => (
                                <motion.div 
                                    key={idx}
                                    className="group relative flex flex-col p-6 rounded-[2.2rem] bg-white dark:bg-[#1C1C1E] shadow-md border border-black/5 dark:border-white/5 overflow-hidden"
                                    variants={cardVariants}
                                    whileHover="hover"
                                >
                                    <div className="absolute inset-0 bg-black/[0.01] dark:bg-white/[0.01]"></div>
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${moment.color} text-white flex items-center justify-center mb-6 shadow-md transition-transform duration-300 group-hover:scale-110`}>
                                        <moment.icon size={22} />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{moment.title}</h3>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6 flex-1">{moment.desc}</p>
                                    <div className="text-xs font-semibold text-zinc-400 border-t border-black/5 dark:border-white/5 pt-4">
                                        ⏱ {moment.date}
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Features Overview */}
                    <div className="flex flex-col gap-6">
                        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
                            <LayoutList className="text-indigo-500" size={26} /> Giá trị không gian số dòng họ
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { title: "Cây Phả Hệ Trực Quan", desc: "Tra cứu danh sách thành viên dòng họ qua sơ đồ phả hệ thông minh trực quan.", icon: Network, color: "text-blue-500" },
                                { title: "Bản Tin & Sự Kiện", desc: "Nơi cập nhật thông tin ngày giỗ, ngày lễ và thông báo chung kịp thời.", icon: Newspaper, color: "text-amber-500" },
                                { title: "Trò Chuyện & Gọi Nhóm", desc: "Kết nối trực tuyến chất lượng cao không giới hạn qua Jitsi Meet Call.", icon: MessageSquare, color: "text-emerald-500" },
                                { title: "Minh Bạch Quỹ Dòng Họ", desc: "Quản lý dòng tiền đóng đóng, thu chi công khai minh bạch.", icon: Wallet, color: "text-rose-500" }
                            ].map((feat, idx) => (
                                <div key={idx} className="flex gap-4 p-5 rounded-3xl bg-white/50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                                    <div className={`${feat.color} shrink-0 mt-1`}><feat.icon size={22} /></div>
                                    <div>
                                        <h4 className="font-bold text-base mb-1">{feat.title}</h4>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{feat.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA Bottom Section */}
                    <motion.div 
                        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-tr from-zinc-900 to-indigo-950 text-white p-8 md:p-14 shadow-xl text-center flex flex-col items-center gap-6"
                        variants={cardVariants}
                    >
                        <h2 className="text-3xl md:text-5xl font-black max-w-2xl leading-tight">
                            Bắt đầu kết nối số dòng họ Vũ của bạn
                        </h2>
                        <p className="text-zinc-300 max-w-xl text-sm md:text-base leading-relaxed">
                            Hãy đăng nhập để tham gia trò chuyện trực tuyến, tìm kiếm sơ đồ phả hệ cội nguồn gia quyến hoặc gửi yêu cầu tạo tài khoản mới.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2 w-full justify-center">
                            <button 
                                onClick={() => onNavigate('login')}
                                className="w-full sm:w-auto px-8 py-3.5 font-bold rounded-2xl bg-white text-zinc-950 shadow-md hover:bg-zinc-100 transition-all flex items-center justify-center gap-2"
                            >
                                Đăng nhập tài khoản
                            </button>
                            <button 
                                onClick={() => onNavigate('register')}
                                className="w-full sm:w-auto px-8 py-3.5 font-bold rounded-2xl bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
                            >
                                Gửi mẫu Đăng ký
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
                
                {/* Simple Footer */}
                <footer className="mt-auto py-8 text-center text-xs text-zinc-400 dark:text-zinc-600 border-t border-black/5 dark:border-white/5">
                    Copyright © 2026 by DangVQ • VuFamily Genealogy Platforms
                </footer>
            </div>
        );
    }

    // ── AUTHENTICATED USER HOME VIEW (Dashboard) ──
    return (
        <motion.div 
            className="flex flex-col gap-6 md:gap-8 p-4 md:p-8 h-full overflow-y-auto w-full text-zinc-900 dark:text-zinc-100 bg-[#F2F2F7] dark:bg-black"
            initial="hidden" animate="visible" variants={containerVariants}
        >
            {/* ── Welcome Hero Banner ── */}
            <motion.div 
                className="relative overflow-hidden rounded-[2rem] bg-white dark:bg-[#1C1C1E] p-8 md:p-12 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between"
                variants={cardVariants}
            >
                <div className="relative z-10 flex flex-col gap-4 max-w-2xl">
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 border border-amber-500/20 self-start">
                        <Sparkles size={14} /> Gia tộc Vũ tộc
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
                        {greetingText}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300">{user?.displayName || user?.username}</span>!
                    </h1>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400">
                        Chào mừng bạn trở lại không gian sinh hoạt số của Dòng Họ Vũ.
                    </p>
                    {dateDisplay.lunar && (
                        <div className="flex flex-wrap items-center gap-3 text-sm font-medium mt-2">
                            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400"><Calendar size={16} /> {dateDisplay.solar}</span>
                            <span className="text-zinc-300 dark:text-zinc-700 hidden md:inline">|</span>
                            <span className="text-amber-600 dark:text-amber-400">Âm lịch: {dateDisplay.lunar}</span>
                        </div>
                    )}
                </div>
                
                {/* Decorative glows (Subtle for iOS) */}
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-50">
                    <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px]"></div>
                    <div className="absolute bottom-[-20%] right-[10%] w-[250px] h-[250px] bg-amber-500/10 rounded-full blur-[80px]"></div>
                </div>
            </motion.div>

            {/* ── Quick Navigation Dashboard Grid (Bento Box) ── */}
            <div className="flex flex-col gap-4">
                <h3 className="text-xl font-bold flex items-center gap-2 px-2"><LayoutList size={22} className="text-zinc-400" /> Tính năng chính</h3>
                <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-[minmax(200px,auto)] gap-4 md:gap-5"
                    variants={containerVariants}
                >
                    {[
                        { id: 'tree', title: 'Phả đồ Dòng họ', desc: 'Khám phá sơ đồ phả hệ dòng họ Vũ, tra cứu nguồn cội và các nhánh gia tộc.', icon: Network, color: 'text-blue-500', bg: 'bg-blue-500/10', wide: true },
                        { id: 'newsfeed', title: 'Bản tin Gia đình', desc: 'Cập nhật tin tức, hoạt động, thông báo quan trọng từ hội đồng dòng họ.', icon: Newspaper, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                        { id: 'chat', title: 'Trò chuyện trực tuyến', desc: 'Nhắn tin tức thời, chia sẻ hình ảnh và gọi thoại/video nhóm miễn phí.', icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        { id: 'calendar', title: 'Lịch & Sự kiện', desc: 'Theo dõi ngày giỗ, sinh nhật thành viên và sự kiện chung sắp diễn ra.', icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                        { id: 'finance', title: 'Quỹ Tài chính', desc: 'Quản lý các khoản đóng góp, báo cáo thu chi minh bạch của dòng họ.', icon: Wallet, color: 'text-rose-500', bg: 'bg-rose-500/10' }
                    ].map((feature, i) => (
                        <motion.div 
                            key={feature.id}
                            className={`group relative flex flex-col p-6 rounded-[2rem] bg-white dark:bg-[#1C1C1E] shadow-sm cursor-pointer overflow-hidden ${feature.wide ? 'md:col-span-2 lg:col-span-2' : ''}`}
                            variants={cardVariants}
                            whileHover="hover"
                            onClick={() => onNavigate(feature.id)}
                        >
                            <div className="absolute inset-0 bg-black/[0.02] dark:bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${feature.bg} ${feature.color} border border-current/10 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
                                <feature.icon size={24} />
                            </div>
                            
                            <h4 className="text-lg font-bold mb-2 text-zinc-900 dark:text-white">{feature.title}</h4>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">{feature.desc}</p>
                            
                            <div className="mt-auto pt-2 flex items-center text-sm font-semibold text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
                                Vào {feature.title.toLowerCase()} <ChevronRight size={16} className="ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* ── Bottom Section with Events and Stats ── */}
            <motion.div 
                className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6"
                variants={containerVariants}
            >
                {/* Upcoming Events Column */}
                <motion.div 
                    className="flex flex-col bg-white dark:bg-[#1C1C1E] rounded-[2rem] shadow-sm overflow-hidden h-[450px]"
                    variants={cardVariants}
                >
                    <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 dark:border-white/5">
                        <h3 className="font-bold flex items-center gap-2"><Calendar size={18} className="text-purple-500" /> Sự kiện sắp tới</h3>
                        <button className="text-sm font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" onClick={() => onNavigate('calendar')}>Xem tất cả</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2">
                        {!hasEvents ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
                                <Sparkles size={48} className="mb-4 text-zinc-300 dark:text-zinc-700" />
                                <p className="text-sm">Không có sự kiện quan trọng nào trong 30 ngày tới.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 p-2">
                                {combinedEvents.map((ev, i) => {
                                    let icon = <Cake size={24} />;
                                    let bgCls = "bg-pink-500/10 text-pink-500";
                                    let title = null;
                                    let subtitle = "";

                                    if (ev.type === 'anniversary') {
                                        icon = <Flame size={24} />;
                                        bgCls = "bg-orange-500/10 text-orange-500";
                                        title = <>Ngày giỗ <span className="font-bold">{ev.member.name}</span></>;
                                        subtitle = `Âm: ${ev.lunarStr} • Dương: ${ev.solarAnniversary}`;
                                    } else if (ev.type === 'birthday') {
                                        icon = <Cake size={24} />;
                                        bgCls = "bg-pink-500/10 text-pink-500";
                                        title = <>Sinh nhật <span className="font-bold">{ev.member.name}</span></>;
                                        subtitle = `${ev.fullDate} ${ev.age !== null ? `• Tuổi: ${ev.age}` : ''}`;
                                    } else if (ev.type === 'wedding') {
                                        icon = <Heart size={24} />;
                                        bgCls = "bg-rose-500/10 text-rose-500";
                                        title = <>Kỷ niệm ngày cưới <span className="font-bold">{ev.member.name}</span></>;
                                        subtitle = `Kỷ niệm ${ev.years} năm • Ngày: ${ev.displayDate}`;
                                    } else if (ev.type === 'day30') {
                                        icon = <Sparkles size={24} />;
                                        bgCls = "bg-emerald-500/10 text-emerald-500";
                                        title = <>Đầy tháng bé <span className="font-bold">{ev.member.name}</span></>;
                                        subtitle = `Lễ đầy tháng • Ngày: ${ev.displayDate}`;
                                    } else if (ev.type === 'year1') {
                                        icon = <Award size={24} />;
                                        bgCls = "bg-blue-500/10 text-blue-500";
                                        title = <>Lễ thôi nôi bé <span className="font-bold">{ev.member.name}</span></>;
                                        subtitle = `Thôi nôi (1 tuổi) • Ngày: ${ev.displayDate}`;
                                    }

                                    return (
                                        <div key={`${ev.type}-${i}`} className="group flex items-center gap-4 p-4 rounded-3xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
                                            <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 ${bgCls}`}>
                                                {icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate text-zinc-900 dark:text-white">{title}</div>
                                                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                                    {subtitle}
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                {ev.daysUntil === 0 ? (
                                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30 animate-pulse">Hôm nay</span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">Còn {ev.daysUntil} ngày</span>
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
                <motion.div 
                    className="flex flex-col gap-6"
                    variants={containerVariants}
                >
                    <motion.div className="grid grid-cols-2 gap-4" variants={cardVariants}>
                        <div className="flex flex-col items-start gap-4 p-6 bg-white dark:bg-[#1C1C1E] rounded-[2rem] shadow-sm">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <Users size={24} />
                            </div>
                            <div>
                                <div className="text-3xl font-black">{totalMembers}</div>
                                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Thành viên</div>
                            </div>
                        </div>
                        <div className="flex flex-col items-start gap-4 p-6 bg-white dark:bg-[#1C1C1E] rounded-[2rem] shadow-sm">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <Network size={24} />
                            </div>
                            <div>
                                <div className="text-3xl font-black">{totalGenerations}</div>
                                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Thế hệ</div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div 
                        className="relative p-8 bg-white dark:bg-[#1C1C1E] rounded-[2rem] shadow-sm flex flex-col items-start gap-4 overflow-hidden"
                        variants={cardVariants}
                    >
                        <Quote size={80} className="absolute -top-4 -left-4 text-amber-500/10 rotate-12" />
                        <p className="relative z-10 text-amber-900 dark:text-amber-100 text-lg italic leading-relaxed pl-6 border-l-2 border-amber-500/50">
                            "Con người có tổ có tông,<br />
                            Như cây có cội, như sông có nguồn."
                        </p>
                        <span className="relative z-10 self-end text-sm font-semibold text-amber-700/60 dark:text-amber-300/60">— Ca dao Việt Nam</span>
                    </motion.div>

                    <motion.div 
                        className="flex items-center gap-4 p-6 bg-white dark:bg-[#1C1C1E] rounded-[2rem] shadow-sm cursor-pointer transition-all"
                        variants={cardVariants}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => onNavigate('guide')}
                    >
                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                            <HelpCircle size={24} />
                        </div>
                        <div>
                            <h5 className="font-bold text-sm">Hướng dẫn sử dụng</h5>
                            <p className="text-xs text-zinc-500 mt-0.5">Cách dùng gia phả, tạo chat, quản lý quỹ.</p>
                        </div>
                    </motion.div>
                </motion.div>

            </motion.div>
        </motion.div>
    );
}
