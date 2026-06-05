// Authentication & Authorization Middleware — Supabase version
const { supabase } = require('../config/supabase');

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

        if (user.status === 'banned') {
            return res.status(403).json({ success: false, error: 'Tài khoản của bạn đã bị khóa' });
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

// Editor or Admin middleware (for content editing operations)
function requireEditorOrAdmin(req, res, next) {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'editor')) {
        next();
    } else {
        res.status(403).json({ success: false, error: 'Bạn cần quyền Biên tập viên trở lên để thực hiện thao tác này' });
    }
}

module.exports = {
    authenticate,
    optionalAuth,
    requireAdmin,
    requireEditorOrAdmin
};
