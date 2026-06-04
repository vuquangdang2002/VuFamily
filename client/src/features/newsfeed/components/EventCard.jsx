import React, { useState } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { api } from '../../../shared/services/api';
import { myError } from '../../../shared/utils/logger';

const RECURRENCE_MAP = {
    none: 'newsfeed.recurrence_none',
    weekly: 'newsfeed.recurrence_weekly',
    monthly: 'newsfeed.recurrence_monthly',
    yearly: 'newsfeed.recurrence_yearly'
};

export default function EventCard({ event, currentUserId, isAdmin, canEdit, addToast, onRefresh }) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const isRegistered = (event.subscribers || []).some(s => s.id === currentUserId);
    const participantCount = (event.subscribers || []).length;

    const handleRegister = async () => {
        setLoading(true);
        try {
            const res = await api.registerEvent(event.id);
            if (res.success) {
                addToast(t('newsfeed.event_registered'), 'success');
                onRefresh?.();
            }
        } catch (e) {
            myError('EVENT', 'Register error:', e);
            addToast(e.message || 'Error', 'error');
        }
        setLoading(false);
    };

    const handleUnregister = async () => {
        setLoading(true);
        try {
            const res = await api.unregisterEvent(event.id);
            if (res.success) {
                addToast(t('newsfeed.event_unregister'), 'info');
                onRefresh?.();
            }
        } catch (e) {
            myError('EVENT', 'Unregister error:', e);
            addToast(e.message || 'Error', 'error');
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!confirm(t('newsfeed.event_delete_confirm'))) return;
        try {
            const res = await api.deleteEvent(event.id);
            if (res.success) {
                addToast(t('newsfeed.event_delete_success'), 'success');
                onRefresh?.();
            }
        } catch (e) {
            myError('EVENT', 'Delete error:', e);
        }
    };

    const formatEventDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        } catch { return dateStr; }
    };

    return (
        <div className="nf-event-card">
            <div className="nf-event-header">
                <div className="nf-event-icon">📅</div>
                <div className="nf-event-title-wrap">
                    <h3 className="nf-event-title">{event.title}</h3>
                    {event.created_by_name && (
                        <span className="nf-event-author">
                            {t('newsfeed.event_by')} <strong>{event.created_by_name}</strong>
                        </span>
                    )}
                </div>
                {isAdmin && (
                    <button className="nf-post-delete" onClick={handleDelete} title={t('newsfeed.delete_post_title')}>
                        🗑️
                    </button>
                )}
            </div>

            <div className="nf-event-details">
                <div className="nf-event-detail-row">
                    <span className="nf-event-detail-label">📆</span>
                    <span>{formatEventDate(event.event_date)}</span>
                </div>
                {event.time && (
                    <div className="nf-event-detail-row">
                        <span className="nf-event-detail-label">🕐</span>
                        <span>{event.time}</span>
                    </div>
                )}
                {event.location && (
                    <div className="nf-event-detail-row">
                        <span className="nf-event-detail-label">📍</span>
                        <span>{event.location}</span>
                    </div>
                )}
                {event.recurrence && event.recurrence !== 'none' && (
                    <div className="nf-event-detail-row">
                        <span className="nf-event-detail-label">🔄</span>
                        <span>{t(RECURRENCE_MAP[event.recurrence] || 'newsfeed.recurrence_none')}</span>
                    </div>
                )}
                {event.note && (
                    <div className="nf-event-note">
                        <span>📝</span> {event.note}
                    </div>
                )}
            </div>

            <div className="nf-event-footer">
                <div className="nf-event-participants">
                    <span className="nf-event-participant-count">
                        👥 {participantCount} {t('newsfeed.event_participants')}
                    </span>
                    {participantCount > 0 && (
                        <div className="nf-event-participant-list">
                            {(event.subscribers || []).slice(0, 5).map((s, i) => (
                                <span key={s.id || i} className="nf-event-participant-chip">{s.name}</span>
                            ))}
                            {participantCount > 5 && (
                                <span className="nf-event-participant-chip nf-event-more">+{participantCount - 5}</span>
                            )}
                        </div>
                    )}
                </div>
                <button
                    className={`nf-event-register-btn ${isRegistered ? 'registered' : ''}`}
                    onClick={isRegistered ? handleUnregister : handleRegister}
                    disabled={loading}
                >
                    {loading ? '...' : isRegistered ? `✅ ${t('newsfeed.event_unregister')}` : `📋 ${t('newsfeed.event_register')}`}
                </button>
            </div>
        </div>
    );
}
