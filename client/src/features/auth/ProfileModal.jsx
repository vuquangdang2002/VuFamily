import { useState, useEffect } from 'react';

export default function ProfileModal({ isOpen, onClose, user, onUpdateUser, onAddToast }) {
    const [activeTab, setActiveTab] = useState('info'); // 'info' or 'password'
    
    // Info
    const [displayName, setDisplayName] = useState('');
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
            setDisplayName(user.displayName || user.username || '');
            setActiveTab('info');
            setCurrentPwd('');
            setNewPwd('');
            setConfirmNewPwd('');
            setPwdError('');
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

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
                body: JSON.stringify({ displayName: displayName.trim() })
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
            setPwdError('Mật khẩu yếu. Yêu cầu: >8 ký tự, chữ Hoa, chữ thường, số, ký tự đặc biệt (!@#$).');
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
                // Reset form
                setCurrentPwd('');
                setNewPwd('');
                setConfirmNewPwd('');
            } else {
                setPwdError(data.error || 'Đổi mật khẩu thất bại');
            }
        } catch (e) {
            setPwdError('Lỗi kết nối khi đổi mật khẩu');
        } finally {
            setLoadingPwd(false);
        }
    };

    return (
        <div className="modal-overlay open" style={{ zIndex: 9999 }}>
            <div className="modal" style={{ width: 450 }}>
                <div className="modal-header">
                    <h2 style={{ fontSize: 18 }}>👤 Hồ sơ cá nhân</h2>
                    <button className="detail-close" onClick={onClose}>✕</button>
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 20px' }}>
                    <button 
                        onClick={() => setActiveTab('info')}
                        style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'info' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'info' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Thông tin
                    </button>
                    <button 
                        onClick={() => setActiveTab('password')}
                        style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'password' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'password' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Đổi mật khẩu
                    </button>
                </div>

                <div className="modal-body">
                    {activeTab === 'info' && (
                        <div>
                            <div className="form-group">
                                <label className="form-label">Tên đăng nhập</label>
                                <input className="form-input" type="text" value={user?.username || ''} disabled style={{ opacity: 0.6 }} />
                                <small style={{ color: 'var(--text-muted)' }}>Tên đăng nhập không thể thay đổi</small>
                            </div>
                            <div className="form-group" style={{ marginTop: 16 }}>
                                <label className="form-label">Tên hiển thị</label>
                                <input className="form-input" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                            </div>
                            <div style={{ marginTop: 24, textAlign: 'right' }}>
                                <button className="btn btn-primary" onClick={handleUpdateInfo} disabled={loadingInfo || displayName === user?.displayName}>
                                    {loadingInfo ? '⏳...' : '💾 Lưu thay đổi'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'password' && (
                        <div>
                            {pwdError && <div className="login-error" style={{ marginBottom: 12 }}>⚠️ {pwdError}</div>}
                            
                            <div className="form-group">
                                <label className="form-label">Mật khẩu hiện tại</label>
                                <input className="form-input" type={showPwds ? "text" : "password"} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ marginTop: 16 }}>
                                <label className="form-label">Mật khẩu mới</label>
                                <input className="form-input" type={showPwds ? "text" : "password"} value={newPwd} onChange={e => setNewPwd(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ marginTop: 16 }}>
                                <label className="form-label">Nhập lại mật khẩu mới</label>
                                <input className="form-input" type={showPwds ? "text" : "password"} value={confirmNewPwd} onChange={e => setConfirmNewPwd(e.target.value)} />
                            </div>
                            
                            <div style={{ marginTop: 12 }}>
                                <label style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 13, cursor:'pointer' }}>
                                    <input type="checkbox" checked={showPwds} onChange={e => setShowPwds(e.target.checked)} />
                                    Hiện mật khẩu
                                </label>
                            </div>

                            <div style={{ marginTop: 24, textAlign: 'right' }}>
                                <button className="btn btn-primary" onClick={handleChangePassword} disabled={loadingPwd}>
                                    {loadingPwd ? '⏳...' : '🔑 Đổi mật khẩu'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
