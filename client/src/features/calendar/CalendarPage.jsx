import { useState, useMemo, useEffect } from 'react';
import { myLog, myError } from '../../shared/utils/logger';
import { Solar, Lunar } from '../../shared/utils/lunar.js';
import { ganZhiToViet, lunarDayLabel } from '../../shared/utils/vietLunar.js';
import './Calendar.css';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { useTranslation } from '../../shared/hooks/useTranslation';

function parseMD(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length < 3) return null;
    return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10), day: parseInt(parts[2], 10) };
}

function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function pad2(n) { return String(n).padStart(2, '0'); }

function formatDateVN(dateStr) {
    const p = parseMD(dateStr);
    if (!p) return dateStr || '';
    return `${pad2(p.day)}/${pad2(p.month)}/${p.year}`;
}

function calcAge(birthDateStr) {
    if (!birthDateStr) return null;
    const b = parseMD(birthDateStr);
    if (!b) return null;
    const today = new Date();
    let age = today.getFullYear() - b.year;
    if ((today.getMonth() + 1) < b.month || ((today.getMonth() + 1) === b.month && today.getDate() < b.day)) age--;
    return age;
}

function getUpcomingBirthdays(members, daysAhead = 30) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const results = [];
    members.forEach(m => {
        const md = parseMD(m.birthDate);
        if (!md) return;
        const thisYear = today.getFullYear();
        let eventDate = new Date(thisYear, md.month - 1, md.day);
        if (eventDate < today) eventDate = new Date(thisYear + 1, md.month - 1, md.day);
        const diff = Math.floor((eventDate - today) / 86400000);
        if (diff >= 0 && diff <= daysAhead) {
            results.push({
                member: m, daysUntil: diff,
                displayDate: `${pad2(md.day)}/${pad2(md.month)}`,
                fullDate: formatDateVN(m.birthDate),
                age: calcAge(m.birthDate),
            });
        }
    });
    results.sort((a, b) => a.daysUntil - b.daysUntil);
    return results;
}

function getUpcomingAnniversaries(members, daysAhead = 30) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thisYear = today.getFullYear();
    const results = [];
    members.forEach(m => {
        if (!m.deathDate) return;
        const md = parseMD(m.deathDate);
        if (!md) return;

        try {
            // Get original lunar death date
            const deathSolar = Solar.fromYmd(md.year, md.month, md.day);
            const deathLunar = deathSolar.getLunar();
            const lDay = deathLunar.getDay();
            const lMonth = deathLunar.getMonth();

            // Format Original Lunar Date with full year
            const lunarYear = deathLunar.getYear();
            const lunarStr = `${pad2(lDay)}/${pad2(Math.abs(lMonth))}`;
            const lunarYearStr = `${ganZhiToViet(deathLunar.getYearInGanZhi())} (${lunarYear})`;

            // Find anniversary in current year
            let currentLunarYear = Lunar.fromYmd(thisYear, lMonth, lDay);
            let annSolar = currentLunarYear.getSolar();
            let eventDate = new Date(annSolar.getYear(), annSolar.getMonth() - 1, annSolar.getDay());

            if (eventDate < today) {
                // Next year
                currentLunarYear = Lunar.fromYmd(thisYear + 1, lMonth, lDay);
                annSolar = currentLunarYear.getSolar();
                eventDate = new Date(annSolar.getYear(), annSolar.getMonth() - 1, annSolar.getDay());
            }

            const diff = Math.floor((eventDate - today) / 86400000);
            if (diff >= 0 && diff <= daysAhead) {
                results.push({
                    member: m, daysUntil: diff,
                    lunarStr,
                    lunarYearStr,
                    solarAnniversary: `${pad2(eventDate.getDate())}/${pad2(eventDate.getMonth() + 1)}/${eventDate.getFullYear()}`,
                    deathDateDisplay: formatDateVN(m.deathDate),
                });
            }
        } catch (e) {
            myError('CALENDAR', e);
        }
    });
    results.sort((a, b) => a.daysUntil - b.daysUntil);
    return results;
}

function getEventsForDate(members, year, month, day) {
    const events = [];
    members.forEach(m => {
        const bd = parseMD(m.birthDate);
        if (bd && bd.month === month && bd.day === day) events.push({ type: 'birthday', member: m });
        // For anniversaries, check based on lunar conversion
        if (m.deathDate) {
            const md = parseMD(m.deathDate);
            if (md) {
                try {
                    const deathSolar = Solar.fromYmd(md.year, md.month, md.day);
                    const deathLunar = deathSolar.getLunar();

                    const currentLunarYear = Lunar.fromYmd(year, deathLunar.getMonth(), deathLunar.getDay());
                    const annSolar = currentLunarYear.getSolar();

                    if (annSolar.getMonth() === month && annSolar.getDay() === day) {
                        events.push({ type: 'anniversary', member: m });
                    }
                } catch (e) { myError('CALENDAR', "CalendarPage Error:", e); }
            }
        }
    });
    return events;
}

function MemberAvatar({ member, size = 40 }) {
    if (member.photo) {
        return <img src={member.photo} alt={member.name} className="cal-member-photo" style={{ width: size, height: size }} />;
    }
    return (
        <span className="cal-member-emoji" style={{ width: size, height: size, fontSize: size * 0.5 }}>
            {member.gender === 1 ? '👨' : '👩'}
        </span>
    );
}

