import React from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';

export default function SidebarPanel({ members, onNavigate }) {
    const { t } = useTranslation();

    const upcomingBirthdays = (() => {
        const today = new Date();
        const inDays = (d) => {
            const date = new Date(d);
            const next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
            if (next < today) next.setFullYear(today.getFullYear() + 1);
            return Math.ceil((next - today) / 86400000);
        };
        return members
            .filter(m => m.birthDate && !m.deathDate)
            .map(m => ({ name: m.name, date: m.birthDate, days: inDays(m.birthDate), type: 'sinh nhật' }))
            .filter(m => m.days <= 30)
            .sort((a, b) => a.days - b.days)
            .slice(0, 4);
    })();

    return (
        <div className="nf-right-panel">
            {/* Upcoming birthdays */}
            <div className="nf-panel-card">
                <p className="nf-panel-title">{t('newsfeed.upcoming_birthdays')}</p>
                {upcomingBirthdays.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('newsfeed.no_birthdays_30')}</p>
                ) : (
                    <div className="nf-event-list">
                        {upcomingBirthdays.map((b, i) => (
                            <div key={i} className="nf-event-item">
                                <div className="nf-event-dot" />
                                <div>
                                    <div className="nf-event-name">{b.name}</div>
                                    <div className="nf-event-date">
                                        {b.days === 0 ? `${t('newsfeed.today_birthday')} 🎉` : `${b.days} ${t('newsfeed.days_left')}`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="nf-panel-card">
                <p className="nf-panel-title">⚡ {t('newsfeed.quick_access')}</p>
                <div className="nf-quick-actions">
                    <button className="nf-quick-btn" onClick={() => onNavigate && onNavigate('tree')}>
                        <span className="nf-quick-btn-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>🌳</span>
                        {t('nav.tree')}
                    </button>
                    <button className="nf-quick-btn" onClick={() => onNavigate && onNavigate('chat')}>
                        <span className="nf-quick-btn-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>💬</span>
                        {t('nav.chat')}
                    </button>
                    <button className="nf-quick-btn" onClick={() => onNavigate && onNavigate('calendar')}>
                        <span className="nf-quick-btn-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>📅</span>
                        {t('nav.calendar')}
                    </button>
                </div>
            </div>
        </div>
    );
}
