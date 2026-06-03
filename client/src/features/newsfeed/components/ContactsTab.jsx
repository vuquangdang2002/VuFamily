import React, { useState } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { localApi } from '../../../shared/services/api';

import iconZalo from '../../../assets/icons/icon_zalo.png';
import iconFacebook from '../../../assets/icons/icon_facebook.png';
import iconMessenger from '../../../assets/icons/icon_messenger.png';

const BRAND_ICONS = { zalo: iconZalo, facebook: iconFacebook, messenger: iconMessenger };
const CONTACT_LABELS = { zalo: 'Zalo', facebook: 'Facebook', messenger: 'Messenger' };

const BrandIcon = ({ type, size = 36 }) => (
    <img src={BRAND_ICONS[type]} alt={type} width={size} height={size} style={{ borderRadius: 8 }} />
);

function generateQR(text, size = 200) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}

export default function ContactsTab({ isAdmin, addToast }) {
    const { t } = useTranslation();
    const [contacts, setContacts] = useState(() => localApi.getContacts());
    const [editingContact, setEditingContact] = useState(null);
    const [editUrl, setEditUrl] = useState('');
    const [qrModal, setQrModal] = useState(null);

    const handleStartEdit = (c) => {
        setEditingContact(c.id);
        setEditUrl(c.url || '');
    };

    const handleSaveUrl = (c) => {
        localApi.updateContact(c.id, { ...c, url: editUrl });
        setContacts(localApi.getContacts());
        setEditingContact(null);
        addToast(t('profile.toast_update_success'));
    };

    return (
        <div className="nf-contacts-section">
            <div className="nf-contacts-grid">
                {contacts.map(c => (
                    <div key={c.id} className="nf-contact-card">
                        <div className="nf-contact-icon-wrap">
                            <BrandIcon type={c.type} size={40} />
                        </div>
                        <div className="nf-contact-info">
                            <div className="nf-contact-type">{CONTACT_LABELS[c.type] || c.type}</div>
                            <div className="nf-contact-name">{c.name}</div>
                            {editingContact === c.id ? (
                                <div className="nf-contact-edit-row">
                                    <input
                                        className="form-input"
                                        value={editUrl}
                                        onChange={e => setEditUrl(e.target.value)}
                                        placeholder={t('newsfeed.enter_link')}
                                        autoFocus
                                        style={{ fontSize: 12, padding: '4px 8px', marginTop: 4 }}
                                    />
                                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                        <button className="btn btn-primary btn-sm" onClick={() => handleSaveUrl(c)}>{t('newsfeed.save')}</button>
                                        <button className="btn btn-sm" onClick={() => setEditingContact(null)}>{t('newsfeed.cancel')}</button>
                                    </div>
                                </div>
                            ) : (
                                c.url && <div className="nf-contact-url">{c.url}</div>
                            )}
                        </div>
                        <div className="nf-contact-actions">
                            {c.url ? (
                                <>
                                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
                                        {t('newsfeed.open')}
                                    </a>
                                    <button className="btn btn-sm" onClick={() => setQrModal(c)}>
                                        {t('newsfeed.qr')}
                                    </button>
                                </>
                            ) : (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('newsfeed.no_contacts')}</span>
                            )}
                            {isAdmin && editingContact !== c.id && (
                                <button className="btn btn-sm" onClick={() => handleStartEdit(c)}>{t('newsfeed.edit_link_btn')}</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* QR Code Modal */}
            {qrModal && (
                <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setQrModal(null)}>
                    <div className="modal" style={{ width: 340, textAlign: 'center' }}>
                        <div className="modal-header">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BrandIcon type={qrModal.type} size={24} />
                                {qrModal.name}
                            </h2>
                            <button className="detail-close" onClick={() => setQrModal(null)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                            <img src={generateQR(qrModal.url)} alt="QR Code"
                                style={{ width: 200, height: 200, borderRadius: 12, border: '1px solid var(--border-subtle)' }} />
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', wordBreak: 'break-all' }}>{qrModal.url}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('newsfeed.scan_qr')}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
