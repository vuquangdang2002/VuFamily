import { Hono } from 'hono';
import { getDb } from '../db/client';
import { updateRequests, members, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { Env } from '../index';
import { authenticate, requireAdmin } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

export const requestRouter = new Hono<{ Bindings: Env }>();

// GET /api/requests - Get all requests
requestRouter.get('/', authenticate, async (c) => {
  try {
    const db = getDb(c.env.DB);

    const reqs = await db.select({
      id: updateRequests.id,
      userId: updateRequests.userId,
      memberId: updateRequests.memberId,
      changes: updateRequests.changes,
      note: updateRequests.note,
      status: updateRequests.status,
      reviewedBy: updateRequests.reviewedBy,
      reviewedAt: updateRequests.reviewedAt,
      rejectReason: updateRequests.rejectReason,
      createdAt: updateRequests.createdAt,
      memberName: members.name,
      username: users.username,
      displayName: users.displayName
    })
    .from(updateRequests)
    .leftJoin(members, eq(updateRequests.memberId, members.id))
    .leftJoin(users, eq(updateRequests.userId, users.id))
    .orderBy(desc(updateRequests.createdAt));

    const formatted = reqs.map(r => ({
      id: r.id,
      memberId: r.memberId,
      memberName: r.memberName || `Thành viên #${r.memberId}`,
      requestedBy: r.displayName || r.username || `User #${r.userId}`,
      userId: r.userId,
      changes: r.changes,
      note: r.note || '',
      status: r.status || 'pending',
      rejectReason: r.rejectReason || '',
      createdAt: r.createdAt
    }));

    return successResponse(c, formatted);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// GET /api/requests/pending - Get pending requests
requestRouter.get('/pending', authenticate, async (c) => {
  try {
    const db = getDb(c.env.DB);

    const reqs = await db.select({
      id: updateRequests.id,
      userId: updateRequests.userId,
      memberId: updateRequests.memberId,
      changes: updateRequests.changes,
      note: updateRequests.note,
      status: updateRequests.status,
      createdAt: updateRequests.createdAt,
      memberName: members.name,
      username: users.username,
      displayName: users.displayName
    })
    .from(updateRequests)
    .leftJoin(members, eq(updateRequests.memberId, members.id))
    .leftJoin(users, eq(updateRequests.userId, users.id))
    .where(eq(updateRequests.status, 'pending'))
    .orderBy(desc(updateRequests.createdAt));

    const formatted = reqs.map(r => ({
      id: r.id,
      memberId: r.memberId,
      memberName: r.memberName || `Thành viên #${r.memberId}`,
      requestedBy: r.displayName || r.username || `User #${r.userId}`,
      userId: r.userId,
      changes: r.changes,
      note: r.note || '',
      status: 'pending',
      createdAt: r.createdAt
    }));

    return successResponse(c, formatted);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/requests - Submit a request
requestRouter.post('/', authenticate, async (c) => {
  try {
    const currentUser = c.get('user');
    const { memberId, changes, note } = await c.req.json();
    const db = getDb(c.env.DB);

    const changesStr = typeof changes === 'string' ? changes : JSON.stringify(changes);

    const [newReq] = await db.insert(updateRequests).values({
      userId: currentUser.id,
      memberId: parseInt(memberId as string),
      changes: changesStr,
      note: note || '',
      status: 'pending'
    }).returning();

    return successResponse(c, newReq, 'Đã gửi yêu cầu chỉnh sửa', 201);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/requests/:id/approve - Approve a request
requestRouter.post('/:id/approve', authenticate, requireAdmin, async (c) => {
  try {
    const id = parseInt(c.req.param('id') as string);
    const currentUser = c.get('user');
    const db = getDb(c.env.DB);

    const [req] = await db.select().from(updateRequests).where(eq(updateRequests.id, id));
    if (!req) return errorResponse(c, 'Yêu cầu không tồn tại', 404);

    let changesObj: any = {};
    try { changesObj = JSON.parse(req.changes); } catch (e) {}

    if (Object.keys(changesObj).length > 0) {
      await db.update(members).set(changesObj).where(eq(members.id, req.memberId));
    }

    await db.update(updateRequests).set({
      status: 'approved',
      reviewedBy: currentUser.id,
      reviewedAt: new Date().toISOString()
    }).where(eq(updateRequests.id, id));

    return successResponse(c, null, 'Đã phê duyệt yêu cầu');
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/requests/:id/reject - Reject a request
requestRouter.post('/:id/reject', authenticate, requireAdmin, async (c) => {
  try {
    const id = parseInt(c.req.param('id') as string);
    const currentUser = c.get('user');
    const { rejectReason } = await c.req.json();
    const db = getDb(c.env.DB);

    await db.update(updateRequests).set({
      status: 'rejected',
      rejectReason: rejectReason || '',
      reviewedBy: currentUser.id,
      reviewedAt: new Date().toISOString()
    }).where(eq(updateRequests.id, id));

    return successResponse(c, null, 'Đã từ chối yêu cầu');
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});
