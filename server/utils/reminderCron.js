// reminderCron.js - Backend scheduler for email notifications of upcoming events (birthdays & anniversaries)
const MemberModel = require('../models/Member');
const { supabase } = require('../config/supabase');
const { Solar, Lunar } = require('./lunar');

function parseMD(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length < 3) return null;
    return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10), day: parseInt(parts[2], 10) };
}

function getUpcomingEvents(members, daysAhead = 3) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = [];

    members.forEach(m => {
        // 1. Birthdays (Solar)
        if (m.birth_date && !m.death_date) {
            const md = parseMD(m.birth_date);
            if (md) {
                const thisYear = today.getFullYear();
                let eventDate = new Date(thisYear, md.month - 1, md.day);
                if (eventDate < today) eventDate = new Date(thisYear + 1, md.month - 1, md.day);
                const diff = Math.ceil((eventDate - today) / 86400000);
                if (diff >= 0 && diff <= daysAhead) {
                    upcoming.push({
                        name: m.name,
                        type: 'BIRTHDAY',
                        daysUntil: diff,
                        dateDisplay: `${md.day}/${md.month}`,
                        details: `Sinh nhật (Tuổi: ${thisYear - md.year})`
                    });
                }
            }
        }

        // 2. Anniversaries (Lunar Death Anniversary - Giỗ)
        if (m.death_date) {
            const md = parseMD(m.death_date);
            if (md) {
                try {
                    const deathSolar = Solar.fromYmd(md.year, md.month, md.day);
                    const deathLunar = deathSolar.getLunar();
                    const lDay = deathLunar.getDay();
                    const lMonth = deathLunar.getMonth();

                    const thisYear = today.getFullYear();
                    let currentLunarYear = Lunar.fromYmd(thisYear, lMonth, lDay);
                    let annSolar = currentLunarYear.getSolar();
                    let eventDate = new Date(annSolar.getYear(), annSolar.getMonth() - 1, annSolar.getDay());

                    if (eventDate < today) {
                        currentLunarYear = Lunar.fromYmd(thisYear + 1, lMonth, lDay);
                        annSolar = currentLunarYear.getSolar();
                        eventDate = new Date(annSolar.getYear(), annSolar.getMonth() - 1, annSolar.getDay());
                    }

                    const diff = Math.ceil((eventDate - today) / 86400000);
                    if (diff >= 0 && diff <= daysAhead) {
                        upcoming.push({
                            name: m.name,
                            type: 'ANNIVERSARY',
                            daysUntil: diff,
                            dateDisplay: `${annSolar.getDay()}/${annSolar.getMonth() + 1}`,
                            lunarDisplay: `${lDay}/${Math.abs(lMonth)}`,
                            details: `Giỗ chạp âm lịch (Ngày âm: ${lDay}/${Math.abs(lMonth)})`
                        });
                    }
                } catch (e) {
                    console.error('Error calculating lunar anniversary:', e);
                }
            }
        }
    });

    upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
    return upcoming;
}

