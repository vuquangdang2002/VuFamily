import { useState, useEffect } from 'react';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { api } from '../../shared/services/api';
import { myError } from '../../shared/utils/logger';
import CalendarGrid from './components/CalendarGrid';
import UpcomingEventsSidebar from './components/UpcomingEventsSidebar';
import EventCard from './components/EventCard';
import './Calendar.css';

export default function CalendarPage({ members, user, addToast }) {
    const { t } = useTranslation();
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
    const [selectedDay, setSelectedDay] = useState(null);
    const [serverEvents, setServerEvents] = useState([]);
    
    // Tabs & Event Form State
    const [tab, setTab] = useState('calendar'); // 'calendar' or 'events'
    const [showEventForm, setShowEventForm] = useState(false);
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

    useEffect(() => {
        fetchEvents();
    }, []);

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
        <div className="page-container calendar-page">
            <div className="page-header">
                <h2>{t('calendar.title')}</h2>
                <p className="page-subtitle">{t('calendar.subtitle')}</p>
            </div>

            <div className="calendar-tabs">
                <button 
                    className={`calendar-tab-btn ${tab === 'calendar' ? 'active' : ''}`}
                    onClick={() => setTab('calendar')}
                >
                    📅 {t('calendar.tab_calendar') || 'Lịch tháng'}
                </button>
                <button 
                    className={`calendar-tab-btn ${tab === 'events' ? 'active' : ''}`}
                    onClick={() => setTab('events')}
                >
                    📋 {t('calendar.tab_events') || 'Danh sách sự kiện'}
                    {serverEvents.length > 0 && (
                        <span className="calendar-tab-badge">{serverEvents.length}</span>
                    )}
                </button>
            </div>
            
            {tab === 'calendar' ? (
                <div className="calendar-layout">
                    <CalendarGrid 
                        members={members} 
                        viewYear={viewYear} 
                        setViewYear={setViewYear} 
                        viewMonth={viewMonth} 
                        setViewMonth={setViewMonth} 
                        selectedDay={selectedDay} 
                        setSelectedDay={setSelectedDay}
                        serverEvents={serverEvents}
                        user={user}
                        addToast={addToast}
                        onRefreshEvents={fetchEvents}
                    />
                    
                    <UpcomingEventsSidebar members={members} serverEvents={serverEvents} />
                </div>
            ) : (
                <div className="calendar-events-tab">

                    {/* ── Search bar ── */}
                    <div className="cal-search-bar">
                        <span className="cal-search-icon">🔍</span>
                        <input
                            type="text"
                            className="cal-search-input"
                            placeholder={t('calendar.search_placeholder') || 'Tìm kiếm sự kiện...'}
                            value={eventSearch}
                            onChange={e => setEventSearch(e.target.value)}
                        />
                        {eventSearch && (
                            <button className="cal-search-clear" onClick={() => setEventSearch('')}>✕</button>
                        )}
                    </div>

                    {/* ── Quick filters ── */}
                    <div className="calendar-event-filters">
                        {QUICK_FILTERS.map(f => (
                            <button
                                key={f.key}
                                className={`calendar-filter-btn ${eventFilter === f.key ? 'active' : ''} ${f.key === 'custom' ? 'custom-btn' : ''}`}
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
                        <div className="cal-custom-range">
                            <div className="cal-range-group">
                                <label className="cal-range-label">📅 {t('calendar.range_from') || 'Từ ngày'}</label>
                                <input type="date" className="form-input cal-range-input" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                            </div>
                            <span className="cal-range-sep">→</span>
                            <div className="cal-range-group">
                                <label className="cal-range-label">📅 {t('calendar.range_to') || 'Đến ngày'}</label>
                                <input type="date" className="form-input cal-range-input" value={customTo} min={customFrom} onChange={e => setCustomTo(e.target.value)} />
                            </div>
                            {(customFrom || customTo) && (
                                <button className="cal-range-clear" onClick={() => { setCustomFrom(''); setCustomTo(''); }}>✕ Xóa</button>
                            )}
                        </div>
                    )}

                    {/* ── Sort & stats bar ── */}
                    <div className="cal-list-meta">
                        <span className="cal-list-count">
                            {filteredEvents.length === serverEvents.length
                                ? `${serverEvents.length} sự kiện`
                                : `${filteredEvents.length} / ${serverEvents.length} sự kiện`}
                        </span>
                        <div className="cal-sort-group">
                            <span className="cal-sort-label">Sắp xếp:</span>
                            <button
                                className={`cal-sort-btn ${sortOrder === 'asc' ? 'active' : ''}`}
                                onClick={() => setSortOrder('asc')}
                                title="Sắp xếp gần nhất trước"
                            >
                                ↑ Gần nhất
                            </button>
                            <button
                                className={`cal-sort-btn ${sortOrder === 'desc' ? 'active' : ''}`}
                                onClick={() => setSortOrder('desc')}
                                title="Sắp xếp xa nhất trước"
                            >
                                ↓ Xa nhất
                            </button>
                        </div>
                    </div>

                    {/* Event Creation Form (editor/admin only) */}
                    {canEdit && (
                        <div className="nf-create-post" style={{ marginBottom: 20 }}>
                            {!showEventForm ? (
                                <button
                                    className="nf-event-create-toggle"
                                    onClick={() => setShowEventForm(true)}
                                >
                                    ➕ {t('newsfeed.create_event_btn')}
                                </button>
                            ) : (
                                <div className="nf-event-form" style={{ padding: 20, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
                                    <h4 className="nf-event-form-title">{t('newsfeed.create_event_btn')}</h4>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder={t('newsfeed.event_title')}
                                            value={eventForm.title}
                                            onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                                        />

                                        {/* Start Date & Start Time */}
                                        <div>
                                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                                {t('newsfeed.event_start') || 'Bắt đầu'}
                                            </label>
                                            <div className="nf-event-form-row">
                                                <input
                                                    type="date"
                                                    className="form-input"
                                                    value={eventForm.event_date}
                                                    onChange={e => setEventForm({ ...eventForm, event_date: e.target.value })}
                                                />
                                                <input
                                                    type="time"
                                                    className="form-input"
                                                    value={eventForm.time}
                                                    onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* End Date & End Time */}
                                        <div>
                                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                                {t('newsfeed.event_end') || 'Kết thúc'}
                                            </label>
                                            <div className="nf-event-form-row">
                                                <input
                                                    type="date"
                                                    className="form-input"
                                                    value={eventForm.end_date}
                                                    onChange={e => setEventForm({ ...eventForm, end_date: e.target.value })}
                                                />
                                                <input
                                                    type="time"
                                                    className="form-input"
                                                    value={eventForm.end_time}
                                                    onChange={e => setEventForm({ ...eventForm, end_time: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder={t('newsfeed.event_location')}
                                            value={eventForm.location}
                                            onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                                        />

                                        <select
                                            className="form-input"
                                            value={eventForm.recurrence}
                                            onChange={e => setEventForm({ ...eventForm, recurrence: e.target.value })}
                                        >
                                            <option value="none">{t('newsfeed.recurrence_none')}</option>
                                            <option value="weekly">{t('newsfeed.recurrence_weekly')}</option>
                                            <option value="monthly">{t('newsfeed.recurrence_monthly')}</option>
                                            <option value="yearly">{t('newsfeed.recurrence_yearly')}</option>
                                        </select>

                                        <textarea
                                            className="form-input"
                                            placeholder={t('newsfeed.event_note')}
                                            value={eventForm.note}
                                            onChange={e => setEventForm({ ...eventForm, note: e.target.value })}
                                            rows={2}
                                        />
                                    </div>

                                    <div className="nf-event-form-actions">
                                        <button className="btn btn-secondary" onClick={() => setShowEventForm(false)}>
                                            {t('newsfeed.event_cancel')}
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleCreateEvent}
                                            disabled={!eventForm.title.trim() || !eventForm.event_date}
                                        >
                                            {t('newsfeed.event_submit')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Event list (grouped by month) ── */}
                    {filteredEvents.length === 0 ? (
                        <div className="cal-empty-state">
                            <span>📅</span>
                            <h3>{t('newsfeed.no_events') || 'Không có sự kiện nào'}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                                {eventSearch || eventFilter !== 'all'
                                    ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                                    : 'Chưa có sự kiện nào được tạo'}
                            </p>
                        </div>
                    ) : (
                        <div className="cal-grouped-list">
                            {groupedEvents.map(group => (
                                <div key={group.key} className="cal-month-group">
                                    <div className="cal-month-label">
                                        <span className="cal-month-dot" />
                                        {group.label}
                                        <span className="cal-month-count">{group.events.length} sự kiện</span>
                                    </div>
                                    <div className="cal-month-events">
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
