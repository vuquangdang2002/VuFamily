// ForceChangePasswordModal.jsx — Popup bắt buộc đổi mật khẩu khi admin reset password
import React, { useState } from 'react';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { useTranslation } from '../../shared/hooks/useTranslation';

export default function ForceChangePasswordModal({ isOpen, error, onSubmit }) {
    const { t } = useTranslation();
    const [newPwd, setNewPwd] = useState('');
    const [confirmNewPwd, setConfirmNewPwd] = useState('');
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSubmit(newPwd, confirmNewPwd);
    };

    return (
        <div className="modal-overlay open" style={{ zIndex: 9999 }}>
            <div className="modal" style={{ width: 400 }}>
                <div className="modal-header">
                    <h2 style={{ fontSize: 18 }}>{t('force_pwd.title')}</h2>
                </div>
                <div className="modal-body">
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                        {t('force_pwd.description')}
                        <br /><br />
                        <span style={{ color: '#eab308' }}>{t('force_pwd.hint')}</span>
                    </p>

                    {error && <div className="login-error" style={{ marginBottom: 12 }}>⚠️ {error}</div>}

                    <div style={{ marginBottom: 12, position: 'relative' }}>
                        <input className="form-input" type={showNewPwd ? "text" : "password"} placeholder={t('force_pwd.new_placeholder')}
                            value={newPwd} onChange={e => setNewPwd(e.target.value)} autoFocus style={{ paddingRight: 40 }} />
                        <button type="button" onClick={() => setShowNewPwd(!showNewPwd)}
                            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.6, padding: 4 }}>
                            {showNewPwd ? '🙈' : '👁️'}
                        </button>
                    </div>
                    <div style={{ marginBottom: 16, position: 'relative' }}>
                        <input className="form-input" type={showConfirmPwd ? "text" : "password"} placeholder={t('force_pwd.confirm_placeholder')}
                            value={confirmNewPwd} onChange={e => setConfirmNewPwd(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()} style={{ paddingRight: 40 }} />
                        <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.6, padding: 4 }}>
                            {showConfirmPwd ? '🙈' : '👁️'}
                        </button>
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSubmit}>
                        {t('force_pwd.submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}
