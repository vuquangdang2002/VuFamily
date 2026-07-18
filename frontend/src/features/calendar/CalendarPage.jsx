import { useState, useEffect } from 'react';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { api } from '../../shared/services/api';
import { request } from '../../shared/services/api/request';
import { myError } from '../../shared/utils/logger';
import CalendarGrid from './components/CalendarGrid';
import UpcomingEventsSidebar from './components/UpcomingEventsSidebar';
import EventCard from './components/EventCard';


export default function CalendarPage({ members, user, addToast }) {
    const { t } = useTranslation();
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
    const [selectedDay, setSelectedDay] = useState(null);
    const [serverEvents, setServerEvents] = useState([]);
    const [monthlyEvents, setMonthlyEvents] = useState([]);
    const [loadingMonthly, setLoadingMonthly] = useState(true);
    
    // Tabs & Event Form State
    const [tab, setTab] = useState(() => {
        const path = window.location.pathname;
        if (path === '/calendar/events') {
            return 'events';
        }
        return 'calendar';
    });
    const [showEventForm, setShowEventForm] = useState(false);

    // Sync URL with tab changes
    useEffect(() => {
        const currentPath = window.location.pathname;
        const targetPath = tab === 'events' ? '/calendar/events' : '/calendar/grid';
        if (currentPath !== targetPath) {
            window.history.pushState({}, '', targetPath);
        }
    }, [tab]);

    // Handle popstate for calendar tab transitions
    useEffect(() => {
        const handlePopState = () => {
            const path = window.location.pathname;
            if (path === '/calendar/events') {
                setTab('events');
            } else if (path === '/calendar/grid' || path === '/calendar') {
                setTab('calendar');
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);
    const [eventFilter, setEventFilter] = useState('all');
    const [eventSearch, setEventSearch] = useState('');
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [showCustomRange, setShowCustomRange] = useState(false);
    const [eventForm, setEventForm] = useState({
        title: '', event_date: '', time: '', end_date: '', end_time: '', location: '', recurrence: 'none', note: ''
    });

    const canEdit = user?.role === 'admin' || user?.role === 'editor';
    const isAdmin = user?.role === 'admin';
    const currentUserId = user?.id;

    const fetchEvents = async () => {
        try {
            const json = await api.getEvents();
            if (json.success) {
                setServerEvents(json.data || []);
            }
        } catch (e) {
            myError('CALENDAR', 'Error fetching events:', e);
        }
    };

    const fetchMonthlyEvents = async () => {
        setLoadingMonthly(true);
        try {
            const json = await request(`/events/monthly?year=${viewYear}&month=${viewMonth}`);
            if (json.success) {
                setMonthlyEvents(json.data || []);
            }
        } catch (e) {
            myError('CALENDAR', 'Error fetching monthly events:', e);
        } finally {
            setLoadingMonthly(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        fetchMonthlyEvents();
    }, [viewYear, viewMonth]);

    const handleCreateEvent = async () => {
        if (!eventForm.title.trim() || !eventForm.event_date) {
            addToast(t('newsfeed.event_fail'), 'error');
            return;
        }
        if (eventForm.end_date && eventForm.end_date < eventForm.event_date) {
            addToast(t('newsfeed.event_date_invalid') || 'Ngày kết thúc không được trước ngày bắt đầu', 'error');
            return;
        }
        try {
            const json = await api.createEvent({
                title: eventForm.title.trim(),
                event_date: eventForm.event_date,
                event_type: 'meeting',
                location: eventForm.location,
                time: eventForm.time,
                end_date: eventForm.end_date,
                end_time: eventForm.end_time,
                recurrence: eventForm.recurrence,
                note: eventForm.note
            });
            if (json.success) {
                addToast(t('newsfeed.event_success'), 'success');
                setEventForm({ title: '', event_date: '', time: '', end_date: '', end_time: '', location: '', recurrence: 'none', note: '' });
                setShowEventForm(false);
                fetchEvents();
            } else {
                addToast(json.error || t('newsfeed.event_fail'), 'error');
            }
        } catch (e) {
            addToast(t('newsfeed.event_fail'), 'error');
        }
    };

    // ─── Event list filtering ───
    const getFilterBounds = () => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(startOfToday); endOfToday.setHours(23, 59, 59, 999);

        if (eventFilter === 'today') return [startOfToday, endOfToday];

        if (eventFilter === 'week') {
            const day = now.getDay();
            const monday = new Date(startOfToday);
            monday.setDate(startOfToday.getDate() + (day === 0 ? -6 : 1 - day));
            const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
            return [monday, sunday];
        }
        if (eventFilter === 'next7') {
            const end = new Date(startOfToday); end.setDate(startOfToday.getDate() + 6); end.setHours(23, 59, 59, 999);
            return [startOfToday, end];
        }
        if (eventFilter === 'next30') {
            const end = new Date(startOfToday); end.setDate(startOfToday.getDate() + 29); end.setHours(23, 59, 59, 999);
            return [startOfToday, end];
        }
        if (eventFilter === 'month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); end.setHours(23, 59, 59, 999);
            return [start, end];
        }
        if (eventFilter === 'quarter') {
            const q = Math.floor(now.getMonth() / 3);
            const start = new Date(now.getFullYear(), q * 3, 1);
            const end = new Date(now.getFullYear(), q * 3 + 3, 0); end.setHours(23, 59, 59, 999);
            return [start, end];
        }
        if (eventFilter === 'year') {
            const start = new Date(now.getFullYear(), 0, 1);
            const end = new Date(now.getFullYear(), 11, 31); end.setHours(23, 59, 59, 999);
            return [start, end];
        }
        if (eventFilter === 'past') {
            return [null, new Date(startOfToday.getTime() - 1)];
        }
        if (eventFilter === 'custom') {
            const from = customFrom ? new Date(customFrom) : null;
            const to = customTo ? new Date(customTo + 'T23:59:59') : null;
            return [from, to];
        }
        return [null, null]; // 'all'
    };

    const getFilteredAndSortedEvents = () => {
        const [from, to] = getFilterBounds();

        let result = serverEvents.filter(ev => {
            if (!ev.event_date) return false;
            const evDate = new Date(ev.event_date);

            // date range check
            if (from && evDate < from) return false;
            if (to && evDate > to) return false;

            // search filter
            if (eventSearch.trim()) {
                const q = eventSearch.toLowerCase();
                const titleMatch = (ev.title || '').toLowerCase().includes(q);
                const locMatch = (ev.location || '').toLowerCase().includes(q);
                const noteMatch = (ev.note || '').toLowerCase().includes(q);
                if (!titleMatch && !locMatch && !noteMatch) return false;
            }
            return true;
        });

        result.sort((a, b) => {
            const da = new Date(a.event_date + (a.time ? 'T' + a.time : ''));
            const db = new Date(b.event_date + (b.time ? 'T' + b.time : ''));
            return sortOrder === 'asc' ? da - db : db - da;
        });

        return result;
    };

    const filteredEvents = getFilteredAndSortedEvents();

    // Group events by month-year label
    const groupEventsByMonth = (events) => {
        const groups = [];
        let lastKey = null;
        events.forEach(ev => {
            const d = new Date(ev.event_date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const label = d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
            if (key !== lastKey) { groups.push({ key, label, events: [] }); lastKey = key; }
            groups[groups.length - 1].events.push(ev);
        });
        return groups;
    };

    const groupedEvents = groupEventsByMonth(filteredEvents);

    const QUICK_FILTERS = [
        { key: 'all',     label: t('calendar.filter_all') || 'Tất cả' },
        { key: 'today',   label: t('calendar.filter_today') || 'Hôm nay' },
        { key: 'next7',   label: t('calendar.filter_next7') || '7 ngày tới' },
        { key: 'next30',  label: t('calendar.filter_next30') || '30 ngày tới' },
        { key: 'week',    label: t('calendar.filter_week') || 'Tuần này' },
        { key: 'month',   label: t('calendar.filter_month') || 'Tháng này' },
        { key: 'quarter', label: t('calendar.filter_quarter') || 'Quý này' },
        { key: 'year',    label: t('calendar.filter_year') || 'Năm nay' },
        { key: 'past',    label: t('calendar.filter_past') || 'Đã qua' },
        { key: 'custom',  label: t('calendar.filter_custom') || '⚙ Tùy chỉnh' },
    ];

    return (
        <div className="h-full w-full p-4 md:p-6 lg:p-8 overflow-y-auto block space-y-6 relative">
            <div className="flex flex-col gap-1 mb-2">
                <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">📅</span> {t('calendar.title')}
                </h2>
                <p className="text-sm md:text-base font-medium text-zinc-500 dark:text-zinc-400">{t('calendar.subtitle')}</p>
            </div>

            <div className="flex flex-wrap gap-2 p-1.5 bg-black/5 dark:bg-white/5 backdrop-blur-md rounded-2xl w-fit shadow-sm border border-black/5 dark:border-white/10">
                <button 
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[14px] transition-all ${tab === 'calendar' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    onClick={() => setTab('calendar')}
                >
                    📅 {t('calendar.tab_calendar') || 'Lịch tháng'}
                </button>
                <button 
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[14px] transition-all ${tab === 'events' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    onClick={() => setTab('events')}
                >
                    📋 {t('calendar.tab_events') || 'Danh sách sự kiện'}
                    {serverEvents.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-black">
                            {serverEvents.length}
                        </span>
                    )}
                </button>
            </div>
            
            {tab === 'calendar' ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                    <div className="lg:col-span-3">
                        <CalendarGrid 
                            members={members} 
                            viewYear={viewYear} 
                            setViewYear={setViewYear} 
                            viewMonth={viewMonth} 
                            setViewMonth={setViewMonth} 
                            selectedDay={selectedDay} 
                            setSelectedDay={setSelectedDay}
                            serverEvents={serverEvents}
                            monthlyEvents={monthlyEvents}
                            user={user}
                            addToast={addToast}
                            onRefreshEvents={() => { fetchEvents(); fetchMonthlyEvents(); }}
                        />
                    </div>
                    
                    <div className="lg:col-span-1">
                        <UpcomingEventsSidebar members={members} serverEvents={serverEvents} />
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6">

                    {/* ── Search bar ── */}
                    <div className="relative flex items-center rounded-2xl bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-sm p-1.5 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                        <span className="absolute left-4 text-zinc-400 text-lg">🔍</span>
                        <input
                            type="text"
                            className="w-full bg-transparent border-none outline-none pl-12 pr-12 py-3 text-[15px] font-medium text-zinc-900 dark:text-white placeholder:text-zinc-500"
                            placeholder={t('calendar.search_placeholder') || 'Tìm kiếm sự kiện...'}
                            value={eventSearch}
                            onChange={e => setEventSearch(e.target.value)}
                        />
                        {eventSearch && (
                            <button 
                                className="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-500 transition-colors"
                                onClick={() => setEventSearch('')}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* ── Quick filters ── */}
                    <div className="flex flex-wrap gap-2">
                        {QUICK_FILTERS.map(f => (
                            <button
                                key={f.key}
                                className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all border ${
                                    eventFilter === f.key 
                                        ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 shadow-sm' 
                                        : 'bg-white/60 dark:bg-[#111111]/60 text-zinc-600 dark:text-zinc-400 border-black/5 dark:border-white/10 hover:bg-white dark:hover:bg-[#1A1A1C]'
                                }`}
                                onClick={() => {
                                    setEventFilter(f.key);
                                    if (f.key === 'custom') setShowCustomRange(true);
                                    else setShowCustomRange(false);
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Custom date range picker ── */}
                    {(eventFilter === 'custom' || showCustomRange) && (
                        <div className="flex flex-wrap items-center gap-3 p-4 rounded-[1.5rem] bg-white/60 dark:bg-[#111111]/60 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-bold text-zinc-500">📅 {t('calendar.range_from') || 'Từ ngày'}</label>
                                <input type="date" className="rounded-xl px-3 py-2 text-sm bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 outline-none focus:ring-2 focus:ring-blue-500/50" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                            </div>
                            <span className="text-zinc-400 font-bold hidden sm:block">→</span>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-bold text-zinc-500">📅 {t('calendar.range_to') || 'Đến ngày'}</label>
                                <input type="date" className="rounded-xl px-3 py-2 text-sm bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 outline-none focus:ring-2 focus:ring-blue-500/50" value={customTo} min={customFrom} onChange={e => setCustomTo(e.target.value)} />
                            </div>
                            {(customFrom || customTo) && (
                                <button className="ml-auto px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors" onClick={() => { setCustomFrom(''); setCustomTo(''); }}>✕ Xóa</button>
                            )}
                        </div>
                    )}

                    {/* ── Sort & stats bar ── */}
                    <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/10">
                        <span className="text-[13px] font-bold text-zinc-500 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg">
                            {filteredEvents.length === serverEvents.length
                                ? `${serverEvents.length} sự kiện`
                                : `${filteredEvents.length} / ${serverEvents.length} sự kiện`}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-zinc-500 hidden sm:block">Sắp xếp:</span>
                            <button
                                className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-colors ${sortOrder === 'asc' ? 'bg-zinc-800 text-white dark:bg-white dark:text-black' : 'bg-black/5 text-zinc-600 dark:bg-white/5 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10'}`}
                                onClick={() => setSortOrder('asc')}
                            >
                                ↑ Gần nhất
                            </button>
                            <button
                                className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-colors ${sortOrder === 'desc' ? 'bg-zinc-800 text-white dark:bg-white dark:text-black' : 'bg-black/5 text-zinc-600 dark:bg-white/5 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10'}`}
                                onClick={() => setSortOrder('desc')}
                            >
                                ↓ Xa nhất
                            </button>
                        </div>
                    </div>

                    {/* Event Creation Form (editor/admin only) */}
                    {canEdit && (
                        <div className="mb-4">
                            {!showEventForm ? (
                                <button
                                    className="w-full flex items-center justify-center gap-2 py-4 rounded-[1.5rem] border-2 border-dashed border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all text-sm"
                                    onClick={() => setShowEventForm(true)}
                                >
                                    ➕ {t('newsfeed.create_event_btn') || 'Tạo sự kiện mới'}
                                </button>
                            ) : (
                                <div className="rounded-[1.5rem] p-6 bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-sm flex flex-col gap-5">
                                    <h4 className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                                        <span className="text-blue-500">✨</span> {t('newsfeed.create_event_btn')}
                                    </h4>
                                    
                                    <div className="flex flex-col gap-4">
                                        <input
                                            type="text"
                                            className="w-full rounded-xl px-4 py-3 outline-none text-[14px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500/50"
                                            placeholder={t('newsfeed.event_title') || 'Tên sự kiện *'}
                                            value={eventForm.title}
                                            onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                                        />

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Start Date & Start Time */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">
                                                    {t('newsfeed.event_start') || 'Bắt đầu'}
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="date"
                                                        className="flex-1 rounded-xl px-4 py-2.5 outline-none text-[14px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500/50"
                                                        value={eventForm.event_date}
                                                        onChange={e => setEventForm({ ...eventForm, event_date: e.target.value })}
                                                    />
                                                    <input
                                                        type="time"
                                                        className="w-28 rounded-xl px-3 py-2.5 outline-none text-[14px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500/50"
                                                        value={eventForm.time}
                                                        onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {/* End Date & End Time */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">
                                                    {t('newsfeed.event_end') || 'Kết thúc'}
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="date"
                                                        className="flex-1 rounded-xl px-4 py-2.5 outline-none text-[14px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500/50"
                                                        value={eventForm.end_date}
                                                        onChange={e => setEventForm({ ...eventForm, end_date: e.target.value })}
                                                    />
                                                    <input
                                                        type="time"
                                                        className="w-28 rounded-xl px-3 py-2.5 outline-none text-[14px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500/50"
                                                        value={eventForm.end_time}
                                                        onChange={e => setEventForm({ ...eventForm, end_time: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <input
                                                type="text"
                                                className="w-full rounded-xl px-4 py-3 outline-none text-[14px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500/50"
                                                placeholder={t('newsfeed.event_location') || 'Địa điểm'}
                                                value={eventForm.location}
                                                onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                                            />

                                            <select
                                                className="w-full rounded-xl px-4 py-3 outline-none text-[14px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500/50"
                                                value={eventForm.recurrence}
                                                onChange={e => setEventForm({ ...eventForm, recurrence: e.target.value })}
                                            >
                                                <option value="none">{t('newsfeed.recurrence_none') || 'Không lặp lại'}</option>
                                                <option value="weekly">{t('newsfeed.recurrence_weekly') || 'Hàng tuần'}</option>
                                                <option value="monthly">{t('newsfeed.recurrence_monthly') || 'Hàng tháng'}</option>
                                                <option value="yearly">{t('newsfeed.recurrence_yearly') || 'Hàng năm'}</option>
                                            </select>
                                        </div>

                                        <textarea
                                            className="w-full rounded-xl px-4 py-3 outline-none text-[14px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 min-h-[80px] resize-y"
                                            placeholder={t('newsfeed.event_note') || 'Ghi chú thêm...'}
                                            value={eventForm.note}
                                            onChange={e => setEventForm({ ...eventForm, note: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex gap-3 justify-end pt-2 border-t border-black/5 dark:border-white/10">
                                        <button 
                                            className="px-6 py-2.5 rounded-xl font-bold text-[14px] bg-black/5 text-zinc-600 dark:bg-white/5 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                            onClick={() => setShowEventForm(false)}
                                        >
                                            {t('newsfeed.event_cancel') || 'Hủy'}
                                        </button>
                                        <button
                                            className="px-6 py-2.5 rounded-xl font-bold text-[14px] bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                                            onClick={handleCreateEvent}
                                            disabled={!eventForm.title.trim() || !eventForm.event_date}
                                        >
                                            {t('newsfeed.event_submit') || 'Lưu sự kiện'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Event list (grouped by month) ── */}
                    {filteredEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center bg-white/40 dark:bg-[#111111]/40 rounded-[2rem] border border-dashed border-black/10 dark:border-white/10 backdrop-blur-sm">
                            <span className="text-5xl mb-4 opacity-50">📅</span>
                            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                                {t('newsfeed.no_events') || 'Không có sự kiện nào'}
                            </h3>
                            <p className="text-[13px] text-zinc-500">
                                {eventSearch || eventFilter !== 'all'
                                    ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                                    : 'Chưa có sự kiện nào được tạo'}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-10">
                            {groupedEvents.map(group => (
                                <div key={group.key} className="flex flex-col gap-4 relative">
                                    <div className="sticky top-0 z-10 py-2 bg-zinc-50/80 dark:bg-black/80 backdrop-blur-xl flex items-center gap-3">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
                                        <h3 className="text-[15px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">
                                            {group.label}
                                        </h3>
                                        <span className="ml-2 px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                                            {group.events.length}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {group.events.map(event => (
                                            <EventCard
                                                key={event.id}
                                                event={event}
                                                currentUserId={currentUserId}
                                                isAdmin={isAdmin}
                                                canEdit={canEdit}
                                                addToast={addToast}
                                                onRefresh={fetchEvents}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
