import { useState } from 'react';
import { useTranslation } from '../../shared/hooks/useTranslation';
import CalendarGrid from './components/CalendarGrid';
import UpcomingEventsSidebar from './components/UpcomingEventsSidebar';
import './Calendar.css';

export default function CalendarPage({ members }) {
    const { t } = useTranslation();
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
    const [selectedDay, setSelectedDay] = useState(null);

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
                />
                
                <UpcomingEventsSidebar members={members} />
            </div>
        </div>
    );
}
