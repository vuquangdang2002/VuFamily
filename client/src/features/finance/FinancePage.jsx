import React, { useState, useEffect } from 'react';
import { api } from '../../shared/services/api';
import { useTranslation } from '../../shared/hooks/useTranslation';
import './Finance.css';

const CATEGORY_COLORS = {
    education: '#3b82f6',
    death_anniversary: '#ef4444',
    travel: '#10b981',
    construction: '#8b5cf6',
    award: '#f59e0b',
    other: '#64748b'
};

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

    const categoryLabels = {
        education: t('finance.cat_education'),
        death_anniversary: t('finance.cat_death_anniversary'),
        travel: t('finance.cat_travel'),
        construction: t('finance.cat_construction'),
        award: t('finance.cat_award'),
        other: t('finance.cat_other')
    };

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
            addToast(t('finance.offline_warning'), 'warning');
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
            addToast(t('finance.invalid_amount'), 'error');
            return;
        }
        if (!formData.description.trim()) {
            addToast(t('finance.empty_description'), 'error');
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
                addToast(t('finance.create_success'));
                setFormData({ type: 'INCOME', amount: '', category: 'other', description: '' });
                setShowAddModal(false);
                loadData();
            } else {
                addToast(res.error || t('finance.create_fail'), 'error');
            }
        } catch (err) {
            addToast(t('finance.create_error'), 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('finance.delete_confirm'))) return;
        try {
            const res = await api.deleteFinanceTransaction(id);
            if (res.success) {
                addToast(t('finance.delete_success'));
                loadData();
            } else {
                addToast(res.error || t('finance.delete_fail'), 'error');
            }
        } catch (err) {
            addToast(t('finance.delete_error'), 'error');
        }
    };

    // Calculate totals
    const totalIncome = transactions.filter(tx => tx.type === 'INCOME').reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpense = transactions.filter(tx => tx.type === 'EXPENSE').reduce((sum, tx) => sum + tx.amount, 0);
    const currentBalance = totalIncome - totalExpense;

    // Calculate categories breakdown
    const categories = {};
    Object.entries(categoryLabels).forEach(([key, label]) => {
        categories[key] = { label, amount: 0, color: CATEGORY_COLORS[key] || '#64748b' };
    });

    transactions.forEach(tx => {
        const cat = categories[tx.category] || categories.other;
        if (tx.type === 'INCOME') cat.amount += tx.amount;
        else cat.amount -= tx.amount;
    });

    const filteredTransactions = transactions.filter(tx => 
        (tx.description || '').toLowerCase().includes(financeSearchQuery.toLowerCase()) ||
        (tx.created_by_user?.display_name || '').toLowerCase().includes(financeSearchQuery.toLowerCase()) ||
        (categories[tx.category]?.label || '').toLowerCase().includes(financeSearchQuery.toLowerCase())
    );

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };

    const AUDIT_ACTION_MAP = {
        CREATED: t('finance.audit_created'),
        UPDATED: t('finance.audit_updated'),
        DELETED: t('finance.audit_deleted')
    };

    return (
        <div className="page-container finance-page">
            <div className="finance-header-card">
                <div>
                    <h2>{t('finance.title')}</h2>
                    <p className="finance-subtitle">{t('finance.subtitle')}</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {isEditorOrAdmin && (
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>{t('finance.add_transaction')}</button>
                    )}
                    {isAdmin && (
                        <button className="btn btn-secondary" onClick={() => setShowLogsModal(true)}>{t('finance.audit_logs_btn')}</button>
                    )}
                </div>
            </div>

            {/* Balances Dashboard */}
            <div className="finance-balance-grid">
                <div className="finance-card balance-total">
                    <div className="card-icon">🏦</div>
                    <div>
                        <div className="card-label">{t('finance.total_balance')}</div>
                        <div className={`card-value ${currentBalance >= 0 ? 'text-income' : 'text-expense'}`}>
                            {formatCurrency(currentBalance)}
                        </div>
                    </div>
                </div>
                <div className="finance-card balance-income">
                    <div className="card-icon">📈</div>
                    <div>
                        <div className="card-label">{t('finance.total_income')}</div>
                        <div className="card-value text-income">{formatCurrency(totalIncome)}</div>
                    </div>
                </div>
                <div className="finance-card balance-expense">
                    <div className="card-icon">📉</div>
                    <div>
                        <div className="card-label">{t('finance.total_expense')}</div>
                        <div className="card-value text-expense">{formatCurrency(totalExpense)}</div>
                    </div>
                </div>
            </div>

            {/* Two column grid */}
            <div className="finance-main-grid">
                {/* Left: transactions list */}
                <div className="finance-card-block list-block">
                    <h3>{t('finance.recent_activity')}</h3>
                    
                    {transactions.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('finance.search_placeholder')}
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
                        <div className="finance-empty">{t('finance.no_transactions')}</div>
                    ) : filteredTransactions.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            {t('finance.no_search_result')}
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="finance-table">
                                <thead>
                                    <tr>
                                        <th>{t('finance.col_date')}</th>
                                        <th>{t('finance.col_description')}</th>
                                        <th>{t('finance.col_category')}</th>
                                        <th>{t('finance.col_amount')}</th>
                                        {isAdmin && <th>{t('finance.col_action')}</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td>{new Date(tx.created_at).toLocaleDateString('vi-VN')}</td>
                                            <td>
                                                <div className="tx-desc">{tx.description}</div>
                                                <div className="tx-creator">{t('finance.created_by')} {tx.created_by_user?.display_name || t('finance.system_user')}</div>
                                            </td>
                                            <td>
                                                <span className="badge-cat" style={{ background: `${categories[tx.category]?.color}15`, color: categories[tx.category]?.color }}>
                                                    {categories[tx.category]?.label || t('finance.cat_other')}
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
                    <h3>{t('finance.cat_breakdown')}</h3>
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
                            <h2>{t('finance.modal_add_title')}</h2>
                            <button className="detail-close" onClick={() => setShowAddModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateTransaction} className="modal-body">
                            <div className="form-group">
                                <label>{t('finance.type_label')}</label>
                                <select className="form-input" name="type" value={formData.type} onChange={handleInputChange}>
                                    <option value="INCOME">{t('finance.type_income')}</option>
                                    <option value="EXPENSE">{t('finance.type_expense')}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{t('finance.amount_label')}</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    name="amount" 
                                    value={formData.amount} 
                                    onChange={handleInputChange} 
                                    placeholder={t('finance.amount_placeholder')} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('finance.category_label')}</label>
                                <select className="form-input" name="category" value={formData.category} onChange={handleInputChange}>
                                    {Object.entries(categories).map(([key, cat]) => (
                                        <option key={key} value={key}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{t('finance.description_label')}</label>
                                <textarea 
                                    className="form-input" 
                                    name="description" 
                                    value={formData.description} 
                                    onChange={handleInputChange} 
                                    placeholder={t('finance.description_placeholder')} 
                                    rows={3} 
                                    required 
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>{t('finance.submit_btn')}</button>
                                <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowAddModal(false)}>{t('finance.cancel_btn')}</button>
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
                            <h2>{t('finance.audit_title')}</h2>
                            <button className="detail-close" onClick={() => setShowLogsModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                                {t('finance.audit_description')}
                            </p>
                            <div className="table-responsive">
                                <table className="finance-table logs-table">
                                    <thead>
                                        <tr>
                                            <th>{t('finance.audit_col_time')}</th>
                                            <th>{t('finance.audit_col_action')}</th>
                                            <th>{t('finance.audit_col_user')}</th>
                                            <th>{t('finance.audit_col_amount')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLogs.map(log => (
                                            <tr key={log.id}>
                                                <td>{new Date(log.modified_at).toLocaleString('vi-VN')}</td>
                                                <td>
                                                    <span className={`badge-action action-${log.action.toLowerCase()}`}>
                                                        {AUDIT_ACTION_MAP[log.action] || log.action}
                                                    </span>
                                                </td>
                                                <td>{log.modified_by_user?.display_name || t('finance.audit_unknown')}</td>
                                                <td>
                                                    {log.action === 'CREATED' && (
                                                        <span>{t('finance.audit_new_amount')} <strong className="text-income">{formatCurrency(log.new_amount)}</strong></span>
                                                    )}
                                                    {log.action === 'UPDATED' && (
                                                        <span>{formatCurrency(log.old_amount)} → <strong className="text-income">{formatCurrency(log.new_amount)}</strong></span>
                                                    )}
                                                    {log.action === 'DELETED' && (
                                                        <span>{t('finance.audit_old_deleted')} <strong className="text-expense">{formatCurrency(log.old_amount)}</strong></span>
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
