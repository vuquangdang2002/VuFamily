import { useState } from 'react';
import { localApi, formatDate } from '../services/api';

const FIELD_LABELS = {
    name: 'Họ tên', gender: 'Giới tính', birthDate: 'Ngày sinh', birthTime: 'Giờ sinh',
    deathDate: 'Ngày mất', deathDateLunar: 'Ngày mất (ÂL)', birthPlace: 'Quê quán',
    deathPlace: 'Nơi mất', occupation: 'Nghề nghiệp', phone: 'Điện thoại',
    email: 'Email', address: 'Địa chỉ', note: 'Ghi chú', generation: 'Đời thứ',
    birthOrder: 'Con thứ', childType: 'Loại', photo: 'Ảnh',
};

const STATUS_LABELS = {
    pending: { icon: '⏳', text: 'Đang chờ', color: '#FF9800' },
    approved: { icon: '✅', text: 'Đã duyệt', color: '#4CAF50' },
    rejected: { icon: '❌', text: 'Từ chối', color: '#f44336' },
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

function ChangesView({ before, changes }) {
    if (!changes) return null;
    const skipFields = ['id', 'spouseId', 'parentId', 'newAchievements'];
    const entries = Object.entries(changes).filter(([k]) => !skipFields.includes(k));
    const changed = entries.filter(([k, v]) => String(before?.[k] ?? '') !== String(v));
    if (changed.length === 0) return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Không có thay đổi</div>;

    return (
        <div className="diff-view">
            {changed.map(([field, newVal]) => (
                <div key={field} className="diff-row">
                    <div className="diff-label">{FIELD_LABELS[field] || field}</div>
                    <div className="diff-values">
                        {field === 'photo' ? (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {before?.[field] && <img src={before[field]} alt="Trước" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #f44336' }} />}
                                <span style={{ color: 'var(--text-muted)' }}>→</span>
                                {newVal && <img src={newVal} alt="Sau" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #4CAF50' }} />}
                            </div>
                        ) : (
                            <>
                                <span className="diff-old">{String(before?.[field] ?? '') || '(trống)'}</span>
                                <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                                <span className="diff-new">{String(newVal) || '(trống)'}</span>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function RequestsPage({ user, onRefresh, addToast }) {
    const isAdmin = user?.role === 'admin';
    const [filter, setFilter] = useState('pending');
    const [requests, setRequests] = useState(() => {
        const all = localApi.getAllRequests();
        return isAdmin ? all : all.filter(r => r.requestedBy === user?.username);
    });

    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

    const handleApprove = (req) => {
        if (!confirm(`Duyệt yêu cầu cập nhật "${req.memberName}" từ ${req.requestedByName}?\n\nCác thay đổi sẽ được áp dụng ngay.`)) return;
        const result = localApi.approveRequest(req.id, user);
        addToast(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            setRequests(localApi.getAllRequests());
            if (onRefresh) onRefresh();
        }
    };

    const handleReject = (req) => {
        const reason = prompt(`Từ chối yêu cầu của ${req.requestedByName}?\n\nNhập lý do (không bắt buộc):`);
        if (reason === null) return; // User pressed Cancel
        const result = localApi.rejectRequest(req.id, user, reason);
        addToast(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            setRequests(localApi.getAllRequests());
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>📋 Yêu cầu chỉnh sửa {pendingCount > 0 && <span className="badge">{pendingCount}</span>}</h2>
                <p className="page-subtitle">Quản lý các yêu cầu cập nhật gia phả</p>
            </div>

            <div className="page-body">
                <div className="request-filters" style={{ marginBottom: 16 }}>
                    <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
                        ⏳ Chờ duyệt {pendingCount > 0 && `(${pendingCount})`}
                    </button>
                    <button className={`filter-btn ${filter === 'approved' ? 'active' : ''}`} onClick={() => setFilter('approved')}>
                        ✅ Đã duyệt
                    </button>
                    <button className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>
                        ❌ Từ chối
                    </button>
                    <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                        📋 Tất cả
                    </button>
                </div>

                <div className="side-panel-body">
                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <span style={{ fontSize: 40 }}>{filter === 'pending' ? '✅' : '📭'}</span>
                            <p>{filter === 'pending' ? 'Không có yêu cầu nào đang chờ duyệt.' : 'Không có yêu cầu nào.'}</p>
                        </div>
                    ) : (
                        <div className="requests-list">
                            {filtered.map(req => {
                                const status = STATUS_LABELS[req.status] || STATUS_LABELS.pending;
                                return (
                                    <div key={req.id} className={`request-card ${req.status}`}>
                                        <div className="request-card-header">
                                            <div className="request-card-status" style={{ color: status.color }}>
                                                {status.icon} {status.text}
                                            </div>
                                            <div className="request-card-time">{timeAgo(req.requestedAt)}</div>
                                        </div>
                                        <div className="request-card-title">
                                            🏷️ <strong>{req.memberName}</strong>
                                        </div>
                                        <div className="request-card-meta">
                                            👤 Gửi bởi: <strong>{req.requestedByName}</strong>
                                        </div>
                                        {req.note && <div className="request-card-note">💬 {req.note}</div>}

                                        <ChangesView before={req.before} changes={req.changes} />

                                        {req.status === 'pending' && (
                                            <div className="request-card-actions">
                                                <button className="btn btn-primary btn-sm" onClick={() => handleApprove(req)}>
                                                    ✅ Duyệt
                                                </button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleReject(req)}>
                                                    ❌ Từ chối
                                                </button>
                                            </div>
                                        )}

                                        {req.status === 'rejected' && req.rejectReason && (
                                            <div className="request-card-reason">
                                                💬 Lý do: {req.rejectReason}
                                            </div>
                                        )}

                                        {req.reviewedAt && (
                                            <div className="request-card-reviewed">
                                                {req.status === 'approved' ? '✅' : '❌'} Xử lý bởi {req.reviewedBy} · {timeAgo(req.reviewedAt)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
