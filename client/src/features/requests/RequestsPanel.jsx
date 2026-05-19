// RequestsPanel.jsx — Trang quản lý yêu cầu chỉnh sửa gia phả (đã localize)
import '../../shared/components/SidePanels.css';
import { myLog, myError } from '../../shared/utils/logger';
import { useState, useEffect } from 'react';
import { api, localApi, formatDate } from '../../shared/services/api';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { useTranslation } from '../../shared/hooks/useTranslation';

function ChangesView({ before, changes, t }) {
    let finalChanges = changes;
    if (typeof finalChanges === 'string') {
        try { finalChanges = JSON.parse(finalChanges); } catch (e) { myError('REQUEST', "JSON Parse:", e.message); }
    }
    if (typeof finalChanges === 'string') {
        try { finalChanges = JSON.parse(finalChanges); } catch (e) { myError('REQUEST', "JSON Parse:", e.message); }
    }
    if (!finalChanges || typeof finalChanges !== 'object') return null;

    const skipFields = ['id', 'spouseId', 'parentId', 'newAchievements'];
    const entries = Object.entries(finalChanges).filter(([k]) => !skipFields.includes(k));
    const changed = entries.filter(([k, v]) => String(before?.[k] ?? '') !== String(v));
    if (changed.length === 0) return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('requests.no_visible_changes')}</div>;

    return (
        <div className="diff-view">
            {changed.map(([field, newVal]) => (
                <div key={field} className="diff-row">
                    <div className="diff-label">{t(`field.${field}`) !== `field.${field}` ? t(`field.${field}`) : field}</div>
                    <div className="diff-values">
                        {field === 'photo' ? (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {before?.[field] && <img src={before[field]} alt="Before" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #f44336' }} />}
                                <span style={{ color: 'var(--text-muted)' }}>→</span>
                                {newVal && <img src={newVal} alt="After" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #4CAF50' }} />}
                            </div>
                        ) : (
                            <>
                                <span className="diff-old">{String(before?.[field] ?? '') || t('history.empty_value')}</span>
                                <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                                <span className="diff-new">{String(newVal) || t('history.empty_value')}</span>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function RequestsPage({ user, onRefresh, addToast, members = [] }) {
    const { t } = useTranslation();
    const isAdmin = user?.role === 'admin';
    const [filter, setFilter] = useState('pending');
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const STATUS_LABELS = {
        pending: { icon: '⏳', text: t('requests.status_pending'), color: '#FF9800' },
        approved: { icon: '✅', text: t('requests.status_approved'), color: '#4CAF50' },
        rejected: { icon: '❌', text: t('requests.status_rejected'), color: '#f44336' },
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

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const res = await api.getAllRequests();
            if (res.success) setRequests(res.data || []);
        } catch (e) {
            addToast(t('requests.load_error'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, []);

    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

    const handleApprove = async (req) => {
        if (!confirm(t('requests.approve_confirm').replace('{name}', req.memberName).replace('{user}', req.requestedByName))) return;
        try {
            await api.approveRequest(req.id);
            addToast(t('requests.approve_success'), 'success');
            await fetchRequests();
            if (onRefresh) onRefresh();
        } catch (e) {
            addToast(e.message || t('requests.approve_fail'), 'error');
        }
    };

    const handleReject = async (req) => {
        const reason = prompt(t('requests.reject_prompt').replace('{user}', req.requestedByName));
        if (reason === null) return;
        try {
            await api.rejectRequest(req.id, reason);
            addToast(t('requests.reject_success'), 'success');
            await fetchRequests();
        } catch (e) {
            addToast(e.message || t('requests.reject_fail'), 'error');
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="page-container">
            <div className="page-header shrink-0">
                <h2>{t('requests.title')} {pendingCount > 0 && <span className="badge">{pendingCount}</span>}</h2>
                <p className="page-subtitle">{t('requests.subtitle')}</p>
            </div>

            <div className="page-body">
                <div className="request-filters" style={{ marginBottom: 16 }}>
                    <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
                        {t('requests.filter_pending')} {pendingCount > 0 && `(${pendingCount})`}
                    </button>
                    <button className={`filter-btn ${filter === 'approved' ? 'active' : ''}`} onClick={() => setFilter('approved')}>
                        {t('requests.filter_approved')}
                    </button>
                    <button className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>
                        {t('requests.filter_rejected')}
                    </button>
                    <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                        {t('requests.filter_all')}
                    </button>
                </div>

                <div className="side-panel-body">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            {t('common.loading')}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="empty-state">
                            <span style={{ fontSize: 40 }}>{filter === 'pending' ? '✅' : '📭'}</span>
                            <p>{filter === 'pending' ? t('requests.empty_pending') : t('requests.empty_all')}</p>
                        </div>
                    ) : (
                        <div className="requests-list">
                            {filtered.map(req => {
                                const status = STATUS_LABELS[req.status] || STATUS_LABELS.pending;
                                return (
                                    <div key={req.id} className={`request-card ${req.status}`}>
                                        <div className="request-card-header">
                                            <div className="request-card-status" style={{ color: status.color }}>
                                                {status.icon} {status.text}
                                            </div>
                                            <div className="request-card-time">{timeAgo(req.requestedAt)}</div>
                                        </div>
                                        <div className="request-card-title">
                                            🏷️ <strong>{req.memberName}</strong>
                                        </div>
                                        <div className="request-card-meta">
                                            👤 {t('requests.sent_by')} <strong>{req.requestedByName}</strong>
                                        </div>
                                        {req.note && <div className="request-card-note">💬 {req.note}</div>}

                                        <ChangesView before={members.find(m => String(m.id) === String(req.memberId))} changes={req.changes} t={t} />

                                        {req.status === 'pending' && (
                                            <div className="request-card-actions">
                                                <button className="btn btn-primary btn-sm" onClick={() => handleApprove(req)}>
                                                    {t('requests.btn_approve')}
                                                </button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleReject(req)}>
                                                    {t('requests.btn_reject')}
                                                </button>
                                            </div>
                                        )}

                                        {req.status === 'rejected' && req.rejectReason && (
                                            <div className="request-card-reason">
                                                💬 {t('requests.reason')} {req.rejectReason}
                                            </div>
                                        )}

                                        {req.reviewedAt && (
                                            <div className="request-card-reviewed">
                                                {req.status === 'approved' ? '✅' : '❌'} {t('requests.reviewed_by')} {req.reviewedBy} · {timeAgo(req.reviewedAt)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
