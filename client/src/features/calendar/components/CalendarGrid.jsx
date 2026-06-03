import React from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { Solar } from '../../../shared/utils/lunar.js';
import { lunarDayLabel } from '../../../shared/utils/vietLunar.js';
import { myError } from '../../../shared/utils/logger';
import { MemberAvatar } from './UpcomingEventsSidebar';
import { 
    daysInMonth, getEventsForDate, 
    calcAge, getUpcomingBirthdays, getUpcomingAnniversaries 
} from '../utils/calendarHelpers';

export default function CalendarGrid({ 
    members, viewYear, setViewYear, 
    viewMonth, setViewMonth, 
    selectedDay, setSelectedDay 
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
    const selectedDayEvents = selectedDay ? getEventsForDate(members, viewYear, viewMonth, selectedDay) : [];

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
                            const events = getEventsForDate(members, viewYear, viewMonth, d);
                            const hasBD = events.some(e => e.type === 'birthday');
                            const hasAN = events.some(e => e.type === 'anniversary');

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
                                    {(hasBD || hasAN) && (
                                        <div className="cal-day-dots">
                                            {hasBD && <span className="cal-dot cal-dot-birthday" />}
                                            {hasAN && <span className="cal-dot cal-dot-anniversary" />}
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
                </div>
                
                {selectedDay && (
                    <div className="cal-day-detail">
                        <h4>{t('calendar.day_detail')} {selectedDay}/{viewMonth}/{viewYear}</h4>
                        {selectedDayEvents.length === 0 ? (
                            <p className="cal-no-event">{t('calendar.no_event')}</p>
                        ) : (
                            <div className="cal-event-list">
                                {selectedDayEvents.map((ev, i) => (
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
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
