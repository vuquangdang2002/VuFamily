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
    const selectedDayEvents = selectedDay ? getEventsForDate(members, viewYear, viewMonth, selectedDay, serverEvents) : [];

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
        <div className="calendar-main">
            <div className="calendar-card">
                <div className="calendar-nav">
                    <button className="cal-nav-btn" onClick={prevMonth}>◀</button>
                    <span className="cal-nav-title">{MONTH_NAMES[viewMonth - 1]} {viewYear}</span>
                    <button className="cal-nav-btn" onClick={nextMonth}>▶</button>
                    <button className="cal-today-btn" onClick={goToday}>{t('calendar.today_btn')}</button>
                </div>
                <div className="calendar-grid">
                    {WEEKDAYS.map((wd, idx) => (
                        <div key={wd} className={'cal-weekday' + (idx === 0 ? ' cal-weekday-sun' : '')}>{wd}</div>
                    ))}
                    {weeks.map((wk, wi) =>
                        wk.map((d, di) => {
                            if (d === null) return <div key={`e-${wi}-${di}`} className="cal-day cal-day-empty" />;
                            const events = getEventsForDate(members, viewYear, viewMonth, d, serverEvents);
                            const hasBD = events.some(e => e.type === 'birthday');
                            const hasAN = events.some(e => e.type === 'anniversary');
                            const hasEV = events.some(e => e.type === 'event');

                            let lunarLabel = '';
                            try {
                                const s = Solar.fromYmd(viewYear, viewMonth, d);
                                const l = s.getLunar();
                                lunarLabel = lunarDayLabel(l.getDay(), l.getMonth());
                            } catch (e) { myError('CALENDAR', "CalendarGrid Error:", e); }

                            return (
                                <div key={`d-${d}`}
                                    className={'cal-day' + (isToday(d) ? ' cal-day-today' : '') + (d === selectedDay ? ' cal-day-selected' : '') + (di === 0 ? ' cal-day-sun' : '') + (events.length > 0 ? ' cal-day-event' : '')}
                                    onClick={() => setSelectedDay(d === selectedDay ? null : d)}>
                                    <span className="cal-day-num">{d}</span>
                                    {lunarLabel && <span className="cal-day-lunar">{lunarLabel}</span>}
                                    {(hasBD || hasAN || hasEV) && (
                                        <div className="cal-day-dots">
                                            {hasBD && <span className="cal-dot cal-dot-birthday" />}
                                            {hasAN && <span className="cal-dot cal-dot-anniversary" />}
                                            {hasEV && <span className="cal-dot cal-dot-event" />}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
                <div className="calendar-legend">
                    <span className="cal-legend-item"><span className="cal-dot cal-dot-birthday" /> {t('calendar.legend_birthday')}</span>
                    <span className="cal-legend-item"><span className="cal-dot cal-dot-anniversary" /> {t('calendar.legend_anniversary')}</span>
                    <span className="cal-legend-item"><span className="cal-dot cal-dot-event" /> {t('calendar.legend_event')}</span>
                </div>
                
                {selectedDay && (
                    <div className="cal-day-detail">
                        <h4>{t('calendar.day_detail')} {selectedDay}/{viewMonth}/{viewYear}</h4>
                        {selectedDayEvents.length === 0 ? (
                            <p className="cal-no-event">{t('calendar.no_event')}</p>
                        ) : (
                            <div className="cal-event-list">
                                {selectedDayEvents.map((ev, i) => {
                                    if (ev.type === 'event') {
                                        const sev = ev.event;
                                        const isRegistered = (sev.subscribers || []).some(s => s.id === currentUserId);
                                        return (
                                            <div key={`ev-${i}`} className="cal-event-item cal-event-server">
                                                <div className="cal-event-server-icon">📅</div>
                                                <div className="cal-event-info">
                                                    <span className="cal-event-name">{sev.title}</span>
                                                    <span className="cal-event-sub">
                                                        {sev.time && `🕐 ${sev.time}`}
                                                        {sev.location && ` · 📍 ${sev.location}`}
                                                        {sev.recurrence && sev.recurrence !== 'none' && ` · 🔄 ${t(RECURRENCE_LABELS[sev.recurrence] || '')}`}
                                                    </span>
                                                    <span className="cal-event-sub">
                                                        👥 {(sev.subscribers || []).length} {t('calendar.event_participants')}
                                                    </span>
                                                </div>
                                                <button
                                                    className={`cal-event-register-btn ${isRegistered ? 'registered' : ''}`}
                                                    onClick={() => isRegistered ? handleUnregisterEvent(sev.id) : handleRegisterEvent(sev.id)}
                                                >
                                                    {isRegistered ? `✅` : `📋`}
                                                </button>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={i} className={`cal-event-item cal-event-${ev.type}`}>
                                            <MemberAvatar member={ev.member} size={32} />
                                            <div className="cal-event-info">
                                                <span className="cal-event-name">{ev.member.name}</span>
                                                <span className="cal-event-sub">
                                                    {ev.type === 'birthday'
                                                        ? `${t('calendar.birthday_label')} — ${calcAge(ev.member.birthDate)} ${t('calendar.age_suffix')}`
                                                        : t('calendar.anniversary_label')}
                                                    {ev.member.generation ? ` · ${t('calendar.generation_prefix')} ${ev.member.generation}` : ''}
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
