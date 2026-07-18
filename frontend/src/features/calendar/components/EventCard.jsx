import React, { useState } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { api } from '../../../shared/services/api';
import { myError } from '../../../shared/utils/logger';
import { Calendar as CalendarIcon, Clock, MapPin, RefreshCw, AlignLeft, Users, Trash2, CheckCircle2, UserPlus } from 'lucide-react';

const RECURRENCE_MAP = {
    none: 'calendar.recurrence_none',
    weekly: 'calendar.recurrence_weekly',
    monthly: 'calendar.recurrence_monthly',
    yearly: 'calendar.recurrence_yearly'
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
                addToast(t('calendar.event_register') + ' ' + t('common.success', 'thành công'), 'success');
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
                addToast(t('calendar.event_unregister') + ' ' + t('common.success', 'thành công'), 'info');
                onRefresh?.();
            }
        } catch (e) {
            myError('EVENT', 'Unregister error:', e);
            addToast(e.message || 'Error', 'error');
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!confirm(t('newsfeed.event_delete_confirm') || 'Xóa sự kiện này?')) return;
        try {
            const res = await api.deleteEvent(event.id);
            if (res.success) {
                addToast(t('newsfeed.event_delete_success') || 'Đã xóa sự kiện', 'success');
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

    const renderDateTimeRange = () => {
        const startD = formatEventDate(event.event_date);
        const endD = event.end_date ? formatEventDate(event.end_date) : '';
        const startTime = event.time || '';
        const endTime = event.end_time || '';

        if (!endD) {
            return (
                <div className="flex flex-col gap-2.5">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <CalendarIcon size={16} />
                        </div>
                        <div className="flex flex-col pt-1">
                            <span className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 leading-tight">{startD}</span>
                        </div>
                    </div>
                    {startTime && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <Clock size={16} />
                            </div>
                            <div className="flex flex-col pt-1">
                                <span className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 leading-tight">{startTime}{endTime ? ` - ${endTime}` : ''}</span>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (event.event_date === event.end_date) {
            return (
                <div className="flex flex-col gap-2.5">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <CalendarIcon size={16} />
                        </div>
                        <div className="flex flex-col pt-1">
                            <span className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 leading-tight">{startD}</span>
                        </div>
                    </div>
                    {(startTime || endTime) && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <Clock size={16} />
                            </div>
                            <div className="flex flex-col pt-1">
                                <span className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 leading-tight">{startTime || '00:00'} - {endTime || '23:59'}</span>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <CalendarIcon size={16} />
                </div>
                <div className="flex flex-col gap-1.5 pt-1">
                    <div className="text-[13px] text-zinc-700 dark:text-zinc-300">
                        <span className="font-bold uppercase tracking-wider text-xs text-zinc-400 dark:text-zinc-500 mr-2">{t('newsfeed.event_start') || 'Bắt đầu'}:</span>
                        {startTime ? <span className="font-semibold text-zinc-900 dark:text-white mr-1">{startTime}</span> : ''}
                        <span className="font-medium">{startD}</span>
                    </div>
                    <div className="text-[13px] text-zinc-700 dark:text-zinc-300">
                        <span className="font-bold uppercase tracking-wider text-xs text-zinc-400 dark:text-zinc-500 mr-2">{t('newsfeed.event_end') || 'Kết thúc'}:</span>
                        {endTime ? <span className="font-semibold text-zinc-900 dark:text-white mr-1">{endTime}</span> : ''}
                        <span className="font-medium">{endD}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="rounded-[1.5rem] bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm flex flex-col hover:shadow-md transition-shadow relative overflow-hidden group">
            {/* Top color bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-80" />
            
            <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-[1rem] bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0 shadow-inner">
                    📅
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                    <h3 className="text-[16px] font-extrabold text-zinc-900 dark:text-white leading-tight mb-1 truncate">{event.title}</h3>
                    {event.created_by_name && (
                        <span className="text-[12px] font-medium text-zinc-500 truncate">
                            {t('newsfeed.event_by') || 'Được tạo bởi'} <strong className="text-zinc-700 dark:text-zinc-300">{event.created_by_name}</strong>
                        </span>
                    )}
                </div>
                {isAdmin && (
                    <button 
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 text-zinc-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 transition-colors shrink-0" 
                        onClick={handleDelete} 
                        title={t('newsfeed.delete_post_title')}
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <div className="p-5 flex flex-col gap-4">
                {renderDateTimeRange()}

                {event.location && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <MapPin size={16} />
                        </div>
                        <div className="flex flex-col pt-1.5">
                            <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 leading-tight">{event.location}</span>
                        </div>
                    </div>
                )}
                
                {event.recurrence && event.recurrence !== 'none' && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <RefreshCw size={16} />
                        </div>
                        <div className="flex flex-col pt-1.5">
                            <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 leading-tight">{t(RECURRENCE_MAP[event.recurrence] || 'newsfeed.recurrence_none')}</span>
                        </div>
                    </div>
                )}
                
                {event.note && (
                    <div className="flex items-start gap-3 mt-1 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                        <div className="text-zinc-400 dark:text-zinc-500 mt-0.5 shrink-0">
                            <AlignLeft size={16} />
                        </div>
                        <div className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                            {event.note}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-auto p-4 bg-zinc-50/50 dark:bg-black/20 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5 text-[12px] font-bold text-zinc-500">
                        <Users size={14} /> 
                        <span>{participantCount} {t('calendar.event_participants')}</span>
                    </div>
                    {participantCount > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {(event.subscribers || []).slice(0, 5).map((s, i) => (
                                <span key={s.id || i} className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm truncate max-w-[80px]">
                                    {s.name}
                                </span>
                            ))}
                            {participantCount > 5 && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-[11px] font-bold">
                                    +{participantCount - 5}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <button
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all ${isRegistered ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'}`}
                    onClick={isRegistered ? handleUnregister : handleRegister}
                    disabled={loading}
                >
                    {loading ? (
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    ) : isRegistered ? (
                        <><CheckCircle2 size={16} /> {t('calendar.event_unregister') || 'Đã đăng ký'}</>
                    ) : (
                        <><UserPlus size={16} /> {t('calendar.event_register') || 'Đăng ký tham gia'}</>
                    )}
                </button>
            </div>
        </div>
    );
}
