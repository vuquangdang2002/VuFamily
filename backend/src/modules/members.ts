import { Hono } from 'hono';
import { getDb } from '../db/client';
import { members, achievements } from '../db/schema';
import { eq, or, ilike, count, sql } from 'drizzle-orm';
import { Env } from '../index';
import { authenticate, requireEditorOrAdmin } from '../middleware/auth';

export const memberRouter = new Hono<{ Bindings: Env }>();

// GET /api/members/search
memberRouter.get('/search', async (c) => {
  try {
    const q = c.req.query('q')?.toLowerCase().trim() || '';
    if (!q) return c.json({ success: true, data: [] });

    const db = getDb(c.env.DB);
    const searchPattern = `%${q}%`;
    const data = await db.select()
      .from(members)
      .where(or(
        ilike(members.name, searchPattern),
        ilike(members.birthPlace, searchPattern),
        ilike(members.occupation, searchPattern),
        ilike(members.note, searchPattern)
      ))
      .limit(50);

    return c.json({ success: true, data, cached: false });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET /api/members
memberRouter.get('/', async (c) => {
  try {
    const db = getDb(c.env.DB);
    // Fetch all members, order by generation and birthDate
    const data = await db.select().from(members).orderBy(members.generation, members.birthDate);
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET /api/members/:id
memberRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id') as string);
    const db = getDb(c.env.DB);
    const [member] = await db.select().from(members).where(eq(members.id, id));
    
    if (!member) return c.json({ success: false, error: 'Không tìm thấy' }, 404);
    return c.json({ success: true, data: member });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET /api/members/:id/children
memberRouter.get('/:id/children', async (c) => {
  try {
    const parentId = parseInt(c.req.param('id') as string);
    const db = getDb(c.env.DB);
    const childrenList = await db.select().from(members).where(eq(members.parentId, parentId)).orderBy(members.birthOrder);
    return c.json({ success: true, data: childrenList });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET /api/members/:id/achievements
memberRouter.get('/:id/achievements', async (c) => {
  try {
    const memberId = parseInt(c.req.param('id') as string);
    const db = getDb(c.env.DB);
    const data = await db.select().from(achievements).where(eq(achievements.memberId, memberId)).orderBy(achievements.startYear);
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/members
memberRouter.post('/', authenticate, requireEditorOrAdmin, async (c) => {
  try {
    const body = await c.req.json();
    if (!body.name) return c.json({ success: false, error: 'Tên là bắt buộc' }, 400);

    const spouseIdVal = body.spouseId ? parseInt(body.spouseId) : null;
    const weddingDateVal = spouseIdVal ? body.weddingDate : null;

    const db = getDb(c.env.DB);
    const [newMember] = await db.insert(members).values({
      name: body.name,
      gender: body.gender ?? 1,
      birthDate: body.birthDate,
      birthTime: body.birthTime,
      deathDate: body.deathDate,
      deathDateLunar: body.deathDateLunar,
      birthPlace: body.birthPlace,
      deathPlace: body.deathPlace,
      occupation: body.occupation,
      phone: body.phone,
      email: body.email,
      address: body.address,
      note: body.note,
      photo: body.photo,
      birthOrder: body.birthOrder,
      childType: body.childType ?? 'biological',
      parentId: body.parentId,
      spouseId: spouseIdVal,
      weddingDate: weddingDateVal,
      generation: body.generation ?? 1,
    }).returning();

    // Bidirectional spouse linking
    if (newMember.spouseId) {
      await db.update(members).set({ spouseId: newMember.id }).where(eq(members.id, newMember.spouseId));
    }

    return c.json({ success: true, data: newMember }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// PUT /api/members/:id
memberRouter.put('/:id', authenticate, requireEditorOrAdmin, async (c) => {
  try {
    const id = parseInt(c.req.param('id') as string);
    const body = await c.req.json();
    const db = getDb(c.env.DB);
    
    const oldMember = await db.select().from(members).where(eq(members.id, id)).then(r => r[0]);

    const updateData = { ...body };
    if (body.spouseId === null || body.spouseId === "") {
      updateData.spouseId = null;
      updateData.weddingDate = null;
    }

    const [updated] = await db.update(members).set({
      ...updateData,
      updatedAt: new Date().toISOString(),
    }).where(eq(members.id, id)).returning();

    if (!updated) return c.json({ success: false, error: 'Không tìm thấy' }, 404);

    // Bidirectional spouse linking updates
    if (body.spouseId !== undefined) {
      const newSpouseId = body.spouseId ? parseInt(body.spouseId) : null;
      const oldSpouseId = oldMember?.spouseId;

      if (newSpouseId !== oldSpouseId) {
        // 1. Clear old spouse link
        if (oldSpouseId) {
          await db.update(members).set({ spouseId: null }).where(eq(members.id, oldSpouseId));
        }
        // 2. Set new spouse link
        if (newSpouseId) {
          await db.update(members).set({ spouseId: id }).where(eq(members.id, newSpouseId));
        }
      }
    }

    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// DELETE /api/members/:id
memberRouter.delete('/:id', authenticate, requireEditorOrAdmin, async (c) => {
  try {
    const id = parseInt(c.req.param('id') as string);
    const db = getDb(c.env.DB);
    const [deleted] = await db.delete(members).where(eq(members.id, id)).returning();
    
    if (!deleted) return c.json({ success: false, error: 'Không tìm thấy' }, 404);
    return c.json({ success: true, message: 'Đã xóa' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ─── Stats and Achievements Routers ───
export const statsRouter = new Hono<{ Bindings: Env }>();
statsRouter.get('/', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const [totalObj] = await db.select({ value: count() }).from(members);
    const [malesObj] = await db.select({ value: count() }).from(members).where(eq(members.gender, 1));
    const [femalesObj] = await db.select({ value: count() }).from(members).where(eq(members.gender, 0));
    const [passedAwayObj] = await db.select({ value: count() }).from(members).where(sql`${members.deathDate} IS NOT NULL OR ${members.deathDate} != ''`);
    
    const data = {
      total: totalObj.value,
      males: malesObj.value,
      females: femalesObj.value,
      passed_away: passedAwayObj.value,
      generations: 10 // Mock for now, would need a distinct generation query
    };

    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export const achievementRouter = new Hono<{ Bindings: Env }>();
achievementRouter.post('/', authenticate, requireEditorOrAdmin, async (c) => {
  try {
    const body = await c.req.json();
    if (!body.title) return c.json({ success: false, error: 'Tên thành tích là bắt buộc' }, 400);

    const db = getDb(c.env.DB);
    const [newAch] = await db.insert(achievements).values({
      memberId: body.memberId,
      category: body.category || 'other',
      title: body.title,
      organization: body.organization || '',
      startYear: body.startYear,
      endYear: body.endYear,
      description: body.description || ''
    }).returning({ id: achievements.id });

    return c.json({ success: true, data: { id: newAch.id } }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

achievementRouter.delete('/:id', authenticate, requireEditorOrAdmin, async (c) => {
  try {
    const id = parseInt(c.req.param('id') as string);
    const db = getDb(c.env.DB);
    await db.delete(achievements).where(eq(achievements.id, id));
    return c.json({ success: true, message: 'Đã xóa' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});
