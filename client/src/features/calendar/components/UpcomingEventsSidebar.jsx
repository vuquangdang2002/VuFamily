import React from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { getUpcomingBirthdays, getUpcomingAnniversaries, getUpcomingServerEvents } from '../utils/calendarHelpers';

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
        <div className="calendar-sidebar">
            {/* Upcoming Birthdays */}
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

            {/* Upcoming Anniversaries */}
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

            {/* Upcoming Events (Server) */}
            <div className="cal-upcoming-card cal-upcoming-event">
                <div className="cal-upcoming-header">
                    <span className="cal-upcoming-icon">📅</span>
                    <h3>{t('calendar.upcoming_events')}</h3>
                    <span className="cal-upcoming-count">{upcomingEvents.length}</span>
                </div>
                <div className="cal-upcoming-body">
                    {upcomingEvents.length === 0 ? (
                        <p className="cal-no-event">{t('calendar.no_events_30')}</p>
                    ) : upcomingEvents.map((ev, i) => (
                        <div key={i} className={'cal-upcoming-item' + (ev.daysUntil === 0 ? ' cal-item-today' : '')}>
                            <div className="cal-event-server-icon-sm">📅</div>
                            <div className="cal-upcoming-info">
                                <span className="cal-upcoming-name">{ev.event.title}</span>
                                <span className="cal-upcoming-date">
                                    📆 {ev.displayDate}
                                    {ev.event.time && ` · 🕐 ${ev.event.time}`}
                                </span>
                                {ev.event.location && (
                                    <span className="cal-upcoming-gen">📍 {ev.event.location}</span>
                                )}
                                {ev.event.recurrence && ev.event.recurrence !== 'none' && (
                                    <span className="cal-upcoming-gen">🔄 {t(RECURRENCE_LABELS[ev.event.recurrence] || '')}</span>
                                )}
                            </div>
                            <div className="cal-upcoming-badge">
                                {ev.daysUntil === 0
                                    ? <span className="cal-badge cal-badge-today">{t('calendar.today_badge')}</span>
                                    : <span className="cal-badge cal-badge-event">{ev.daysUntil} {t('calendar.days_suffix')}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
export { MemberAvatar };
