// Authentication & Authorization Middleware — Supabase version
const { supabase } = require('../../database/supabase');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const SALT_ROUNDS = 10;

async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

// Auth middleware - check session token
async function authenticate(req, res, next) {
    const token = req.headers['x-auth-token'] || req.query.token;
    if (!token) {
        return res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('token', token)
            .single();

        if (error || !user) {
            return res.status(401).json({ success: false, error: 'Phiên đăng nhập không hợp lệ' });
        }

        req.user = user;
        next();
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// Optional auth
async function optionalAuth(req, res, next) {
    const token = req.headers['x-auth-token'] || req.query.token;
    if (!token) return next();

    try {
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('token', token)
            .single();
        if (user) req.user = user;
    } catch (err) { /* silently fail */ }
    next();
}

// Admin-only middleware
function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, error: 'Chỉ Admin mới có quyền thực hiện' });
    }
}

// ─── Auth Controller ───

async function login(req, res) {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !user) {
            return res.status(401).json({ success: false, error: 'Sai tên đăng nhập hoặc mật khẩu' });
        }

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Sai tên đăng nhập hoặc mật khẩu' });
        }

        // Generate session token
        const token = crypto.randomBytes(32).toString('hex');
        await supabase
            .from('users')
            .update({ token, updated_at: new Date().toISOString() })
            .eq('id', user.id);

        res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                displayName: user.display_name,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                role: user.role,
                token
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function logout(req, res) {
    try {
        await supabase
            .from('users')
            .update({ token: null })
            .eq('id', req.user.id);
        res.json({ success: true, message: 'Đã đăng xuất' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function getMe(req, res) {
    res.json({
        success: true,
        data: { id: req.user.id, username: req.user.username, displayName: req.user.display_name, email: req.user.email, phone: req.user.phone, avatar: req.user.avatar, role: req.user.role }
    });
}

async function updateProfile(req, res) {
    try {
        const { displayName, email, phone, avatar } = req.body;
        if (!displayName) return res.status(400).json({ success: false, error: 'Tên hiển thị không được để trống' });

        const { data, error } = await supabase
            .from('users')
            .update({ display_name: displayName, email: email || '', phone: phone || '', avatar: avatar || '', updated_at: new Date().toISOString() })
            .eq('id', req.user.id)
            .select('id, username, display_name, email, phone, avatar, role')
            .single();

        if (error) throw error;

        res.json({ success: true, data: { id: data.id, username: data.username, displayName: data.display_name, email: data.email, phone: data.phone, avatar: data.avatar, role: data.role } });
    } catch (err) {
        console.error('[DangVQ Log] [API: updateProfile] Error:', err.message);
        res.status(500).json({ success: false, error: err.message || 'Lỗi cập nhật thông tin cá nhân' });
    }
}

// ─── User Management (Admin only) ───

async function getUsers(req, res) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, display_name, email, phone, avatar, role, created_at, updated_at')
            .order('id');
        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function createUser(req, res) {
    const { username, password, displayName, role } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Tên đăng nhập và mật khẩu là bắt buộc' });
    }

    try {
        // Check duplicate
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        if (existing) {
            return res.status(400).json({ success: false, error: 'Tên đăng nhập đã tồn tại' });
        }

        const hashedPw = await hashPassword(password);
        const { error } = await supabase
            .from('users')
            .insert({
                username,
                password: hashedPw,
                display_name: displayName || username,
                role: role || 'viewer',
            });
        if (error) throw error;

        res.status(201).json({ success: true, message: 'Đã tạo tài khoản' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function register(req, res) {
    const { username, password, displayName } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Tên đăng nhập và mật khẩu là bắt buộc' });
    }

    // Validate strong password
    const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{8,})");
    if (!strongRegex.test(password)) {
        return res.status(400).json({ success: false, error: 'Mật khẩu phải từ 8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt' });
    }

    try {
        // Check duplicate
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        if (existing) {
            return res.status(400).json({ success: false, error: 'Tên đăng nhập đã tồn tại' });
        }

        const hashedPw = await hashPassword(password);
        const { error } = await supabase
            .from('users')
            .insert({
                username,
                password: hashedPw,
                display_name: displayName || username,
                role: 'viewer', // Always viewer
            });
        if (error) throw error;

        res.status(201).json({ success: true, message: 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function updateUser(req, res) {
    const userId = req.params.id;
    const { displayName, role, email, phone, avatar } = req.body;

    if (!displayName || !role) {
        return res.status(400).json({ success: false, error: 'Tên hiển thị và quyền là bắt buộc' });
    }

    try {
        const { error } = await supabase
            .from('users')
            .update({ display_name: displayName, role, email: email || '', phone: phone || '', avatar: avatar || '', updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) throw error;
        res.json({ success: true, message: 'Cập nhật tài khoản thành công' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function deleteUser(req, res) {
    try {
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ success: false, error: 'Không thể xóa chính mình' });
        }
        const { error } = await supabase.from('users').delete().eq('id', parseInt(req.params.id));
        if (error) throw error;
        res.json({ success: true, message: 'Đã xóa tài khoản' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

async function changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ mật khẩu' });
    }

    try {
        const { data: user } = await supabase
            .from('users')
            .select('password')
            .eq('id', req.user.id)
            .single();

        const isMatch = await comparePassword(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Mật khẩu hiện tại không đúng' });
        }

        const newHash = await hashPassword(newPassword);
        await supabase
            .from('users')
            .update({ password: newHash, updated_at: new Date().toISOString() })
            .eq('id', req.user.id);

        res.json({ success: true, message: 'Đã đổi mật khẩu' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// Admin reset password for any user
async function resetPassword(req, res) {
    const { newPassword } = req.body;
    const userId = parseInt(req.params.id);
    if (!newPassword) {
        return res.status(400).json({ success: false, error: 'Mật khẩu mới là bắt buộc' });
    }

    try {
        const newHash = await hashPassword(newPassword);
        const { error } = await supabase
            .from('users')
            .update({ password: newHash, updated_at: new Date().toISOString() })
            .eq('id', userId);
        if (error) throw error;
        res.json({ success: true, message: 'Đã đặt lại mật khẩu' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

// Forgot password - send temp password to admin email
async function forgotPassword(req, res) {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ success: false, error: 'Vui lòng nhập tên đăng nhập' });
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, display_name')
            .eq('username', username)
            .single();

        if (error || !user) {
            return res.status(404).json({ success: false, error: 'Tài khoản không tồn tại' });
        }

        // Generate random temp password
        const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 chars
        const hashedPw = await hashPassword(tempPassword);
        await supabase
            .from('users')
            .update({ password: hashedPw, updated_at: new Date().toISOString() })
            .eq('id', user.id);

        // Send email via Resend
        const RESEND_KEY = process.env.RESEND_API_KEY;
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'vuquangdang2002@gmail.com';
        const APP_URL = process.env.APP_URL || 'https://vu-family.vercel.app';

        if (RESEND_KEY) {
            const { Resend } = require('resend');
            const resend = new Resend(RESEND_KEY);
            await resend.emails.send({
                from: 'Gia Phả <onboarding@resend.dev>',
                to: [ADMIN_EMAIL],
                subject: `[Gia Phả] Đặt lại mật khẩu - ${user.username}`,
                html: `
                    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px">
                        <h2 style="color:#1e293b;margin-bottom:8px">🏛️ Gia Phả - Dòng Họ Vũ</h2>
                        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
                        <p style="color:#475569">Tài khoản <strong>${user.display_name || user.username}</strong> (<code>${user.username}</code>) đã yêu cầu đặt lại mật khẩu.</p>
                        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
                            <p style="margin:0 0 4px;color:#64748b;font-size:13px">Mật khẩu tạm thời:</p>
                            <p style="margin:0;font-size:24px;font-weight:700;color:#2563eb;letter-spacing:2px">${tempPassword}</p>
                        </div>
                        <div style="text-align:center;margin:20px 0">
                            <a href="${APP_URL}?resetUser=${user.username}&resetPw=${tempPassword}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
                                🔑 Đăng nhập tự động
                            </a>
                        </div>
                        <p style="color:#ef4444;font-size:13px;text-align:center">⚠️ Vui lòng đổi mật khẩu ngay sau khi đăng nhập!</p>
                        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
                        <p style="color:#94a3b8;font-size:11px;text-align:center">Email tự động từ hệ thống Gia Phả. Không trả lời email này.</p>
                    </div>
                `,
            });
            res.json({ success: true, message: 'Mật khẩu mới đã được gửi qua email cho quản trị viên. Vui lòng liên hệ admin để nhận mật khẩu.' });
        } else {
            // No email key configured - just return success with password hint for admin
            res.json({ success: true, message: 'Mật khẩu đã được đặt lại. Vui lòng liên hệ quản trị viên để nhận mật khẩu mới.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

module.exports = {
    hashPassword,
    comparePassword,
    authenticate,
    optionalAuth,
    requireAdmin,
    login,
    logout,
    getMe,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    changePassword,
    resetPassword,
    forgotPassword,
    updateProfile,
    register
};

