import { Hono } from 'hono';
import { getDb } from '../db/client';
import { events, members } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Env } from '../index';
import { authenticate, requireAdmin, requireEditorOrAdmin } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
// @ts-ignore
import { Solar, Lunar } from '../utils/lunar';
// @ts-ignore
import { ganZhiToViet } from '../utils/vietLunar';

export const eventRouter = new Hono<{ Bindings: Env }>();

function parseDescription(description: string | null) {
  let meta: any = {};
  try {
    meta = JSON.parse(description || '{}');
  } catch (_) {
    meta = { note: description };
  }
  return meta;
}

function parseMD(dateStr: string | null) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length < 3) return null;
  return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10), day: parseInt(parts[2], 10) };
}

function pad2(n: number) { return String(n).padStart(2, '0'); }

function formatDateVN(dateStr: string | null) {
  const p = parseMD(dateStr);
  if (!p) return dateStr || '';
  return `${pad2(p.day)}/${pad2(p.month)}/${p.year}`;
}

function calcAge(birthDateStr: string | null) {
  if (!birthDateStr) return null;
  const b = parseMD(birthDateStr);
  if (!b) return null;
  const today = new Date();
  let age = today.getFullYear() - b.year;
  if ((today.getMonth() + 1) < b.month || ((today.getMonth() + 1) === b.month && today.getDate() < b.day)) age--;
  return age;
}

