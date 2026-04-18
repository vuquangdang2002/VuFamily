import { useState } from 'react';

export default function LoginPage({ onLogin, verifyMsg }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForgot, setShowForgot] = useState(false);
    const [forgotUser, setForgotUser] = useState('');
    const [forgotMsg, setForgotMsg] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    // Registration state
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [facebook, setFacebook] = useState('');
    const [registerSuccess, setRegisterSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isRegisterMode) {
            if (!username.trim() || !password.trim()) {
                setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
                return;
            }
            setLoading(true);
            setError('');
            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username.trim(),
                        password,
                        displayName: displayName.trim(),
                        email: email.trim(),
                        phone: phone.trim(),
                        facebook: facebook.trim()
                    })
                });
                const json = await res.json();
                if (json.success) {
                    setIsRegisterMode(false);
                    setError('');
                    setRegisterSuccess(json.message);
                } else {
                    setError(json.error || 'Đăng ký thất bại');
                }
            } catch (err) {
                setError('Lỗi kết nối server');
            } finally {
                setLoading(false);
            }
            return;
        }

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
        <div className="lp-root">
            <style>{`
                .lp-root {
                    min-height: 100vh;
                    background: #F9FAFB;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                }
                .lp-card {
                    background: #fff;
                    border-radius: 20px;
                    box-shadow: 0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
                    padding: 40px 36px 32px;
                    width: 100%;
                    max-width: 420px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .lp-icon { width: 56px; height: 56px; margin-bottom: 20px; }
                .lp-title {
                    font-family: 'Playfair Display', serif;
                    font-size: 26px; font-weight: 700; color: #111827;
                    margin: 0 0 6px; text-align: center;
                }
                .lp-subtitle { font-size: 14px; color: #6B7280; margin: 0 0 24px; text-align: center; }
                .lp-error {
                    width: 100%; background: #FEF2F2; border: 1px solid #FECACA;
                    border-radius: 10px; padding: 10px 14px; color: #DC2626;
                    font-size: 13px; margin-bottom: 16px;
                }
                .lp-form { width: 100%; display: flex; flex-direction: column; gap: 16px; }
                .lp-field { display: flex; flex-direction: column; gap: 6px; }
                .lp-label { font-size: 13px; font-weight: 500; color: #374151; }
                .lp-input-wrap { position: relative; }
                .lp-input {
                    width: 100%; padding: 11px 14px;
                    border: 1.5px solid #E5E7EB; border-radius: 10px;
                    font-size: 14px; color: #111827; background: #fff; outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    font-family: 'Inter', sans-serif;
                }
                .lp-input:focus { border-color: #111827; box-shadow: 0 0 0 3px rgba(17,24,39,0.06); }
                .lp-input-hint { font-size: 11px; color: #9CA3AF; margin-top: 4px; }
                .lp-eye {
                    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                    background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 0; display: flex;
                }
                .lp-forgot-btn {
                    background: none; border: none; color: #F59E0B; cursor: pointer;
                    font-size: 13px; font-weight: 500; padding: 0; font-family: 'Inter', sans-serif;
                }
                .lp-btn-primary {
                    width: 100%; padding: 13px; background: #111827; color: #fff;
                    border: none; border-radius: 12px; font-size: 15px; font-weight: 600;
                    cursor: pointer; font-family: 'Inter', sans-serif;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    transition: background 0.2s, transform 0.1s; margin-top: 4px;
                }
                .lp-btn-primary:hover { background: #1F2937; }
                .lp-btn-primary:active { transform: scale(0.98); }
                .lp-btn-primary:disabled { background: #9CA3AF; cursor: not-allowed; }
                .lp-or {
                    display: flex; align-items: center; gap: 12px;
                    color: #9CA3AF; font-size: 12px; font-weight: 500; letter-spacing: 0.05em;
                    margin: 12px 0; width: 100%;
                }
                .lp-or::before, .lp-or::after { content: ''; flex: 1; height: 1px; background: #E5E7EB; }
                .lp-btn-outline {
                    width: 100%; padding: 12px; background: transparent; color: #374151;
                    border: 1.5px solid #E5E7EB; border-radius: 12px; font-size: 14px; font-weight: 500;
                    cursor: pointer; font-family: 'Inter', sans-serif;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    transition: background 0.15s, border-color 0.15s;
                }
                .lp-btn-outline:hover { background: #F9FAFB; border-color: #D1D5DB; }
                .lp-footer { font-size: 12px; color: #9CA3AF; margin-top: 20px; text-align: center; }
                .lp-forgot-panel {
                    width: 100%; background: #F9FAFB; border: 1px solid #E5E7EB;
                    border-radius: 12px; padding: 16px;
                    display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;
                }
                .lp-forgot-panel p { font-size: 13px; color: #6B7280; margin: 0; }
                .lp-forgot-msg { font-size: 13px; color: #059669; background: #ECFDF5; border-radius: 8px; padding: 8px 12px; }
            `}</style>

            <div className="lp-card">
                <div className="lp-icon">
                    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                        <circle cx="28" cy="28" r="27" stroke="#D4AF37" strokeWidth="2" />
                        <text x="28" y="34" textAnchor="middle" fill="#D4AF37" fontSize="22" fontWeight="bold" fontFamily="serif">族</text>
                    </svg>
                </div>

                <h1 className="lp-title">{isRegisterMode ? 'Tạo tài khoản' : 'Gia Phả Dòng Họ'}</h1>
                <p className="lp-subtitle">
                    {isRegisterMode ? 'Đăng ký tài khoản thành viên dòng họ' : 'Đăng nhập để quản lý & đóng góp thông tin'}
                </p>

                {/* Email verification result banner */}
                {verifyMsg && (
                    <div style={{
                        width: '100%', borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                        background: verifyMsg.success ? '#ECFDF5' : '#FEF2F2',
                        border: `1px solid ${verifyMsg.success ? '#A7F3D0' : '#FECACA'}`,
                        color: verifyMsg.success ? '#065F46' : '#DC2626',
                        fontSize: 13
                    }}>
                        {verifyMsg.success ? '✅ ' : '❌ '}{verifyMsg.text}
                    </div>
                )}

                {/* Register success banner */}
                {registerSuccess && (
                    <div style={{
                        width: '100%', borderRadius: 10, padding: '12px 14px', marginBottom: 16,
                        background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: 13
                    }} dangerouslySetInnerHTML={{ __html: '📧 ' + registerSuccess }} />
                )}

                {error && <div className="lp-error">{error}</div>}

                {showForgot && (
                    <div className="lp-forgot-panel">
                        <p>Nhập tên đăng nhập để quản trị viên gửi mật khẩu mới qua email.</p>
                        <input className="lp-input" type="text" placeholder="Tên đăng nhập..." value={forgotUser} onChange={e => setForgotUser(e.target.value)} autoFocus />
                        {forgotMsg && <div className="lp-forgot-msg">{forgotMsg}</div>}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="lp-btn-primary" style={{ flex: 1 }} onClick={handleForgotPassword} disabled={forgotLoading}>
                                {forgotLoading ? '⏳ Đang gửi...' : '📧 Gửi yêu cầu'}
                            </button>
                            <button className="lp-btn-outline" style={{ flex: 1 }} onClick={() => setShowForgot(false)}>Hủy</button>
                        </div>
                    </div>
                )}

                <form className="lp-form" onSubmit={handleSubmit}>
                    {isRegisterMode && (
                        <div className="lp-field">
                            <label className="lp-label">Họ tên</label>
                            <input className="lp-input" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Nguyễn Văn A" />
                        </div>
                    )}

                    <div className="lp-field">
                        <label className="lp-label">{isRegisterMode ? 'Tên đăng nhập' : 'Tên đăng nhập'}</label>
                        <input
                            className="lp-input"
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder={isRegisterMode ? 'ten_dang_nhap' : 'Nhập tên đăng nhập...'}
                            autoFocus
                        />
                    </div>

                    {isRegisterMode && (
                        <>
                            <div className="lp-field">
                                <label className="lp-label">Email <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    className="lp-input"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="email@example.com"
                                />
                                <p className="lp-input-hint">Link xác nhận sẽ được gửi đến email này.</p>
                            </div>

                            <div className="lp-field">
                                <label className="lp-label">Số điện thoại <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(Tùy chọn)</span></label>
                                <input
                                    className="lp-input"
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="0912345678"
                                />
                            </div>

                            <div className="lp-field">
                                <label className="lp-label">Link Facebook <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>(Tùy chọn)</span></label>
                                <input
                                    className="lp-input"
                                    type="url"
                                    value={facebook}
                                    onChange={e => setFacebook(e.target.value)}
                                    placeholder="https://facebook.com/..."
                                />
                            </div>
                        </>
                    )}
                    <div className="lp-field">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="lp-label">Mật khẩu</label>
                            {!isRegisterMode && (
                                <button type="button" className="lp-forgot-btn" onClick={() => { setShowForgot(!showForgot); setForgotMsg(''); }}>
                                    Quên mật khẩu?
                                </button>
                            )}
                        </div>
                        <div className="lp-input-wrap">
                            <input
                                className="lp-input"
                                type={showPass ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{ paddingRight: 40 }}
                            />
                            <button type="button" className="lp-eye" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                                {showPass
                                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                }
                            </button>
                        </div>
                        {isRegisterMode && <p className="lp-input-hint">Tối thiểu 8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt.</p>}
                    </div>

                    <button className="lp-btn-primary" type="submit" disabled={loading}>
                        {loading
                            ? (isRegisterMode ? '⏳ Đang đăng ký...' : '⏳ Đang đăng nhập...')
                            : (isRegisterMode
                                ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>Đăng ký</>
                                : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>Đăng nhập</>
                            )
                        }
                    </button>
                </form>

                <div className="lp-or">HOẶC</div>

                <button type="button" className="lp-btn-outline" onClick={() => { setIsRegisterMode(!isRegisterMode); setError(''); setShowForgot(false); }}>
                    {isRegisterMode
                        ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>Đăng nhập</>
                        : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>Tạo tài khoản mới</>
                    }
                </button>

                <p className="lp-footer">Copyright © 2026 by DangVQ</p>
            </div>
        </div>
    );
}
