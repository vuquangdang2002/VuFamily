// HistoryPanel.jsx — Trang lịch sử chỉnh sửa gia phả (đã localize)
import '../../shared/components/SidePanels.css';
import { myLog, myError } from '../../shared/utils/logger';
import { useState, useEffect } from 'react';
import { api, localApi, formatDate } from '../../shared/services/api';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';

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

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
    };

    function timeAgo(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const now = new Date();
        const diff = Math.floor((now - d) / 1000);
        if (diff < 0) return t('common.just_now');
        if (diff < 60) return t('common.just_now');
        if (diff < 3600) return `${Math.floor(diff / 60)} ${t('common.minutes_ago')}`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('common.hours_ago')}`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} ${t('common.days_ago')}`;
        return formatDate(String(dateStr).slice(0, 10));
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
        <div className="page-container">
            <div className="page-header shrink-0">
                <h2>{isAdmin ? t('history.title_admin') : t('history.title_user')}</h2>
                <p className="page-subtitle">{t('history.subtitle')}</p>
            </div>
            <div className="page-body">
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
                    <motion.div 
                        className="history-timeline"
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                    >
                        {history.map(entry => {
                            const action = ACTION_LABELS.update;
                            const isExpanded = expandedId === entry.id;
                            return (
                                <motion.div 
                                    key={entry.id} 
                                    variants={itemVariants}
                                    className={`history-entry update backdrop-blur-md bg-white/40 dark:bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 transition-all duration-300 hover:scale-[1.015] hover:border-amber-500/30 hover:shadow-lg`}
                                    layout
                                >
                                    <div className="history-entry-header cursor-pointer flex items-center justify-between" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                                        <div className="flex items-center gap-3">
                                            <div className="history-entry-icon text-xl" style={{ color: action.color }}>{action.icon}</div>
                                            <div className="history-entry-info">
                                                <div className="history-entry-title text-[15px] font-bold text-zinc-900 dark:text-white">
                                                    <strong>{action.text}</strong> — {entry.memberName}
                                                </div>
                                                <div className="history-entry-meta text-xs text-zinc-500">
                                                    👤 {entry.requestedByName} · {t('history.approved_by')} {entry.reviewedBy} {t('history.at')} {timeAgo(entry.reviewedAt)}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="history-entry-expand text-zinc-400 font-bold transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                                    </div>
                                    
                                    <AnimatePresence initial={false}>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <div className="history-entry-details pt-4 border-t border-black/5 dark:border-white/5 mt-3">
                                                    <DiffView before={members.find(m => String(m.id) === String(entry.memberId))} after={entry.changes} t={t} />
                                                    {isAdmin && (
                                                        <button className="btn btn-sm mt-3 px-4 py-1.5 rounded-xl bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 dark:hover:bg-white/20 text-xs font-semibold transition-all duration-300 active:scale-95"
                                                            onClick={() => handleRevert(entry)}>
                                                            {t('history.revert')}
                                                        </button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