async function checkAndSendReminders() {
    try {
        const enableReminders = process.env.ENABLE_EMAIL_REMINDERS !== 'false';
        if (!enableReminders) {
            console.log('[ReminderCron] Email reminders are disabled via environment configuration.');
            return { success: true, count: 0, reason: 'disabled' };
        }

        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
            console.warn('[ReminderCron] Missing RESEND_API_KEY. Reminders cannot be sent.');
            return { success: false, error: 'missing_resend_key' };
        }

        const members = await MemberModel.getAll();
        const upcoming = getUpcomingEvents(members, 3); // Check next 3 days

        if (upcoming.length === 0) {
            console.log('[ReminderCron] No upcoming birthdays or anniversaries in the next 3 days.');
            return { success: true, count: 0 };
        }

        console.log(`[ReminderCron] Found ${upcoming.length} upcoming events. Fetching recipient emails...`);

        // Fetch registered active users to send notifications
        const { data: users, error } = await supabase
            .from('users')
            .select('email, display_name')
            .eq('status', 'active');

        if (error) throw error;

        // Collect recipient emails
        let recipients = [];
        if (process.env.REMINDER_EMAIL_RECIPIENTS) {
            recipients = process.env.REMINDER_EMAIL_RECIPIENTS.split(',').map(e => e.trim());
        } else {
            recipients = users
                .map(u => u.email)
                .filter(email => email && email.includes('@') && !email.includes('anonymous'));
        }

        // Add fallback to admin email if no recipients found
        if (recipients.length === 0 && process.env.ADMIN_EMAIL) {
            recipients.push(process.env.ADMIN_EMAIL);
        }

        if (recipients.length === 0) {
            console.log('[ReminderCron] No recipients configured or found in active users list.');
            return { success: true, count: 0, reason: 'no_recipients' };
        }

        const { Resend } = require('resend');
        const resend = new Resend(resendKey);

        const emailContent = `
            <div style="font-family:sans-serif;max-width:550px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;">
                <h2 style="color:#1e293b;margin-bottom:4px;display:flex;align-items:center;gap:8px">🏛️ Gia Phả - Dòng Họ Vũ</h2>
                <p style="color:#64748b;font-size:14px;margin-top:0">Thông báo nhắc lịch dòng họ tự động</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
                <p style="color:#334155;font-size:15px;line-height:1.6">Xin chào các thành viên Gia đình,</p>
                <p style="color:#334155;font-size:15px;line-height:1.6">Hệ thống xin thông báo các sự kiện quan trọng sắp diễn ra trong <strong>3 ngày tới</strong>:</p>
                
                <div style="margin:24px 0">
                    ${upcoming.map(ev => `
                        <div style="background:#ffffff;border-left:4px solid ${ev.type === 'BIRTHDAY' ? '#f59e0b' : '#ef4444'};border-radius:8px;padding:16px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
                            <div style="font-weight:bold;color:#1e293b;font-size:16px">${ev.name}</div>
                            <div style="color:#475569;font-size:14px;margin-top:4px">${ev.details}</div>
                            <div style="display:flex;gap:12px;margin-top:8px;font-size:12px;color:#64748b">
                                <span>📅 Ngày dương: <strong>${ev.dateDisplay}</strong></span>
                                ${ev.lunarDisplay ? `<span>🌙 Ngày âm: <strong>${ev.lunarDisplay}</strong></span>` : ''}
                                <span style="margin-left:auto;color:${ev.daysUntil === 0 ? '#ef4444' : '#64748b'};font-weight:${ev.daysUntil === 0 ? 'bold' : 'normal'}">
                                    ${ev.daysUntil === 0 ? 'Hôm nay!' : `Còn ${ev.daysUntil} ngày`}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
                <p style="color:#94a3b8;font-size:12px;text-align:center;line-height:1.5">
                    Đây là thư tự động từ hệ thống Gia Phả VuFamily.<br>
                    Để dừng nhận các thư nhắc lịch này, vui lòng liên hệ Admin dòng họ.
                </p>
            </div>
        `;

        for (const recipient of recipients) {
            try {
                await resend.emails.send({
                    from: 'Nhắc Lịch Gia Phả <onboarding@resend.dev>',
                    to: [recipient],
                    subject: `[Nhắc Lịch Gia Phả] Có ${upcoming.length} sự kiện sắp tới`,
                    html: emailContent
                });
                console.log(`[ReminderCron] Sent reminder email successfully to: ${recipient}`);
            } catch (err) {
                console.error(`[ReminderCron] Failed to send email to ${recipient}:`, err);
            }
        }

        return { success: true, count: upcoming.length };
    } catch (err) {
        console.error('[ReminderCron] Unexpected error in reminder cron job:', err);
        return { success: false, error: err.message };
    }
}

// Start in-memory background interval checking once every 12 hours (runs in persistent hosting environments)
function startReminderInterval() {
    console.log('[ReminderCron] Starting background interval for email reminders (12 hours)...');
    
    // Check first after 30 seconds to allow server startup tasks
    setTimeout(() => {
        checkAndSendReminders().catch(() => {});
    }, 30000);

    setInterval(() => {
        checkAndSendReminders().catch(() => {});
    }, 12 * 60 * 60 * 1000); // 12 hours
}

module.exports = {
    checkAndSendReminders,
    startReminderInterval
};
