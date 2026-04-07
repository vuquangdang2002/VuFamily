import { useState, useEffect, useRef } from 'react';

function getToken() {
    try { return JSON.parse(localStorage.getItem('vuFamilyAuth') || '{}').token || ''; }
    catch { return ''; }
}

export default function ProfileModal({ isOpen, onClose, user, onUpdateUser, onAddToast }) {
    const [activeTab, setActiveTab] = useState('info');

    // Info fields
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [avatar, setAvatar] = useState('');         // current saved URL
    const [avatarPreview, setAvatarPreview] = useState(''); // local preview (blob URL)
    const [avatarFile, setAvatarFile] = useState(null);    // File object to upload
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const fileInputRef = useRef(null);

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
            setAvatarPreview('');
            setAvatarFile(null);
            setActiveTab('info');
            setCurrentPwd(''); setNewPwd(''); setConfirmNewPwd('');
            setPwdError('');
        }
    }, [isOpen, user]);

    // Cleanup blob URL on unmount / change
    useEffect(() => {
        return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); };
    }, [avatarPreview]);

    if (!isOpen) return null;

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            onAddToast('Vui lòng chọn file ảnh (JPG, PNG, WebP...)', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            onAddToast('Ảnh quá lớn. Giới hạn 5MB.', 'error');
            return;
        }
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(URL.createObjectURL(file));
        setAvatarFile(file);
    };

    const infoChanged =
        displayName !== (user?.displayName || user?.display_name || user?.username || '') ||
        email !== (user?.email || '') ||
        phone !== (user?.phone || '') ||
        !!avatarFile;

    const handleUpdateInfo = async () => {
        if (!displayName.trim()) { onAddToast('Tên hiển thị không được để trống', 'error'); return; }
        setLoadingInfo(true);
        try {
            let finalAvatarUrl = avatar;

            // 1. Upload avatar nếu có file mới
            if (avatarFile) {
                setUploadingAvatar(true);
                const uploadRes = await fetch('/api/auth/avatar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': avatarFile.type,
                        'x-auth-token': getToken(),
                    },
                    body: avatarFile,
                });
                setUploadingAvatar(false);
                const uploadData = await uploadRes.json();
                if (!uploadData.success) throw new Error(uploadData.error || 'Upload ảnh thất bại');
                finalAvatarUrl = uploadData.url;
            }

            // 2. Cập nhật profile
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({
                    displayName: displayName.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    avatar: finalAvatarUrl,
                })
            });
            const data = await res.json();
            if (data.success) {
                onUpdateUser(data.data);
                setAvatar(finalAvatarUrl);
                setAvatarFile(null);
                if (avatarPreview) { URL.revokeObjectURL(avatarPreview); setAvatarPreview(''); }
                onAddToast('Cập nhật thông tin thành công!');
            } else {
                onAddToast(data.error || 'Cập nhật thất bại', 'error');
            }
        } catch (e) {
            onAddToast(e.message || 'Lỗi kết nối khi cập nhật', 'error');
        } finally {
            setLoadingInfo(false);
            setUploadingAvatar(false);
        }
    };

    const handleChangePassword = async () => {
        setPwdError('');
        if (!currentPwd || !newPwd || !confirmNewPwd) { setPwdError('Vui lòng điền đầy đủ các trường mật khẩu'); return; }
        const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{8,})");
        if (!strongRegex.test(newPwd)) { setPwdError('Mật khẩu yếu. Yêu cầu: ≥8 ký tự, chữ Hoa, chữ thường, số, ký tự đặc biệt (!@#$).'); return; }
        if (newPwd !== confirmNewPwd) { setPwdError('Mật khẩu mới không khớp'); return; }
        setLoadingPwd(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
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

    const displayedAvatar = avatarPreview || avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'U')}&background=3B6FCF&color=fff&size=96`;

    return (
        <div className="modal-overlay open" style={{ zIndex: 9999 }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ width: 480 }}>
                {/* Header */}
                <div className="modal-header" style={{ padding: '20px 24px 0', borderBottom: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        {/* Clickable avatar */}
                        <div
                            style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                            onClick={() => fileInputRef.current?.click()}
                            title="Nhấp để thay đổi ảnh đại diện"
                        >
                            <img
                                src={displayedAvatar}
                                alt="avatar"
                                style={{
                                    width: 56, height: 56, borderRadius: '50%', objectFit: 'cover',
                                    border: avatarFile ? '3px solid var(--accent-success)' : '3px solid var(--primary)',
                                    transition: 'all 0.2s'
                                }}
                                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'U')}&background=3B6FCF&color=fff&size=96`; }}
                            />
                            <div style={{
                                position: 'absolute', inset: 0, borderRadius: '50%',
                                background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s',
                                fontSize: 18,
                            }}
                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.style.opacity = 0}
                            >📷</div>
                            {avatarFile && (
                                <div style={{
                                    position: 'absolute', bottom: -2, right: -2, width: 18, height: 18,
                                    background: 'var(--accent-success)', borderRadius: '50%', border: '2px solid var(--bg-card)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10
                                }}>✓</div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                        />
                        <div>
                            <h2 style={{ fontSize: 17, margin: 0 }}>{displayName || user?.username}</h2>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                @{user?.username} · {user?.role === 'admin' ? '👑 Admin' : '👤 Viewer'}
                            </span>
                            {avatarFile && (
                                <div style={{ fontSize: 11, color: 'var(--accent-success)', marginTop: 2 }}>
                                    📷 Ảnh mới: {avatarFile.name} ({(avatarFile.size / 1024).toFixed(0)}KB)
                                </div>
                            )}
                        </div>
                    </div>
                    <button className="detail-close" onClick={onClose}>✕</button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 20px', marginTop: 16 }}>
                    {[['info', '👤 Thông tin'], ['password', '🔑 Mật khẩu']].map(([key, label]) => (
                        <button key={key} onClick={() => setActiveTab(key)} style={{
                            padding: '10px 16px', background: 'none', border: 'none',
                            borderBottom: activeTab === key ? '2px solid var(--primary)' : '2px solid transparent',
                            marginBottom: -1, color: activeTab === key ? 'var(--primary)' : 'var(--text-muted)',
                            cursor: 'pointer', fontWeight: activeTab === key ? 700 : 500,
                            fontSize: 13, transition: 'all 200ms'
                        }}>{label}</button>
                    ))}
                </div>

                <div className="modal-body">
                    {/* ── INFO TAB ── */}
                    {activeTab === 'info' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="form-group">
                                <label className="form-label">Tên đăng nhập</label>
                                <input className="form-input" value={user?.username || ''} disabled style={{ opacity: 0.55, cursor: 'not-allowed' }} />
                                <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>Tên đăng nhập không thể thay đổi</small>
                            </div>
                            <div className="form-group">
                                <label className="form-label">✏️ Tên hiển thị *</label>
                                <input className="form-input" type="text" value={displayName}
                                    onChange={e => setDisplayName(e.target.value)} placeholder="Nguyễn Văn A..." autoFocus />
                            </div>
                            <div className="form-group">
                                <label className="form-label">📧 Email</label>
                                <input className="form-input" type="email" value={email}
                                    onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">📞 Số điện thoại</label>
                                <input className="form-input" type="tel" value={phone}
                                    onChange={e => setPhone(e.target.value)} placeholder="0901 234 567" />
                            </div>

                            {/* Avatar hint */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 14px', background: 'var(--bg-primary)',
                                borderRadius: 10, border: '1px dashed var(--border-subtle)',
                                cursor: 'pointer'
                            }} onClick={() => fileInputRef.current?.click()}>
                                <span style={{ fontSize: 24 }}>📷</span>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                                        {avatarFile ? `Đã chọn: ${avatarFile.name}` : 'Thay đổi ảnh đại diện'}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {avatarFile
                                            ? `${(avatarFile.size / 1024).toFixed(0)}KB — Nhấp để chọn file khác`
                                            : 'Nhấp để chọn ảnh từ máy tính (JPG, PNG, WebP — tối đa 5MB)'}
                                    </div>
                                </div>
                                {avatarFile && (
                                    <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}
                                        onClick={e => { e.stopPropagation(); setAvatarFile(null); if (avatarPreview) { URL.revokeObjectURL(avatarPreview); setAvatarPreview(''); } }}>
                                        ✕
                                    </button>
                                )}
                            </div>

                            <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <button className="btn" onClick={onClose}>Hủy</button>
                                <button className="btn btn-primary" onClick={handleUpdateInfo}
                                    disabled={loadingInfo || !infoChanged}>
                                    {uploadingAvatar ? '☁️ Đang upload ảnh...' : loadingInfo ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
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
                            <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#a16207' }}>
                                ⚠️ Yêu cầu: ít nhất 8 ký tự, gồm chữ <b>Hoa</b>, chữ thường, số và ký tự đặc biệt (!@#$...)
                            </div>
                            <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
