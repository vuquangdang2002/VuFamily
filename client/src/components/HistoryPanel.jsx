import { useState } from 'react';
import { localApi, formatDate } from '../services/api';

const ACTION_LABELS = {
    create: { icon: '➕', text: 'Thêm mới', color: '#4CAF50' },
    update: { icon: '✏️', text: 'Cập nhật', color: '#FF9800' },
    delete: { icon: '🗑️', text: 'Xóa', color: '#f44336' },
};

// Field labels for diff view
const FIELD_LABELS = {
    name: 'Họ tên', gender: 'Giới tính', birthDate: 'Ngày sinh', birthTime: 'Giờ sinh',
    deathDate: 'Ngày mất', deathDateLunar: 'Ngày mất (ÂL)', birthPlace: 'Quê quán',
    deathPlace: 'Nơi mất', occupation: 'Nghề nghiệp', phone: 'Điện thoại',
    email: 'Email', address: 'Địa chỉ', note: 'Ghi chú', generation: 'Đời thứ',
    birthOrder: 'Con thứ', childType: 'Loại', photo: 'Ảnh',
};

function timeAgo(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return formatDate(dateStr.slice(0, 10));
}

function DiffView({ before, after }) {
    if (!before && !after) return null;
    const fields = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    const skipFields = ['id', 'spouseId', 'parentId'];
    const changed = [];
    fields.forEach(f => {
        if (skipFields.includes(f)) return;
        const bv = before?.[f] ?? '';
        const av = after?.[f] ?? '';
        if (String(bv) !== String(av)) {
            changed.push({ field: f, before: bv, after: av });
        }
    });
    if (changed.length === 0) return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Không có thay đổi</div>;
    return (
        <div className="diff-view">
            {changed.map(c => (
                <div key={c.field} className="diff-row">
                    <div className="diff-label">{FIELD_LABELS[c.field] || c.field}</div>
                    <div className="diff-values">
                        {c.field === 'photo' ? (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {c.before && <img src={c.before} alt="Trước" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #f44336' }} />}
                                <span style={{ color: 'var(--text-muted)' }}>→</span>
                                {c.after && <img src={c.after} alt="Sau" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #4CAF50' }} />}
                            </div>
                        ) : (
                            <>
                                {c.before && <span className="diff-old">{String(c.before)}</span>}
                                <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                                <span className="diff-new">{String(c.after) || '(trống)'}</span>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function HistoryPage({ isAdmin, user, onRefresh, addToast }) {
    const [allHistory] = useState(() => localApi.getEditHistory());
    const [expandedId, setExpandedId] = useState(null);

    // Admin sees all history, viewer sees only their own edits
    const history = isAdmin
        ? allHistory
        : allHistory.filter(e => e.editedBy === user?.username);

    const handleRevert = (entry) => {
        const actionText = entry.action === 'create' ? `xóa "${entry.memberName}" (hoàn tác thêm mới)`
            : entry.action === 'delete' ? `khôi phục "${entry.memberName}"`
                : `hoàn tác thay đổi của "${entry.memberName}"`;
        if (!confirm(`Bạn có chắc muốn ${actionText}?\n\nThao tác này sẽ được ghi lại trong lịch sử.`)) return;

        const result = localApi.revertHistory(entry.id, user);
        addToast(result.message, result.success ? 'success' : 'error');
        if (result.success && onRefresh) onRefresh();
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>{isAdmin ? '📜 Lịch sử chỉnh sửa' : '📜 Lịch sử của tôi'}</h2>
                <p className="page-subtitle">Theo dõi các thay đổi dữ liệu gia phả</p>
            </div>
            <div className="page-body">
                    {history.length === 0 ? (
                        <div className="empty-state">
                            <span style={{ fontSize: 40 }}>📭</span>
                            <p>Chưa có lịch sử chỉnh sửa nào.</p>
                        </div>
                    ) : (
                        <div className="history-timeline">
                            {history.map(entry => {
                                const action = ACTION_LABELS[entry.action] || ACTION_LABELS.update;
                                const isExpanded = expandedId === entry.id;
                                return (
                                    <div key={entry.id} className={`history-entry ${entry.action}`}>
                                        <div className="history-entry-header" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                                            <div className="history-entry-icon" style={{ color: action.color }}>{action.icon}</div>
                                            <div className="history-entry-info">
                                                <div className="history-entry-title">
                                                    <strong>{action.text}</strong> — {entry.memberName}
                                                </div>
                                                <div className="history-entry-meta">
                                                    👤 {entry.editedByName} · {timeAgo(entry.editedAt)}
                                                </div>
                                            </div>
                                            <span className="history-entry-expand">{isExpanded ? '▲' : '▼'}</span>
                                        </div>
                                        {isExpanded && (
                                            <div className="history-entry-details">
                                                <DiffView before={entry.before} after={entry.after} />
                                                {isAdmin && (
                                                    <button className="btn btn-sm" style={{ marginTop: 8 }}
                                                        onClick={() => handleRevert(entry)}>
                                                        ↩️ Hoàn tác
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
            </div>
        </div>
    );
}
