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
            data: { id: user.id, username: user.username, displayName: user.display_name, role: user.role, token }
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
        data: { id: req.user.id, username: req.user.username, displayName: req.user.display_name, role: req.user.role }
    });
}

// ─── User Management (Admin only) ───

async function getUsers(req, res) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, display_name, role, created_at, updated_at')
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
    deleteUser,
    changePassword
};
