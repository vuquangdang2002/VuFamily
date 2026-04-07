import { useState, useEffect } from 'react';
import { localApi, formatDate } from '../../shared/services/api';

const CATEGORY_LABELS = { education: '🎓 Học tập', work: '💼 Công tác', social: '🏅 Đoàn thể', award: '🏆 Giải thưởng', other: '📌 Khác' };
const CHILD_TYPE_LABELS = { biological: 'Con đẻ', adopted: 'Con nuôi' };
const ORDER_LABELS = { 1: 'Trưởng', 2: 'Thứ hai', 3: 'Thứ ba', 4: 'Thứ tư', 5: 'Thứ năm', 6: 'Thứ sáu', 7: 'Thứ bảy', 8: 'Thứ tám', 9: 'Thứ chín', 10: 'Thứ mười' };

function childLabel(member, parent) {
    if (!parent) return '';
    const order = member.birthOrder ? (ORDER_LABELS[member.birthOrder] || `Thứ ${member.birthOrder}`) : '';
    const type = member.childType === 'adopted' ? ' (con nuôi)' : '';
    return order ? `Con ${order.toLowerCase()} của ${parent.name}${type}` : `Con của ${parent.name}${type}`;
}

export default function DetailPanel({ member, members, isOpen, onClose, onEdit, onDelete, onAddChild, onAddSpouse, onRefresh, isAdmin, onSelfEdit }) {
    const [achievements, setAchievements] = useState([]);

    useEffect(() => {
        if (member) { setAchievements(localApi.getAchievements(member.id)); } else { setAchievements([]); }
    }, [member]);

    if (!member) return null;

    const spouse = member.spouseId ? members.find(m => m.id === member.spouseId) : null;
    let children = members.filter(m => m.parentId === member.id);
    if (spouse) { members.filter(m => m.parentId === spouse.id).forEach(sc => { if (!children.find(c => c.id === sc.id)) children.push(sc); }); }
    children.sort((a, b) => (a.birthOrder || 99) - (b.birthOrder || 99));
    const parent = member.parentId ? members.find(m => m.id === member.parentId) : null;

    const birthDisplay = member.birthDate ? formatDate(member.birthDate) : 'Chưa rõ';
    const birthTimeDisplay = member.birthTime ? ` lúc ${member.birthTime}` : '';
    let deathDisplay = '';
    if (member.deathDate) {
        deathDisplay = formatDate(member.deathDate);
        if (member.deathDateLunar) deathDisplay += ` (ÂL: ${member.deathDateLunar})`;
    }

    const childInfo = childLabel(member, parent);

    const handleDeleteAch = (achId) => {
        if (!isAdmin) return;
        if (confirm('Xóa thành tích này?')) { localApi.deleteAchievement(achId); setAchievements(localApi.getAchievements(member.id)); }
    };

    return (
        <div className={`detail-panel ${isOpen ? 'open' : ''}`}>
            <div className="detail-header">
                <h3>Thông tin thành viên</h3>
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
                <div className={`detail-gender ${member.gender === 1 ? 'male' : 'female'}`}>{member.gender === 1 ? '👨 Nam' : '👩 Nữ'}</div>
                {member.occupation && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, marginTop: 4 }}>💼 {member.occupation}</div>}
                {childInfo && <div style={{ fontSize: 13, color: 'var(--gold)', marginBottom: 4 }}>{childInfo}</div>}
                <div className="detail-years">
                    {deathDisplay ? `${birthDisplay} — ${deathDisplay}` : birthDisplay !== 'Chưa rõ' ? `Sinh ${birthDisplay}${birthTimeDisplay}` : ''}
                </div>

                <div className="detail-section">
                    <div className="detail-section-title">Thông tin cá nhân</div>
                    <div className="detail-field"><div className="detail-field-label">Ngày sinh</div><div className="detail-field-value">{birthDisplay}{birthTimeDisplay}</div></div>
                    {member.deathDate && (<>
                        <div className="detail-field"><div className="detail-field-label">Ngày mất (Dương lịch)</div><div className="detail-field-value">{formatDate(member.deathDate)}</div></div>
                        {member.deathDateLunar && <div className="detail-field"><div className="detail-field-label">Ngày mất (Âm lịch)</div><div className="detail-field-value" style={{ color: 'var(--gold)' }}>🌙 {member.deathDateLunar}</div></div>}
                        {member.deathPlace && <div className="detail-field"><div className="detail-field-label">Nơi mất</div><div className="detail-field-value">{member.deathPlace}</div></div>}
                    </>)}
                    <div className="detail-field"><div className="detail-field-label">Quê quán</div><div className="detail-field-value">{member.birthPlace || 'Chưa rõ'}</div></div>
                    <div className="detail-field"><div className="detail-field-label">Đời thứ</div><div className="detail-field-value">{member.generation ? `Đời thứ ${member.generation}` : 'Chưa rõ'}</div></div>
                    {member.address && <div className="detail-field"><div className="detail-field-label">Địa chỉ</div><div className="detail-field-value">{member.address}</div></div>}
                    {(member.phone || member.email) && <div className="detail-field"><div className="detail-field-label">Liên hệ</div><div className="detail-field-value">{member.phone && <div>📞 <a href={`tel:${member.phone}`} className="contact-link">{member.phone}</a></div>}{member.email && <div>✉️ <a href={`mailto:${member.email}`} className="contact-link">{member.email}</a></div>}</div></div>}
                    {member.note && <div className="detail-field"><div className="detail-field-label">Ghi chú</div><div className="detail-field-value">{member.note}</div></div>}
                </div>

                <div className="detail-section">
                    <div className="detail-section-title">Quan hệ gia đình</div>
                    <div className="detail-field"><div className="detail-field-label">Cha/Mẹ</div><div className="detail-field-value">{parent ? parent.name : 'Không có'}</div></div>
                    {member.birthOrder && parent && <div className="detail-field"><div className="detail-field-label">Thứ tự</div><div className="detail-field-value">{ORDER_LABELS[member.birthOrder] || `Thứ ${member.birthOrder}`} {member.childType === 'adopted' ? '(Con nuôi)' : '(Con đẻ)'}</div></div>}
                    <div className="detail-field"><div className="detail-field-label">Vợ/Chồng</div><div className="detail-field-value">{spouse ? spouse.name : 'Chưa có'}</div></div>
                    <div className="detail-field">
                        <div className="detail-field-label">Con ({children.length})</div>
                        <div className="detail-field-value">
                            {children.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {children.map(c => (
                                        <div key={c.id} style={{ fontSize: 13 }}>
                                            {c.birthOrder ? `${c.birthOrder}. ` : '• '}{c.name}
                                            {c.childType === 'adopted' && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>(con nuôi)</span>}
                                        </div>
                                    ))}
                                </div>
                            ) : 'Không có'}
                        </div>
                    </div>
                </div>

                {achievements.length > 0 && (
                    <div className="detail-section">
                        <div className="detail-section-title">Thành tích & Hoạt động</div>
                        {achievements.map(a => (
                            <div key={a.id} className="detail-field" style={{ position: 'relative' }}>
                                <div className="detail-field-label">
                                    {CATEGORY_LABELS[a.category] || a.category}
                                    {a.startYear && <span style={{ marginLeft: 8, color: 'var(--gold)' }}>({a.startYear}{a.endYear ? ` - ${a.endYear}` : ' - nay'})</span>}
                                </div>
                                <div className="detail-field-value" style={{ fontWeight: 500 }}>{a.title}</div>
                                {a.organization && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{a.organization}</div>}
                                {a.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{a.description}</div>}
                                {isAdmin && <button onClick={() => handleDeleteAch(a.id)} style={{ position: 'absolute', top: 10, right: 0, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }} title="Xóa">✕</button>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isAdmin ? (
                <div className="detail-actions">
                    {onEdit && <button className="btn" onClick={() => onEdit(member.id)}>✏️ Sửa</button>}
                    {onDelete && <button className="btn btn-danger" onClick={() => onDelete(member.id)}>🗑 Xóa</button>}
                    {onAddChild && <button className="btn" onClick={() => onAddChild(member.id)}>👶 Thêm con</button>}
                    {!spouse && onAddSpouse && <button className="btn" onClick={() => onAddSpouse(member.id)}>💑 Thêm vợ/chồng</button>}
                </div>
            ) : (
                <div className="detail-actions">
                    {onSelfEdit && <button className="btn" onClick={() => onSelfEdit(member.id)}>✏️ Cập nhật thông tin</button>}
                </div>
            )}
        </div>
    );
}
