import React from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { getUpcomingBirthdays, getUpcomingAnniversaries, getUpcomingServerEvents } from '../utils/calendarHelpers';

function MemberAvatar({ member, size = 40 }) {
    if (member.photo) {
        return <img src={member.photo} alt={member.name} className="rounded-xl object-cover shadow-sm border border-black/10 dark:border-white/10" style={{ width: size, height: size }} />;
    }
    return (
        <span className="rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl shrink-0 border border-black/10 dark:border-white/10 shadow-sm" style={{ width: size, height: size, fontSize: size * 0.5 }}>
            {member.gender === 1 ? '👨' : '👩'}
        </span>
    );
}

const RECURRENCE_LABELS = {
    weekly: 'calendar.recurrence_weekly',
    monthly: 'calendar.recurrence_monthly',
    yearly: 'calendar.recurrence_yearly'
};

export default function UpcomingEventsSidebar({ members, serverEvents = [] }) {
    const { t } = useTranslation();
    const upcomingBirthdays = getUpcomingBirthdays(members, 30);
    const upcomingAnniversaries = getUpcomingAnniversaries(members, 30);
    const upcomingEvents = getUpcomingServerEvents(serverEvents, 30);

    return (
        <div className="flex flex-col gap-6 w-full h-full">
            {/* Upcoming Birthdays */}
            <div className="rounded-[1.5rem] p-5 md:p-6 pt-6 md:pt-7 shadow-sm bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-white/40 dark:border-white/10 flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-80" />
                <div className="flex items-center gap-3 pb-3 border-b border-black/5 dark:border-white/10">
                    <span className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl shrink-0 shadow-inner">🎂</span>
                    <h3 className="text-[14px] md:text-[15px] font-extrabold text-zinc-900 dark:text-white uppercase tracking-wide">{t('calendar.upcoming_birthday')}</h3>
                    <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">{upcomingBirthdays.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                    {upcomingBirthdays.length === 0 ? (
                        <p className="py-5 px-4 text-center text-[13px] font-medium text-zinc-500 bg-white/40 dark:bg-white/5 rounded-xl border border-dashed border-black/10 dark:border-white/10 leading-relaxed">{t('calendar.no_birthday_30')}</p>
                    ) : upcomingBirthdays.map((ev, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors shadow-sm ${ev.daysUntil === 0 ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 ring-1 ring-emerald-500/50' : 'bg-white/80 dark:bg-black/40 border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-zinc-800'}`}>
                            <MemberAvatar member={ev.member} size={44} />
                            <div className="flex flex-col flex-1 min-w-0 pt-0.5">
                                <span className="text-[14px] font-extrabold text-zinc-900 dark:text-white truncate leading-tight mb-0.5">{ev.member.name}</span>
                                <span className="text-[12px] font-medium text-zinc-500 truncate">
                                    {t('calendar.born_label')} {ev.fullDate} — <strong className="text-emerald-600 dark:text-emerald-400">{ev.age} {t('calendar.age_suffix')}</strong>
                                </span>
                                <span className="text-[11px] text-zinc-400 mt-0.5">
                                    {ev.displayDate}{ev.member.generation ? ` · ${t('calendar.generation_prefix')} ${ev.member.generation}` : ''}
                                </span>
                            </div>
                            <div className="shrink-0 pt-1">
                                {ev.daysUntil === 0
                                    ? <span className="px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm whitespace-nowrap bg-emerald-500 text-white animate-pulse">{t('calendar.today_badge')}</span>
                                    : <span className="px-2 py-1 rounded-md text-[10px] font-bold shadow-sm whitespace-nowrap bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{ev.daysUntil} {t('calendar.days_suffix')}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Upcoming Anniversaries */}
            <div className="rounded-[1.5rem] p-5 md:p-6 pt-6 md:pt-7 shadow-sm bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-white/40 dark:border-white/10 flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-orange-500 opacity-80" />
                <div className="flex items-center gap-3 pb-3 border-b border-black/5 dark:border-white/10">
                    <span className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl shrink-0 shadow-inner">🕯️</span>
                    <h3 className="text-[14px] md:text-[15px] font-extrabold text-zinc-900 dark:text-white uppercase tracking-wide">{t('calendar.upcoming_anniversary')}</h3>
                    <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">{upcomingAnniversaries.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                    {upcomingAnniversaries.length === 0 ? (
                        <p className="py-5 px-4 text-center text-[13px] font-medium text-zinc-500 bg-white/40 dark:bg-white/5 rounded-xl border border-dashed border-black/10 dark:border-white/10 leading-relaxed">{t('calendar.no_anniversary_30')}</p>
                    ) : upcomingAnniversaries.map((ev, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors shadow-sm ${ev.daysUntil === 0 ? 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 ring-1 ring-amber-500/50' : 'bg-white/80 dark:bg-black/40 border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-zinc-800'}`}>
                            <MemberAvatar member={ev.member} size={44} />
                            <div className="flex flex-col flex-1 min-w-0 pt-0.5">
                                <span className="text-[14px] font-extrabold text-zinc-900 dark:text-white truncate leading-tight mb-0.5">{ev.member.name}</span>
                                <span className="text-[12px] font-bold text-amber-600 dark:text-amber-400 truncate mt-0.5">
                                    🌙 {ev.lunarStr} {t('calendar.year_label')} {ev.lunarYearStr}
                                </span>
                                <span className="text-[11px] text-zinc-500 truncate mt-0.5">
                                    📅 {t('calendar.solar_label')} {ev.solarAnniversary}
                                </span>
                            </div>
                            <div className="shrink-0 pt-1">
                                {ev.daysUntil === 0
                                    ? <span className="px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm whitespace-nowrap bg-amber-500 text-white animate-pulse">{t('calendar.today_badge')}</span>
                                    : <span className="px-2 py-1 rounded-md text-[10px] font-bold shadow-sm whitespace-nowrap bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{ev.daysUntil} {t('calendar.days_suffix')}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Upcoming Events (Server) */}
            <div className="rounded-[1.5rem] p-5 md:p-6 pt-6 md:pt-7 shadow-sm bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-white/40 dark:border-white/10 flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-80" />
                <div className="flex items-center gap-3 pb-3 border-b border-black/5 dark:border-white/10">
                    <span className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl shrink-0 shadow-inner">📅</span>
                    <h3 className="text-[14px] md:text-[15px] font-extrabold text-zinc-900 dark:text-white uppercase tracking-wide">{t('calendar.upcoming_events')}</h3>
                    <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">{upcomingEvents.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                    {upcomingEvents.length === 0 ? (
                        <p className="py-5 px-4 text-center text-[13px] font-medium text-zinc-500 bg-white/40 dark:bg-white/5 rounded-xl border border-dashed border-black/10 dark:border-white/10 leading-relaxed">{t('calendar.no_events_30')}</p>
                    ) : upcomingEvents.map((ev, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors shadow-sm ${ev.daysUntil === 0 ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 ring-1 ring-blue-500/50' : 'bg-white/80 dark:bg-black/40 border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-zinc-800'}`}>
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-500 flex items-center justify-center text-lg shrink-0 border border-blue-200 dark:border-blue-500/30">📅</div>
                            <div className="flex flex-col flex-1 min-w-0 pt-0.5">
                                <span className="text-[14px] font-extrabold text-zinc-900 dark:text-white truncate leading-tight mb-0.5">{ev.event.title}</span>
                                <span className="text-[12px] font-medium text-zinc-500 truncate flex gap-2">
                                    <span>📆 {ev.displayDate}</span>
                                    {ev.event.time && <span>· 🕐 {ev.event.time}</span>}
                                </span>
                                {(ev.event.location || (ev.event.recurrence && ev.event.recurrence !== 'none')) && (
                                    <span className="text-[11px] text-zinc-400 mt-1 flex flex-col gap-0.5">
                                        {ev.event.location && <span>📍 {ev.event.location}</span>}
                                        {ev.event.recurrence && ev.event.recurrence !== 'none' && <span>🔄 {t(RECURRENCE_LABELS[ev.event.recurrence] || '')}</span>}
                                    </span>
                                )}
                            </div>
                            <div className="shrink-0 pt-1">
                                {ev.daysUntil === 0
                                    ? <span className="px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm whitespace-nowrap bg-blue-500 text-white animate-pulse">{t('calendar.today_badge')}</span>
                                    : <span className="px-2 py-1 rounded-md text-[10px] font-bold shadow-sm whitespace-nowrap bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{ev.daysUntil} {t('calendar.days_suffix')}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
export { MemberAvatar };
