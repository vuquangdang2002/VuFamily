import { useState } from 'react';
import loginHero from '../../assets/login-hero.png';

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
        <div className="flex w-screen h-screen bg-white dark:bg-black font-body overflow-hidden">
            {/* Left side: Form */}
            <div className="w-full lg:w-[500px] flex flex-col p-8 sm:p-12 z-10 bg-white dark:bg-black shadow-2xl relative overflow-y-auto custom-scrollbar">
                
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-12 h-12 rounded-xl bg-black dark:bg-black flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-black/20 dark:shadow-black/20">
                        🏛️
                    </div>
                    <div>
                        <h1 className="font-heading text-2xl font-bold text-black dark:text-white leading-tight">Gia Phả</h1>
                        <p className="text-sm font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase">Dòng Họ Vũ</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
                    {/* Header */}
                    <div className="mb-8 text-center sm:text-left">
                        <h2 className="font-heading text-3xl font-bold text-black dark:text-white mb-2">
                            {isRegisterMode ? 'Đăng ký tài khoản' : 'Đăng nhập'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            {isRegisterMode ? 'Điền thông tin để tham gia gia phả' : 'Chào mừng trở lại! Vui lòng nhập thông tin'}
                        </p>
                    </div>

                    {/* Messages */}
                    {verifyMsg && (
                        <div className={`p-4 mb-6 rounded-xl text-sm font-medium border ${verifyMsg.success ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
                            {verifyMsg.text}
                        </div>
                    )}
                    {registerSuccess && (
                        <div className="p-4 mb-6 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                            {registerSuccess}
                        </div>
                    )}
                    {error && (
                        <div className="p-4 mb-6 rounded-xl text-sm font-medium bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tên đăng nhập</label>
                            <input 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-black focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black dark:text-white placeholder-slate-400 outline-none"
                                value={username} onChange={e => setUsername(e.target.value)}
                                placeholder="Nhập tên đăng nhập" required 
                            />
                        </div>

                        {isRegisterMode && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Họ và tên <span className="text-rose-500">*</span></label>
                                    <input 
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-black focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black dark:text-white placeholder-slate-400 outline-none"
                                        value={displayName} onChange={e => setDisplayName(e.target.value)}
                                        placeholder="Ví dụ: Vũ Quang Đăng" required 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Số điện thoại</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-black focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black dark:text-white placeholder-slate-400 outline-none"
                                        value={phone} onChange={e => setPhone(e.target.value)}
                                        placeholder="Để liên hệ xác minh (Tùy chọn)" type="tel" 
                                    />
                                </div>
                            </>
                        )}

                        <div className="space-y-1.5 relative">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mật khẩu</label>
                            <div className="relative">
                                <input 
                                    type={showPass ? 'text' : 'password'}
                                    className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-black focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black dark:text-white placeholder-slate-400 outline-none"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••" required 
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    {showPass ? '👁️' : '🙈'}
                                </button>
                            </div>
                        </div>

                        {!isRegisterMode && (
                            <div className="flex justify-end pt-1">
                                <button type="button" onClick={() => setShowForgot(true)} className="text-sm font-medium text-black dark:text-white hover:text-gray-900 dark:hover:text-indigo-300 transition-colors">
                                    Quên mật khẩu?
                                </button>
                            </div>
                        )}

                        <button 
                            type="submit" disabled={loading}
                            className="w-full py-3.5 mt-4 bg-black hover:bg-slate-800 dark:bg-black dark:hover:bg-gray-900 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-black/10 dark:shadow-black/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                            {isRegisterMode ? 'Đăng ký ngay' : 'Đăng nhập'}
                        </button>
                    </form>

                    <div className="mt-8 text-center border-t border-slate-100 dark:border-slate-800 pt-6">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {isRegisterMode ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
                            <button 
                                type="button" 
                                onClick={() => { setIsRegisterMode(!isRegisterMode); setError(''); setRegisterSuccess(''); }} 
                                className="ml-2 font-semibold text-black dark:text-white hover:text-gray-900 dark:hover:text-indigo-300 transition-colors"
                            >
                                {isRegisterMode ? 'Đăng nhập' : 'Tạo tài khoản mới'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right side: Graphic Hero */}
            <div className="hidden lg:flex flex-1 relative bg-slate-100 dark:bg-black items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-20 dark:opacity-10" style={{ backgroundImage: `url(${loginHero})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }}></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-black/80 to-transparent dark:from-black dark:to-black/80"></div>
                
                <div className="relative z-10 p-16 max-w-2xl text-white">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-semibold mb-6">
                        Phiên bản 2.0
                    </div>
                    <h2 className="font-heading text-5xl font-bold leading-tight mb-6">
                        Gắn kết gia đình,<br/>lưu giữ cội nguồn.
                    </h2>
                    <p className="text-lg text-slate-300 leading-relaxed max-w-lg mb-12">
                        Ứng dụng Gia Phả được thiết kế thông minh, bảo mật và cực kỳ hiện đại. 
                        Truy cập cây gia phả, kết nối tin nhắn và chia sẻ sự kiện với gia đình chỉ trong một cú nhấp.
                    </p>
                    
                    <div className="flex items-center gap-8">
                        <div className="flex -space-x-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500 border-2 border-black flex items-center justify-center text-sm shadow-xl">👨</div>
                            <div className="w-12 h-12 rounded-full bg-pink-500 border-2 border-black flex items-center justify-center text-sm shadow-xl">👩</div>
                            <div className="w-12 h-12 rounded-full bg-black border-2 border-black flex items-center justify-center text-sm shadow-xl text-white font-bold">+1k</div>
                        </div>
                        <p className="text-sm font-medium text-slate-300">Được tin dùng bởi<br/><span className="text-white font-bold">hàng ngàn thành viên</span></p>
                    </div>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgot && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-heading text-xl font-bold text-black dark:text-white">Khôi phục mật khẩu</h3>
                            <button onClick={() => setShowForgot(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors">✕</button>
                        </div>
                        
                        {forgotMsg && (
                            <div className={`p-4 mb-6 rounded-xl text-sm font-medium ${forgotMsg.includes('Lỗi') ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
                                {forgotMsg}
                            </div>
                        )}

                        <div className="space-y-1.5 mb-6">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tên đăng nhập</label>
                            <input 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white focus:ring-2 focus:ring-black/20 focus:border-black transition-all text-black dark:text-white outline-none"
                                value={forgotUser} onChange={e => setForgotUser(e.target.value)}
                                placeholder="Nhập tên tài khoản của bạn"
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowForgot(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Hủy</button>
                            <button onClick={handleForgotPassword} disabled={forgotLoading} className="px-5 py-2.5 bg-black hover:bg-slate-800 dark:bg-black dark:hover:bg-gray-900 text-white rounded-xl text-sm font-semibold transition-all shadow-lg flex items-center gap-2">
                                {forgotLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Gửi yêu cầu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
