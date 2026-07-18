import { Context, Next } from 'hono';
import { getDb } from '../db/client';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

// Extend Hono Context to include user
declare module 'hono' {
  interface ContextVariableMap {
    user: typeof users.$inferSelect;
  }
}

export const authenticate = async (c: Context, next: Next) => {
  const token = c.req.header('x-auth-token') || c.req.query('token');
  if (!token) {
    return c.json({ success: false, error: 'Chưa đăng nhập' }, 401);
  }

  try {
    const db = getDb(c.env.DB);
    const [user] = await db.select().from(users).where(eq(users.token, token));

    if (!user) {
      return c.json({ success: false, error: 'Phiên đăng nhập không hợp lệ' }, 401);
    }

    if (user.status === 'banned') {
      return c.json({ success: false, error: 'Tài khoản của bạn đã bị khóa' }, 403);
    }

    c.set('user', user);
    await next();
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
};

export const optionalAuth = async (c: Context, next: Next) => {
  const token = c.req.header('x-auth-token') || c.req.query('token');
  if (!token) {
    await next();
    return;
  }

  try {
    const db = getDb(c.env.DB);
    const [user] = await db.select().from(users).where(eq(users.token, token));
    if (user) {
      c.set('user', user);
    }
  } catch (err) { /* silently fail */ }
  await next();
};

export const requireAdmin = async (c: Context, next: Next) => {
  const user = c.get('user');
  if (user && user.role === 'admin') {
    await next();
  } else {
    return c.json({ success: false, error: 'Chỉ Admin mới có quyền thực hiện' }, 403);
  }
};

export const requireEditorOrAdmin = async (c: Context, next: Next) => {
  const user = c.get('user');
  if (user && (user.role === 'admin' || user.role === 'editor')) {
    await next();
  } else {
    return c.json({ success: false, error: 'Bạn cần quyền Biên tập viên trở lên để thực hiện thao tác này' }, 403);
  }
};