// GET /api/events
eventRouter.get('/', authenticate, async (c) => {
  try {
    const db = getDb(c.env.DB);
    const data = await db.select().from(events).orderBy(events.eventDate);

    const formattedEvents = data.map(ev => {
      const meta = parseDescription(ev.description);
      return {
        ...ev,
        location: meta.location || '',
        time: meta.time || '',
        end_date: meta.end_date || '',
        end_time: meta.end_time || '',
        recurrence: meta.recurrence || 'none',
        note: meta.note || '',
        subscribers: meta.subscribers || [],
        created_by_name: meta.created_by_name || ''
      };
    });

    return successResponse(c, formattedEvents);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/events
eventRouter.post('/', authenticate, requireEditorOrAdmin, async (c) => {
  try {
    const { title, event_date, event_type, location, time, recurrence, note, end_date, end_time } = await c.req.json();
    if (!title || !title.trim()) return errorResponse(c, 'Tiêu đề sự kiện không được trống', 400);
    if (!event_date) return errorResponse(c, 'Ngày sự kiện không được trống', 400);

    const currentUser = c.get('user');
    
    const meta = {
      location: location || '',
      time: time || '',
      end_date: end_date || '',
      end_time: end_time || '',
      recurrence: recurrence || 'none',
      note: note || '',
      subscribers: [],
      created_by_name: currentUser.displayName || currentUser.username
    };

    const db = getDb(c.env.DB);
    const [newEvent] = await db.insert(events).values({
      title: title.trim(),
      eventDate: event_date,
      eventType: event_type || 'meeting',
      description: JSON.stringify(meta),
    }).returning();

    return successResponse(c, { ...newEvent, ...meta }, 'Tạo sự kiện thành công', 201);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// DELETE /api/events/:id
eventRouter.delete('/:id', authenticate, requireAdmin, async (c) => {
  try {
    const eventId = parseInt(c.req.param('id') as string);
    const db = getDb(c.env.DB);
    await db.delete(events).where(eq(events.id, eventId));
    return successResponse(c, null, 'Đã xóa sự kiện');
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/events/:id/register
eventRouter.post('/:id/register', authenticate, async (c) => {
  try {
    const eventId = parseInt(c.req.param('id') as string);
    const currentUser = c.get('user');
    const userName = currentUser.displayName || currentUser.username;

    const db = getDb(c.env.DB);
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return errorResponse(c, 'Không tìm thấy sự kiện', 404);

    const meta = parseDescription(event.description);
    const subscribers = meta.subscribers || [];

    if (subscribers.some((s: any) => s.id === currentUser.id)) {
      return successResponse(c, { subscribers }, 'Đã đăng ký trước đó');
    }

    subscribers.push({ id: currentUser.id, name: userName, registered_at: new Date().toISOString() });
    meta.subscribers = subscribers;

    await db.update(events).set({
      description: JSON.stringify(meta)
    }).where(eq(events.id, eventId));

    return successResponse(c, { subscribers }, 'Đã đăng ký tham gia sự kiện');
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/events/:id/unregister
eventRouter.post('/:id/unregister', authenticate, async (c) => {
  try {
    const eventId = parseInt(c.req.param('id') as string);
    const currentUser = c.get('user');

    const db = getDb(c.env.DB);
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return errorResponse(c, 'Không tìm thấy sự kiện', 404);

    const meta = parseDescription(event.description);
    let subscribers = meta.subscribers || [];
    subscribers = subscribers.filter((s: any) => s.id !== currentUser.id);
    meta.subscribers = subscribers;

    await db.update(events).set({
      description: JSON.stringify(meta)
    }).where(eq(events.id, eventId));

    return successResponse(c, { subscribers }, 'Đã hủy đăng ký tham gia');
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// GET /api/events/anniversaries
eventRouter.get('/anniversaries', authenticate, async (c) => {
  try {
    const daysAhead = parseInt(c.req.query('daysAhead') || '30', 10);
    const db = getDb(c.env.DB);
    const allMembers = await db.select().from(members);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisYear = today.getFullYear();

    const birthdays: any[] = [];
    const weddingAnniversaries: any[] = [];
    const deathAnniversaries: any[] = [];
    const day30Events: any[] = [];
    const year1Events: any[] = [];

    allMembers.forEach(m => {
      if (!m.deathDate) {
        const bd = parseMD(m.birthDate);
        if (bd) {
          let eventDate = new Date(thisYear, bd.month - 1, bd.day);
          if (eventDate < today) eventDate = new Date(thisYear + 1, bd.month - 1, bd.day);
          const diff = Math.floor((eventDate.getTime() - today.getTime()) / 86400000);
          if (diff >= 0 && diff <= daysAhead) {
            birthdays.push({
              member: m,
              daysUntil: diff,
              displayDate: `${pad2(bd.day)}/${pad2(bd.month)}`,
              fullDate: formatDateVN(m.birthDate),
              age: calcAge(m.birthDate),
            });
          }

          const birthDate = new Date(bd.year, bd.month - 1, bd.day);
          const day30 = new Date(birthDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          day30.setHours(0, 0, 0, 0);
          const diff30 = Math.floor((day30.getTime() - today.getTime()) / 86400000);
          if (diff30 >= 0 && diff30 <= daysAhead) {
            day30Events.push({
              member: m,
              daysUntil: diff30,
              displayDate: `${pad2(day30.getDate())}/${pad2(day30.getMonth() + 1)}`,
              fullDate: `${pad2(day30.getDate())}/${pad2(day30.getMonth() + 1)}/${day30.getFullYear()}`,
            });
          }

          const day365 = new Date(bd.year + 1, bd.month - 1, bd.day);
          day365.setHours(0, 0, 0, 0);
          const diff365 = Math.floor((day365.getTime() - today.getTime()) / 86400000);
          if (diff365 >= 0 && diff365 <= daysAhead) {
            year1Events.push({
              member: m,
              daysUntil: diff365,
              displayDate: `${pad2(day365.getDate())}/${pad2(day365.getMonth() + 1)}`,
              fullDate: `${pad2(day365.getDate())}/${pad2(day365.getMonth() + 1)}/${day365.getFullYear()}`,
            });
          }
        }

        if (m.weddingDate) {
          const wd = parseMD(m.weddingDate);
          if (wd) {
            let eventDate = new Date(thisYear, wd.month - 1, wd.day);
            if (eventDate < today) eventDate = new Date(thisYear + 1, wd.month - 1, wd.day);
            const diff = Math.floor((eventDate.getTime() - today.getTime()) / 86400000);
            if (diff >= 0 && diff <= daysAhead) {
              const yearsCount = eventDate.getFullYear() - wd.year;
              weddingAnniversaries.push({
                member: m,
                daysUntil: diff,
                displayDate: `${pad2(wd.day)}/${pad2(wd.month)}`,
                fullDate: formatDateVN(m.weddingDate),
                years: yearsCount,
              });
            }
          }
        }
      } else {
        const dd = parseMD(m.deathDate);
        if (dd) {
          try {
            const deathSolar = Solar.fromYmd(dd.year, dd.month, dd.day);
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

            const diff = Math.floor((eventDate.getTime() - today.getTime()) / 86400000);
            if (diff >= 0 && diff <= daysAhead) {
              deathAnniversaries.push({
                member: m,
                daysUntil: diff,
                lunarStr,
                lunarYearStr,
                solarAnniversary: `${pad2(eventDate.getDate())}/${pad2(eventDate.getMonth() + 1)}/${eventDate.getFullYear()}`,
                deathDateDisplay: formatDateVN(m.deathDate),
              });
            }
          } catch (e) {}
        }
      }
    });

    const sortFn = (a: any, b: any) => a.daysUntil - b.daysUntil;
    birthdays.sort(sortFn);
    weddingAnniversaries.sort(sortFn);
    deathAnniversaries.sort(sortFn);
    day30Events.sort(sortFn);
    year1Events.sort(sortFn);

    return successResponse(c, {
      birthdays,
      weddingAnniversaries,
      deathAnniversaries,
      day30Events,
      year1Events
    });
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// GET /api/events/monthly
eventRouter.get('/monthly', authenticate, async (c) => {
  try {
    const year = parseInt(c.req.query('year') || String(new Date().getFullYear()), 10);
    const month = parseInt(c.req.query('month') || String(new Date().getMonth() + 1), 10);

    const db = getDb(c.env.DB);
    const allMembers = await db.select().from(members);
    const customEvents = await db.select().from(events);

    const resultEvents: any[] = [];

    allMembers.forEach(m => {
      if (m.deathDate) {
        const dd = parseMD(m.deathDate);
        if (dd) {
          try {
            const deathSolar = Solar.fromYmd(dd.year, dd.month, dd.day);
            const deathLunar = deathSolar.getLunar();
            const currentLunarYear = Lunar.fromYmd(year, deathLunar.getMonth(), deathLunar.getDay());
            const annSolar = currentLunarYear.getSolar();

            if (annSolar.getMonth() === month) {
              resultEvents.push({
                day: annSolar.getDay(),
                type: 'anniversary',
                member: m,
                lunarStr: `${pad2(deathLunar.getDay())}/${pad2(Math.abs(deathLunar.getMonth()))}`
              });
            }
          } catch (e) {}
        }
      } else {
        const bd = parseMD(m.birthDate);
        if (bd && bd.month === month) {
          resultEvents.push({
            day: bd.day,
            type: 'birthday',
            member: m,
            age: year - bd.year
          });
        }

        const wd = parseMD(m.weddingDate);
        if (wd && wd.month === month) {
          resultEvents.push({
            day: wd.day,
            type: 'wedding',
            member: m,
            years: year - wd.year
          });
        }

        if (bd) {
          const birthDate = new Date(bd.year, bd.month - 1, bd.day);
          const day30 = new Date(birthDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          if (day30.getMonth() + 1 === month && day30.getFullYear() === year) {
            resultEvents.push({
              day: day30.getDate(),
              type: 'day30',
              member: m
            });
          }

          const day365 = new Date(bd.year + 1, bd.month - 1, bd.day);
          if (day365.getMonth() + 1 === month && day365.getFullYear() === year) {
            resultEvents.push({
              day: day365.getDate(),
              type: 'year1',
              member: m
            });
          }
        }
      }
    });

    customEvents.forEach(ev => {
      const evDate = parseMD(ev.eventDate);
      if (evDate) {
        let matches = false;
        let meta: any = {};
        try {
          meta = JSON.parse(ev.description || '{}');
        } catch (_) {}

        const recurrence = meta.recurrence || 'none';
        if (recurrence === 'yearly' && evDate.month === month) {
          matches = true;
        } else if (recurrence === 'monthly') {
          matches = true;
        } else if (evDate.year === year && evDate.month === month) {
          matches = true;
        }

        if (matches) {
          resultEvents.push({
            day: evDate.day,
            type: 'event',
            event: {
              ...ev,
              location: meta.location || '',
              time: meta.time || '',
              recurrence
            }
          });
        }
      }
    });

    return successResponse(c, resultEvents);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});
