import { useState, useEffect } from 'react';

export default function ProfileModal({ isOpen, onClose, user, onUpdateUser, onAddToast }) {
    const [activeTab, setActiveTab] = useState('info');

    // Info fields
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [avatar, setAvatar] = useState('');
    const [loadingInfo, setLoadingInfo] = useState(false);

    // Password
    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmNewPwd, setConfirmNewPwd] = useState('');
    const [showPwds, setShowPwds] = useState(false);
    const [loadingPwd, setLoadingPwd] = useState(false);
    const [pwdError, setPwdError] = useState('');

    useEffect(() => {
        if (isOpen && user) {
            setDisplayName(user.displayName || user.display_name || user.username || '');
            setEmail(user.email || '');
            setPhone(user.phone || '');
            setAvatar(user.avatar || '');
            setActiveTab('info');
            setCurrentPwd('');
            setNewPwd('');
            setConfirmNewPwd('');
            setPwdError('');
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const infoChanged = 
        displayName !== (user?.displayName || user?.display_name || user?.username || '') ||
        email !== (user?.email || '') ||
        phone !== (user?.phone || '') ||
        avatar !== (user?.avatar || '');

    const handleUpdateInfo = async () => {
        if (!displayName.trim()) {
            onAddToast('Tên hiển thị không được để trống', 'error');
            return;
        }
        setLoadingInfo(true);
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': user.token },
                body: JSON.stringify({
                    displayName: displayName.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    avatar: avatar.trim(),
                })
            });
            const data = await res.json();
            if (data.success) {
                onUpdateUser(data.data);
                onAddToast('Cập nhật thông tin thành công!');
            } else {
                onAddToast(data.error || 'Cập nhật thất bại', 'error');
            }
        } catch (e) {
            onAddToast('Lỗi kết nối khi cập nhật', 'error');
        } finally {
            setLoadingInfo(false);
        }
    };

    const handleChangePassword = async () => {
        setPwdError('');
        if (!currentPwd || !newPwd || !confirmNewPwd) {
            setPwdError('Vui lòng điền đầy đủ các trường mật khẩu');
            return;
        }
        const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{8,})");
        if (!strongRegex.test(newPwd)) {
            setPwdError('Mật khẩu yếu. Yêu cầu: ≥8 ký tự, chữ Hoa, chữ thường, số, ký tự đặc biệt (!@#$).');
            return;
        }
        if (newPwd !== confirmNewPwd) {
            setPwdError('Mật khẩu mới không khớp');
            return;
        }
        setLoadingPwd(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': user.token },
                body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd })
            });
            const data = await res.json();
            if (data.success) {
                onAddToast('Đổi mật khẩu thành công!');
                setCurrentPwd(''); setNewPwd(''); setConfirmNewPwd('');
            } else {
                setPwdError(data.error || 'Đổi mật khẩu thất bại');
            }
        } catch (e) {
            setPwdError('Lỗi kết nối khi đổi mật khẩu');
        } finally {
            setLoadingPwd(false);
        }
    };

    const avatarSrc = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'U')}&background=3B6FCF&color=fff&size=96`;

    return (
        <div className="modal-overlay open" style={{ zIndex: 9999 }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ width: 480 }}>
                {/* Header */}
                <div className="modal-header" style={{ padding: '20px 24px 0', borderBottom: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ position: 'relative' }}>
                            <img
                                src={avatarSrc}
                                alt="avatar"
                                style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', background: 'var(--bg-primary)' }}
                                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'U')}&background=3B6FCF&color=fff&size=96`; }}
                            />
                            <span style={{ position: 'absolute', bottom: 0, right: 0, fontSize: 12, background: 'var(--primary)', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</span>
                        </div>
                        <div>
                            <h2 style={{ fontSize: 17, margin: 0 }}>{displayName || user?.username}</h2>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{user?.username} · {user?.role === 'admin' ? '👑 Admin' : '👤 Viewer'}</span>
                        </div>
                    </div>
                    <button className="detail-close" onClick={onClose}>✕</button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 20px', marginTop: 16 }}>
                    {[['info', '👤 Thông tin'], ['password', '🔑 Mật khẩu']].map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            style={{
                                padding: '10px 16px', background: 'none', border: 'none',
                                borderBottom: activeTab === key ? '2px solid var(--primary)' : '2px solid transparent',
                                marginBottom: -1,
                                color: activeTab === key ? 'var(--primary)' : 'var(--text-muted)',
                                cursor: 'pointer', fontWeight: activeTab === key ? 700 : 500,
                                fontSize: 13, transition: 'all 200ms'
                            }}
                        >{label}</button>
                    ))}
                </div>

                <div className="modal-body">
                    {/* ── INFO TAB ── */}
                    {activeTab === 'info' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Display Name */}
                            <div className="form-group">
                                <label className="form-label">Tên đăng nhập</label>
                                <input className="form-input" value={user?.username || ''} disabled style={{ opacity: 0.55, cursor: 'not-allowed' }} />
                                <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Tên đăng nhập không thể thay đổi</small>
                            </div>

                            <div className="form-group">
                                <label className="form-label">✏️ Tên hiển thị *</label>
                                <input className="form-input" type="text" value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    placeholder="Nguyễn Văn A..." autoFocus />
                            </div>

                            <div className="form-group">
                                <label className="form-label">📧 Email</label>
                                <input className="form-input" type="email" value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="email@example.com" />
                            </div>

                            <div className="form-group">
                                <label className="form-label">📞 Số điện thoại</label>
                                <input className="form-input" type="tel" value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="0901 234 567" />
                            </div>

                            <div className="form-group">
                                <label className="form-label">🖼️ Ảnh đại diện (URL)</label>
                                <input className="form-input" type="url" value={avatar}
                                    onChange={e => setAvatar(e.target.value)}
                                    placeholder="https://..." />
                                {avatar && (
                                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <img src={avatar} alt="preview" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-subtle)' }}
                                            onError={e => { e.target.style.display = 'none'; }} />
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Xem trước ảnh đại diện</span>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <button className="btn" onClick={onClose}>Hủy</button>
                                <button className="btn btn-primary" onClick={handleUpdateInfo}
                                    disabled={loadingInfo || !infoChanged}>
                                    {loadingInfo ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── PASSWORD TAB ── */}
                    {activeTab === 'password' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {pwdError && <div className="login-error">⚠️ {pwdError}</div>}

                            <div className="form-group">
                                <label className="form-label">Mật khẩu hiện tại</label>
                                <input className="form-input" type={showPwds ? 'text' : 'password'}
                                    value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
                                    placeholder="Nhập mật khẩu hiện tại..." />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Mật khẩu mới</label>
                                <input className="form-input" type={showPwds ? 'text' : 'password'}
                                    value={newPwd} onChange={e => setNewPwd(e.target.value)}
                                    placeholder="Mật khẩu mới (≥8 ký tự)..." />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Nhập lại mật khẩu mới</label>
                                <input className="form-input" type={showPwds ? 'text' : 'password'}
                                    value={confirmNewPwd} onChange={e => setConfirmNewPwd(e.target.value)}
                                    placeholder="Nhập lại mật khẩu mới..."
                                    onKeyDown={e => e.key === 'Enter' && handleChangePassword()} />
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <input type="checkbox" checked={showPwds} onChange={e => setShowPwds(e.target.checked)} />
                                Hiện mật khẩu
                            </label>

                            <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#a16207' }}>
                                ⚠️ Yêu cầu: ít nhất 8 ký tự, bao gồm chữ <b>Hoa</b>, chữ thường, số và ký tự đặc biệt (!@#$...)
                            </div>

                            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <button className="btn" onClick={onClose}>Hủy</button>
                                <button className="btn btn-primary" onClick={handleChangePassword} disabled={loadingPwd}>
                                    {loadingPwd ? '⏳ Đang đổi...' : '🔑 Đổi mật khẩu'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
