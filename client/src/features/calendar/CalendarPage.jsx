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

    // Week / Month / Quarter / Year event list filter calculation
    const getFilteredEvents = () => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return serverEvents.filter(ev => {
            if (!ev.event_date) return false;
            const evDate = new Date(ev.event_date);
            const evDateNormalized = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate());
            
            if (eventFilter === 'all') return true;
            
            if (eventFilter === 'week') {
                const currentDay = now.getDay();
                const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
                const monday = new Date(startOfToday);
                monday.setDate(startOfToday.getDate() + distanceToMonday);
                
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                
                monday.setHours(0,0,0,0);
                sunday.setHours(23,59,59,999);
                
                return evDateNormalized >= monday && evDateNormalized <= sunday;
            }
            
            if (eventFilter === 'month') {
                return evDate.getFullYear() === now.getFullYear() && evDate.getMonth() === now.getMonth();
            }
            
            if (eventFilter === 'quarter') {
                const currentQuarter = Math.floor(now.getMonth() / 3);
                const evQuarter = Math.floor(evDate.getMonth() / 3);
                return evDate.getFullYear() === now.getFullYear() && evQuarter === currentQuarter;
            }
            
            if (eventFilter === 'year') {
                return evDate.getFullYear() === now.getFullYear();
            }
            
            return true;
        });
    };

    const filteredEvents = getFilteredEvents();

    return (
        <div className="page-container calendar-page">
            <div className="page-header">
                <h2>{t('calendar.title')}</h2>
                <p className="page-subtitle">{t('calendar.subtitle')}</p>
            </div>

            {/* Tab Navigation */}
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
                    {/* Filters */}
                    <div className="calendar-event-filters">
                        <button className={`calendar-filter-btn ${eventFilter === 'all' ? 'active' : ''}`} onClick={() => setEventFilter('all')}>{t('calendar.filter_all') || 'Tất cả'}</button>
                        <button className={`calendar-filter-btn ${eventFilter === 'week' ? 'active' : ''}`} onClick={() => setEventFilter('week')}>{t('calendar.filter_week') || 'Tuần này'}</button>
                        <button className={`calendar-filter-btn ${eventFilter === 'month' ? 'active' : ''}`} onClick={() => setEventFilter('month')}>{t('calendar.filter_month') || 'Tháng này'}</button>
                        <button className={`calendar-filter-btn ${eventFilter === 'quarter' ? 'active' : ''}`} onClick={() => setEventFilter('quarter')}>{t('calendar.filter_quarter') || 'Quý này'}</button>
                        <button className={`calendar-filter-btn ${eventFilter === 'year' ? 'active' : ''}`} onClick={() => setEventFilter('year')}>{t('calendar.filter_year') || 'Năm nay'}</button>
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

                    {filteredEvents.length === 0 ? (
                        <div className="empty-state" style={{ padding: 40, textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
                            <span style={{ fontSize: 48 }}>📅</span>
                            <h3 style={{ marginTop: 12, fontSize: 16 }}>{t('newsfeed.no_events') || 'Không có sự kiện nào'}</h3>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {filteredEvents.map(event => (
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
                    )}
                </div>
            )}
        </div>
    );
}
