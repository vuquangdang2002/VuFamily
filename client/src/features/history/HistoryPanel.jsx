// HistoryPanel.jsx — Trang lịch sử chỉnh sửa gia phả (đã localize)
import '../../shared/components/SidePanels.css';
import { myLog, myError } from '../../shared/utils/logger';
import { useState, useEffect } from 'react';
import { api, localApi, formatDate } from '../../shared/services/api';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { useTranslation } from '../../shared/hooks/useTranslation';

function DiffView({ before, after, t }) {
    let finalAfter = after;
    if (typeof finalAfter === 'string') {
        try { finalAfter = JSON.parse(finalAfter); } catch (e) { myError('HISTORY', "JSON Parse:", e.message); }
    }
    if (typeof finalAfter === 'string') {
        try { finalAfter = JSON.parse(finalAfter); } catch (e) { myError('HISTORY', "JSON Parse:", e.message); }
    }

    if (!before && !finalAfter) return null;
    const fields = new Set([...Object.keys(before || {}), ...Object.keys(finalAfter || {})]);
    const skipFields = ['id', 'spouseId', 'parentId', 'newAchievements'];
    const changed = [];
    fields.forEach(f => {
        if (skipFields.includes(f)) return;
        const bv = before?.[f] ?? '';
        const av = finalAfter?.[f] ?? '';
        if (String(bv) !== String(av) && String(av) !== '') {
            changed.push({ field: f, before: bv, after: av });
        }
    });
    if (changed.length === 0) return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('history.no_changes')}</div>;
    return (
        <div className="diff-view">
            {changed.map(c => (
                <div key={c.field} className="diff-row">
                    <div className="diff-label">{t(`field.${c.field}`) !== `field.${c.field}` ? t(`field.${c.field}`) : c.field}</div>
                    <div className="diff-values">
                        {c.field === 'photo' ? (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {c.before && <img src={c.before} alt={t('history.before')} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #f44336' }} />}
                                <span style={{ color: 'var(--text-muted)' }}>→</span>
                                {c.after && <img src={c.after} alt={t('history.after')} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #4CAF50' }} />}
                            </div>
                        ) : (
                            <>
                                {c.before && <span className="diff-old">{String(c.before)}</span>}
                                <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                                <span className="diff-new">{String(c.after) || t('history.empty_value')}</span>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function HistoryPage({ isAdmin, user, onRefresh, addToast, members = [] }) {
    const { t } = useTranslation();
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    const ACTION_LABELS = {
        create: { icon: '➕', text: t('history.action_create'), color: '#4CAF50' },
        update: { icon: '✏️', text: t('history.action_update'), color: '#FF9800' },
        delete: { icon: '🗑️', text: t('history.action_delete'), color: '#f44336' },
    };

    function timeAgo(dateStr) {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - d) / 1000);
        if (diff < 60) return t('common.just_now');
        if (diff < 3600) return `${Math.floor(diff / 60)} ${t('common.minutes_ago')}`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('common.hours_ago')}`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} ${t('common.days_ago')}`;
        return formatDate(dateStr.slice(0, 10));
    }

    const fetchHistory = async () => {
        try {
            setIsLoading(true);
            const res = await api.getAllRequests();
            if (res.success) {
                const approved = (res.data || []).filter(r => r.status === 'approved');
                const filtered = isAdmin ? approved : approved.filter(r => r.requestedBy === user?.username);
                setHistory(filtered);
            }
        } catch (e) {
            addToast(t('history.load_error'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchHistory(); }, []);

    const handleRevert = (entry) => {
        addToast(t('history.revert_unavailable'), 'error');
    };

    return (
        <div className="page-container flex flex-col h-screen pt-16 sm:pt-0 overflow-hidden">
            <div className="page-header shrink-0">
                <h2>{isAdmin ? t('history.title_admin') : t('history.title_user')}</h2>
                <p className="page-subtitle">{t('history.subtitle')}</p>
            </div>
            <div className="page-body flex-1 overflow-y-auto p-4 md:p-6 pb-24 relative min-h-[200px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        {t('common.loading')}
                    </div>
                ) : history.length === 0 ? (
                    <div className="empty-state">
                        <span style={{ fontSize: 40 }}>📭</span>
                        <p>{t('history.empty')}</p>
                    </div>
                ) : (
                    <div className="history-timeline">
                        {history.map(entry => {
                            const action = ACTION_LABELS.update;
                            const isExpanded = expandedId === entry.id;
                            return (
                                <div key={entry.id} className="history-entry update">
                                    <div className="history-entry-header" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                                        <div className="history-entry-icon" style={{ color: action.color }}>{action.icon}</div>
                                        <div className="history-entry-info">
                                            <div className="history-entry-title">
                                                <strong>{action.text}</strong> — {entry.memberName}
                                            </div>
                                            <div className="history-entry-meta">
                                                👤 {entry.requestedByName} · {t('history.approved_by')} {entry.reviewedBy} {t('history.at')} {timeAgo(entry.reviewedAt)}
                                            </div>
                                        </div>
                                        <span className="history-entry-expand">{isExpanded ? '▲' : '▼'}</span>
                                    </div>
                                    {isExpanded && (
                                        <div className="history-entry-details">
                                            <DiffView before={members.find(m => String(m.id) === String(entry.memberId))} after={entry.changes} t={t} />
                                            {isAdmin && (
                                                <button className="btn btn-sm" style={{ marginTop: 8 }}
                                                    onClick={() => handleRevert(entry)}>
                                                    {t('history.revert')}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
