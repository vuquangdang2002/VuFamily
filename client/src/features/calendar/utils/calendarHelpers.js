// calendarHelpers.js - Shared utilities for Calendar page calculations
import { Solar, Lunar } from '../../../shared/utils/lunar.js';
import { ganZhiToViet } from '../../../shared/utils/vietLunar.js';

export function parseMD(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length < 3) return null;
    return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10), day: parseInt(parts[2], 10) };
}

export function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

export function pad2(n) { return String(n).padStart(2, '0'); }

export function formatDateVN(dateStr) {
    const p = parseMD(dateStr);
    if (!p) return dateStr || '';
    return `${pad2(p.day)}/${pad2(p.month)}/${p.year}`;
}

export function calcAge(birthDateStr) {
    if (!birthDateStr) return null;
    const b = parseMD(birthDateStr);
    if (!b) return null;
    const today = new Date();
    let age = today.getFullYear() - b.year;
    if ((today.getMonth() + 1) < b.month || ((today.getMonth() + 1) === b.month && today.getDate() < b.day)) age--;
    return age;
}

export function getUpcomingBirthdays(members, daysAhead = 30) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const results = [];
    members.forEach(m => {
        const md = parseMD(m.birthDate);
        if (!md) return;
        const thisYear = today.getFullYear();
        let eventDate = new Date(thisYear, md.month - 1, md.day);
        if (eventDate < today) eventDate = new Date(thisYear + 1, md.month - 1, md.day);
        const diff = Math.floor((eventDate - today) / 86400000);
        if (diff >= 0 && diff <= daysAhead) {
            results.push({
                member: m, daysUntil: diff,
                displayDate: `${pad2(md.day)}/${pad2(md.month)}`,
                fullDate: formatDateVN(m.birthDate),
                age: calcAge(m.birthDate),
            });
        }
    });
    results.sort((a, b) => a.daysUntil - b.daysUntil);
    return results;
}

export function getUpcomingAnniversaries(members, daysAhead = 30) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thisYear = today.getFullYear();
    const results = [];
    members.forEach(m => {
        if (!m.deathDate) return;
        const md = parseMD(m.deathDate);
        if (!md) return;

        try {
            const deathSolar = Solar.fromYmd(md.year, md.month, md.day);
            const deathLunar = deathSolar.getLunar();
            const lDay = deathLunar.getDay();
            const lMonth = deathLunar.getMonth();

            const lunarYear = deathLunar.getYear();
            const lunarStr = `${pad2(lDay)}/${pad2(Math.abs(lMonth))}`;
            const lunarYearStr = `${ganZhiToViet(deathLunar.getYearInGanZhi())} (${lunarYear})`;

            let currentLunarYear = Lunar.fromYmd(thisYear, lMonth, lDay);
            let annSolar = currentLunarYear.getSolar();
            let eventDate = new Date(annSolar.getYear(), annSolar.getMonth() - 1, annSolar.getDay());

            if (eventDate < today) {
                currentLunarYear = Lunar.fromYmd(thisYear + 1, lMonth, lDay);
                annSolar = currentLunarYear.getSolar();
                eventDate = new Date(annSolar.getYear(), annSolar.getMonth() - 1, annSolar.getDay());
            }

            const diff = Math.floor((eventDate - today) / 86400000);
            if (diff >= 0 && diff <= daysAhead) {
                results.push({
                    member: m, daysUntil: diff,
                    lunarStr,
                    lunarYearStr,
                    solarAnniversary: `${pad2(eventDate.getDate())}/${pad2(eventDate.getMonth() + 1)}/${eventDate.getFullYear()}`,
                    deathDateDisplay: formatDateVN(m.deathDate),
                });
            }
        } catch (e) {
            console.error('Error calculating anniversary helpers:', e);
        }
    });
    results.sort((a, b) => a.daysUntil - b.daysUntil);
    return results;
}

export function getEventsForDate(members, year, month, day) {
    const events = [];
    members.forEach(m => {
        const bd = parseMD(m.birthDate);
        if (bd && bd.month === month && bd.day === day) events.push({ type: 'birthday', member: m });
        if (m.deathDate) {
            const md = parseMD(m.deathDate);
            if (md) {
                try {
                    const deathSolar = Solar.fromYmd(md.year, md.month, md.day);
                    const deathLunar = deathSolar.getLunar();

                    const currentLunarYear = Lunar.fromYmd(year, deathLunar.getMonth(), deathLunar.getDay());
                    const annSolar = currentLunarYear.getSolar();

                    if (annSolar.getMonth() === month && annSolar.getDay() === day) {
                        events.push({ type: 'anniversary', member: m });
                    }
                } catch (e) {}
            }
        }
    });
    return events;
}
