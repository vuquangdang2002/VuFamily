// MemberModal.jsx — Modal thêm/sửa thành viên gia phả (đã localize)
import { useState, useEffect, useRef } from 'react';
import { localApi } from '../../shared/services/api';
import PhotoCropper from './PhotoCropper';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { myLog, myError } from '../../shared/utils/logger';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';

function readFileAsDataUrl(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

export default function MemberModal({ isOpen, onClose, onSubmit, editMember, parentId, spouseOfId, members }) {
    const { t } = useTranslation();
    const [rawPhoto, setRawPhoto] = useState(null);
    const [form, setForm] = useState({
        name: '', gender: 1,
        birthDate: '', birthTime: '',
        deathDate: '', deathDateLunar: '',
        birthPlace: '', deathPlace: '',
        generation: '', note: '',
        occupation: '', phone: '', email: '', address: '',
        birthOrder: '', childType: 'biological',
        photo: '',
        weddingDate: '',
        parentId: '',
        spouseId: '',
    });

    const [achievements, setAchievements] = useState([]);
    const [showAchForm, setShowAchForm] = useState(false);
    const [achForm, setAchForm] = useState({ category: 'education', title: '', organization: '', startYear: '', endYear: '', description: '' });

    const CATEGORIES = [
        { value: 'education', label: t('detail.cat_education') },
        { value: 'work', label: t('detail.cat_work') },
        { value: 'social', label: t('detail.cat_social') },
        { value: 'award', label: t('detail.cat_award') },
        { value: 'other', label: t('detail.cat_other') },
    ];

    useEffect(() => {
        if (editMember) {
            setForm({
                name: editMember.name || '', gender: editMember.gender !== undefined ? editMember.gender : 1,
                birthDate: editMember.birthDate || '', birthTime: editMember.birthTime || '',
                deathDate: editMember.deathDate || '', birthPlace: editMember.birthPlace || '',
                deathPlace: editMember.deathPlace || '', generation: editMember.generation || '',
                note: editMember.note || '', occupation: editMember.occupation || '',
                phone: editMember.phone || '', email: editMember.email || '',
                address: editMember.address || '', birthOrder: editMember.birthOrder || '',
                childType: editMember.childType || 'biological', photo: editMember.photo || '',
                weddingDate: editMember.weddingDate || '',
                parentId: editMember.parentId || '',
                spouseId: editMember.spouseId || '',
            });
        } else {
            let gen = 1, gender = 1;
            if (parentId) {
                const parent = members.find(m => m.id === parentId);
                if (parent) gen = (parent.generation || 1) + 1;
            } else if (spouseOfId) {
                const spouse = members.find(m => m.id === spouseOfId);
                if (spouse) { gen = spouse.generation || 1; gender = spouse.gender === 1 ? 0 : 1; }
            }
            setForm({ name: '', gender, birthDate: '', birthTime: '', deathDate: '', deathDateLunar: '',
                birthPlace: '', deathPlace: '', generation: gen, note: '', occupation: '',
                phone: '', email: '', address: '', birthOrder: '', childType: 'biological', photo: '', weddingDate: '',
                parentId: parentId || '', spouseId: spouseOfId || '' });
        }
        if (editMember) { setAchievements(localApi.getAchievements(editMember.id) || []); }
        else { setAchievements([]); }
        setShowAchForm(false);
    }, [editMember, parentId, spouseOfId, members, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        onSubmit({
            ...form, generation: form.generation ? parseInt(form.generation) : 1,
            birthOrder: form.birthOrder ? parseInt(form.birthOrder) : null,
            parentId: form.parentId ? parseInt(form.parentId) : null,
            spouseId: form.spouseId ? parseInt(form.spouseId) : null,
            id: editMember?.id, newAchievements: achievements,
        });
    };

    const addAchievement = () => {
        if (!achForm.title.trim()) return;
        setAchievements([...achievements, { ...achForm, startYear: achForm.startYear ? parseInt(achForm.startYear) : null, endYear: achForm.endYear ? parseInt(achForm.endYear) : null }]);
        setAchForm({ category: 'education', title: '', organization: '', startYear: '', endYear: '', description: '' });
        setShowAchForm(false);
    };

    const removeAchievement = (idx) => {
        const ach = achievements[idx];
        if (ach.id && editMember) {
            if (confirm(t('member.ach_delete_confirm'))) {
                localApi.deleteAchievement(ach.id);
                setAchievements(achievements.filter((_, i) => i !== idx));
            }
        } else {
            setAchievements(achievements.filter((_, i) => i !== idx));
        }
    };

    const title = editMember
        ? `${t('member.edit_title')} ${editMember.name}`
        : spouseOfId ? t('member.add_spouse') : parentId ? t('member.add_child') : t('member.add_new');

    const hasChanges = () => {
        if (!editMember) return true;
        if (achievements.length > 0) return true;
        const skipFields = ['id', 'spouseId', 'parentId'];
        for (const k in form) {
            if (skipFields.includes(k)) continue;
            if (String(form[k] ?? '') !== String(editMember[k] ?? '')) return true;
        }
        return false;
    };

    const isSaveDisabled = !hasChanges() || !form.name.trim();

    return (
        <AnimatePresence>
        {isOpen && (
        <motion.div 
            className="modal-overlay open"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <motion.div 
                className="modal"
                style={{ maxHeight: '90vh' }}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="detail-close" onClick={onClose}>✕</button>
                </div>

                {/* Banner Hướng dẫn Quan hệ */}
                {form.parentId && (
                    <div className="relation-context-banner" style={{ background: 'rgba(234, 179, 8, 0.1)', color: 'rgb(202, 138, 4)', padding: '10px 16px', borderRadius: '1rem', margin: '12px 24px 0', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                        👶 Đang thêm con của: <strong>{members.find(m => String(m.id) === String(form.parentId))?.name || 'Chưa rõ'}</strong>
                    </div>
                )}
                {form.spouseId && (
                    <div className="relation-context-banner" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'rgb(244, 63, 94)', padding: '10px 16px', borderRadius: '1rem', margin: '12px 24px 0', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                        💍 Đang kết hôn (dâu/rể) với: <strong>{members.find(m => String(m.id) === String(form.spouseId))?.name || 'Chưa rõ'}</strong>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* ── Thông tin cơ bản ── */}
                        <div className="form-section-title">{t('member.section_basic')}</div>

                        {/* Chọn quan hệ gia đình trực tiếp */}
                        <div className="form-row" style={{ marginBottom: 16 }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600 }}>Liên kết Bố/Mẹ</label>
                                <select className="form-select" value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })}>
                                    <option value="">-- Chọn phụ huynh (nếu có) --</option>
                                    {members.filter(m => !editMember || m.id !== editMember.id).map(m => (
                                        <option key={m.id} value={m.id}>{m.name} (Đời {m.generation})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600 }}>Liên kết Vợ/Chồng</label>
                                <select className="form-select" value={form.spouseId} onChange={e => {
                                    const val = e.target.value;
                                    setForm({ ...form, spouseId: val, weddingDate: val ? form.weddingDate : '' });
                                }}>
                                    <option value="">-- Chưa kết hôn / Ly hôn --</option>
                                    {members.filter(m => !editMember || m.id !== editMember.id).map(m => (
                                        <option key={m.id} value={m.id}>{m.name} (Đời {m.generation})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group" style={{ textAlign: 'center' }}>
                            <label className="form-label">{t('member.photo_label')}</label>
                            <div className="photo-upload">
                                {form.photo ? (
                                    <div className="photo-preview">
                                        <img src={form.photo} alt="Preview" />
                                        <button type="button" className="photo-remove" onClick={() => setForm({ ...form, photo: '' })}>✕</button>
                                    </div>
                                ) : (
                                    <div className="photo-placeholder" onClick={() => document.getElementById('photoInput')?.click()}>
                                        <span style={{ fontSize: 32 }}>{form.gender === 1 ? '👨' : '👩'}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('member.photo_click')}</span>
                                    </div>
                                )}
                                <input id="photoInput" type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={async (e) => {
                                        if (e.target.files[0]) { const url = await readFileAsDataUrl(e.target.files[0]); setRawPhoto(url); }
                                        e.target.value = '';
                                    }} />
                                {!form.photo && <button type="button" className="btn" style={{ marginTop: 8, fontSize: 12 }} onClick={() => document.getElementById('photoInput')?.click()}>{t('member.photo_choose')}</button>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('member.fullname')}</label>
                            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('member.fullname_placeholder')} required autoFocus />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">{t('member.gender')}</label>
                                <select className="form-select" value={form.gender} onChange={e => setForm({ ...form, gender: parseInt(e.target.value) })}>
                                    <option value={1}>{t('member.male')}</option>
                                    <option value={0}>{t('member.female')}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('member.generation')}</label>
                                <input className="form-input" type="number" min="1" value={form.generation} onChange={e => setForm({ ...form, generation: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('member.occupation')}</label>
                            <input className="form-input" value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} placeholder={t('member.occupation_placeholder')} />
                        </div>

                        {/* Con thứ mấy */}
                        {(parentId || (editMember && editMember.parentId)) && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">{t('member.birth_order')}</label>
                                    <input className="form-input" type="number" min="1" value={form.birthOrder} onChange={e => setForm({ ...form, birthOrder: e.target.value })} placeholder={t('member.birth_order_placeholder')} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('member.child_type')}</label>
                                    <select className="form-select" value={form.childType} onChange={e => setForm({ ...form, childType: e.target.value })}>
                                        <option value="biological">{t('member.biological')}</option>
                                        <option value="adopted">{t('member.adopted')}</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* ── Ngày sinh ── */}
                        <div className="form-section-title" style={{ marginTop: 20 }}>{t('member.section_birth')}</div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">{t('member.birth_date')}</label>
                                <input className="form-input" type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('member.birth_time')}</label>
                                <input className="form-input" type="time" value={form.birthTime} onChange={e => setForm({ ...form, birthTime: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('member.birth_place')}</label>
                            <input className="form-input" value={form.birthPlace} onChange={e => setForm({ ...form, birthPlace: e.target.value })} placeholder={t('member.birth_place_placeholder')} />
                        </div>

                        {/* ── Ngày mất ── */}
                        <div className="form-section-title" style={{ marginTop: 20 }}>{t('member.section_death')}</div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">{t('member.death_date_solar')}</label>
                                <input className="form-input" type="date" value={form.deathDate} onChange={e => setForm({ ...form, deathDate: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('member.death_date_lunar')}</label>
                                <input className="form-input" value={form.deathDateLunar} onChange={e => setForm({ ...form, deathDateLunar: e.target.value })} placeholder={t('member.death_date_lunar_placeholder')} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('member.death_place')}</label>
                            <input className="form-input" value={form.deathPlace} onChange={e => setForm({ ...form, deathPlace: e.target.value })} placeholder={t('member.birth_place_placeholder')} />
                        </div>

                        {/* ── Hôn nhân ── */}
                        <div className="form-section-title" style={{ marginTop: 20 }}>{t('member.section_marriage') || 'Thông tin hôn nhân'}</div>
                        <div className="form-group">
                            <label className="form-label">{t('member.wedding_date') || 'Ngày cưới'}</label>
                            <input className="form-input" type="date" value={form.weddingDate} onChange={e => setForm({ ...form, weddingDate: e.target.value })} />
                        </div>

                        {/* ── Liên hệ ── */}
                        <div className="form-section-title" style={{ marginTop: 20 }}>{t('member.section_contact')}</div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">{t('member.phone')}</label>
                                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="VD: 0912345678" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('member.email')}</label>
                                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="VD: ten@email.com" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('member.address')}</label>
                            <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder={t('member.address_placeholder')} />
                        </div>

                        {/* Ghi chú */}
                        <div className="form-group" style={{ marginTop: 12 }}>
                            <label className="form-label">{t('member.note')}</label>
                            <textarea className="form-textarea" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder={t('member.note_placeholder')} />
                        </div>

                        {/* ── Thành tích ── */}
                        <div className="form-section-title" style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{t('member.section_achievements')}</span>
                            <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setShowAchForm(!showAchForm)}>
                                {showAchForm ? t('member.ach_close') : t('member.ach_add')}
                            </button>
                        </div>

                        {showAchForm && (
                            <div style={{ background: 'rgba(212,175,55,0.05)', padding: 12, borderRadius: 8, marginBottom: 12, border: '1px solid var(--border-subtle)' }}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">{t('member.ach_type')}</label>
                                        <select className="form-select" value={achForm.category} onChange={e => setAchForm({ ...achForm, category: e.target.value })}>
                                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">{t('member.ach_name')}</label>
                                        <input className="form-input" value={achForm.title} onChange={e => setAchForm({ ...achForm, title: e.target.value })} placeholder={t('member.ach_name_placeholder')} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('member.ach_org')}</label>
                                    <input className="form-input" value={achForm.organization} onChange={e => setAchForm({ ...achForm, organization: e.target.value })} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">{t('member.ach_start_year')}</label>
                                        <input className="form-input" type="number" value={achForm.startYear} onChange={e => setAchForm({ ...achForm, startYear: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">{t('member.ach_end_year')}</label>
                                        <input className="form-input" type="number" value={achForm.endYear} onChange={e => setAchForm({ ...achForm, endYear: e.target.value })} placeholder={t('member.ach_end_year_placeholder')} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('member.ach_desc')}</label>
                                    <input className="form-input" value={achForm.description} onChange={e => setAchForm({ ...achForm, description: e.target.value })} />
                                </div>
                                <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={addAchievement}>{t('member.ach_submit')}</button>
                            </div>
                        )}

                        {achievements.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {achievements.map((a, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: 12 }}>
                                        <span>{CATEGORIES.find(c => c.value === a.category)?.label?.split(' ')[0] || '📌'}</span>
                                        <span style={{ flex: 1, color: 'var(--text-primary)' }}>{a.title}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{a.startYear}{a.endYear ? `-${a.endYear}` : ''}</span>
                                        <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent-error)', cursor: 'pointer', fontSize: 14 }} onClick={() => removeAchievement(i)}>✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn" onClick={onClose}>{t('member.btn_cancel')}</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaveDisabled} style={{ opacity: isSaveDisabled ? 0.5 : 1, cursor: isSaveDisabled ? 'not-allowed' : 'pointer' }}>
                            {editMember ? t('member.btn_save') : t('member.btn_add')}
                        </button>
                    </div>
                </form>
            </motion.div>

            {rawPhoto && (
                <PhotoCropper
                    imageSrc={rawPhoto}
                    onCrop={(croppedUrl) => { setForm({ ...form, photo: croppedUrl }); setRawPhoto(null); }}
                    onCancel={() => setRawPhoto(null)}
                />
            )}
        </motion.div>
        )}
        </AnimatePresence>
    );
}
