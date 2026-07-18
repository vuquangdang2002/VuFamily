import React from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { Solar } from '../../../shared/utils/lunar.js';
import { lunarDayLabel } from '../../../shared/utils/vietLunar.js';
import { myError } from '../../../shared/utils/logger';
import { api } from '../../../shared/services/api';
import { MemberAvatar } from './UpcomingEventsSidebar';
import { 
    daysInMonth, getEventsForDate, 
    calcAge, getUpcomingBirthdays, getUpcomingAnniversaries 
} from '../utils/calendarHelpers';

const RECURRENCE_LABELS = {
    weekly: 'calendar.recurrence_weekly',
    monthly: 'calendar.recurrence_monthly',
    yearly: 'calendar.recurrence_yearly'
};

export default function CalendarGrid({ 
    members, viewYear, setViewYear, 
    viewMonth, setViewMonth, 
    selectedDay, setSelectedDay,
    serverEvents = [],
    monthlyEvents = [],
    user,
    addToast,
    onRefreshEvents
}) {
    const { t } = useTranslation();
    const today = new Date();

    const WEEKDAYS = t('calendar.weekdays').split(',');
    const MONTH_NAMES = t('calendar.month_names').split(',');

    const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
    const totalDays = daysInMonth(viewYear, viewMonth);
    const weeks = [];
    let week = new Array(firstDayOfWeek).fill(null);
    for (let d = 1; d <= totalDays; d++) {
        week.push(d);
        if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

    const prevMonth = () => { 
        if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); } 
        else setViewMonth(m => m - 1); 
        setSelectedDay(null); 
    };
    const nextMonth = () => { 
        if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); } 
        else setViewMonth(m => m + 1); 
        setSelectedDay(null); 
    };
    const goToday = () => { 
        setViewYear(today.getFullYear()); 
        setViewMonth(today.getMonth() + 1); 
        setSelectedDay(today.getDate()); 
    };
    
    const isToday = (d) => d === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();
    const selectedDayEvents = selectedDay ? monthlyEvents.filter(ev => ev.day === selectedDay) : [];

    const currentUserId = (() => {
        try {
            const { AuthHelper } = require('../../../shared/services/AuthHelper');
            return AuthHelper.getAuthData().id;
        } catch { return null; }
    })();

    const handleRegisterEvent = async (eventId) => {
        try {
            const res = await api.registerEvent(eventId);
            if (res.success) {
                addToast?.(t('calendar.event_register'), 'success');
                onRefreshEvents?.();
            }
        } catch (e) { myError('CALENDAR', e); }
    };

    const handleUnregisterEvent = async (eventId) => {
        try {
            const res = await api.unregisterEvent(eventId);
            if (res.success) {
                addToast?.(t('calendar.event_unregister'), 'info');
                onRefreshEvents?.();
            }
        } catch (e) { myError('CALENDAR', e); }
    };

    return (
        <div className="w-full">
            <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-[1.5rem] shadow-sm p-4 md:p-6 flex flex-col gap-6">
                
                {/* ── Navigation ── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-zinc-600 dark:text-zinc-300" onClick={prevMonth}>
                            ◀
                        </button>
                        <span className="text-lg md:text-xl font-extrabold text-zinc-900 dark:text-white capitalize min-w-[120px] text-center">
                            {MONTH_NAMES[viewMonth - 1]} {viewYear}
                        </span>
                        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-zinc-600 dark:text-zinc-300" onClick={nextMonth}>
                            ▶
                        </button>
                    </div>
                    <button className="px-4 py-2 rounded-xl font-bold text-sm bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/30 transition-colors shadow-sm" onClick={goToday}>
                        {t('calendar.today_btn')}
                    </button>
                </div>

                {/* ── Grid ── */}
                <div className="grid grid-cols-7 gap-1.5 md:gap-3">
                    {WEEKDAYS.map((wd, idx) => (
                        <div key={wd} className={`text-center text-[11px] md:text-xs font-black uppercase tracking-wider py-2 ${idx === 0 ? 'text-rose-500' : 'text-zinc-500'}`}>
                            {wd}
                        </div>
                    ))}
                    
                    {weeks.map((wk, wi) =>
                        wk.map((d, di) => {
                            if (d === null) return <div key={`e-${wi}-${di}`} className="aspect-square md:aspect-auto md:min-h-[90px] invisible" />;
                            
                            const events = monthlyEvents.filter(ev => ev.day === d);
                            const hasBD = events.some(e => ['birthday', 'day30', 'year1'].includes(e.type));
                            const hasAN = events.some(e => e.type === 'anniversary');
                            const hasEV = events.some(e => ['event', 'wedding'].includes(e.type));

                            let lunarLabel = '';
                            try {
                                const s = Solar.fromYmd(viewYear, viewMonth, d);
                                const l = s.getLunar();
                                lunarLabel = lunarDayLabel(l.getDay(), l.getMonth());
                            } catch (e) { myError('CALENDAR', "CalendarGrid Error:", e); }

                            const isCurrentDay = isToday(d);
                            const isSelected = d === selectedDay;
                            
                            let bgClass = "bg-white/40 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 border-black/5 dark:border-white/5";
                            if (isCurrentDay) bgClass = "bg-blue-50/80 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50";
                            if (isSelected) bgClass = "bg-white dark:bg-[#222] ring-2 ring-blue-500 border-transparent shadow-md transform scale-[1.02] z-10";

                            return (
                                <div key={`d-${d}`}
                                    className={`aspect-square md:aspect-auto md:min-h-[90px] p-1.5 md:p-2 border rounded-2xl cursor-pointer relative flex flex-col items-center md:items-start transition-all duration-200 ${bgClass}`}
                                    onClick={() => setSelectedDay(d === selectedDay ? null : d)}>
                                    
                                    <div className="flex flex-col items-center md:flex-row md:justify-between w-full">
                                        <span className={`text-[15px] font-extrabold ${isCurrentDay ? 'text-blue-600 dark:text-blue-400' : di === 0 ? 'text-rose-500' : 'text-zinc-700 dark:text-zinc-200'}`}>
                                            {d}
                                        </span>
                                        {lunarLabel && <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mt-0.5 md:mt-0">{lunarLabel}</span>}
                                    </div>
                                    
                                    {(hasBD || hasAN || hasEV) && (
                                        <div className="flex gap-1 mt-auto pt-2 pb-1 justify-center md:justify-start w-full">
                                            {hasBD && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />}
                                            {hasAN && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" />}
                                            {hasEV && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]" />}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── Legend ── */}
                <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-black/5 dark:border-white/10 mt-2">
                    <span className="flex items-center gap-2 text-[12px] font-bold text-zinc-600 dark:text-zinc-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" /> {t('calendar.legend_birthday')}
                    </span>
                    <span className="flex items-center gap-2 text-[12px] font-bold text-zinc-600 dark:text-zinc-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]" /> {t('calendar.legend_anniversary')}
                    </span>
                    <span className="flex items-center gap-2 text-[12px] font-bold text-zinc-600 dark:text-zinc-400">
                        <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]" /> {t('calendar.legend_event')}
                    </span>
                </div>
                
                {/* ── Selected Day Detail ── */}
                {selectedDay && (
                    <div className="mt-4 p-5 rounded-2xl bg-zinc-50/80 dark:bg-black/40 border border-black/5 dark:border-white/10 animate-fade-in flex flex-col gap-4">
                        <h4 className="text-[15px] font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                            <span className="text-blue-500">✨</span> {t('calendar.day_detail')} {selectedDay}/{viewMonth}/{viewYear}
                        </h4>
                        
                        {selectedDayEvents.length === 0 ? (
                            <div className="py-6 text-center text-[13px] font-medium text-zinc-500 bg-white/40 dark:bg-white/5 rounded-xl border border-dashed border-black/10 dark:border-white/10">
                                {t('calendar.no_event')}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {selectedDayEvents.map((ev, i) => {
                                    if (ev.type === 'event') {
                                        const sev = ev.event;
                                        const isRegistered = (sev.subscribers || []).some(s => s.id === currentUserId);
                                        return (
                                            <div key={`ev-${i}`} className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 shadow-sm">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center text-lg shrink-0">📅</div>
                                                <div className="flex flex-col flex-1 min-w-0 pt-0.5">
                                                    <span className="text-[14px] font-extrabold text-zinc-900 dark:text-white truncate">{sev.title}</span>
                                                    <div className="flex flex-col gap-0.5 mt-1">
                                                        <span className="text-[12px] text-zinc-500 flex flex-wrap gap-x-2">
                                                            {sev.time && <span>🕐 {sev.time}</span>}
                                                            {sev.location && <span>📍 {sev.location}</span>}
                                                            {sev.recurrence && sev.recurrence !== 'none' && <span>🔄 {t(RECURRENCE_LABELS[sev.recurrence] || '')}</span>}
                                                        </span>
                                                        <span className="text-[12px] font-bold text-blue-600 dark:text-blue-400 mt-1">
                                                            👥 {(sev.subscribers || []).length} {t('calendar.event_participants')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    className={`px-4 py-2 rounded-xl font-bold text-[12px] transition-colors shrink-0 ${isRegistered ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-black/5 text-zinc-600 hover:bg-black/10 dark:bg-white/10 dark:text-zinc-300'}`}
                                                    onClick={() => isRegistered ? handleUnregisterEvent(sev.id) : handleRegisterEvent(sev.id)}
                                                >
                                                    {isRegistered ? `✅ ${t('calendar.event_unregister') || 'Đã ĐK'}` : `📋 ${t('calendar.event_register') || 'Đăng ký'}`}
                                                </button>
                                            </div>
                                        );
                                    }

                                    let typeLabel = "";
                                    let emoji = "👤";
                                    let iconBg = "bg-zinc-100 dark:bg-zinc-800";
                                    
                                    if (ev.type === 'birthday') {
                                        typeLabel = `${t('calendar.birthday_label') || 'Sinh nhật'} — ${ev.age} ${t('calendar.age_suffix') || 'tuổi'}`;
                                        emoji = "🎂";
                                        iconBg = "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500";
                                    } else if (ev.type === 'anniversary') {
                                        typeLabel = `${t('calendar.anniversary_label') || 'Ngày giỗ'} (Âm lịch: ${ev.lunarStr})`;
                                        emoji = "🕯️";
                                        iconBg = "bg-amber-50 dark:bg-amber-500/10 text-amber-500";
                                    } else if (ev.type === 'wedding') {
                                        typeLabel = `Kỷ niệm ngày cưới (${ev.years} năm)`;
                                        emoji = "💍";
                                        iconBg = "bg-purple-50 dark:bg-purple-500/10 text-purple-500";
                                    } else if (ev.type === 'day30') {
                                        typeLabel = "Lễ đầy tháng";
                                        emoji = "👶";
                                        iconBg = "bg-pink-50 dark:bg-pink-500/10 text-pink-500";
                                    } else if (ev.type === 'year1') {
                                        typeLabel = "Lễ thôi nôi";
                                        emoji = "🎁";
                                        iconBg = "bg-pink-50 dark:bg-pink-500/10 text-pink-500";
                                    }

                                    return (
                                        <div key={i} className="flex items-center gap-4 p-3.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-black/5 dark:border-white/5 shadow-sm">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${iconBg}`}>{emoji}</div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="text-[14px] font-extrabold text-zinc-900 dark:text-white truncate">{ev.member.name}</span>
                                                <span className="text-[12px] font-medium text-zinc-500 truncate">
                                                    {typeLabel}
                                                    {ev.member.generation ? ` · ${t('calendar.generation_prefix') || 'Đời'} ${ev.member.generation}` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
