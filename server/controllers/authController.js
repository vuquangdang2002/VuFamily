const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { AUTH } = require('../config/constants');

class AuthController {
    static async hashPassword(password) {
        return bcrypt.hash(password, AUTH.BCRYPT_SALT_ROUNDS);
    }

    static async comparePassword(password, hash) {
        return bcrypt.compare(password, hash);
    }

    static async login(req, res) {
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

            const isMatch = await AuthController.comparePassword(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ success: false, error: 'Sai tên đăng nhập hoặc mật khẩu' });
            }

            if (user.status === 'banned') {
                return res.status(403).json({ success: false, error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' });
            }

            if (!user.email_verified) {
                return res.status(403).json({ success: false, error: 'Tài khoản chưa xác nhận email. Vui lòng kiểm tra hộp thư và click link xác nhận.' });
            }

            // Generate session token
            const token = crypto.randomBytes(32).toString('hex');
            await supabase
                .from('users')
                .update({
                    token,
                    is_online: true,
                    last_active: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
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
            console.error('[AuthController - login] Error:', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static async logout(req, res) {
        try {
            await supabase
                .from('users')
                .update({ token: null, is_online: false })
                .eq('id', req.user.id);
            res.json({ success: true, message: 'Đã đăng xuất' });
        } catch (err) {
            console.error('[AuthController - logout] Error:', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static async getMe(req, res) {
        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('id, username, display_name, email, phone, avatar, role')
                .eq('id', req.user.id)
                .single();
            
            if (error || !user) {
                return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
            }
            res.json({ success: true, data: user });
        } catch (err) {
            console.error('[AuthController - getMe] Error:', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static async ping(req, res) {
        try {
            await supabase
                .from('users')
                .update({ last_active: new Date().toISOString(), is_online: true })
                .eq('id', req.user.id);
            res.json({ success: true });
        } catch (err) {
            console.error('[AuthController - ping] Error:', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = AuthController;
