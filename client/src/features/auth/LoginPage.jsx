import { useState } from 'react';

export default function LoginPage({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForgot, setShowForgot] = useState(false);
    const [forgotUser, setForgotUser] = useState('');
    const [forgotMsg, setForgotMsg] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await onLogin(username.trim(), password);
        } catch (err) {
            setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!forgotUser.trim()) { setForgotMsg('Vui lòng nhập tên đăng nhập'); return; }
        setForgotLoading(true);
        setForgotMsg('');
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: forgotUser.trim() })
            });
            const json = await res.json();
            setForgotMsg(json.message || json.error || 'Đã xử lý yêu cầu');
        } catch (e) { setForgotMsg('Lỗi kết nối server'); }
        setForgotLoading(false);
    };

    return (
        <div className="login-page">
            {/* Left side - Form */}
            <div className="login-left">
                <div className="login-card">
                    <div className="login-logo">
                        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                            <circle cx="28" cy="28" r="27" stroke="var(--gold)" strokeWidth="2" />
                            <text x="28" y="34" textAnchor="middle" fill="var(--gold)" fontSize="22" fontWeight="bold" fontFamily="serif">族</text>
                        </svg>
                    </div>
                    <h1 className="login-title">Gia Phả Dòng Họ</h1>
                    <p className="login-subtitle">Hệ thống quản lý gia phả</p>

                    {error && <div className="login-error">⚠️ {error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Tên đăng nhập</label>
                            <div className="input-with-icon">
                                <span className="input-icon">👤</span>
                                <input className="form-input" type="text" value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="Nhập tên đăng nhập..." autoFocus />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mật khẩu</label>
                            <div className="input-with-icon">
                                <span className="input-icon">🔒</span>
                                <input className="form-input" type={showPass ? 'text' : 'password'}
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="Nhập mật khẩu..." />
                                <button type="button" className="input-toggle" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                                    {showPass ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
                            {loading ? '⏳ Đang đăng nhập...' : '🔑 Đăng nhập'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: 12 }}>
                        <button
                            type="button"
                            onClick={() => { setShowForgot(true); setForgotUser(''); setForgotMsg(''); }}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
                        >
                            Quên mật khẩu?
                        </button>
                    </div>
                </div>

                <div className="login-footer">
                    Copyright © 2026 by DangVQ
                </div>

                {/* Forgot password modal */}
                {showForgot && (
                    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowForgot(false)}>
                        <div className="modal" style={{ width: 380 }}>
                            <div className="modal-header">
                                <h2>🔑 Quên mật khẩu</h2>
                                <button className="detail-close" onClick={() => setShowForgot(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                                    Nhập tên đăng nhập, mật khẩu mới sẽ được gửi qua email cho quản trị viên.
                                </p>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="Tên đăng nhập..."
                                    value={forgotUser}
                                    onChange={e => setForgotUser(e.target.value)}
                                    autoFocus
                                />
                                {forgotMsg && (
                                    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(37,99,235,0.1)', color: 'var(--primary)', fontSize: 13 }}>
                                        {forgotMsg}
                                    </div>
                                )}
                                <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                    <button className="btn" onClick={() => setShowForgot(false)}>Đóng</button>
                                    <button className="btn btn-primary" onClick={handleForgotPassword} disabled={forgotLoading}>
                                        {forgotLoading ? '⏳...' : '📧 Gửi yêu cầu'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right side - Image/decoration */}
            <div className="login-right">
                <div className="login-right-content">
                    <div className="login-decoration">
                        <div className="deco-circle c1"></div>
                        <div className="deco-circle c2"></div>
                        <div className="deco-circle c3"></div>
                    </div>
                    <div className="login-right-text">
                        <h2>🌳 Gìn giữ truyền thống</h2>
                        <p>Lưu giữ và kết nối các thế hệ trong gia đình, từ quá khứ đến tương lai.</p>
                        <div className="login-features">
                            <div className="login-feature">📊 Sơ đồ gia phả trực quan</div>
                            <div className="login-feature">🔒 Bảo mật thông tin</div>
                            <div className="login-feature">📱 Truy cập mọi thiết bị</div>
                            <div className="login-feature">📷 Lưu trữ hình ảnh</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
