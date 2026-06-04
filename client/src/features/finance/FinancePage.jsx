import React, { useState, useRef } from 'react';
import { api } from '../../shared/services/api';
import { useFinanceData } from './useFinanceData';
import FinanceImportModal from './FinanceImportModal';
import './Finance.css';

export default function FinancePage({ user, addToast }) {
    const {
        transactions, auditLogs, loading, categories, categoryLabels,
        totalIncome, totalExpense, currentBalance, formatCurrency,
        isAdmin, isEditorOrAdmin, loadData,
        handleCreateTransaction, handleDelete, handleExportCSV, getMonthlyData, t
    } = useFinanceData({ user, addToast });

    const [financeSearchQuery, setFinanceSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [googleSheetUrl, setGoogleSheetUrl] = useState('');
    const [parsedTransactions, setParsedTransactions] = useState([]);
    const [importLoading, setImportLoading] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
    const [donutType, setDonutType] = useState('EXPENSE');
    const [hoveredSlice, setHoveredSlice] = useState(null);
    const [hoveredBar, setHoveredBar] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [formData, setFormData] = useState({ type: 'INCOME', amount: '', category: 'other', description: '' });

    const chartCardRef = useRef(null);

    const AUDIT_ACTION_MAP = {
        CREATED: t('finance.audit_created'),
        UPDATED: t('finance.audit_updated'),
        DELETED: t('finance.audit_deleted')
    };

    const handleMouseMove = (e) => {
        if (!chartCardRef.current) return;
        const rect = chartCardRef.current.getBoundingClientRect();
        setTooltipPos({ x: e.clientX - rect.left + 15, y: e.clientY - rect.top - 15 });
    };

    // Donut chart
    const donutData = Object.entries(categories).map(([key, cat]) => {
        let sum = 0;
        transactions.forEach(tx => { if (tx.category === key && tx.type === donutType) sum += tx.amount; });
        return { key, label: cat.label, amount: sum, color: cat.color };
    }).filter(c => c.amount > 0);
    const totalDonutAmount = donutData.reduce((s, d) => s + d.amount, 0);
    let cumulativePercent = 0;
    const donutSlices = donutData.map(d => {
        const percent = (d.amount / totalDonutAmount) * 100;
        const dashArray = `${(d.amount / totalDonutAmount) * 314.16} 314.16`;
        const dashOffset = 314.16 - (cumulativePercent / 100) * 314.16;
        cumulativePercent += percent;
        return { ...d, percent, dashArray, dashOffset };
    });

    const monthlyData = getMonthlyData();
    const maxMonthlyVal = Math.max(...monthlyData.map(m => Math.max(m.income, m.expense)), 500000);

    const filteredTransactions = transactions.filter(tx =>
        (tx.description || '').toLowerCase().includes(financeSearchQuery.toLowerCase()) ||
        (tx.created_by_user?.display_name || '').toLowerCase().includes(financeSearchQuery.toLowerCase()) ||
        (categories[tx.category]?.label || '').toLowerCase().includes(financeSearchQuery.toLowerCase())
    );

    const handleSaveImport = async () => {
        const activeImports = parsedTransactions.filter(item => item.selected && item.valid);
        if (activeImports.length === 0) return;
        setImportLoading(true);
        setImportProgress({ current: 0, total: activeImports.length });
        let successCount = 0;
        try {
            for (let i = 0; i < activeImports.length; i++) {
                setImportProgress({ current: i + 1, total: activeImports.length });
                const item = activeImports[i];
                const res = await api.createFinanceTransaction({ type: item.type, amount: item.amount, category: item.category, description: item.description });
                if (res.success) successCount++;
            }
            addToast(t('finance.import_success').replace('{count}', successCount));
            setShowImportModal(false);
            setParsedTransactions([]);
            loadData();
        } catch (e) {
            addToast(t('finance.import_fail').replace('{error}', e.message), 'error');
        } finally {
            setImportLoading(false);
            setImportProgress({ current: 0, total: 0 });
        }
    };

    return (
        <div className="page-container finance-page" ref={chartCardRef}>
            {/* Header */}
            <div className="finance-header-card">
                <div>
                    <h2>{t('finance.title')}</h2>
                    <p className="finance-subtitle">{t('finance.subtitle')}</p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {isEditorOrAdmin && (<>
                        <button className="btn btn-secondary" onClick={() => handleExportCSV(categories)}>📤 {t('finance.export_btn')}</button>
                        <button className="btn btn-secondary" onClick={() => { setShowImportModal(true); setParsedTransactions([]); setGoogleSheetUrl(''); }}>📥 {t('finance.import_btn')}</button>
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>{t('finance.add_transaction')}</button>
                    </>)}
                    {isAdmin && <button className="btn btn-secondary" onClick={() => setShowLogsModal(true)}>{t('finance.audit_logs_btn')}</button>}
                </div>
            </div>

            {/* Balance Cards */}
            <div className="finance-balance-grid">
                <div className="finance-card balance-total">
                    <div className="card-icon">🏦</div>
                    <div>
                        <div className="card-label">{t('finance.total_balance')}</div>
                        <div className={`card-value ${currentBalance >= 0 ? 'text-income' : 'text-expense'}`}>{formatCurrency(currentBalance)}</div>
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

            {/* Analytics Charts */}
            <div className="finance-analytics-container">
                <div className="finance-analytics-card">
                    <h3>{t('finance.analytics_title')}</h3>
                    <div className="charts-flex-grid">
                        {/* Donut Chart */}
                        <div className="chart-wrapper">
                            <h4>
                                <span>{donutType === 'EXPENSE' ? t('finance.chart_breakdown_expense') : t('finance.chart_breakdown_income')}</span>
                                <div className="chart-toggle-group">
                                    <button className={`chart-toggle-btn ${donutType === 'EXPENSE' ? 'active' : ''}`} onClick={() => setDonutType('EXPENSE')}>{t('finance.type_expense').substring(0, 3)}</button>
                                    <button className={`chart-toggle-btn ${donutType === 'INCOME' ? 'active' : ''}`} onClick={() => setDonutType('INCOME')}>{t('finance.type_income').substring(0, 3)}</button>
                                </div>
                            </h4>
                            {totalDonutAmount === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: 13 }}>
                                    <span>⭕</span><span style={{ marginTop: 8 }}>{t('finance.chart_no_data')}</span>
                                </div>
                            ) : (<>
                                <div style={{ position: 'relative', width: 160, height: 160 }}>
                                    <svg width="160" height="160" viewBox="0 0 160 160">
                                        <circle cx="80" cy="80" r="50" fill="transparent" stroke="var(--bg-secondary)" strokeWidth="16" />
                                        {donutSlices.map(slice => (
                                            <circle key={slice.key} cx="80" cy="80" r="50" fill="transparent" stroke={slice.color} strokeWidth="16"
                                                strokeDasharray={slice.dashArray} strokeDashoffset={slice.dashOffset}
                                                transform="rotate(-90 80 80)" className="donut-slice"
                                                onMouseEnter={() => setHoveredSlice({ label: slice.label, amount: slice.amount, percent: slice.percent, color: slice.color })}
                                                onMouseLeave={() => setHoveredSlice(null)} onMouseMove={handleMouseMove} />
                                        ))}
                                    </svg>
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                        <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{formatCurrency(totalDonutAmount).split(',')[0]}</span>
                                    </div>
                                </div>
                                <div className="chart-legend-grid">
                                    {donutSlices.map(slice => (
                                        <div key={slice.key} className="chart-legend-item">
                                            <span className="color-dot" style={{ background: slice.color }} />
                                            <span style={{ fontSize: 11 }}>{slice.label} ({slice.percent.toFixed(0)}%)</span>
                                        </div>
                                    ))}
                                </div>
                            </>)}
                        </div>

                        {/* Bar Chart */}
                        <div className="chart-wrapper">
                            <h4>{t('finance.chart_monthly_trend')}</h4>
                            <svg width="100%" height="180" viewBox="0 0 360 180" style={{ flex: 1, display: 'block' }}>
                                <line x1="30" y1="30" x2="340" y2="30" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="3 3" />
                                <line x1="30" y1="80" x2="340" y2="80" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="3 3" />
                                <line x1="30" y1="130" x2="340" y2="130" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="3 3" />
                                <line x1="30" y1="150" x2="340" y2="150" stroke="var(--border-subtle)" strokeWidth="1" />
                                {monthlyData.map((m, idx) => {
                                    const startX = 40 + idx * 50;
                                    const maxBarHeight = 110;
                                    const incomeHeight = (m.income / maxMonthlyVal) * maxBarHeight;
                                    const expenseHeight = (m.expense / maxMonthlyVal) * maxBarHeight;
                                    return (
                                        <g key={idx}>
                                            <rect x={startX} y={150 - incomeHeight} width="12" height={Math.max(1, incomeHeight)} fill="#10b981" rx="2" className="bar-rect"
                                                onMouseEnter={() => setHoveredBar({ monthName: m.monthName, type: t('finance.type_income'), amount: m.income })}
                                                onMouseLeave={() => setHoveredBar(null)} onMouseMove={handleMouseMove} />
                                            <rect x={startX + 15} y={150 - expenseHeight} width="12" height={Math.max(1, expenseHeight)} fill="#ef4444" rx="2" className="bar-rect"
                                                onMouseEnter={() => setHoveredBar({ monthName: m.monthName, type: t('finance.type_expense'), amount: m.expense })}
                                                onMouseLeave={() => setHoveredBar(null)} onMouseMove={handleMouseMove} />
                                            <text x={startX + 14} y="166" fill="var(--text-muted)" fontSize="9" textAnchor="middle" fontWeight="600">{m.monthName}</text>
                                        </g>
                                    );
                                })}
                            </svg>
                            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="color-dot" style={{ background: '#10b981' }} /><span>{t('finance.type_income').substring(0, 3)}</span></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="color-dot" style={{ background: '#ef4444' }} /><span>{t('finance.type_expense').substring(0, 3)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Tooltips */}
            {hoveredSlice && (
                <div className="chart-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="color-dot" style={{ background: hoveredSlice.color }} />{hoveredSlice.label}
                    </div>
                    <div style={{ marginTop: 4 }}><strong>{formatCurrency(hoveredSlice.amount)}</strong> ({hoveredSlice.percent.toFixed(1)}%)</div>
                </div>
            )}
            {hoveredBar && (
                <div className="chart-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                    <div style={{ fontWeight: 600 }}>{hoveredBar.monthName}</div>
                    <div style={{ marginTop: 4 }}>{hoveredBar.type}: <strong>{formatCurrency(hoveredBar.amount)}</strong></div>
                </div>
            )}

            {/* Transactions + Categories Grid */}
            <div className="finance-main-grid">
                <div className="finance-card-block list-block">
                    <h3>{t('finance.recent_activity')}</h3>
                    {transactions.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <input type="text" className="form-input" placeholder={t('finance.search_placeholder')} value={financeSearchQuery} onChange={e => setFinanceSearchQuery(e.target.value)}
                                style={{ width: '100%', borderRadius: 20, padding: '6px 14px', fontSize: 13, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', boxSizing: 'border-box' }} />
                        </div>
                    )}
                    {loading ? <div className="finance-loading">{t('common.loading')}</div>
                        : transactions.length === 0 ? <div className="finance-empty">{t('finance.no_transactions')}</div>
                        : filteredTransactions.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{t('finance.no_search_result')}</div>
                        : (
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
                                                <td><span className="badge-cat" style={{ background: `${categories[tx.category]?.color}15`, color: categories[tx.category]?.color }}>{categories[tx.category]?.label || t('finance.cat_other')}</span></td>
                                                <td className={tx.type === 'INCOME' ? 'text-income font-bold' : 'text-expense font-bold'}>{tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}</td>
                                                {isAdmin && <td><button className="btn btn-sm btn-danger" onClick={() => handleDelete(tx.id)}>🗑️</button></td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                </div>
                <div className="finance-card-block chart-block">
                    <h3>{t('finance.cat_breakdown')}</h3>
                    <div className="cat-breakdown-list">
                        {Object.entries(categories).map(([key, cat]) => (
                            <div key={key} className="cat-breakdown-item">
                                <div className="cat-breakdown-header">
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span className="color-dot" style={{ background: cat.color }} />{cat.label}
                                    </span>
                                    <span className="font-bold">{formatCurrency(cat.amount)}</span>
                                </div>
                                <div className="cat-progress-bg">
                                    <div className="cat-progress-fill" style={{ background: cat.color, width: `${totalIncome > 0 ? Math.max(0, Math.min(100, (cat.amount / totalIncome) * 100)) : 0}%` }} />
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
                        <form onSubmit={async (e) => { e.preventDefault(); const ok = await handleCreateTransaction(formData); if (ok) { setFormData({ type: 'INCOME', amount: '', category: 'other', description: '' }); setShowAddModal(false); } }} className="modal-body">
                            <div className="form-group">
                                <label>{t('finance.type_label')}</label>
                                <select className="form-input" name="type" value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}>
                                    <option value="INCOME">{t('finance.type_income')}</option>
                                    <option value="EXPENSE">{t('finance.type_expense')}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{t('finance.amount_label')}</label>
                                <input type="number" className="form-input" name="amount" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder={t('finance.amount_placeholder')} required />
                            </div>
                            <div className="form-group">
                                <label>{t('finance.category_label')}</label>
                                <select className="form-input" name="category" value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}>
                                    {Object.entries(categories).map(([key, cat]) => <option key={key} value={key}>{cat.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{t('finance.description_label')}</label>
                                <textarea className="form-input" name="description" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder={t('finance.description_placeholder')} rows={3} required />
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>{t('finance.submit_btn')}</button>
                                <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowAddModal(false)}>{t('finance.cancel_btn')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <FinanceImportModal
                    categories={categories} parsedTransactions={parsedTransactions}
                    setParsedTransactions={setParsedTransactions} importLoading={importLoading}
                    importProgress={importProgress} googleSheetUrl={googleSheetUrl}
                    setGoogleSheetUrl={setGoogleSheetUrl} onClose={() => setShowImportModal(false)}
                    onSave={handleSaveImport} addToast={addToast}
                />
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
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>{t('finance.audit_description')}</p>
                            <div className="table-responsive">
                                <table className="finance-table logs-table">
                                    <thead><tr>
                                        <th>{t('finance.audit_col_time')}</th>
                                        <th>{t('finance.audit_col_action')}</th>
                                        <th>{t('finance.audit_col_user')}</th>
                                        <th>{t('finance.audit_col_amount')}</th>
                                    </tr></thead>
                                    <tbody>
                                        {auditLogs.map(log => (
                                            <tr key={log.id}>
                                                <td>{new Date(log.modified_at).toLocaleString('vi-VN')}</td>
                                                <td><span className={`badge-action action-${log.action.toLowerCase()}`}>{AUDIT_ACTION_MAP[log.action] || log.action}</span></td>
                                                <td>{log.modified_by_user?.display_name || t('finance.audit_unknown')}</td>
                                                <td>
                                                    {log.action === 'CREATED' && <span>{t('finance.audit_new_amount')} <strong className="text-income">{formatCurrency(log.new_amount)}</strong></span>}
                                                    {log.action === 'UPDATED' && <span>{formatCurrency(log.old_amount)} → <strong className="text-income">{formatCurrency(log.new_amount)}</strong></span>}
                                                    {log.action === 'DELETED' && <span>{t('finance.audit_old_deleted')} <strong className="text-expense">{formatCurrency(log.old_amount)}</strong></span>}
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
