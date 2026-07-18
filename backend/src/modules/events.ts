import { Hono } from 'hono';
import { getDb } from '../db/client';
import { events } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Env } from '../index';
import { authenticate, requireAdmin, requireEditorOrAdmin } from '../middleware/auth';

export const eventRouter = new Hono<{ Bindings: Env }>();

// Helper to safely parse description JSON
function parseDescription(description: string | null) {
  let meta: any = {};
  try {
    meta = JSON.parse(description || '{}');
  } catch (_) {
    meta = { note: description };
  }
  return meta;
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

    return c.json({ success: true, data: formattedEvents });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/events
eventRouter.post('/', authenticate, requireEditorOrAdmin, async (c) => {
  try {
    const { title, event_date, event_type, location, time, recurrence, note, end_date, end_time } = await c.req.json();
    if (!title || !title.trim()) return c.json({ success: false, error: 'Tiêu đề sự kiện không được trống' }, 400);
    if (!event_date) return c.json({ success: false, error: 'Ngày sự kiện không được trống' }, 400);

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
      // memberId is null
    }).returning();

    return c.json({
      success: true,
      data: {
        ...newEvent,
        ...meta
      }
    }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// DELETE /api/events/:id
eventRouter.delete('/:id', authenticate, requireAdmin, async (c) => {
  try {
    const eventId = parseInt(c.req.param('id') as string);
    const db = getDb(c.env.DB);
    await db.delete(events).where(eq(events.id, eventId));
    return c.json({ success: true, message: 'Đã xóa sự kiện' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
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
    if (!event) return c.json({ success: false, error: 'Không tìm thấy sự kiện' }, 404);

    const meta = parseDescription(event.description);
    const subscribers = meta.subscribers || [];

    if (subscribers.some((s: any) => s.id === currentUser.id)) {
      return c.json({ success: true, message: 'Đã đăng ký trước đó', data: { subscribers } });
    }

    subscribers.push({ id: currentUser.id, name: userName, registered_at: new Date().toISOString() });
    meta.subscribers = subscribers;

    await db.update(events).set({
      description: JSON.stringify(meta)
    }).where(eq(events.id, eventId));

    return c.json({ success: true, data: { subscribers } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/events/:id/unregister
eventRouter.post('/:id/unregister', authenticate, async (c) => {
  try {
    const eventId = parseInt(c.req.param('id') as string);
    const currentUser = c.get('user');

    const db = getDb(c.env.DB);
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return c.json({ success: false, error: 'Không tìm thấy sự kiện' }, 404);

    const meta = parseDescription(event.description);
    let subscribers = meta.subscribers || [];
    subscribers = subscribers.filter((s: any) => s.id !== currentUser.id);
    meta.subscribers = subscribers;

    await db.update(events).set({
      description: JSON.stringify(meta)
    }).where(eq(events.id, eventId));

    return c.json({ success: true, data: { subscribers } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});