export default function CalendarPage({ members }) {
    const { t } = useTranslation();
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
    const [selectedDay, setSelectedDay] = useState(null);

    const WEEKDAYS = t('calendar.weekdays').split(',');
    const MONTH_NAMES = t('calendar.month_names').split(',');

    const upcomingBirthdays = useMemo(() => getUpcomingBirthdays(members, 30), [members]);
    const upcomingAnniversaries = useMemo(() => getUpcomingAnniversaries(members, 30), [members]);

    // Calendar grid
    const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
    const totalDays = daysInMonth(viewYear, viewMonth);
    const weeks = [];
    let week = new Array(firstDayOfWeek).fill(null);
    for (let d = 1; d <= totalDays; d++) {
        week.push(d);
        if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

    const prevMonth = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); setSelectedDay(null); };
    const nextMonth = () => { if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); setSelectedDay(null); };
    const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth() + 1); setSelectedDay(today.getDate()); };
    const isToday = (d) => d === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();
    const selectedDayEvents = selectedDay ? getEventsForDate(members, viewYear, viewMonth, selectedDay) : [];

    return (
        <div className="page-container calendar-page">
            <div className="page-header">
                <h2>{t('calendar.title')}</h2>
                <p className="page-subtitle">{t('calendar.subtitle')}</p>
            </div>
            <div className="calendar-layout">
                {/* ──── Calendar Grid ──── */}
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

                                    // Lunar date for this day
                                    let lunarLabel = '';
                                    try {
                                        const s = Solar.fromYmd(viewYear, viewMonth, d);
                                        const l = s.getLunar();
                                        lunarLabel = lunarDayLabel(l.getDay(), l.getMonth());
                                    } catch (e) { myError('CALENDAR', "CalendarPage Error:", e); }

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

                {/* ──── Upcoming Events ──── */}
                <div className="calendar-sidebar">
                    {/* ── Upcoming Birthdays ── */}
                    <div className="cal-upcoming-card cal-upcoming-birthday">
                        <div className="cal-upcoming-header">
                            <span className="cal-upcoming-icon">🎂</span>
                            <h3>{t('calendar.upcoming_birthday')}</h3>
                            <span className="cal-upcoming-count">{upcomingBirthdays.length}</span>
                        </div>
                        <div className="cal-upcoming-body">
                            {upcomingBirthdays.length === 0 ? (
                                <p className="cal-no-event">{t('calendar.no_birthday_30')}</p>
                            ) : upcomingBirthdays.map((ev, i) => (
                                <div key={i} className={'cal-upcoming-item' + (ev.daysUntil === 0 ? ' cal-item-today' : '')}>
                                    <MemberAvatar member={ev.member} />
                                    <div className="cal-upcoming-info">
                                        <span className="cal-upcoming-name">{ev.member.name}</span>
                                        <span className="cal-upcoming-date">
                                            {t('calendar.born_label')} {ev.fullDate} — <strong>{ev.age} {t('calendar.age_suffix')}</strong>
                                        </span>
                                        <span className="cal-upcoming-gen">
                                            {ev.displayDate}{ev.member.generation ? ` · ${t('calendar.generation_prefix')} ${ev.member.generation}` : ''}
                                        </span>
                                    </div>
                                    <div className="cal-upcoming-badge">
                                        {ev.daysUntil === 0
                                            ? <span className="cal-badge cal-badge-today">{t('calendar.today_badge')}</span>
                                            : <span className="cal-badge cal-badge-days">{ev.daysUntil} {t('calendar.days_suffix')}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Upcoming Anniversaries ── */}
                    <div className="cal-upcoming-card cal-upcoming-anniversary">
                        <div className="cal-upcoming-header">
                            <span className="cal-upcoming-icon">🕯️</span>
                            <h3>{t('calendar.upcoming_anniversary')}</h3>
                            <span className="cal-upcoming-count">{upcomingAnniversaries.length}</span>
                        </div>
                        <div className="cal-upcoming-body">
                            {upcomingAnniversaries.length === 0 ? (
                                <p className="cal-no-event">{t('calendar.no_anniversary_30')}</p>
                            ) : upcomingAnniversaries.map((ev, i) => (
                                <div key={i} className={'cal-upcoming-item' + (ev.daysUntil === 0 ? ' cal-item-today' : '')}>
                                    <MemberAvatar member={ev.member} />
                                    <div className="cal-upcoming-info">
                                        <span className="cal-upcoming-name">{ev.member.name}</span>
                                        <span className="cal-upcoming-lunar">
                                            🌙 {ev.lunarStr} {t('calendar.year_label')} {ev.lunarYearStr} <em>{t('calendar.lunar_label')}</em>
                                        </span>
                                        <span className="cal-upcoming-date">
                                            📅 {t('calendar.solar_label')} {ev.solarAnniversary} · {t('calendar.death_label')} {ev.deathDateDisplay}
                                        </span>
                                    </div>
                                    <div className="cal-upcoming-badge">
                                        {ev.daysUntil === 0
                                            ? <span className="cal-badge cal-badge-today">{t('calendar.today_badge')}</span>
                                            : <span className="cal-badge cal-badge-memorial">{ev.daysUntil} {t('calendar.days_suffix')}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
