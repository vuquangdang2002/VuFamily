// localNotifications.js - Offline-first Local Notifications service for Capacitor and Web Browsers
import { LocalNotifications } from '@capacitor/local-notifications';
import { myLog, myError } from './logger';

// Parse YYYY-MM-DD
function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length < 3) return null;
    return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10), day: parseInt(parts[2], 10) };
}

/**
 * Calculates events happening today or tomorrow
 */
function getTargetEvents(members) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events = [];

    members.forEach(m => {
        // 1. Birthdays (Solar)
        if (m.birthDate && !m.deathDate) {
            const md = parseDate(m.birthDate);
            if (md) {
                const thisYear = today.getFullYear();
                let eventDate = new Date(thisYear, md.month - 1, md.day);
                if (eventDate < today) eventDate = new Date(thisYear + 1, md.month - 1, md.day);
                
                const diff = Math.ceil((eventDate - today) / 86400000);
                if (diff >= 0 && diff <= 1) { // Today or Tomorrow
                    events.push({
                        id: m.id * 2, // Unique ID
                        title: `🎂 Sinh nhật thành viên`,
                        body: `${m.name} có sinh nhật ${diff === 0 ? 'hôm nay!' : 'vào ngày mai.'} (Tuổi: ${thisYear - md.year})`,
                        date: eventDate
                    });
                }
            }
        }
    });

    return events;
}

/**
 * Schedules device reminders for upcoming events
 * @param {Array} members - Entire family members array
 */
export async function scheduleOfflineNotifications(members) {
    if (!members || members.length === 0) return;

    try {
        const targetEvents = getTargetEvents(members);
        if (targetEvents.length === 0) {
            myLog('NOTIFICATION', 'No events to alert today or tomorrow.');
            return;
        }

        // 1. Capacitor Native Push Notifications
        if (window.Capacitor) {
            // Request permissions just in case
            const perm = await LocalNotifications.checkPermissions();
            if (perm.display !== 'granted') {
                await LocalNotifications.requestPermissions();
            }

            // Cancel any previously scheduled notifications to prevent duplicates
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel(pending);
            }

            // Schedule fresh alerts
            const notifications = targetEvents.map(ev => ({
                id: ev.id,
                title: ev.title,
                body: ev.body,
                largeIcon: 'res://icon',
                smallIcon: 'res://ic_stat_name',
                schedule: { at: new Date(Date.now() + 5000) } // trigger in 5 seconds
            }));

            await LocalNotifications.schedule({ notifications });
            myLog('NOTIFICATION', `Capacitor scheduled ${notifications.length} native alerts.`);
        } 
        // 2. Web Browser Standard API Notifications
        else if ('Notification' in window && Notification.permission === 'granted') {
            targetEvents.forEach(ev => {
                // To avoid multiple duplicate alerts on every single reload:
                // Only show if the last alert was more than 1 hour ago
                const lastAlertKey = `last_alert_${ev.id}`;
                const lastAlertTime = localStorage.getItem(lastAlertKey);
                if (!lastAlertTime || (Date.now() - parseInt(lastAlertTime, 10) > 3600000)) {
                    new Notification(ev.title, {
                        body: ev.body,
                        icon: '/favicon.ico'
                    });
                    localStorage.setItem(lastAlertKey, String(Date.now()));
                }
            });
            myLog('NOTIFICATION', `Web browser triggered ${targetEvents.length} web notifications.`);
        }
    } catch (err) {
        myError('NOTIFICATION', 'Failed to schedule offline notifications:', err);
    }
}
