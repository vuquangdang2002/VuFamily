import { useState, useEffect } from 'react';
import { api, localApi, formatDate } from '../../shared/services/api';

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
    let finalChanges = changes;
    if (typeof finalChanges === 'string') {
        try { finalChanges = JSON.parse(finalChanges); } catch(e) {}
    }
    if (typeof finalChanges === 'string') {
        try { finalChanges = JSON.parse(finalChanges); } catch(e) {}
    }
    if (!finalChanges || typeof finalChanges !== 'object') return null;

    const skipFields = ['id', 'spouseId', 'parentId', 'newAchievements'];
    const entries = Object.entries(finalChanges).filter(([k]) => !skipFields.includes(k));
    const changed = entries.filter(([k, v]) => String(before?.[k] ?? '') !== String(v));
    if (changed.length === 0) return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Không có thay đổi rõ rệt</div>;

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
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const res = await api.getAllRequests();
            if (res.success) setRequests(res.data || []);
        } catch (e) {
            addToast('Lỗi khi tải danh sách yêu cầu', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

    const handleApprove = async (req) => {
        if (!confirm(`Duyệt yêu cầu cập nhật "${req.memberName}" từ ${req.requestedByName}?\n\nCác thay đổi sẽ được áp dụng ngay.`)) return;
        try {
            const result = await api.approveRequest(req.id);
            addToast('Đã duyệt yêu cầu thành công', 'success');
            await fetchRequests();
            if (onRefresh) onRefresh();
        } catch(e) {
            addToast(e.message || 'Lỗi khi duyệt', 'error');
        }
    };

    const handleReject = async (req) => {
        const reason = prompt(`Từ chối yêu cầu của ${req.requestedByName}?\n\nNhập lý do (không bắt buộc):`);
        if (reason === null) return; // User pressed Cancel
        try {
            const result = await api.rejectRequest(req.id, reason);
            addToast('Đã từ chối yêu cầu', 'success');
            await fetchRequests();
        } catch(e) {
            addToast(e.message || 'Lỗi khi từ chối', 'error');
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="page-container flex flex-col h-screen pt-16 sm:pt-0 overflow-hidden">
            <div className="page-header shrink-0">
                <h2>📋 Yêu cầu chỉnh sửa {pendingCount > 0 && <span className="badge">{pendingCount}</span>}</h2>
                <p className="page-subtitle">Quản lý các yêu cầu cập nhật gia phả</p>
            </div>

            <div className="page-body flex-1 overflow-y-auto p-4 md:p-6 pb-24">
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

                <div className="side-panel-body relative min-h-[200px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            Vui lòng chờ...
                        </div>
                    ) : filtered.length === 0 ? (
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
