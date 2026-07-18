import React, { useState, useEffect } from 'react';
import loginHero from '../../assets/login-hero.png';
import { useTranslation } from '../../shared/hooks/useTranslation.js';
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, Loader2, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './styles/LoginPage.css';

export default function LoginPage({ onLogin, verifyMsg, initialRegisterMode = false, onGoBack }) {
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Forgot password
    const [showForgot, setShowForgot] = useState(false);
    const [forgotUser, setForgotUser] = useState('');
    const [forgotMsg, setForgotMsg] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    // Registration state
    const [isRegisterMode, setIsRegisterMode] = useState(initialRegisterMode);
    useEffect(() => {
        setIsRegisterMode(initialRegisterMode);
    }, [initialRegisterMode]);
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
                    setError(json.error || t('login.error_register_fail'));
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
            setError(err.message || t('login.error_login_fail'));
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!forgotUser.trim()) { setForgotMsg(t('login.error_forgot_username')); return; }
        setForgotLoading(true);
        setForgotMsg('');
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: forgotUser.trim() })
            });
            const json = await res.json();
            setForgotMsg(json.message || json.error || t('login.forgot_processed'));
        } catch (e) { setForgotMsg(t('login.error_connection')); }
        setForgotLoading(false);
    };

    return (
        <div className="login-container">
            {/* Background Effects */}
            <div className="login-bg-layer">
                <img src={loginHero} alt="Background" className="login-bg-img" />
                <div className="login-bg-gradient"></div>
                
                {/* Accent Glows */}
                <div className="login-glow-orange"></div>
                <div className="login-glow-red"></div>
            </div>

            {/* Main Content */}
            <div className="login-card-wrapper">
                {onGoBack && (
                    <button
                        type="button"
                        onClick={onGoBack}
                        className="fixed top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium z-50"
                    >
                        <ArrowLeft size={16} />
                        Quay lại trang chủ
                    </button>
                )}

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="login-card"
                >
                    {/* Header */}
                    <div className="flex flex-col items-center" style={{ marginBottom: '32px' }}>
                        <div className="relative" style={{ marginBottom: '16px' }}>
                            <div className="absolute inset-0 bg-[#fe6e00]/30 blur-xl rounded-full"></div>
                            <div className="login-logo-container group">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#fe6e00]/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                                <img src="/logo.png" alt="Vu Gia Logo" className="w-14 h-14 object-contain relative z-10 drop-shadow-[0_0_12px_rgba(254,110,0,0.8)]" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ marginBottom: '8px' }}>
                            {isRegisterMode ? t('login.create_account') : t('login.title')}
                        </h1>
                        <p className="text-sm text-zinc-400 text-center max-w-[280px]">
                            {isRegisterMode ? t('login.register_member') : t('login.sub')}
                        </p>
                    </div>

                    {/* Alerts */}
                    <AnimatePresence mode="wait">
                        {verifyMsg && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className={`login-alert ${verifyMsg.success ? 'login-alert-success' : 'login-alert-error'}`}
                            >
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span>{verifyMsg.text}</span>
                            </motion.div>
                        )}
                        
                        {registerSuccess && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="login-alert login-alert-success"
                            >
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span dangerouslySetInnerHTML={{ __html: registerSuccess }} />
                            </motion.div>
                        )}

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="login-alert login-alert-error"
                            >
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Forgot Password Panel */}
                    <AnimatePresence>
                        {showForgot && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden" style={{ marginBottom: '24px' }}
                            >
                                <div className="p-5 bg-black/40 border border-white/5 rounded-xl flex flex-col gap-4">
                                    <p className="text-sm text-zinc-300">{t('login.forgot_hint')}</p>
                                    <div className="login-input-wrapper">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                                            <User size={16} />
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder={t('login.forgot_placeholder')} 
                                            value={forgotUser} 
                                            onChange={e => setForgotUser(e.target.value)} 
                                            className="login-input"
                                        />
                                    </div>
                                    {forgotMsg && <div className="text-sm text-[#fe6e00]">{forgotMsg}</div>}
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={handleForgotPassword} 
                                            disabled={forgotLoading}
                                            className="flex-1 bg-white text-black font-semibold rounded-lg py-2 text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50"
                                        >
                                            {forgotLoading ? t('login.forgot_sending') : t('login.forgot_submit')}
                                        </button>
                                        <button 
                                            onClick={() => setShowForgot(false)}
                                            className="flex-1 bg-transparent border border-white/20 text-white font-medium rounded-lg py-2 text-sm hover:bg-white/5 transition-colors"
                                        >
                                            {t('action.cancel')}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Main Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {isRegisterMode && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-zinc-400 ml-1">{t('login.fullname')}</label>
                                <div className="login-input-wrapper">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                                        <User size={18} />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={displayName} 
                                        onChange={e => setDisplayName(e.target.value)} 
                                        placeholder="Nguyễn Văn A" 
                                        className="login-input"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-zinc-400 ml-1">
                                <span className="text-red-400 mr-1">*</span>{t('login.username')}
                            </label>
                            <div className="login-input-wrapper">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder={t('login.username')}
                                    className="login-input"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {isRegisterMode && (
                            <>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-zinc-400 ml-1">
                                        <span className="text-red-400 mr-1">*</span>Email
                                    </label>
                                    <div className="login-input-wrapper">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                                            <Mail size={18} />
                                        </div>
                                        <input 
                                            type="email" 
                                            value={email} 
                                            onChange={e => setEmail(e.target.value)} 
                                            placeholder="email@example.com" 
                                            className="login-input"
                                        />
                                    </div>
                                    <p className="text-[11px] text-zinc-500 ml-1" style={{ marginTop: '4px' }}>{t('login.email_hint')}</p>
                                </div>
                                
                                <div className="flex flex-col gap-1.5">
                                    <label className="flex items-center justify-between text-xs font-medium text-zinc-400 ml-1">
                                        <span>{t('login.phone')}</span>
                                        <span className="text-zinc-600 font-normal">{t('login.optional')}</span>
                                    </label>
                                    <div className="login-input-wrapper">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                                            <Phone size={18} />
                                        </div>
                                        <input 
                                            type="tel" 
                                            value={phone} 
                                            onChange={e => setPhone(e.target.value)} 
                                            placeholder="0912345678" 
                                            className="login-input"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-1.5">
                                    <label className="flex items-center justify-between text-xs font-medium text-zinc-400 ml-1">
                                        <span>{t('login.facebook')}</span>
                                        <span className="text-zinc-600 font-normal">{t('login.optional')}</span>
                                    </label>
                                    <div className="login-input-wrapper">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                                            <LinkIcon size={18} />
                                        </div>
                                        <input 
                                            type="url" 
                                            value={facebook} 
                                            onChange={e => setFacebook(e.target.value)} 
                                            placeholder="https://facebook.com/..." 
                                            className="login-input"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="flex flex-col gap-1.5">
                            <div className="px-1">
                                <label className="text-xs font-medium text-zinc-400">
                                    <span className="text-red-400 mr-1">*</span>{t('login.password')}
                                </label>
                            </div>
                            <div className="login-input-wrapper">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder={t('login.password')}
                                    className="login-input pr-12"
                                />
                                <button 
                                    type="button" 
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                                    onClick={() => setShowPass(!showPass)}
                                    tabIndex={-1}
                                >
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {isRegisterMode ? (
                                <p className="text-[11px] text-zinc-500 ml-1" style={{ marginTop: '4px' }}>{t('login.password_hint')}</p>
                            ) : (
                                <div className="flex justify-end px-1" style={{ marginTop: '4px' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => { setShowForgot(!showForgot); setForgotMsg(''); }}
                                        className="text-[11px] text-[#fe6e00] hover:text-orange-400 transition-colors font-medium"
                                    >
                                        {t('login.forgot_password')}
                                    </button>
                                </div>
                            )}
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="login-btn-primary"
                            style={{ marginTop: '24px' }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" /> 
                                    {isRegisterMode ? t('login.signing_up') : t('login.signing_in')}
                                </>
                            ) : (
                                isRegisterMode ? t('login.sign_up') : t('login.sign_in')
                            )}
                        </button>
                    </form>

                    {/* Separator */}
                    <div className="relative flex items-center" style={{ margin: '24px 0' }}>
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="flex-shrink-0 mx-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('login.or')}</span>
                        <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    {/* Toggle Mode */}
                    <button 
                        type="button" 
                        onClick={() => { setIsRegisterMode(!isRegisterMode); setError(''); setShowForgot(false); }}
                        className="login-btn-secondary"
                    >
                        {isRegisterMode ? t('login.sign_in') : t('login.create_new_account')}
                    </button>
                </motion.div>

                {/* Footer Links */}
                <div className="flex justify-center gap-6 text-xs font-medium text-zinc-500" style={{ marginTop: '32px' }}>
                    <a href="#" className="hover:text-zinc-300 transition-colors">{t('login.about_us')}</a>
                    <a href="#" className="hover:text-zinc-300 transition-colors">{t('login.contact')}</a>
                    <a href="#" className="hover:text-zinc-300 transition-colors">{t('login.guide')}</a>
                </div>
                <p className="text-center text-xs text-zinc-600" style={{ marginTop: '16px' }}>Copyright © 2026 by DangVQ</p>
            </div>
        </div>
    );
}
