import { useState, useEffect } from 'react';
import { api, formatDate } from '../../shared/services/api';

const FIELD_LABELS = {
    name: 'Họ tên', gender: 'Giới tính', birthDate: 'Ngày sinh', birthTime: 'Giờ sinh',
    deathDate: 'Ngày mất', deathDateLunar: 'Ngày mất (ÂL)', birthPlace: 'Quê quán',
    deathPlace: 'Nơi mất', occupation: 'Nghề nghiệp', phone: 'Điện thoại',
    email: 'Email', address: 'Địa chỉ', note: 'Ghi chú', generation: 'Đời thứ',
    birthOrder: 'Con thứ', childType: 'Loại', photo: 'Ảnh',
};

const STATUS_LABELS = {
    pending: { icon: '⏳', text: 'Đang chờ', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20' },
    approved: { icon: '✅', text: 'Đã duyệt', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20' },
    rejected: { icon: '❌', text: 'Từ chối', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/20' },
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
        try { finalChanges = JSON.parse(finalChanges); } catch (e) { }
    }
    if (!finalChanges || typeof finalChanges !== 'object') return null;

    const skipFields = ['id', 'spouseId', 'parentId', 'newAchievements'];
    const entries = Object.entries(finalChanges).filter(([k]) => !skipFields.includes(k));
    const changed = entries.filter(([k, v]) => String(before?.[k] ?? '') !== String(v));
    if (changed.length === 0) return <div className="text-xs text-slate-500 dark:text-slate-400 italic">Không có thay đổi rõ rệt</div>;

    return (
        <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 space-y-3">
            {changed.map(([field, newVal]) => (
                <div key={field} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm">
                    <div className="w-28 shrink-0 font-medium text-slate-700 dark:text-slate-300">
                        {FIELD_LABELS[field] || field}
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                        {field === 'photo' ? (
                            <div className="flex items-center gap-3">
                                {before?.[field] && <img src={before[field]} alt="Trước" className="w-10 h-10 rounded-full object-cover border-2 border-rose-400 shadow-sm" />}
                                <span className="text-slate-400">→</span>
                                {newVal && <img src={newVal} alt="Sau" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400 shadow-sm" />}
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-1 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 line-through decoration-rose-300 break-all">
                                    {String(before?.[field] ?? '') || '(trống)'}
                                </span>
                                <span className="text-slate-400 text-lg">→</span>
                                <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium break-all">
                                    {String(newVal) || '(trống)'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function RequestsPage({ user, onRefresh, addToast, members = [] }) {
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

    useEffect(() => { fetchRequests(); }, []);

    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

    const handleApprove = async (req) => {
        if (!confirm(`Duyệt yêu cầu cập nhật "${req.memberName}" từ ${req.requestedByName}?\n\nCác thay đổi sẽ được áp dụng ngay.`)) return;
        try {
            await api.approveRequest(req.id);
            addToast('Đã duyệt yêu cầu thành công', 'success');
            await fetchRequests();
            if (onRefresh) onRefresh();
        } catch (e) {
            addToast(e.message || 'Lỗi khi duyệt', 'error');
        }
    };

    const handleReject = async (req) => {
        const reason = prompt(`Từ chối yêu cầu của ${req.requestedByName}?\n\nNhập lý do (không bắt buộc):`);
        if (reason === null) return;
        try {
            await api.rejectRequest(req.id, reason);
            addToast('Đã từ chối yêu cầu', 'success');
            await fetchRequests();
        } catch (e) {
            addToast(e.message || 'Lỗi khi từ chối', 'error');
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-black">
            {/* Header */}
            <div className="px-8 py-8 shrink-0 bg-white dark:bg-black border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-2">
                    <h2 className="font-heading text-2xl font-bold text-black dark:text-white">Yêu cầu chỉnh sửa</h2>
                    {pendingCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20">{pendingCount}</span>
                    )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Quản lý và phê duyệt các thay đổi trên cây gia phả</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-6">
                    
                    {/* Filters */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: 'pending', label: `⏳ Chờ duyệt ${pendingCount > 0 ? `(${pendingCount})` : ''}` },
                            { id: 'approved', label: '✅ Đã duyệt' },
                            { id: 'rejected', label: '❌ Từ chối' },
                            { id: 'all', label: '📋 Tất cả' }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.id ? 'bg-black text-white shadow-md dark:bg-black' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-24 text-slate-500">
                            <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
                            <span>Đang tải dữ liệu...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm text-center">
                            <div className="w-20 h-20 mb-6 rounded-full flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 text-4xl shadow-inner">
                                {filter === 'pending' ? '✨' : '📭'}
                            </div>
                            <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                                {filter === 'pending' ? 'Tất cả đã được xử lý!' : 'Không có dữ liệu'}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400">
                                {filter === 'pending' ? 'Không có yêu cầu nào đang chờ duyệt lúc này.' : 'Chưa có yêu cầu nào trong danh sách này.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {filtered.map(req => {
                                const status = STATUS_LABELS[req.status] || STATUS_LABELS.pending;
                                return (
                                    <div key={req.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                        {/* Card Header */}
                                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                            <div className="flex items-center gap-3">
                                                <div className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 border ${status.bg} ${status.color} ${status.border}`}>
                                                    <span>{status.icon}</span> {status.text}
                                                </div>
                                                <span className="text-sm font-medium text-slate-500">
                                                    {timeAgo(req.requestedAt)}
                                                </span>
                                            </div>
                                            {req.reviewedAt && (
                                                <div className="text-xs text-slate-400 font-medium">
                                                    Xử lý bởi <span className="text-slate-700 dark:text-slate-300">{req.reviewedBy}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-6">
                                            <div className="flex flex-col sm:flex-row gap-8">
                                                <div className="flex-1 space-y-4">
                                                    <div>
                                                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Thành viên</div>
                                                        <div className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                                                            🏷️ {req.memberName}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Người gửi yêu cầu</div>
                                                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                            👤 {req.requestedByName}
                                                        </div>
                                                    </div>
                                                    {req.note && (
                                                        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-4 rounded-xl">
                                                            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">Lời nhắn</div>
                                                            <div className="text-sm text-amber-800 dark:text-amber-200">{req.note}</div>
                                                        </div>
                                                    )}
                                                    {req.status === 'rejected' && req.rejectReason && (
                                                        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-4 rounded-xl mt-4">
                                                            <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase mb-1">Lý do từ chối</div>
                                                            <div className="text-sm text-rose-800 dark:text-rose-200">{req.rejectReason}</div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-[2] border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-700 pt-6 sm:pt-0 sm:pl-8">
                                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Chi tiết thay đổi</div>
                                                    <ChangesView before={members.find(m => String(m.id) === String(req.memberId))} changes={req.changes} />
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            {req.status === 'pending' && (
                                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-3">
                                                    <button onClick={() => handleApprove(req)} className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                                                        ✅ Phê duyệt
                                                    </button>
                                                    <button onClick={() => handleReject(req)} className="flex-1 sm:flex-none px-6 py-2.5 bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                                                        ❌ Từ chối
                                                    </button>
                                                </div>
                                            )}
                                        </div>
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
