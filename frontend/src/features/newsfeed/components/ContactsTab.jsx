import React, { useState } from 'react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { localApi } from '../../../shared/services/api';
import { QrCode, ExternalLink, Edit2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../../../shared/components/ui/GlassCard';
import { GlowingButton } from '../../../shared/components/ui/GlowingButton';

import iconZalo from '../../../assets/icons/icon_zalo.png';
import iconFacebook from '../../../assets/icons/icon_facebook.png';
import iconMessenger from '../../../assets/icons/icon_messenger.png';

const BRAND_ICONS = { zalo: iconZalo, facebook: iconFacebook, messenger: iconMessenger };
const CONTACT_LABELS = { zalo: 'Zalo', facebook: 'Facebook', messenger: 'Messenger' };

const BrandIcon = ({ type, size = 36 }) => (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ width: size, height: size }}>
        <img src={BRAND_ICONS[type]} alt={type} width="100%" height="100%" className="object-cover" />
    </div>
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
        if(addToast) addToast(t('profile.toast_update_success') || 'Cập nhật thành công');
    };

    return (
        <div className="flex flex-col gap-6">
            <GlassCard className="p-6 md:p-8 overflow-hidden gradient text-white border-0 bg-gradient-to-br from-blue-600 to-indigo-700">
                <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-white/20 rounded-full blur-[80px] pointer-events-none"></div>
                <h2 className="relative z-10 text-2xl md:text-3xl font-extrabold mb-2">{t('contacts.header_title') || 'Danh bạ & Liên hệ'}</h2>
                <p className="relative z-10 text-blue-100 font-medium">{t('contacts.header_desc') || 'Kết nối nhanh chóng với các kênh thông tin chính thức của dòng họ.'}</p>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                {contacts.map((c, index) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={c.id} 
                    >
                        <GlassCard className="p-5 flex flex-col gap-4 h-full" interactive={!editingContact}>
                            <div className="flex items-start gap-4">
                            <BrandIcon type={c.type} size={48} />
                            <div className="flex flex-col flex-1 min-w-0">
                                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">{CONTACT_LABELS[c.type] || c.type}</div>
                                <div className="font-extrabold text-[17px] text-zinc-900 dark:text-white truncate">{c.name}</div>
                                
                                {editingContact !== c.id && c.url && (
                                    <div className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate mt-1.5 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-md inline-block w-fit max-w-full">
                                        {c.url}
                                    </div>
                                )}
                            </div>
                        </div>

                        <AnimatePresence>
                            {editingContact === c.id && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex flex-col gap-2 overflow-hidden"
                                >
                                    <input
                                        className="w-full rounded-xl px-4 py-2.5 outline-none text-[13px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        value={editUrl}
                                        onChange={e => setEditUrl(e.target.value)}
                                        placeholder={t('newsfeed.enter_link') || 'Nhập đường dẫn liên kết'}
                                        autoFocus
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <GlowingButton 
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingContact(null)}
                                        >
                                            {t('action.cancel') || 'Hủy'}
                                        </GlowingButton>
                                        <GlowingButton 
                                            variant="primary"
                                            size="sm"
                                            onClick={() => handleSaveUrl(c)}
                                            icon={<Check size={14} />}
                                        >
                                            {t('action.save') || 'Lưu'}
                                        </GlowingButton>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {!editingContact && (
                            <div className="flex items-center gap-2 mt-auto pt-2">
                                {c.url ? (
                                    <>
                                        <GlowingButton 
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => window.open(c.url, '_blank')}
                                            icon={<ExternalLink size={14} />}
                                            className="flex-1"
                                        >
                                            {t('contacts.access') || 'Truy cập'}
                                        </GlowingButton>
                                        <GlowingButton 
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setQrModal(c)}
                                            icon={<QrCode size={14} />}
                                        >
                                            {t('contacts.qr_code') || 'Mã QR'}
                                        </GlowingButton>
                                    </>
                                ) : (
                                    <div className="flex-1 text-[13px] text-zinc-400 font-medium italic">
                                        {t('contacts.no_link') || 'Chưa có liên kết'}
                                    </div>
                                )}

                                {isAdmin && (
                                    <GlowingButton 
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleStartEdit(c)}
                                        icon={<Edit2 size={14} />}
                                        title={t('contacts.edit_link') || 'Chỉnh sửa liên kết'}
                                    />
                                )}
                            </div>
                        )}
                        </GlassCard>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {qrModal && (
                    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setQrModal(null)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 dark:border-white/10"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                                <h3 className="flex items-center gap-3 font-bold text-lg text-zinc-900 dark:text-white">
                                    <BrandIcon type={qrModal.type} size={28} />
                                    {qrModal.name}
                                </h3>
                                <button 
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-600 dark:text-zinc-400 transition-colors"
                                    onClick={() => setQrModal(null)}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            
                            <div className="p-8 flex flex-col items-center">
                                <div className="bg-white p-4 rounded-3xl shadow-sm border border-zinc-200 mb-6">
                                    <img src={generateQR(qrModal.url)} alt="QR Code" className="w-[200px] h-[200px] object-contain rounded-xl" />
                                </div>
                                
                                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 text-center font-medium px-4">
                                    Mở ứng dụng Camera hoặc Zalo để quét mã QR bên trên, truy cập nhanh {CONTACT_LABELS[qrModal.type]}.
                                </p>
                            </div>
                            
                            <div className="p-4 border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                                <a 
                                    href={qrModal.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-[15px] hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                                >
                                    Trực tiếp truy cập liên kết <ExternalLink size={16} />
                                </a>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
