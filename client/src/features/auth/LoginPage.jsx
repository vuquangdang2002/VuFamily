import { useState } from 'react';
import loginHero from '../../assets/login-hero.png';
import { useTranslation } from '../../shared/hooks/useTranslation.js';
import './Login.css';

export default function LoginPage({ onLogin, verifyMsg }) {
    const { t } = useTranslation();
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
                setError(t('login.error_missing'));
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
                setError(t('login.error_connection'));
            } finally {
                setLoading(false);
            }
            return;
        }

        if (!username.trim() || !password.trim()) {
            setError(t('login.error_missing'));
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
        } catch (e) { setForgotMsg(t('login.error_connection')); }
        setForgotLoading(false);
    };

    return (
        <div className="lp-root">
            {/* LEFT: Form */}
            <div className="lp-left">
                <div className="lp-logo">
                    <div className="lp-logo-icon">族</div>
                    <div>
                        <div className="lp-logo-text">{isRegisterMode ? t('login.create_account') : t('login.title')}</div>
                        <div className="lp-logo-sub">{isRegisterMode ? t('login.register_member') : t('login.sub')}</div>
                    </div>
                </div>

                {/* Banners */}
                {verifyMsg && (
                    <div style={{
                        borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                        background: verifyMsg.success ? '#ECFDF5' : '#FEF2F2',
                        border: `1px solid ${verifyMsg.success ? '#A7F3D0' : '#FECACA'}`,
                        color: verifyMsg.success ? '#065F46' : '#DC2626', fontSize: 13
                    }}>
                        {verifyMsg.success ? '✅ ' : '❌ '}{verifyMsg.text}
                    </div>
                )}
                {registerSuccess && (
                    <div style={{
                        borderRadius: 8, padding: '12px 14px', marginBottom: 16,
                        background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: 13
                    }} dangerouslySetInnerHTML={{ __html: '📧 ' + registerSuccess }} />
                )}
                {error && <div className="lp-error" style={{ marginBottom: 16 }}>{error}</div>}

                {showForgot && (
                    <div className="lp-forgot-panel" style={{ marginBottom: 16 }}>
                        <p>{t('login.forgot_hint')}</p>
                        <input className="lp-input" type="text" placeholder={t('login.forgot_placeholder')} value={forgotUser} onChange={e => setForgotUser(e.target.value)} autoFocus />
                        {forgotMsg && <div className="lp-forgot-msg">{forgotMsg}</div>}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="lp-btn-primary" style={{ flex: 1 }} onClick={handleForgotPassword} disabled={forgotLoading}>
                                {forgotLoading ? t('login.forgot_sending') : t('login.forgot_submit')}
                            </button>
                            <button className="lp-btn-outline" style={{ flex: 1 }} onClick={() => setShowForgot(false)}>{t('action.cancel')}</button>
                        </div>
                    </div>
                )}

                <form className="lp-form" onSubmit={handleSubmit}>
                    {isRegisterMode && (
                        <div className="lp-field">
                            <label className="lp-label">{t('login.fullname')}</label>
                            <input className="lp-input" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Nguyễn Văn A" />
                        </div>
                    )}

                    <div className="lp-field">
                        <label className="lp-label"><span className="req">*</span>{t('login.username')}</label>
                        <div className="lp-input-wrap">
                            <span className="lp-input-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </span>
                            <input
                                className="lp-input has-icon"
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder={t('login.username')}
                                autoFocus
                            />
                        </div>
                    </div>

                    {isRegisterMode && (
                        <>
                            <div className="lp-field">
                                <label className="lp-label"><span className="req">*</span>Email</label>
                                <input className="lp-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
                                <p className="lp-input-hint">{t('login.email_hint')}</p>
                            </div>
                            <div className="lp-field">
                                <label className="lp-label">{t('login.phone')} <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>{t('login.optional')}</span></label>
                                <input className="lp-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912345678" />
                            </div>
                            <div className="lp-field">
                                <label className="lp-label">{t('login.facebook')} <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}>{t('login.optional')}</span></label>
                                <input className="lp-input" type="url" value={facebook} onChange={e => setFacebook(e.target.value)} placeholder="https://facebook.com/..." />
                            </div>
                        </>
                    )}

                    <div className="lp-field">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="lp-label"><span className="req">*</span>{t('login.password')}</label>
                        </div>
                        <div className="lp-input-wrap">
                            <span className="lp-input-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            </span>
                            <input
                                className="lp-input has-icon"
                                type={showPass ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder={t('login.password')}
                                style={{ paddingRight: 42 }}
                            />
                            <button type="button" className="lp-eye" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                                {showPass
                                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                }
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                            {isRegisterMode ? (
                                <p className="lp-input-hint" style={{ margin: 0 }}>{t('login.password_hint')}</p>
                            ) : (
                                <div style={{ flex: 1 }} /> // Spacer
                            )}
                            {!isRegisterMode && (
                                <button type="button" className="lp-forgot-link" onClick={() => { setShowForgot(!showForgot); setForgotMsg(''); }}>
                                    {t('login.forgot_password')}
                                </button>
                            )}
                        </div>
                    </div>

                    <button className="lp-btn-primary" type="submit" disabled={loading}>
                        {loading
                            ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}></div> {isRegisterMode ? 'Đang đăng ký...' : 'Đang đăng nhập...'}</>
                            : (isRegisterMode ? 'Đăng ký' : 'Đăng nhập')
                        }
                    </button>
                </form>

                <div className="lp-or">{t('login.or')}</div>

                <button type="button" className="lp-btn-outline" onClick={() => { setIsRegisterMode(!isRegisterMode); setError(''); setShowForgot(false); }}>
                    {isRegisterMode ? t('login.sign_in') : t('login.create_new_account')}
                </button>

                <div className="lp-footer">
                    <a href="#">{t('login.about_us')}</a>
                    <a href="#">{t('login.contact')}</a>
                    <a href="#">{t('login.guide')}</a>
                </div>
                <p className="lp-copyright">Copyright © 2026 by DangVQ</p>
            </div>

            {/* RIGHT: Hero image */}
            <div className="lp-right">
                <img src={loginHero} alt="Gia phả dòng họ" />
                <div className="lp-right-overlay" />
            </div>
        </div>
    );
}
