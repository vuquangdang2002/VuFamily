import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api';
import { useTranslation } from '../../shared/hooks/useTranslation';
import './Finance.css';

export default function FinancePage({ user, addToast }) {
    const { t } = useTranslation();
    const [transactions, setTransactions] = useState([]);
    const [financeSearchQuery, setFinanceSearchQuery] = useState('');
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        type: 'INCOME',
        amount: '',
        category: 'other',
        description: ''
    });

    const isEditorOrAdmin = user?.role === 'admin' || user?.role === 'editor';
    const isAdmin = user?.role === 'admin';

    const loadData = async () => {
        setLoading(true);
        try {
            const txRes = await api.getFinanceTransactions();
            if (txRes.success) setTransactions(txRes.data || []);
            
            if (isAdmin) {
                const logRes = await api.getFinanceAuditLogs();
                if (logRes.success) setAuditLogs(logRes.data || []);
            }
        } catch (e) {
            addToast('Không thể kết nối máy chủ để cập nhật dữ liệu tài chính mới nhất. Vui lòng kiểm tra lại kết nối mạng.', 'warning');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateTransaction = async (e) => {
        e.preventDefault();
        const amt = parseFloat(formData.amount);
        if (isNaN(amt) || amt <= 0) {
            addToast('Số tiền không hợp lệ.', 'error');
            return;
        }
        if (!formData.description.trim()) {
            addToast('Vui lòng điền mô tả.', 'error');
            return;
        }

        try {
            const res = await api.createFinanceTransaction({
                type: formData.type,
                amount: amt,
                category: formData.category,
                description: formData.description
            });

            if (res.success) {
                addToast('Đã tạo giao dịch thành công!');
                setFormData({ type: 'INCOME', amount: '', category: 'other', description: '' });
                setShowAddModal(false);
                loadData();
            } else {
                addToast(res.error || 'Tạo giao dịch thất bại.', 'error');
            }
        } catch (err) {
            addToast('Lỗi kết nối khi tạo giao dịch.', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa giao dịch này? Lịch sử kiểm toán sẽ lưu vết.')) return;
        try {
            const res = await api.deleteFinanceTransaction(id);
            if (res.success) {
                addToast('Xóa giao dịch thành công!');
                loadData();
            } else {
                addToast(res.error || 'Xóa giao dịch thất bại.', 'error');
            }
        } catch (err) {
            addToast('Lỗi kết nối khi xóa giao dịch.', 'error');
        }
    };

    // Calculate totals
    const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    const currentBalance = totalIncome - totalExpense;

    // Calculate categories breakdown
    const categories = {
        education: { label: 'Khuyến học', amount: 0, color: '#3b82f6' },
        death_anniversary: { label: 'Giỗ chạp', amount: 0, color: '#ef4444' },
        travel: { label: 'Du lịch & Đi chơi', amount: 0, color: '#10b981' },
        construction: { label: 'Xây dựng nhà thờ', amount: 0, color: '#8b5cf6' },
        award: { label: 'Khen thưởng', amount: 0, color: '#f59e0b' },
        other: { label: 'Khác', amount: 0, color: '#64748b' }
    };

    transactions.forEach(t => {
        const cat = categories[t.category] || categories.other;
        if (t.type === 'INCOME') cat.amount += t.amount;
        else cat.amount -= t.amount;
    });

    const filteredTransactions = transactions.filter(tx => 
        (tx.description || '').toLowerCase().includes(financeSearchQuery.toLowerCase()) ||
        (tx.created_by_user?.display_name || '').toLowerCase().includes(financeSearchQuery.toLowerCase()) ||
        (categories[tx.category]?.label || '').toLowerCase().includes(financeSearchQuery.toLowerCase())
    );

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    return (
        <div className="page-container finance-page">
            <div className="finance-header-card">
                <div>
                    <h2>💰 Quỹ tài chính dòng họ</h2>
                    <p className="finance-subtitle">Quản lý ngân sách, đóng góp xã hội & kiểm toán giao dịch bảo mật</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {isEditorOrAdmin && (
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>➕ Thêm giao dịch</button>
                    )}
                    {isAdmin && (
                        <button className="btn btn-secondary" onClick={() => setShowLogsModal(true)}>📜 Nhật ký kiểm toán</button>
                    )}
                </div>
            </div>

            {/* Balances Dashboard */}
            <div className="finance-balance-grid">
                <div className="finance-card balance-total">
                    <div className="card-icon">🏦</div>
                    <div>
                        <div className="card-label">Tổng quỹ hiện tại</div>
                        <div className={`card-value ${currentBalance >= 0 ? 'text-income' : 'text-expense'}`}>
                            {formatCurrency(currentBalance)}
                        </div>
                    </div>
                </div>
                <div className="finance-card balance-income">
                    <div className="card-icon">📈</div>
                    <div>
                        <div className="card-label">Tổng thu (Đóng góp)</div>
                        <div className="card-value text-income">{formatCurrency(totalIncome)}</div>
                    </div>
                </div>
                <div className="finance-card balance-expense">
                    <div className="card-icon">📉</div>
                    <div>
                        <div className="card-label">Tổng chi (Sự kiện/Quỹ)</div>
                        <div className="card-value text-expense">{formatCurrency(totalExpense)}</div>
                    </div>
                </div>
            </div>

            {/* Two column grid */}
            <div className="finance-main-grid">
                {/* Left: transactions list */}
                <div className="finance-card-block list-block">
                    <h3>Hoạt động gần đây</h3>
                    
                    {transactions.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Tìm giao dịch (mô tả, người tạo, danh mục)..."
                                value={financeSearchQuery}
                                onChange={e => setFinanceSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    borderRadius: 20,
                                    padding: '6px 14px',
                                    fontSize: 13,
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-subtle)',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    )}

                    {loading ? (
                        <div className="finance-loading">{t('common.loading')}</div>
                    ) : transactions.length === 0 ? (
                        <div className="finance-empty">Chưa có giao dịch tài chính nào được ghi lại.</div>
                    ) : filteredTransactions.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            Không tìm thấy giao dịch nào phù hợp
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="finance-table">
                                <thead>
                                    <tr>
                                        <th>Ngày tạo</th>
                                        <th>Mô tả</th>
                                        <th>Danh mục</th>
                                        <th>Số tiền</th>
                                        {isAdmin && <th>Thao tác</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td>{new Date(tx.created_at).toLocaleDateString('vi-VN')}</td>
                                            <td>
                                                <div className="tx-desc">{tx.description}</div>
                                                <div className="tx-creator">Tạo bởi: {tx.created_by_user?.display_name || 'Hệ thống'}</div>
                                            </td>
                                            <td>
                                                <span className="badge-cat" style={{ background: `${categories[tx.category]?.color}15`, color: categories[tx.category]?.color }}>
                                                    {categories[tx.category]?.label || 'Khác'}
                                                </span>
                                            </td>
                                            <td className={tx.type === 'INCOME' ? 'text-income font-bold' : 'text-expense font-bold'}>
                                                {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </td>
                                            {isAdmin && (
                                                <td>
                                                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(tx.id)}>🗑️</button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right: categories breakdown */}
                <div className="finance-card-block chart-block">
                    <h3>Cơ cấu quỹ theo danh mục</h3>
                    <div className="cat-breakdown-list">
                        {Object.entries(categories).map(([key, cat]) => (
                            <div key={key} className="cat-breakdown-item">
                                <div className="cat-breakdown-header">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span className="color-dot" style={{ background: cat.color }} />
                                        {cat.label}
                                    </span>
                                    <span className="font-bold">{formatCurrency(cat.amount)}</span>
                                </div>
                                <div className="cat-progress-bg">
                                    <div 
                                        className="cat-progress-fill" 
                                        style={{ 
                                            background: cat.color, 
                                            width: `${totalIncome > 0 ? Math.max(0, Math.min(100, (cat.amount / totalIncome) * 100)) : 0}%` 
                                        }} 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Add Transaction Modal */}
            {showAddModal && (
                <div className="modal-overlay open" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
                        <div className="modal-header">
                            <h2>➕ Ghi nhận giao dịch quỹ</h2>
                            <button className="detail-close" onClick={() => setShowAddModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateTransaction} className="modal-body">
                            <div className="form-group">
                                <label>Loại giao dịch</label>
                                <select className="form-input" name="type" value={formData.type} onChange={handleInputChange}>
                                    <option value="INCOME">Thu (Đóng đóng, tài trợ...)</option>
                                    <option value="EXPENSE">Chi (Sự kiện, khen thưởng...)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Số tiền (VND)</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    name="amount" 
                                    value={formData.amount} 
                                    onChange={handleInputChange} 
                                    placeholder="Ví dụ: 1000000" 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Danh mục</label>
                                <select className="form-input" name="category" value={formData.category} onChange={handleInputChange}>
                                    {Object.entries(categories).map(([key, cat]) => (
                                        <option key={key} value={key}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Mô tả giao dịch</label>
                                <textarea 
                                    className="form-input" 
                                    name="description" 
                                    value={formData.description} 
                                    onChange={handleInputChange} 
                                    placeholder="Nội dung chi tiết..." 
                                    rows={3} 
                                    required 
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Ghi sổ</button>
                                <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowAddModal(false)}>Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Audit Logs Modal */}
            {showLogsModal && isAdmin && (
                <div className="modal-overlay open" onClick={() => setShowLogsModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, width: '90%' }}>
                        <div className="modal-header">
                            <h2>📜 Nhật ký kiểm toán tài chính (Audit Trail)</h2>
                            <button className="detail-close" onClick={() => setShowLogsModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                                Nhật ký hệ thống tự động ghi lại mọi thao tác thêm, sửa, xóa các giao dịch tài chính dòng họ phục vụ tính công khai, minh bạch.
                            </p>
                            <div className="table-responsive">
                                <table className="finance-table logs-table">
                                    <thead>
                                        <tr>
                                            <th>Thời gian</th>
                                            <th>Hành động</th>
                                            <th>Người thực hiện</th>
                                            <th>Thay đổi số tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLogs.map(log => (
                                            <tr key={log.id}>
                                                <td>{new Date(log.modified_at).toLocaleString('vi-VN')}</td>
                                                <td>
                                                    <span className={`badge-action action-${log.action.toLowerCase()}`}>
                                                        {log.action === 'CREATED' ? 'TẠO MỚI' : log.action === 'UPDATED' ? 'CẬP NHẬT' : 'XÓA BỎ'}
                                                    </span>
                                                </td>
                                                <td>{log.modified_by_user?.display_name || 'Không rõ'}</td>
                                                <td>
                                                    {log.action === 'CREATED' && (
                                                        <span>Số tiền mới: <strong className="text-income">{formatCurrency(log.new_amount)}</strong></span>
                                                    )}
                                                    {log.action === 'UPDATED' && (
                                                        <span>{formatCurrency(log.old_amount)} → <strong className="text-income">{formatCurrency(log.new_amount)}</strong></span>
                                                    )}
                                                    {log.action === 'DELETED' && (
                                                        <span>Số tiền cũ đã xóa: <strong className="text-expense">{formatCurrency(log.old_amount)}</strong></span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
