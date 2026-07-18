import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { Solar } from '../../shared/utils/lunar.js';
import { ganZhiToViet, lunarMonthName } from '../../shared/utils/vietLunar.js';
import { request } from '../../shared/services/api/request';
import GuestView from './components/GuestView';
import DashboardView from './components/DashboardView';

export default function HomePage({ user, members, onNavigate, addToast }) {
    const { t } = useTranslation();

    // ── Time & Date Greetings ──
    const greetingText = useMemo(() => {
        const hr = new Date().getHours();
        if (hr < 12) return t('home.greeting_morning') || 'Chào buổi sáng';
        if (hr < 18) return t('home.greeting_afternoon') || 'Chào buổi chiều';
        return t('home.greeting_evening') || 'Chào buổi tối';
    }, [t]);

    const dateDisplay = useMemo(() => {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const solarStr = today.toLocaleDateString('vi-VN', options);
        
        let lunarStr = '';
        try {
            const solar = Solar.fromYmd(today.getFullYear(), today.getMonth() + 1, today.getDate());
            const lunar = solar.getLunar();
            const day = lunar.getDay();
            const month = lunar.getMonth();
            const yearGanZhi = ganZhiToViet(lunar.getYearInGanZhi());
            const monthName = lunarMonthName(month);
            lunarStr = `Ngày ${day} tháng ${monthName} năm ${yearGanZhi}`;
        } catch (e) {
            console.error('Error generating lunar date greeting:', e);
        }
        
        return { solar: solarStr, lunar: lunarStr };
    }, []);

    // ── Tree Stats ──
    const totalMembers = members.length;
    const totalGenerations = useMemo(() => {
        if (members.length === 0) return 0;
        return Math.max(...members.map(m => m.generation || 0), 0);
    }, [members]);

    // ── Upcoming Events (API-driven) ──
    const [anniversaries, setAnniversaries] = useState({
        birthdays: [],
        weddingAnniversaries: [],
        deathAnniversaries: [],
        day30Events: [],
        year1Events: []
    });
    const [loadingEvents, setLoadingEvents] = useState(true);

    useEffect(() => {
        if (!user) return;
        request('/events/anniversaries?daysAhead=30')
            .then(json => {
                if (json.success) setAnniversaries(json.data);
            })
            .catch(err => console.error('Failed to fetch anniversaries:', err))
            .finally(() => setLoadingEvents(false));
    }, [user]);

    const combinedEvents = useMemo(() => {
        const list = [];
        anniversaries.deathAnniversaries.forEach(ev => list.push({ ...ev, type: 'anniversary' }));
        anniversaries.birthdays.forEach(ev => list.push({ ...ev, type: 'birthday' }));
        anniversaries.weddingAnniversaries.forEach(ev => list.push({ ...ev, type: 'wedding' }));
        anniversaries.day30Events.forEach(ev => list.push({ ...ev, type: 'day30' }));
        anniversaries.year1Events.forEach(ev => list.push({ ...ev, type: 'year1' }));
        
        return list.sort((a, b) => a.daysUntil - b.daysUntil);
    }, [anniversaries]);

    const hasEvents = combinedEvents.length > 0;

    // ── Render Views ──
    if (!user) {
        return <GuestView onNavigate={onNavigate} />;
    }

    return (
        <DashboardView 
            user={user}
            greetingText={greetingText}
            dateDisplay={dateDisplay}
            totalMembers={totalMembers}
            totalGenerations={totalGenerations}
            combinedEvents={combinedEvents}
            hasEvents={hasEvents}
            onNavigate={onNavigate}
        />
    );
}
