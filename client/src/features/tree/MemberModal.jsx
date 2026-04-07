import { useState, useEffect, useRef } from 'react';
import PhotoCropper from './PhotoCropper';

const CATEGORIES = [
    { value: 'education', label: '🎓 Học tập' },
    { value: 'work', label: '💼 Công tác' },
    { value: 'social', label: '🏅 Đoàn thể / Xã hội' },
    { value: 'award', label: '🏆 Giải thưởng / Danh hiệu' },
    { value: 'other', label: '📌 Khác' },
];

function readFileAsDataUrl(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

export default function MemberModal({ isOpen, onClose, onSubmit, editMember, parentId, spouseOfId, members }) {
    const [rawPhoto, setRawPhoto] = useState(null); // For crop flow
    const [form, setForm] = useState({
        name: '', gender: 1,
        birthDate: '', birthTime: '',
        deathDate: '', deathDateLunar: '',
        birthPlace: '', deathPlace: '',
        generation: '', note: '',
        occupation: '', phone: '', email: '', address: '',
        birthOrder: '', childType: 'biological',
        photo: '',
    });

    // Achievements sub-form
    const [achievements, setAchievements] = useState([]);
    const [showAchForm, setShowAchForm] = useState(false);
    const [achForm, setAchForm] = useState({ category: 'education', title: '', organization: '', startYear: '', endYear: '', description: '' });

    useEffect(() => {
        if (editMember) {
            setForm({
                name: editMember.name || '',
                gender: editMember.gender !== undefined ? editMember.gender : 1,
                birthDate: editMember.birthDate || '',
                birthTime: editMember.birthTime || '',
                deathDate: editMember.deathDate || '',
                birthPlace: editMember.birthPlace || '',
                deathPlace: editMember.deathPlace || '',
                generation: editMember.generation || '',
                note: editMember.note || '',
                occupation: editMember.occupation || '',
                phone: editMember.phone || '',
                email: editMember.email || '',
                address: editMember.address || '',
                birthOrder: editMember.birthOrder || '',
                childType: editMember.childType || 'biological',
                photo: editMember.photo || '',
            });
        } else {
            let gen = 1;
            let gender = 1;
            if (parentId) {
                const parent = members.find(m => m.id === parentId);
                if (parent) gen = (parent.generation || 1) + 1;
            } else if (spouseOfId) {
                const spouse = members.find(m => m.id === spouseOfId);
                if (spouse) {
                    gen = spouse.generation || 1;
                    gender = spouse.gender === 1 ? 0 : 1;
                }
            }
            setForm({
                name: '', gender, birthDate: '', birthTime: '', deathDate: '', deathDateLunar: '',
                birthPlace: '', deathPlace: '', generation: gen, note: '',
                occupation: '', phone: '', email: '', address: '',
                birthOrder: '', childType: 'biological',
                photo: '',
            });
        }
        setAchievements([]);
        setShowAchForm(false);
    }, [editMember, parentId, spouseOfId, members, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        onSubmit({
            ...form,
            generation: form.generation ? parseInt(form.generation) : 1,
            birthOrder: form.birthOrder ? parseInt(form.birthOrder) : null,
            parentId: editMember ? editMember.parentId : parentId || null,
            spouseId: editMember ? editMember.spouseId : spouseOfId || null,
            id: editMember?.id,
            newAchievements: achievements,
        });
    };

    const addAchievement = () => {
        if (!achForm.title.trim()) return;
        setAchievements([...achievements, { ...achForm, startYear: achForm.startYear ? parseInt(achForm.startYear) : null, endYear: achForm.endYear ? parseInt(achForm.endYear) : null }]);
        setAchForm({ category: 'education', title: '', organization: '', startYear: '', endYear: '', description: '' });
        setShowAchForm(false);
    };

    const removeAchievement = (idx) => {
        setAchievements(achievements.filter((_, i) => i !== idx));
    };

    const title = editMember
        ? `Sửa: ${editMember.name}`
        : spouseOfId ? 'Thêm vợ/chồng' : parentId ? 'Thêm con' : 'Thêm thành viên mới';

    const hasChanges = () => {
        if (!editMember) return true;
        if (achievements.length > 0) return true; // Though normally disabled for edit
        const skipFields = ['id', 'spouseId', 'parentId'];
        for (const k in form) {
            if (skipFields.includes(k)) continue;
            if (String(form[k] ?? '') !== String(editMember[k] ?? '')) return true;
        }
        return false;
    };

    const isSaveDisabled = !hasChanges() || !form.name.trim();

    return (
        <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxHeight: '90vh' }}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="detail-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Thông tin cơ bản */}
                        <div className="form-section-title">Thông tin cơ bản</div>

                        {/* Ảnh đại diện */}
                        <div className="form-group" style={{ textAlign: 'center' }}>
                            <label className="form-label">Ảnh đại diện</label>
                            <div className="photo-upload">
                                {form.photo ? (
                                    <div className="photo-preview">
                                        <img src={form.photo} alt="Preview" />
                                        <button type="button" className="photo-remove" onClick={() => setForm({ ...form, photo: '' })}>✕</button>
                                    </div>
                                ) : (
                                    <div className="photo-placeholder" onClick={() => document.getElementById('photoInput')?.click()}>
                                        <span style={{ fontSize: 32 }}>{form.gender === 1 ? '👨' : '👩'}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click để chọn ảnh</span>
                                    </div>
                                )}
                                <input id="photoInput" type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={async (e) => {
                                        if (e.target.files[0]) {
                                            const url = await readFileAsDataUrl(e.target.files[0]);
                                            setRawPhoto(url); // Open crop dialog
                                        }
                                        e.target.value = ''; // Reset so same file can be picked again
                                    }} />
                                {!form.photo && <button type="button" className="btn" style={{ marginTop: 8, fontSize: 12 }} onClick={() => document.getElementById('photoInput')?.click()}>📷 Chọn ảnh</button>}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Họ và tên *</label>
                            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nhập họ và tên..." required autoFocus />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Giới tính</label>
                                <select className="form-select" value={form.gender} onChange={e => setForm({ ...form, gender: parseInt(e.target.value) })}>
                                    <option value={1}>Nam</option>
                                    <option value={0}>Nữ</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Đời thứ</label>
                                <input className="form-input" type="number" min="1" value={form.generation} onChange={e => setForm({ ...form, generation: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Nghề nghiệp</label>
                            <input className="form-input" value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} placeholder="VD: Kỹ sư, Giáo viên..." />
                        </div>

                        {/* Thông tin con (chỉ hiện khi thêm/sửa con) */}
                        {(parentId || (editMember && editMember.parentId)) && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Con thứ mấy</label>
                                    <input className="form-input" type="number" min="1" value={form.birthOrder} onChange={e => setForm({ ...form, birthOrder: e.target.value })} placeholder="VD: 1, 2, 3..." />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Loại</label>
                                    <select className="form-select" value={form.childType} onChange={e => setForm({ ...form, childType: e.target.value })}>
                                        <option value="biological">Con đẻ</option>
                                        <option value="adopted">Con nuôi</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Ngày sinh */}
                        <div className="form-section-title" style={{ marginTop: 20 }}>Ngày sinh</div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Ngày/Tháng/Năm sinh</label>
                                <input className="form-input" type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Giờ sinh</label>
                                <input className="form-input" type="time" value={form.birthTime} onChange={e => setForm({ ...form, birthTime: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Nơi sinh / Quê quán</label>
                            <input className="form-input" value={form.birthPlace} onChange={e => setForm({ ...form, birthPlace: e.target.value })} placeholder="VD: Hà Nội" />
                        </div>

                        {/* Ngày mất */}
                        <div className="form-section-title" style={{ marginTop: 20 }}>Ngày mất (bỏ trống nếu còn sống)</div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Ngày mất (Dương lịch)</label>
                                <input className="form-input" type="date" value={form.deathDate} onChange={e => setForm({ ...form, deathDate: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ngày mất (Âm lịch)</label>
                                <input className="form-input" value={form.deathDateLunar} onChange={e => setForm({ ...form, deathDateLunar: e.target.value })} placeholder="VD: 13/07/Ất Mão" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Nơi mất</label>
                            <input className="form-input" value={form.deathPlace} onChange={e => setForm({ ...form, deathPlace: e.target.value })} placeholder="VD: Hà Nội" />
                        </div>

                        {/* Liên hệ */}
                        <div className="form-section-title" style={{ marginTop: 20 }}>Liên hệ</div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Số điện thoại</label>
                                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="VD: 0912345678" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="VD: ten@email.com" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Địa chỉ</label>
                            <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Địa chỉ hiện tại" />
                        </div>

                        {/* Ghi chú */}
                        <div className="form-group" style={{ marginTop: 12 }}>
                            <label className="form-label">Ghi chú</label>
                            <textarea className="form-textarea" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú thêm..." />
                        </div>

                        {/* Thành tích (chỉ khi thêm mới) */}
                        {!editMember && (
                            <>
                                <div className="form-section-title" style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span>Thành tích & Hoạt động</span>
                                    <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setShowAchForm(!showAchForm)}>
                                        {showAchForm ? '✕ Đóng' : '＋ Thêm'}
                                    </button>
                                </div>

                                {showAchForm && (
                                    <div style={{ background: 'rgba(212,175,55,0.05)', padding: 12, borderRadius: 8, marginBottom: 12, border: '1px solid var(--border-subtle)' }}>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Loại</label>
                                                <select className="form-select" value={achForm.category} onChange={e => setAchForm({ ...achForm, category: e.target.value })}>
                                                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Tên *</label>
                                                <input className="form-input" value={achForm.title} onChange={e => setAchForm({ ...achForm, title: e.target.value })} placeholder="Tên thành tích..." />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Tổ chức / Trường / Đơn vị</label>
                                            <input className="form-input" value={achForm.organization} onChange={e => setAchForm({ ...achForm, organization: e.target.value })} />
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Năm bắt đầu</label>
                                                <input className="form-input" type="number" value={achForm.startYear} onChange={e => setAchForm({ ...achForm, startYear: e.target.value })} />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Năm kết thúc</label>
                                                <input className="form-input" type="number" value={achForm.endYear} onChange={e => setAchForm({ ...achForm, endYear: e.target.value })} placeholder="Trống = đang diễn ra" />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Mô tả</label>
                                            <input className="form-input" value={achForm.description} onChange={e => setAchForm({ ...achForm, description: e.target.value })} />
                                        </div>
                                        <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={addAchievement}>Thêm thành tích</button>
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
                            </>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaveDisabled} style={{ opacity: isSaveDisabled ? 0.5 : 1, cursor: isSaveDisabled ? 'not-allowed' : 'pointer' }}>
                            {editMember ? '💾 Lưu thay đổi' : '＋ Thêm thành viên'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Photo Crop Dialog */}
            {rawPhoto && (
                <PhotoCropper
                    imageSrc={rawPhoto}
                    onCrop={(croppedUrl) => { setForm({ ...form, photo: croppedUrl }); setRawPhoto(null); }}
                    onCancel={() => setRawPhoto(null)}
                />
            )}
        </div>
    );
}
