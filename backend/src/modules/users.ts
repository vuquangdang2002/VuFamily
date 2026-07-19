import { Hono } from 'hono';
import { getDb } from '../db/client';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { Env } from '../index';
import { authenticate, requireAdmin } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

export const userRouter = new Hono<{ Bindings: Env }>();

// GET /api/users/public
userRouter.get('/public', authenticate, async (c) => {
  try {
    const db = getDb(c.env.DB);
    const data = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatar,
      isOnline: users.isOnline,
      lastActive: users.lastActive,
    }).from(users).where(eq(users.status, 'active'));

    data.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

    return successResponse(c, data);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// GET /api/users (Admin only)
userRouter.get('/', authenticate, requireAdmin, async (c) => {
  try {
    const db = getDb(c.env.DB);
    const data = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      phone: users.phone,
      avatar: users.avatar,
      role: users.role,
      status: users.status,
      isOnline: users.isOnline,
      lastActive: users.lastActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users);

    return successResponse(c, data);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/users (Admin only)
userRouter.post('/', authenticate, requireAdmin, async (c) => {
  try {
    const { username, password, displayName, role } = await c.req.json();
    if (!username || !password) {
      return errorResponse(c, 'Tên đăng nhập và mật khẩu là bắt buộc', 400);
    }

    const db = getDb(c.env.DB);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
    if (existing) {
      return errorResponse(c, 'Tên đăng nhập đã tồn tại', 400);
    }

    const hashedPw = await bcrypt.hash(password, 10);
    await db.insert(users).values({
      username,
      password: hashedPw,
      displayName: displayName || username,
      role: ['admin', 'editor', 'viewer'].includes(role) ? role : 'viewer',
      status: 'active',
      emailVerified: true
    });

    return successResponse(c, null, 'Đã tạo tài khoản thành công', 201);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// PUT /api/users/:id (Admin only)
userRouter.put('/:id', authenticate, requireAdmin, async (c) => {
  try {
    const userId = parseInt(c.req.param('id') as string);
    const { displayName, role, email, phone, avatar, status } = await c.req.json();
    const currentUser = c.get('user');

    if (!displayName || !role) {
      return errorResponse(c, 'Tên hiển thị và quyền là bắt buộc', 400);
    }

    if (status === 'banned' && userId === currentUser.id) {
      return errorResponse(c, 'Bạn không thể tự khóa tài khoản của chính mình', 400);
    }

    const db = getDb(c.env.DB);
    const updateData: any = {
      displayName,
      role,
      email: email || '',
      phone: phone || '',
      avatar: avatar || '',
      updatedAt: new Date().toISOString(),
    };
    if (status) updateData.status = status;

    await db.update(users).set(updateData).where(eq(users.id, userId));

    return successResponse(c, null, 'Cập nhật tài khoản thành công');
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// DELETE /api/users/:id (Admin only)
userRouter.delete('/:id', authenticate, requireAdmin, async (c) => {
  try {
    const userId = parseInt(c.req.param('id') as string);
    const currentUser = c.get('user');

    if (userId === currentUser.id) {
      return errorResponse(c, 'Không thể xóa chính mình', 400);
    }

    const db = getDb(c.env.DB);
    await db.delete(users).where(eq(users.id, userId));

    return successResponse(c, null, 'Đã xóa tài khoản');
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/users/:id/reset-password (Admin only)
userRouter.post('/:id/reset-password', authenticate, requireAdmin, async (c) => {
  try {
    const userId = parseInt(c.req.param('id') as string);
    const { newPassword } = await c.req.json();

    if (!newPassword) {
      return errorResponse(c, 'Mật khẩu mới là bắt buộc', 400);
    }

    const hashedPw = await bcrypt.hash(newPassword, 10);
    const db = getDb(c.env.DB);
    await db.update(users).set({
      password: hashedPw,
      token: null,
      updatedAt: new Date().toISOString(),
    }).where(eq(users.id, userId));

    return successResponse(c, null, 'Đã đặt lại mật khẩu');
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});
