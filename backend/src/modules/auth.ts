import { Hono } from 'hono';
import { getDb } from '../db/client';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { Env } from '../index';
import { authenticate } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

export const authRouter = new Hono<{ Bindings: Env }>();

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// POST /api/auth/login
authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return errorResponse(c, 'Vui lòng nhập tên đăng nhập và mật khẩu', 400);
    }

    const db = getDb(c.env.DB);
    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) {
      return errorResponse(c, 'Sai tên đăng nhập hoặc mật khẩu', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(c, 'Sai tên đăng nhập hoặc mật khẩu', 401);
    }

    if (user.status === 'banned') {
      return errorResponse(c, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.', 403);
    }

    const token = generateToken();
    const now = new Date().toISOString();

    await db.update(users)
      .set({
        token,
        isOnline: true,
        lastActive: now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    return successResponse(c, {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      token
    });
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/auth/logout
authRouter.post('/logout', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c.env.DB);
    await db.update(users).set({ token: null, isOnline: false }).where(eq(users.id, user.id));
    return successResponse(c, null, 'Đã đăng xuất');
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticate, async (c) => {
  try {
    const currentUser = c.get('user');
    const db = getDb(c.env.DB);
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      phone: users.phone,
      avatar: users.avatar,
      role: users.role,
    }).from(users).where(eq(users.id, currentUser.id));

    if (!user) return errorResponse(c, 'Không tìm thấy người dùng', 404);
    return successResponse(c, user);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/auth/ping
authRouter.post('/ping', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c.env.DB);
    await db.update(users).set({ lastActive: new Date().toISOString(), isOnline: true }).where(eq(users.id, user.id));
    return successResponse(c);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/auth/change-password
authRouter.post('/change-password', authenticate, async (c) => {
  try {
    const { currentPassword, newPassword } = await c.req.json();
    if (!currentPassword || !newPassword) return errorResponse(c, 'Vui lòng nhập đầy đủ mật khẩu', 400);

    const currentUser = c.get('user');
    const db = getDb(c.env.DB);
    const [user] = await db.select().from(users).where(eq(users.id, currentUser.id));

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return errorResponse(c, 'Mật khẩu hiện tại không đúng', 401);

    const hashedPw = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({
      password: hashedPw,
      token: null,
      updatedAt: new Date().toISOString(),
    }).where(eq(users.id, user.id));

    return successResponse(c, null, 'Đã đổi mật khẩu');
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// PUT /api/auth/profile
authRouter.put('/profile', authenticate, async (c) => {
  try {
    const { displayName, email, phone, avatar } = await c.req.json();
    if (!displayName) return errorResponse(c, 'Tên hiển thị không được để trống', 400);

    const currentUser = c.get('user');
    const db = getDb(c.env.DB);
    
    await db.update(users).set({
      displayName,
      email: email || '',
      phone: phone || '',
      avatar: avatar || '',
      updatedAt: new Date().toISOString(),
    }).where(eq(users.id, currentUser.id));

    const [updatedUser] = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      phone: users.phone,
      avatar: users.avatar,
      role: users.role,
    }).from(users).where(eq(users.id, currentUser.id));

    return successResponse(c, updatedUser);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});

// POST /api/auth/register
authRouter.post('/register', async (c) => {
  try {
    const { username, password, displayName, email, phone } = await c.req.json();
    if (!username || !password) {
      return errorResponse(c, 'Tên đăng nhập và mật khẩu là bắt buộc', 400);
    }

    const db = getDb(c.env.DB);
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
    if (existingUser) return errorResponse(c, 'Tên đăng nhập đã tồn tại', 400);

    const hashedPw = await bcrypt.hash(password, 10);
    const verToken = generateToken();
    
    await db.insert(users).values({
      username,
      password: hashedPw,
      displayName: displayName || username,
      email: email || '',
      phone: phone || '',
      role: 'viewer',
      status: 'active',
      emailVerified: true,
      verificationToken: verToken,
    });

    return successResponse(c, null, 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.', 201);
  } catch (err: any) {
    return errorResponse(c, err.message, 500);
  }
});
