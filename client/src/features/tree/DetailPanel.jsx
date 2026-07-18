// DetailPanel.jsx — Panel chi tiết thông tin thành viên gia phả (đã localize)
import { useState, useEffect } from 'react';
import { localApi, formatDate } from '../../shared/services/api';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';

export default function DetailPanel({ member, members, isOpen, onClose, onEdit, onDelete, onAddChild, onAddSpouse, onRefresh, isAdmin, onSelfEdit }) {
    const { t } = useTranslation();
    const [achievements, setAchievements] = useState([]);

    useEffect(() => {
        if (member) { setAchievements(localApi.getAchievements(member.id)); } else { setAchievements([]); }
    }, [member]);

    // ── Lookup dữ liệu gia đình ──
    const CATEGORY_LABELS = {
        education: t('detail.cat_education'), work: t('detail.cat_work'),
        social: t('detail.cat_social'), award: t('detail.cat_award'), other: t('detail.cat_other')
    };

    const spouse = member.spouseId ? members.find(m => m.id === member.spouseId) : null;
    let children = members.filter(m => m.parentId === member.id);
    if (spouse) { members.filter(m => m.parentId === spouse.id).forEach(sc => { if (!children.find(c => c.id === sc.id)) children.push(sc); }); }
    children.sort((a, b) => (a.birthOrder || 99) - (b.birthOrder || 99));
    const parent = member.parentId ? members.find(m => m.id === member.parentId) : null;

    const birthDisplay = member.birthDate ? formatDate(member.birthDate) : t('detail.unknown');
    const birthTimeDisplay = member.birthTime ? ` ${t('detail.at')} ${member.birthTime}` : '';
    let deathDisplay = '';
    if (member.deathDate) {
        deathDisplay = formatDate(member.deathDate);
        if (member.deathDateLunar) deathDisplay += ` (ÂL: ${member.deathDateLunar})`;
    }

    // ── Label con thứ mấy ──
    const childLabel = (() => {
        if (!parent) return '';
        const orderNum = member.birthOrder || 0;
        const typeStr = member.childType === 'adopted' ? ` (${t('detail.adopted').toLowerCase()})` : '';
        if (orderNum) {
            return `${t('detail.children')} #${orderNum} — ${parent.name}${typeStr}`;
        }
        return `${t('detail.children')} — ${parent.name}${typeStr}`;
    })();

    const handleDeleteAch = (achId) => {
        if (!isAdmin) return;
        if (confirm(t('detail.delete_confirm'))) { localApi.deleteAchievement(achId); setAchievements(localApi.getAchievements(member.id)); }
    };

    return (
        <AnimatePresence>
        {isOpen && member && (
        <motion.div 
            className="detail-panel"
            initial={{ opacity: 0, x: 100, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: 100, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
            <div className="detail-header">
                <h3>{t('detail.title')}</h3>
                <button className="detail-close" onClick={onClose}>✕</button>
            </div>

            <div className="detail-content">
                {/* Member photo */}
                {member.photo && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                        <img src={member.photo} alt={member.name}
                            style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--gold)', boxShadow: 'var(--shadow-glow)' }} />
                    </div>
                )}
                <div className="detail-name">{member.name}</div>
                <div className={`detail-gender ${member.gender === 1 ? 'male' : 'female'}`}>{member.gender === 1 ? t('detail.male') : t('detail.female')}</div>
                {member.occupation && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, marginTop: 4 }}>💼 {member.occupation}</div>}
                {childLabel && <div style={{ fontSize: 13, color: 'var(--gold)', marginBottom: 4 }}>{childLabel}</div>}
                <div className="detail-years">
                    {deathDisplay ? `${birthDisplay} — ${deathDisplay}` : birthDisplay !== t('detail.unknown') ? `${t('detail.born')} ${birthDisplay}${birthTimeDisplay}` : ''}
                </div>

                {/* ── Thông tin cá nhân ── */}
                <div className="detail-section">
                    <div className="detail-section-title">{t('detail.personal_info')}</div>
                    <div className="detail-field"><div className="detail-field-label">{t('detail.birth_date')}</div><div className="detail-field-value">{birthDisplay}{birthTimeDisplay}</div></div>
                    {member.deathDate && (<>
                        <div className="detail-field"><div className="detail-field-label">{t('detail.death_date_solar')}</div><div className="detail-field-value">{formatDate(member.deathDate)}</div></div>
                        {member.deathDateLunar && <div className="detail-field"><div className="detail-field-label">{t('detail.death_date_lunar')}</div><div className="detail-field-value" style={{ color: 'var(--gold)' }}>🌙 {member.deathDateLunar}</div></div>}
                        {member.deathPlace && <div className="detail-field"><div className="detail-field-label">{t('detail.death_place')}</div><div className="detail-field-value">{member.deathPlace}</div></div>}
                    </>)}
                    <div className="detail-field"><div className="detail-field-label">{t('detail.hometown')}</div><div className="detail-field-value">{member.birthPlace || t('detail.unknown')}</div></div>
                    <div className="detail-field"><div className="detail-field-label">{t('detail.generation')}</div><div className="detail-field-value">{member.generation ? `${t('detail.generation_nth')} ${member.generation}` : t('detail.unknown')}</div></div>
                    {member.address && <div className="detail-field"><div className="detail-field-label">{t('detail.address')}</div><div className="detail-field-value">{member.address}</div></div>}
                    {(member.phone || member.email) && <div className="detail-field"><div className="detail-field-label">{t('detail.contact')}</div><div className="detail-field-value">{member.phone && <div>📞 <a href={`tel:${member.phone}`} className="contact-link">{member.phone}</a></div>}{member.email && <div>✉️ <a href={`mailto:${member.email}`} className="contact-link">{member.email}</a></div>}</div></div>}
                    {member.note && <div className="detail-field"><div className="detail-field-label">{t('detail.note')}</div><div className="detail-field-value">{member.note}</div></div>}
                </div>

                {/* ── Quan hệ gia đình ── */}
                <div className="detail-section">
                    <div className="detail-section-title">{t('detail.family_relations')}</div>
                    <div className="detail-field"><div className="detail-field-label">{t('detail.parent')}</div><div className="detail-field-value">{parent ? parent.name : t('detail.none')}</div></div>
                    {member.birthOrder && parent && <div className="detail-field"><div className="detail-field-label">{t('detail.birth_order')}</div><div className="detail-field-value">#{member.birthOrder} {member.childType === 'adopted' ? `(${t('detail.adopted')})` : `(${t('detail.biological')})`}</div></div>}
                    <div className="detail-field"><div className="detail-field-label">{t('detail.spouse')}</div><div className="detail-field-value">{spouse ? spouse.name : t('detail.not_yet')}</div></div>
                    <div className="detail-field">
                        <div className="detail-field-label">{t('detail.children')} ({children.length})</div>
                        <div className="detail-field-value">
                            {children.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {children.map(c => (
                                        <div key={c.id} style={{ fontSize: 13 }}>
                                            {c.birthOrder ? `${c.birthOrder}. ` : '• '}{c.name}
                                            {c.childType === 'adopted' && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>({t('detail.adopted').toLowerCase()})</span>}
                                        </div>
                                    ))}
                                </div>
                            ) : t('detail.none')}
                        </div>
                    </div>
                </div>

                {/* ── Thành tích ── */}
                {achievements.length > 0 && (
                    <div className="detail-section">
                        <div className="detail-section-title">{t('detail.achievements')}</div>
                        {achievements.map(a => (
                            <div key={a.id} className="detail-field" style={{ position: 'relative' }}>
                                <div className="detail-field-label">
                                    {CATEGORY_LABELS[a.category] || a.category}
                                    {a.startYear && <span style={{ marginLeft: 8, color: 'var(--gold)' }}>({a.startYear}{a.endYear ? ` - ${a.endYear}` : ` - ${t('detail.present')}`})</span>}
                                </div>
                                <div className="detail-field-value" style={{ fontWeight: 500 }}>{a.title}</div>
                                {a.organization && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{a.organization}</div>}
                                {a.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{a.description}</div>}
                                {isAdmin && <button onClick={() => handleDeleteAch(a.id)} style={{ position: 'absolute', top: 10, right: 0, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }} title={t('action.delete')}>✕</button>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Action Buttons ── */}
            {isAdmin ? (
                <div className="detail-actions">
                    {onEdit && <button className="btn" onClick={() => onEdit(member.id)}>{t('detail.btn_edit')}</button>}
                    {onDelete && <button className="btn btn-danger" onClick={() => onDelete(member.id)}>{t('detail.btn_delete')}</button>}
                    {onAddChild && <button className="btn" onClick={() => onAddChild(member.id)}>{t('detail.btn_add_child')}</button>}
                    {!spouse && onAddSpouse && <button className="btn" onClick={() => onAddSpouse(member.id)}>{t('detail.btn_add_spouse')}</button>}
                </div>
            ) : (
                <div className="detail-actions">
                    {onSelfEdit && <button className="btn" onClick={() => onSelfEdit(member.id)}>{t('detail.btn_self_edit')}</button>}
                </div>
            )}
        </motion.div>
        )}
        </AnimatePresence>
    );
}
