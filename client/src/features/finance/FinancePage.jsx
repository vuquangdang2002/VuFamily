import React, { useState, useEffect, useRef } from 'react';
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

    // Import/Export and Chart states
    const [showImportModal, setShowImportModal] = useState(false);
    const [googleSheetUrl, setGoogleSheetUrl] = useState('');
    const [parsedTransactions, setParsedTransactions] = useState([]); // Array of { id, type, amount, category, description, selected, valid }
    const [importLoading, setImportLoading] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
    const [donutType, setDonutType] = useState('EXPENSE'); // 'INCOME' or 'EXPENSE'
    const [hoveredSlice, setHoveredSlice] = useState(null); // { label, amount, percentage, color }
    const [hoveredBar, setHoveredBar] = useState(null); // { monthName, type, amount }
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const chartCardRef = useRef(null);

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

    // CSV Export
    const handleExportCSV = () => {
        const headers = [
            t('finance.col_date'),
            t('finance.type_label'),
            t('finance.col_amount'),
            t('finance.col_category'),
            t('finance.col_description')
        ];
        const rows = transactions.map(tx => [
            new Date(tx.created_at).toLocaleDateString('vi-VN'),
            tx.type === 'INCOME' ? t('finance.type_income') : t('finance.type_expense'),
            tx.amount,
            categoryLabels[tx.category] || tx.category,
            `"${(tx.description || '').replace(/"/g, '""')}"`
        ]);
        const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `quy-tai-chinh-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // CSV / Google Sheets Import Parsers
    const parseCSV = (text) => {
        const lines = [];
        let row = [""];
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            const next = text[i+1];
            if (c === '"') {
                if (inQuotes && next === '"') {
                    row[row.length - 1] += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c === ',' && !inQuotes) {
                row.push("");
            } else if ((c === '\r' || c === '\n') && !inQuotes) {
                if (c === '\r' && next === '\n') { i++; }
                lines.push(row);
                row = [""];
            } else {
                row[row.length - 1] += c;
            }
        }
        if (row.length > 1 || row[0] !== "") {
            lines.push(row);
        }
        return lines.filter(l => l.some(cell => cell.trim()));
    };

    const resolveGoogleSheetsUrl = (url) => {
        if (url.includes('docs.google.com/spreadsheets')) {
            const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (match && match[1]) {
                return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
            }
        }
        return url;
    };

    const mapCategory = (val) => {
        const clean = (s) => (s || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const text = clean(val);
        if (text.includes('khuyen hoc') || text.includes('education')) return 'education';
        if (text.includes('gio') || text.includes('memorial') || text.includes('anniversary') || text.includes('chap')) return 'death_anniversary';
        if (text.includes('du lich') || text.includes('travel') || text.includes('leisure') || text.includes('choi')) return 'travel';
        if (text.includes('xay') || text.includes('construction') || text.includes('nha tho')) return 'construction';
        if (text.includes('khen') || text.includes('award') || text.includes('thuong')) return 'award';
        return 'other';
    };

    const mapType = (val) => {
        const clean = (s) => (s || '').toLowerCase().trim();
        const text = clean(val);
        if (text.includes('chi') || text.includes('expense') || text === '-' || text.includes('out') || text.includes('expense')) return 'EXPENSE';
        return 'INCOME';
    };

    const parseLoadedCSV = (text) => {
        const lines = parseCSV(text);
        if (lines.length < 2) {
            addToast(t('app.csv_empty'), 'error');
            return;
        }

        const headerRow = lines[0];
        const mapping = { typeIdx: -1, amountIdx: -1, categoryIdx: -1, descIdx: -1 };
        const clean = (s) => (s || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        headerRow.forEach((col, idx) => {
            const name = clean(col);
            if (name.includes('loai') || name.includes('type')) {
                mapping.typeIdx = idx;
            } else if (name.includes('tien') || name.includes('amount') || name.includes('so tien')) {
                mapping.amountIdx = idx;
            } else if (name.includes('muc') || name.includes('category') || name.includes('danh muc')) {
                mapping.categoryIdx = idx;
            } else if (name.includes('mo ta') || name.includes('description') || name.includes('dien giai') || name.includes('noi dung') || name.includes('diễn giải')) {
                mapping.descIdx = idx;
            }
        });

        // Fallbacks
        if (mapping.typeIdx === -1) mapping.typeIdx = 0;
        if (mapping.amountIdx === -1) mapping.amountIdx = 1;
        if (mapping.categoryIdx === -1) mapping.categoryIdx = 2;
        if (mapping.descIdx === -1) mapping.descIdx = 3;

        const items = lines.slice(1).map((row, index) => {
            const typeRaw = row[mapping.typeIdx] || '';
            const amountRaw = row[mapping.amountIdx] || '';
            const categoryRaw = row[mapping.categoryIdx] || '';
            const descRaw = row[mapping.descIdx] || '';

            // Clean amount numbers (e.g. 1.000.000 -> 1000000)
            const cleanAmount = parseFloat(amountRaw.replace(/[^0-9.-]/g, ''));
            const type = mapType(typeRaw);
            const category = mapCategory(categoryRaw);
            const description = descRaw.trim();
            const amount = isNaN(cleanAmount) ? 0 : cleanAmount;

            const valid = amount > 0 && description.length > 0;

            return {
                id: `import-${index}-${Date.now()}`,
                type,
                amount,
                category,
                description,
                selected: valid,
                valid
            };
        });

        setParsedTransactions(items);
    };

    const handleImportFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                parseLoadedCSV(event.target.result);
            }
        };
        reader.readAsText(file);
    };

    const handleLoadGoogleSheet = async () => {
        if (!googleSheetUrl.trim()) return;
        setImportLoading(true);
        try {
            const fetchUrl = resolveGoogleSheetsUrl(googleSheetUrl);
            const res = await fetch(fetchUrl);
            const text = await res.text();
            parseLoadedCSV(text);
        } catch (err) {
            addToast(t('finance.offline_warning'), 'error');
        } finally {
            setImportLoading(false);
        }
    };

    const handleImportRowChange = (id, field, value) => {
        setParsedTransactions(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            if (field === 'amount') {
                const num = parseFloat(value);
                updated.amount = isNaN(num) ? 0 : num;
            }
            updated.valid = updated.amount > 0 && updated.description.trim().length > 0;
            return updated;
        }));
    };

    const handleImportRowSelect = (id) => {
        setParsedTransactions(prev => prev.map(item => 
            item.id === id ? { ...item, selected: !item.selected } : item
        ));
    };

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
                const res = await api.createFinanceTransaction({
                    type: item.type,
                    amount: item.amount,
                    category: item.category,
                    description: item.description
                });
                if (res.success) {
                    successCount++;
                }
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

    // --- CHART GRAPH COMPUTATIONS (SVG) ---
    
    // Donut chart segments for active type (INCOME / EXPENSE)
    const donutData = Object.entries(categories).map(([key, cat]) => {
        let sum = 0;
        transactions.forEach(tx => {
            if (tx.category === key && tx.type === donutType) {
                sum += tx.amount;
            }
        });
        return { key, label: cat.label, amount: sum, color: cat.color };
    }).filter(cat => cat.amount > 0);

    const totalDonutAmount = donutData.reduce((sum, d) => sum + d.amount, 0);

    let cumulativePercent = 0;
    const donutSlices = donutData.map(d => {
        const percent = (d.amount / totalDonutAmount) * 100;
        // Circumference for r=50 is ~314.16. Slice stroke-dasharray = dashlength space
        const dashArray = `${(d.amount / totalDonutAmount) * 314.16} 314.16`;
        const dashOffset = 314.16 - (cumulativePercent / 100) * 314.16;
        cumulativePercent += percent;
        return { ...d, percent, dashArray, dashOffset };
    });

    // 6-Month cashflow data
    const getMonthlyData = () => {
        const monthly = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth();
            const monthName = d.toLocaleDateString('vi-VN', { month: 'short' });
            
            let income = 0;
            let expense = 0;
            
            transactions.forEach(tx => {
                const txDate = new Date(tx.created_at);
                if (txDate.getFullYear() === year && txDate.getMonth() === month) {
                    if (tx.type === 'INCOME') income += tx.amount;
                    else expense += tx.amount;
                }
            });
            monthly.push({ monthName, income, expense });
        }
        return monthly;
    };

    const monthlyData = getMonthlyData();
    const maxMonthlyVal = Math.max(...monthlyData.map(m => Math.max(m.income, m.expense)), 500000);

    const handleMouseMove = (e) => {
        if (!chartCardRef.current) return;
        const rect = chartCardRef.current.getBoundingClientRect();
        setTooltipPos({
            x: e.clientX - rect.left + 15,
            y: e.clientY - rect.top - 15
        });
    };

    return (
        <div className="page-container finance-page" ref={chartCardRef}>
            <div className="finance-header-card">
                <div>
                    <h2>{t('finance.title')}</h2>
                    <p className="finance-subtitle">{t('finance.subtitle')}</p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {isEditorOrAdmin && (
                        <>
                            <button className="btn btn-secondary" onClick={handleExportCSV}>
                                📤 {t('finance.export_btn')}
                            </button>
                            <button className="btn btn-secondary" onClick={() => { setShowImportModal(true); setParsedTransactions([]); setGoogleSheetUrl(''); }}>
                                📥 {t('finance.import_btn')}
                            </button>
                            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>{t('finance.add_transaction')}</button>
                        </>
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

            {/* Visual Analytics Section */}
            <div className="finance-analytics-container">
                <div className="finance-analytics-card">
                    <h3>{t('finance.analytics_title')}</h3>
                    
                    <div className="charts-flex-grid">
                        {/* Donut Chart: Breakdown */}
                        <div className="chart-wrapper">
                            <h4>
                                <span>{donutType === 'EXPENSE' ? t('finance.chart_breakdown_expense') : t('finance.chart_breakdown_income')}</span>
                                <div className="chart-toggle-group">
                                    <button 
                                        className={`chart-toggle-btn ${donutType === 'EXPENSE' ? 'active' : ''}`}
                                        onClick={() => setDonutType('EXPENSE')}
                                    >
                                        {t('finance.type_expense').substring(0, 3)}
                                    </button>
                                    <button 
                                        className={`chart-toggle-btn ${donutType === 'INCOME' ? 'active' : ''}`}
                                        onClick={() => setDonutType('INCOME')}
                                    >
                                        {t('finance.type_income').substring(0, 3)}
                                    </button>
                                </div>
                            </h4>

                            {totalDonutAmount === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: 13 }}>
                                    <span>⭕</span>
                                    <span style={{ marginTop: 8 }}>{t('finance.chart_no_data')}</span>
                                </div>
                            ) : (
                                <>
                                    <div style={{ position: 'relative', width: 160, height: 160 }}>
                                        <svg width="160" height="160" viewBox="0 0 160 160">
                                            <circle cx="80" cy="80" r="50" fill="transparent" stroke="var(--bg-secondary)" strokeWidth="16" />
                                            {donutSlices.map((slice, i) => (
                                                <circle
                                                    key={slice.key}
                                                    cx="80"
                                                    cy="80"
                                                    r="50"
                                                    fill="transparent"
                                                    stroke={slice.color}
                                                    strokeWidth="16"
                                                    strokeDasharray={slice.dashArray}
                                                    strokeDashoffset={slice.dashOffset}
                                                    transform="rotate(-90 80 80)"
                                                    className="donut-slice"
                                                    onMouseEnter={() => setHoveredSlice({ label: slice.label, amount: slice.amount, percent: slice.percent, color: slice.color })}
                                                    onMouseLeave={() => setHoveredSlice(null)}
                                                    onMouseMove={handleMouseMove}
                                                />
                                            ))}
                                        </svg>
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</span>
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
                                </>
                            )}
                        </div>

                        {/* Bar Chart: Cashflow Trend */}
                        <div className="chart-wrapper">
                            <h4>{t('finance.chart_monthly_trend')}</h4>
                            
                            <svg width="100%" height="180" viewBox="0 0 360 180" style={{ flex: 1, display: 'block' }}>
                                {/* Horizontal grid lines */}
                                <line x1="30" y1="30" x2="340" y2="30" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="3 3" />
                                <line x1="30" y1="80" x2="340" y2="80" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="3 3" />
                                <line x1="30" y1="130" x2="340" y2="130" stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="3 3" />
                                <line x1="30" y1="150" x2="340" y2="150" stroke="var(--border-subtle)" strokeWidth="1" />

                                {monthlyData.map((m, idx) => {
                                    const colWidth = 50;
                                    const startX = 40 + idx * colWidth;
                                    const maxBarHeight = 110;
                                    
                                    const incomeHeight = (m.income / maxMonthlyVal) * maxBarHeight;
                                    const expenseHeight = (m.expense / maxMonthlyVal) * maxBarHeight;

                                    return (
                                        <g key={idx}>
                                            {/* Income Bar (Green) */}
                                            <rect
                                                x={startX}
                                                y={150 - incomeHeight}
                                                width="12"
                                                height={Math.max(1, incomeHeight)}
                                                fill="#10b981"
                                                rx="2"
                                                className="bar-rect"
                                                onMouseEnter={() => setHoveredBar({ monthName: m.monthName, type: t('finance.type_income'), amount: m.income })}
                                                onMouseLeave={() => setHoveredBar(null)}
                                                onMouseMove={handleMouseMove}
                                            />
                                            {/* Expense Bar (Red) */}
                                            <rect
                                                x={startX + 15}
                                                y={150 - expenseHeight}
                                                width="12"
                                                height={Math.max(1, expenseHeight)}
                                                fill="#ef4444"
                                                rx="2"
                                                className="bar-rect"
                                                onMouseEnter={() => setHoveredBar({ monthName: m.monthName, type: t('finance.type_expense'), amount: m.expense })}
                                                onMouseLeave={() => setHoveredBar(null)}
                                                onMouseMove={handleMouseMove}
                                            />
                                            {/* Month Label */}
                                            <text
                                                x={startX + 14}
                                                y="166"
                                                fill="var(--text-muted)"
                                                fontSize="9"
                                                textAnchor="middle"
                                                fontWeight="600"
                                            >
                                                {m.monthName}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span className="color-dot" style={{ background: '#10b981' }} />
                                    <span>{t('finance.type_income').substring(0, 3)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span className="color-dot" style={{ background: '#ef4444' }} />
                                    <span>{t('finance.type_expense').substring(0, 3)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tooltips */}
            {hoveredSlice && (
                <div 
                    className="chart-tooltip"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="color-dot" style={{ background: hoveredSlice.color }} />
                        {hoveredSlice.label}
                    </div>
                    <div style={{ marginTop: 4 }}>
                        <strong>{formatCurrency(hoveredSlice.amount)}</strong> ({hoveredSlice.percent.toFixed(1)}%)
                    </div>
                </div>
            )}

            {hoveredBar && (
                <div 
                    className="chart-tooltip"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <div style={{ fontWeight: 600 }}>{hoveredBar.monthName}</div>
                    <div style={{ marginTop: 4 }}>
                        {hoveredBar.type}: <strong>{formatCurrency(hoveredBar.amount)}</strong>
                    </div>
                </div>
            )}

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

            {/* Import Transactions Modal */}
            {showImportModal && (
                <div className="modal-overlay open" onClick={() => !importLoading && setShowImportModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 780, width: '90%' }}>
                        <div className="modal-header">
                            <h2>📥 {t('finance.import_modal_title')}</h2>
                            <button className="detail-close" onClick={() => !importLoading && setShowImportModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ position: 'relative' }}>
                            {/* Processing Progress Loader Overlay */}
                            {importLoading && importProgress.total > 0 && (
                                <div className="progress-overlay">
                                    <div className="progress-spinner"></div>
                                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                                        {t('finance.import_processing')
                                            .replace('{current}', importProgress.current)
                                            .replace('{total}', importProgress.total)}
                                    </div>
                                </div>
                            )}

                            {/* Section 1: File drop upload */}
                            <div className="import-upload-zone" onClick={() => document.getElementById('import-file-input').click()}>
                                <input 
                                    type="file" 
                                    id="import-file-input" 
                                    accept=".csv" 
                                    onChange={handleImportFileSelect} 
                                    style={{ display: 'none' }} 
                                />
                                <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{t('finance.import_select_file')}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>CSV (Unicode, UTF-8)</div>
                            </div>

                            {/* Section 2: Google sheets url link */}
                            <div className="import-sheet-zone">
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                    {t('finance.import_google_sheet')}
                                </label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <input
                                        type="url"
                                        className="form-input"
                                        placeholder={t('finance.import_google_sheet_placeholder')}
                                        value={googleSheetUrl}
                                        onChange={e => setGoogleSheetUrl(e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={handleLoadGoogleSheet} 
                                        disabled={importLoading || !googleSheetUrl.trim()}
                                    >
                                        ⚡ {t('finance.import_load_btn')}
                                    </button>
                                </div>
                                <small style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, display: 'block' }}>
                                    ⚠️ {t('finance.import_google_sheet_hint')}
                                </small>
                            </div>

                            {/* Section 3: Spreadsheet interactive preview & edit table */}
                            {parsedTransactions.length > 0 && (
                                <div style={{ marginTop: 20 }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 700 }}>
                                        {t('finance.import_preview_title').replace('{count}', parsedTransactions.length)}
                                    </h4>
                                    <div className="preview-table-container">
                                        <table className="preview-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 40, textAlign: 'center' }}>{t('finance.import_col_select')}</th>
                                                    <th style={{ width: 110 }}>{t('finance.import_col_type')}</th>
                                                    <th style={{ width: 130 }}>{t('finance.import_col_amount')}</th>
                                                    <th style={{ width: 140 }}>{t('finance.import_col_category')}</th>
                                                    <th>{t('finance.import_col_description')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parsedTransactions.map(item => (
                                                    <tr 
                                                        key={item.id} 
                                                        className={!item.valid ? 'invalid-row' : ''}
                                                        title={!item.valid ? t('finance.import_invalid_row') : ''}
                                                    >
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={item.selected} 
                                                                onChange={() => item.valid && handleImportRowSelect(item.id)}
                                                                disabled={!item.valid} 
                                                            />
                                                        </td>
                                                        <td>
                                                            <select 
                                                                className="form-input" 
                                                                value={item.type} 
                                                                onChange={e => handleImportRowChange(item.id, 'type', e.target.value)}
                                                            >
                                                                <option value="INCOME">{t('finance.type_income').substring(0,3)}</option>
                                                                <option value="EXPENSE">{t('finance.type_expense').substring(0,3)}</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <input 
                                                                type="number" 
                                                                className={`form-input ${item.amount <= 0 ? 'invalid-field' : ''}`}
                                                                value={item.amount === 0 ? '' : item.amount} 
                                                                onChange={e => handleImportRowChange(item.id, 'amount', e.target.value)}
                                                                placeholder="Amount..."
                                                            />
                                                        </td>
                                                        <td>
                                                            <select 
                                                                className="form-input" 
                                                                value={item.category} 
                                                                onChange={e => handleImportRowChange(item.id, 'category', e.target.value)}
                                                            >
                                                                {Object.entries(categories).map(([key, cat]) => (
                                                                    <option key={key} value={key}>{cat.label}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <input 
                                                                type="text" 
                                                                className={`form-input ${item.description.trim().length === 0 ? 'invalid-field' : ''}`}
                                                                value={item.description} 
                                                                onChange={e => handleImportRowChange(item.id, 'description', e.target.value)}
                                                                placeholder="Description..."
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Action button counts */}
                                    <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
                                        <button 
                                            type="button" 
                                            className="btn" 
                                            onClick={() => setShowImportModal(false)}
                                            disabled={importLoading}
                                        >
                                            {t('finance.cancel_btn')}
                                        </button>
                                        <button 
                                            type="button" 
                                            className="btn btn-primary" 
                                            onClick={handleSaveImport}
                                            disabled={importLoading || parsedTransactions.filter(item => item.selected && item.valid).length === 0}
                                        >
                                            🚀 {t('finance.import_confirm_btn').replace('{count}', parsedTransactions.filter(item => item.selected && item.valid).length)}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
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
