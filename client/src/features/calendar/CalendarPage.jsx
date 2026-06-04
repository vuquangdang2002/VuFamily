import { useState, useEffect } from 'react';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { api } from '../../shared/services/api';
import { myError } from '../../shared/utils/logger';
import CalendarGrid from './components/CalendarGrid';
import UpcomingEventsSidebar from './components/UpcomingEventsSidebar';
import './Calendar.css';

export default function CalendarPage({ members, user, addToast }) {
    const { t } = useTranslation();
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
    const [selectedDay, setSelectedDay] = useState(null);
    const [serverEvents, setServerEvents] = useState([]);

    useEffect(() => {
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
        fetchEvents();
    }, []);

    return (
        <div className="page-container calendar-page">
            <div className="page-header">
                <h2>{t('calendar.title')}</h2>
                <p className="page-subtitle">{t('calendar.subtitle')}</p>
            </div>
            
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
                    onRefreshEvents={async () => {
                        try {
                            const json = await api.getEvents();
                            if (json.success) setServerEvents(json.data || []);
                        } catch (e) { myError('CALENDAR', e); }
                    }}
                />
                
                <UpcomingEventsSidebar members={members} serverEvents={serverEvents} />
            </div>
        </div>
    );
}
