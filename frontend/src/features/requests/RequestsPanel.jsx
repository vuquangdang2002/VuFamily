// RequestsPanel.jsx — Trang quản lý yêu cầu chỉnh sửa gia phả (Redesigned v2)
import { myLog, myError } from '../../shared/utils/logger';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, formatDate } from '../../shared/services/api';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Users, FileText, AlertCircle } from 'lucide-react';

function ChangesView({ before, changes, t }) {
    let finalChanges = changes;
    if (typeof finalChanges === 'string') {
        try { finalChanges = JSON.parse(finalChanges); } catch (e) { myError('REQUEST', 'JSON Parse:', e.message); }
    }
    if (typeof finalChanges === 'string') {
        try { finalChanges = JSON.parse(finalChanges); } catch (e) { myError('REQUEST', 'JSON Parse:', e.message); }
    }
    if (!finalChanges || typeof finalChanges !== 'object') return null;

    const skipFields = ['id', 'spouseId', 'parentId', 'newAchievements'];
    const entries = Object.entries(finalChanges).filter(([k]) => !skipFields.includes(k));
    const changed = entries.filter(([k, v]) => String(before?.[k] ?? '') !== String(v));
    if (changed.length === 0) return (
        <div className="text-xs font-medium text-zinc-500 italic py-1">
            {t('requests.no_visible_changes')}
        </div>
    );

    return (
        <div className="flex flex-col gap-2 mt-3">
            {changed.map(([field, newVal]) => (
                <div key={field} className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex flex-col gap-1.5">
                    <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        {t(`field.${field}`) !== `field.${field}` ? t(`field.${field}`) : field}
                    </div>
                    {field === 'photo' ? (
                        <div className="flex items-center gap-3">
                            {before?.[field] && <img src={before[field]} alt="Before" className="w-8 h-8 rounded-full border-2 border-rose-400 object-cover" />}
                            <span className="text-zinc-400 text-sm">→</span>
                            {newVal && <img src={newVal} alt="After" className="w-8 h-8 rounded-full border-2 border-emerald-400 object-cover" />}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-medium text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-lg line-through">
                                {String(before?.[field] ?? '') || t('history.empty_value')}
                            </span>
                            <span className="text-zinc-400 text-sm">→</span>
                            <span className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                                {String(newVal) || t('history.empty_value')}
                            </span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function RequestCard({ req, members, isAdmin, handleApprove, handleReject, t }) {
    const [expanded, setExpanded] = useState(false);

    const STATUS_CONFIG = {
        pending:  { icon: <Clock size={14} />,         label: t('requests.status_pending'),  bg: 'bg-amber-50 dark:bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',   border: 'border-amber-200 dark:border-amber-500/30' },
        approved: { icon: <CheckCircle2 size={14} />,  label: t('requests.status_approved'), bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30' },
        rejected: { icon: <XCircle size={14} />,       label: t('requests.status_rejected'), bg: 'bg-rose-50 dark:bg-rose-500/10',      text: 'text-rose-600 dark:text-rose-400',      border: 'border-rose-200 dark:border-rose-500/30' },
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

    const status = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`bg-white/60 dark:bg-white/5 backdrop-blur-xl border rounded-2xl overflow-hidden shadow-sm transition-shadow hover:shadow-md ${status.border}`}
        >
            {/* Card Header */}
            <div className="p-4 md:p-5 flex items-start gap-4">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#fe6e00]/20 to-amber-500/30 border border-[#fe6e00]/20 flex items-center justify-center shrink-0">
                    <Users size={20} className="text-[#fe6e00]" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-[15px] font-extrabold text-zinc-900 dark:text-white truncate">
                            {req.memberName}
                        </h3>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold ${status.bg} ${status.text}`}>
                            {status.icon} {status.label}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[13px] text-zinc-500 dark:text-zinc-400">
                            {t('requests.sent_by')} <strong className="text-zinc-700 dark:text-zinc-300">{req.requestedByName}</strong>
                        </span>
                        <span className="text-zinc-300 dark:text-zinc-600">·</span>
                        <span className="text-[12px] text-zinc-400">{timeAgo(req.requestedAt)}</span>
                    </div>
                    {req.note && (
                        <div className="mt-2 flex items-start gap-1.5 text-[13px] text-zinc-600 dark:text-zinc-400 bg-black/5 dark:bg-white/5 rounded-xl px-3 py-2">
                            <FileText size={13} className="shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{req.note}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Expandable Changes */}
            <div className="border-t border-black/5 dark:border-white/5">
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-2.5 text-[13px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                    <span>{t('requests.view_changes')}</span>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden px-5 pb-4"
                        >
                            <ChangesView before={members.find(m => String(m.id) === String(req.memberId))} changes={req.changes} t={t} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Actions */}
            {(req.status === 'pending' || req.reviewedAt) && (
                <div className="px-5 pb-4 flex items-center gap-3 flex-wrap">
                    {req.status === 'pending' && isAdmin && (
                        <>
                            <button
                                onClick={() => handleApprove(req)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[13px] bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
                            >
                                <CheckCircle2 size={15} /> {t('requests.btn_approve')}
                            </button>
                            <button
                                onClick={() => handleReject(req)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[13px] bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-all"
                            >
                                <XCircle size={15} /> {t('requests.btn_reject')}
                            </button>
                        </>
                    )}
                    {req.status === 'rejected' && req.rejectReason && (
                        <div className="flex items-start gap-2 text-[13px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-xl px-3 py-2 w-full">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span><strong>{t('requests.reason')}</strong> {req.rejectReason}</span>
                        </div>
                    )}
                    {req.reviewedAt && (
                        <div className="text-[12px] text-zinc-400 w-full">
                            {req.status === 'approved' ? '✅' : '❌'} {t('requests.reviewed_by')} {req.reviewedBy} · {timeAgo(req.reviewedAt)}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}

export default function RequestsPage({ user, onRefresh, addToast, members = [] }) {
    const { t } = useTranslation();
    const isAdmin = user?.role === 'admin';
    const [filter, setFilter] = useState(() => {
        const path = window.location.pathname;
        if (path === '/requests/approved') return 'approved';
        if (path === '/requests/rejected') return 'rejected';
        if (path === '/requests/all') return 'all';
        return 'pending';
    });
    const [requests, setRequests] = useState([]);

    useEffect(() => {
        const currentPath = window.location.pathname;
        const targetPath = `/requests/${filter}`;
        if (currentPath !== targetPath) window.history.pushState({}, '', targetPath);
    }, [filter]);

    useEffect(() => {
        const handlePopState = () => {
            const path = window.location.pathname;
            if (path === '/requests/approved') setFilter('approved');
            else if (path === '/requests/rejected') setFilter('rejected');
            else if (path === '/requests/all') setFilter('all');
            else setFilter('pending');
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const [isLoading, setIsLoading] = useState(true);

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
    const pendingCount = requests.filter(r => r.status === 'pending').length;

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

    const TABS = [
        { key: 'pending',  label: t('requests.filter_pending'),  count: pendingCount },
        { key: 'approved', label: t('requests.filter_approved'), count: null },
        { key: 'rejected', label: t('requests.filter_rejected'), count: null },
        { key: 'all',      label: t('requests.filter_all'),      count: requests.length },
    ];

    return (
        <div className="block space-y-6 p-4 md:p-6 lg:p-8 min-h-0 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap shrink-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
                        {t('requests.title')}
                        {pendingCount > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-sm font-bold bg-[#fe6e00] text-white shadow-md">
                                {pendingCount}
                            </span>
                        )}
                    </h1>
                    <p className="text-[15px] text-zinc-500 mt-1">{t('requests.subtitle')}</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap shrink-0">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[13px] transition-all ${
                            filter === tab.key
                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md'
                                : 'bg-white/60 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-white/10 border border-black/5 dark:border-white/10'
                        }`}
                    >
                        {tab.label}
                        {tab.count !== null && tab.count > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-black ${
                                filter === tab.key ? 'bg-white/20 text-white dark:bg-black/20 dark:text-zinc-900' : 'bg-[#fe6e00]/10 text-[#fe6e00]'
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-[#fe6e00] border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium text-zinc-500">{t('common.loading')}</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-black/5 dark:bg-white/5 flex items-center justify-center">
                            <span className="text-3xl">{filter === 'pending' ? '✅' : '📭'}</span>
                        </div>
                        <div>
                            <p className="font-bold text-zinc-800 dark:text-zinc-200">
                                {filter === 'pending' ? t('requests.empty_pending') : t('requests.empty_all')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <motion.div layout className="flex flex-col gap-4">
                        <AnimatePresence mode="popLayout">
                            {filtered.map(req => (
                                <RequestCard
                                    key={req.id}
                                    req={req}
                                    members={members}
                                    isAdmin={isAdmin}
                                    handleApprove={handleApprove}
                                    handleReject={handleReject}
                                    t={t}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
