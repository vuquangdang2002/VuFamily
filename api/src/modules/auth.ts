import { Hono } from 'hono';
import { getDb } from '../db/client';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { Env } from '../index';
import { authenticate } from '../middleware/auth';

export const authRouter = new Hono<{ Bindings: Env }>();

// Helper to generate a hex token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return c.json({ success: false, error: 'Vui lòng nhập tên đăng nhập và mật khẩu' }, 400);
    }

    const db = getDb(c.env.DB);
    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) {
      return c.json({ success: false, error: 'Sai tên đăng nhập hoặc mật khẩu' }, 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return c.json({ success: false, error: 'Sai tên đăng nhập hoặc mật khẩu' }, 401);
    }

    if (user.status === 'banned') {
      return c.json({ success: false, error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' }, 403);
    }

    if (!user.emailVerified) {
      return c.json({ success: false, error: 'Tài khoản chưa xác nhận email. Vui lòng kiểm tra hộp thư và click link xác nhận.' }, 403);
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

    return c.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        token
      }
    });
  } catch (err: any) {
    console.error('[AuthController - login] Error:', err.message);
    return c.json({ success: false, error: err.message }, 500);
  }
});

authRouter.post('/logout', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c.env.DB);
    await db.update(users).set({ token: null, isOnline: false }).where(eq(users.id, user.id));
    return c.json({ success: true, message: 'Đã đăng xuất' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

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

    if (!user) return c.json({ success: false, error: 'Không tìm thấy người dùng' }, 404);
    return c.json({ success: true, data: user });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

authRouter.post('/ping', authenticate, async (c) => {
  try {
    const user = c.get('user');
    const db = getDb(c.env.DB);
    await db.update(users).set({ lastActive: new Date().toISOString(), isOnline: true }).where(eq(users.id, user.id));
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

authRouter.post('/change-password', authenticate, async (c) => {
  try {
    const { currentPassword, newPassword } = await c.req.json();
    if (!currentPassword || !newPassword) return c.json({ success: false, error: 'Vui lòng nhập đầy đủ mật khẩu' }, 400);

    const currentUser = c.get('user');
    const db = getDb(c.env.DB);
    const [user] = await db.select().from(users).where(eq(users.id, currentUser.id));

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return c.json({ success: false, error: 'Mật khẩu hiện tại không đúng' }, 401);

    const hashedPw = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({
      password: hashedPw,
      token: null,
      updatedAt: new Date().toISOString(),
    }).where(eq(users.id, user.id));

    return c.json({ success: true, message: 'Đã đổi mật khẩu' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

authRouter.put('/profile', authenticate, async (c) => {
  try {
    const { displayName, email, phone, avatar } = await c.req.json();
    if (!displayName) return c.json({ success: false, error: 'Tên hiển thị không được để trống' }, 400);

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

    return c.json({ success: true, data: updatedUser });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

authRouter.post('/register', async (c) => {
  try {
    const { username, password, displayName, email, phone, facebook } = await c.req.json();
    if (!username || !password || !email) {
      return c.json({ success: false, error: 'Tên đăng nhập, email và mật khẩu là bắt buộc' }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return c.json({ success: false, error: 'Email không hợp lệ' }, 400);

    const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{8,})");
    if (!strongRegex.test(password)) {
      return c.json({ success: false, error: 'Mật khẩu phải từ 8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt' }, 400);
    }

    const db = getDb(c.env.DB);
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
    if (existingUser) return c.json({ success: false, error: 'Tên đăng nhập đã tồn tại' }, 400);

    const [existingEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existingEmail) return c.json({ success: false, error: 'Email này đã được đăng ký' }, 400);

    const hashedPw = await bcrypt.hash(password, 10);
    const verToken = generateToken();
    
    // In SQLite, dates can be just ISO strings. Let's not worry about verification_token_expires_at for now since it wasn't in schema
    await db.insert(users).values({
      username,
      password: hashedPw,
      displayName: displayName || username,
      email,
      phone: phone || '',
      // facebook: facebook || '', // Removed from schema.ts
      role: 'viewer',
      emailVerified: false,
      verificationToken: verToken,
    });

    // We skip sending email on registration via Resend in the worker for now to keep it simple and stateless.
    // In Phase 3, Firebase Auth handles email verification natively!

    return c.json({
      success: true,
      message: `Đăng ký thành công! Vui lòng liên hệ admin để kích hoạt tài khoản hoặc làm theo email (nếu có).`
    }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

