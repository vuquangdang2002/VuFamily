import React, { useState, useRef } from 'react';
import { api } from '../../shared/services/api';
import { useFinanceData } from './useFinanceData';
import FinanceImportModal from './FinanceImportModal';
import { Landmark, TrendingUp, TrendingDown, Upload, Download, Plus, Trash2, History, X, Search, DollarSign, PieChart, BarChart3, ChevronDown, CheckCircle2 } from 'lucide-react';

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
        <div className="h-full w-full p-4 md:p-6 lg:p-8 overflow-y-auto block space-y-6 relative" ref={chartCardRef}>
            {/* Decorative glow blobs */}
            <div className="pointer-events-none fixed top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-[#fe6e00]/5 rounded-full blur-[100px] mix-blend-screen" />
            </div>
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2 shrink-0">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                        <span className="text-emerald-500">💰</span> {t('finance.title')}
                    </h2>
                    <p className="text-sm md:text-base font-medium text-zinc-500 dark:text-zinc-400">{t('finance.subtitle')}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {isEditorOrAdmin && (
                        <>
                            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-white/10 shadow-sm transition-all" onClick={() => handleExportCSV(categories)}>
                                <Upload size={16} /> <span className="hidden sm:inline">{t('finance.export_btn')}</span>
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-white/10 shadow-sm transition-all" onClick={() => { setShowImportModal(true); setParsedTransactions([]); setGoogleSheetUrl(''); }}>
                                <Download size={16} /> <span className="hidden sm:inline">{t('finance.import_btn')}</span>
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition-all" onClick={() => setShowAddModal(true)}>
                                <Plus size={16} /> {t('finance.add_transaction')}
                            </button>
                        </>
                    )}
                    {isAdmin && (
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] bg-zinc-800 text-white dark:bg-white dark:text-black hover:bg-black dark:hover:bg-zinc-200 shadow-sm transition-all" onClick={() => setShowLogsModal(true)}>
                            <History size={16} /> <span className="hidden sm:inline">{t('finance.audit_logs_btn')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Balance Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 shrink-0">
                <div className="rounded-[1.5rem] p-5 shadow-sm bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-black/5 dark:border-white/10 flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-80" />
                    <div className="w-12 h-12 rounded-[1rem] bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <Landmark size={24} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-0.5">{t('finance.total_balance')}</span>
                        <span className={`text-2xl font-black tracking-tight ${currentBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {formatCurrency(currentBalance)}
                        </span>
                    </div>
                </div>
                
                <div className="rounded-[1.5rem] p-5 shadow-sm bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-black/5 dark:border-white/10 flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-80" />
                    <div className="w-12 h-12 rounded-[1rem] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <TrendingUp size={24} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-0.5">{t('finance.total_income')}</span>
                        <span className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(totalIncome)}
                        </span>
                    </div>
                </div>

                <div className="rounded-[1.5rem] p-5 shadow-sm bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-black/5 dark:border-white/10 flex items-center gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-pink-500 opacity-80" />
                    <div className="w-12 h-12 rounded-[1rem] bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                        <TrendingDown size={24} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-0.5">{t('finance.total_expense')}</span>
                        <span className="text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
                            {formatCurrency(totalExpense)}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Analytics Charts ── */}
            <div className="rounded-[1.5rem] p-5 shadow-sm bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-black/5 dark:border-white/10 flex flex-col gap-6 shrink-0">
                <h3 className="text-[16px] font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                    <PieChart size={18} className="text-blue-500" /> {t('finance.analytics_title')}
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Donut Chart */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[14px] font-bold text-zinc-700 dark:text-zinc-300">
                                {donutType === 'EXPENSE' ? t('finance.chart_breakdown_expense') : t('finance.chart_breakdown_income')}
                            </h4>
                            <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg">
                                <button className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${donutType === 'EXPENSE' ? 'bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-zinc-500'}`} onClick={() => setDonutType('EXPENSE')}>
                                    {t('finance.type_expense')}
                                </button>
                                <button className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${donutType === 'INCOME' ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-zinc-500'}`} onClick={() => setDonutType('INCOME')}>
                                    {t('finance.type_income')}
                                </button>
                            </div>
                        </div>

                        {totalDonutAmount === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[200px] w-full text-zinc-400 bg-black/5 dark:bg-white/5 rounded-xl border border-dashed border-black/10 dark:border-white/10 shrink-0">
                                <PieChart size={32} className="opacity-50 mb-2" />
                                <span className="text-sm font-medium">{t('finance.chart_no_data')}</span>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-center gap-8 h-full">
                                <div className="relative w-[180px] h-[180px] shrink-0">
                                    <svg width="180" height="180" viewBox="0 0 160 160">
                                        <circle cx="80" cy="80" r="50" fill="transparent" stroke="var(--bg-secondary)" strokeWidth="16" className="stroke-zinc-100 dark:stroke-zinc-800" />
                                        {donutSlices.map(slice => (
                                            <circle key={slice.key} cx="80" cy="80" r="50" fill="transparent" stroke={slice.color} strokeWidth="16"
                                                strokeDasharray={slice.dashArray} strokeDashoffset={slice.dashOffset}
                                                transform="rotate(-90 80 80)" className="transition-all duration-300 hover:stroke-[20px] cursor-pointer"
                                                onMouseEnter={() => setHoveredSlice({ label: slice.label, amount: slice.amount, percent: slice.percent, color: slice.color })}
                                                onMouseLeave={() => setHoveredSlice(null)} onMouseMove={handleMouseMove} />
                                        ))}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total</span>
                                        <span className="text-[15px] font-black text-zinc-900 dark:text-white mt-0.5">{formatCurrency(totalDonutAmount).split(',')[0]}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap sm:flex-col gap-2 flex-1 max-h-[180px] overflow-y-auto pr-2">
                                    {donutSlices.map(slice => (
                                        <div key={slice.key} className="flex items-center justify-between gap-3 text-[12px] font-medium text-zinc-600 dark:text-zinc-300 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg w-full">
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: slice.color }} />
                                                <span className="truncate">{slice.label}</span>
                                            </div>
                                            <span className="font-bold">{slice.percent.toFixed(0)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bar Chart */}
                    <div className="flex flex-col gap-4">
                        <h4 className="text-[14px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                            <BarChart3 size={16} className="text-indigo-500" /> {t('finance.chart_monthly_trend')}
                        </h4>
                        
                        <div className="relative w-full h-[200px]">
                            <svg width="100%" height="200" viewBox="0 0 360 200" preserveAspectRatio="none" className="w-full h-full block">
                                <line x1="30" y1="30" x2="340" y2="30" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" className="text-black/10 dark:text-white/10" />
                                <line x1="30" y1="90" x2="340" y2="90" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" className="text-black/10 dark:text-white/10" />
                                <line x1="30" y1="150" x2="340" y2="150" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" className="text-black/10 dark:text-white/10" />
                                <line x1="30" y1="170" x2="340" y2="170" stroke="currentColor" strokeWidth="1" className="text-black/20 dark:text-white/20" />
                                
                                {monthlyData.map((m, idx) => {
                                    const maxBarHeight = 130;
                                    const incomeHeight = (m.income / maxMonthlyVal) * maxBarHeight;
                                    const expenseHeight = (m.expense / maxMonthlyVal) * maxBarHeight;
                                    // Calculate dynamic spacing based on SVG width
                                    const availableWidth = 310;
                                    const barGroupWidth = 30; // 12 + 3 + 12 + margin
                                    const spacing = Math.max((availableWidth - (monthlyData.length * barGroupWidth)) / (monthlyData.length + 1), 5);
                                    const startX = 40 + (idx * (barGroupWidth + spacing));

                                    return (
                                        <g key={idx}>
                                            <rect x={startX} y={170 - incomeHeight} width="12" height={Math.max(1, incomeHeight)} fill="#10b981" rx="2" className="cursor-pointer hover:opacity-80 transition-opacity"
                                                onMouseEnter={() => setHoveredBar({ monthName: m.monthName, type: t('finance.type_income'), amount: m.income })}
                                                onMouseLeave={() => setHoveredBar(null)} onMouseMove={handleMouseMove} />
                                            <rect x={startX + 14} y={170 - expenseHeight} width="12" height={Math.max(1, expenseHeight)} fill="#f43f5e" rx="2" className="cursor-pointer hover:opacity-80 transition-opacity"
                                                onMouseEnter={() => setHoveredBar({ monthName: m.monthName, type: t('finance.type_expense'), amount: m.expense })}
                                                onMouseLeave={() => setHoveredBar(null)} onMouseMove={handleMouseMove} />
                                            <text x={startX + 13} y="186" fill="currentColor" fontSize="10" textAnchor="middle" fontWeight="700" className="text-zinc-500">{m.monthName}</text>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] font-bold text-zinc-500 px-4">
                            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span>{t('finance.type_income')}</span></div>
                            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /><span>{t('finance.type_expense')}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Chart Tooltips ── */}
            {hoveredSlice && (
                <div className="absolute z-50 p-3 rounded-xl bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-black shadow-xl backdrop-blur-sm pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-10px]" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                    <div className="flex items-center gap-2 font-bold text-[13px] mb-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: hoveredSlice.color }} />{hoveredSlice.label}
                    </div>
                    <div className="text-[14px]"><strong>{formatCurrency(hoveredSlice.amount)}</strong> <span className="opacity-75">({hoveredSlice.percent.toFixed(1)}%)</span></div>
                </div>
            )}
            {hoveredBar && (
                <div className="absolute z-50 p-3 rounded-xl bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-black shadow-xl backdrop-blur-sm pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-10px]" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
                    <div className="font-bold text-[13px] mb-1">{hoveredBar.monthName}</div>
                    <div className="text-[14px] flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${hoveredBar.type === t('finance.type_income') ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{hoveredBar.type}:</span> <strong>{formatCurrency(hoveredBar.amount)}</strong>
                    </div>
                </div>
            )}

            {/* ── Transactions & Category List ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 shrink-0">
                
                {/* Transaction List */}
                <div className="xl:col-span-2 rounded-[1.5rem] p-5 shadow-sm bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-black/5 dark:border-white/10 flex flex-col gap-4">
                    <h3 className="text-[16px] font-extrabold text-zinc-900 dark:text-white flex items-center gap-2 mb-2">
                        <History size={18} className="text-amber-500" /> {t('finance.recent_activity')}
                    </h3>
                    
                    {transactions.length > 0 && (
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                            <input type="text" className="w-full bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-[14px] font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50" placeholder={t('finance.search_placeholder')} value={financeSearchQuery} onChange={e => setFinanceSearchQuery(e.target.value)} />
                        </div>
                    )}
                    
                    {loading ? (
                        <div className="py-12 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-zinc-400 bg-white/40 dark:bg-white/5 rounded-xl border border-dashed border-black/10 dark:border-white/10">
                            <DollarSign size={32} className="opacity-50 mb-2" />
                            <span className="text-sm font-medium">{t('finance.no_transactions')}</span>
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="py-12 text-center text-sm font-medium text-zinc-500 bg-white/40 dark:bg-white/5 rounded-xl border border-dashed border-black/10 dark:border-white/10">
                            {t('finance.no_search_result')}
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/20">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-black/5 dark:bg-white/5 text-[11px] font-black text-zinc-500 uppercase tracking-wider">
                                        <th className="p-4 rounded-tl-xl">{t('finance.col_date')}</th>
                                        <th className="p-4">{t('finance.col_description')}</th>
                                        <th className="p-4">{t('finance.col_category')}</th>
                                        <th className="p-4">{t('finance.col_amount')}</th>
                                        {isAdmin && <th className="p-4 rounded-tr-xl w-12 text-center">{t('finance.col_action')}</th>}
                                    </tr>
                                </thead>
                                <tbody className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 divide-y divide-black/5 dark:divide-white/5">
                                    {filteredTransactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-white/60 dark:hover:bg-white/5 transition-colors group">
                                            <td className="p-4 whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString('vi-VN')}</td>
                                            <td className="p-4 min-w-[200px]">
                                                <div className="font-bold text-zinc-900 dark:text-white mb-0.5">{tx.description}</div>
                                                <div className="text-[11px] text-zinc-500">{t('finance.created_by')} {tx.created_by_user?.display_name || t('finance.system_user')}</div>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold" style={{ background: `${categories[tx.category]?.color}20`, color: categories[tx.category]?.color }}>
                                                    {categories[tx.category]?.label || t('finance.cat_other')}
                                                </span>
                                            </td>
                                            <td className={`p-4 whitespace-nowrap font-black ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </td>
                                            {isAdmin && (
                                                <td className="p-4 text-center">
                                                    <button className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent hover:bg-rose-50 text-zinc-400 hover:text-rose-500 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 transition-colors mx-auto opacity-0 group-hover:opacity-100" onClick={() => handleDelete(tx.id)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Category Breakdown List */}
                <div className="rounded-[1.5rem] p-5 shadow-sm bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-black/5 dark:border-white/10 flex flex-col gap-4">
                    <h3 className="text-[16px] font-extrabold text-zinc-900 dark:text-white flex items-center gap-2 mb-2">
                        <PieChart size={18} className="text-teal-500" /> {t('finance.cat_breakdown')}
                    </h3>
                    
                    <div className="flex flex-col gap-5 overflow-y-auto pr-2 max-h-[500px]">
                        {Object.entries(categories).map(([key, cat]) => {
                            const pct = totalIncome > 0 ? Math.max(0, Math.min(100, (cat.amount / totalIncome) * 100)) : 0;
                            return (
                                <div key={key} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between text-[13px]">
                                        <div className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-200">
                                            <span className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                                            {cat.label}
                                        </div>
                                        <span className="font-black text-zinc-900 dark:text-white">{formatCurrency(cat.amount)}</span>
                                    </div>
                                    <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500" style={{ background: cat.color, width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Add Transaction Modal ── */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform scale-100" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-white/5">
                            <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                                <Plus size={20} className="text-emerald-500" /> {t('finance.modal_add_title')}
                            </h2>
                            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-500 transition-colors" onClick={() => setShowAddModal(false)}>
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={async (e) => { e.preventDefault(); const ok = await handleCreateTransaction(formData); if (ok) { setFormData({ type: 'INCOME', amount: '', category: 'other', description: '' }); setShowAddModal(false); } }} className="p-6 flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">{t('finance.type_label')}</label>
                                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/5 dark:bg-white/5">
                                    <button type="button" className={`py-2.5 rounded-lg text-[13px] font-bold transition-all ${formData.type === 'INCOME' ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-zinc-500'}`} onClick={() => setFormData(p => ({ ...p, type: 'INCOME' }))}>
                                        {t('finance.type_income')}
                                    </button>
                                    <button type="button" className={`py-2.5 rounded-lg text-[13px] font-bold transition-all ${formData.type === 'EXPENSE' ? 'bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-zinc-500'}`} onClick={() => setFormData(p => ({ ...p, type: 'EXPENSE' }))}>
                                        {t('finance.type_expense')}
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">{t('finance.amount_label')}</label>
                                <div className="relative">
                                    <DollarSign size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                                    <input type="number" className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-[15px] font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" name="amount" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} placeholder={t('finance.amount_placeholder')} required />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">{t('finance.category_label')}</label>
                                <div className="relative">
                                    <select className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none" name="category" value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}>
                                        {Object.entries(categories).map(([key, cat]) => <option key={key} value={key}>{cat.label}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">{t('finance.description_label')}</label>
                                <textarea className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-[14px] font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y min-h-[80px]" name="description" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder={t('finance.description_placeholder')} rows={3} required />
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button type="button" className="flex-1 py-3 rounded-xl font-bold text-[14px] bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/10 transition-colors" onClick={() => setShowAddModal(false)}>{t('finance.cancel_btn')}</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-[14px] bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition-colors flex items-center justify-center gap-2">
                                    <CheckCircle2 size={18} /> {t('finance.submit_btn')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Import Modal ── */}
            {showImportModal && (
                <FinanceImportModal
                    categories={categories} parsedTransactions={parsedTransactions}
                    setParsedTransactions={setParsedTransactions} importLoading={importLoading}
                    importProgress={importProgress} googleSheetUrl={googleSheetUrl}
                    setGoogleSheetUrl={setGoogleSheetUrl} onClose={() => setShowImportModal(false)}
                    onSave={handleSaveImport} addToast={addToast}
                />
            )}

            {/* ── Audit Logs Modal ── */}
            {showLogsModal && isAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowLogsModal(false)}>
                    <div className="bg-white dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-white/5">
                            <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                                <History size={20} className="text-zinc-500" /> {t('finance.audit_title')}
                            </h2>
                            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-500 transition-colors" onClick={() => setShowLogsModal(false)}>
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-zinc-50/30 dark:bg-black/20">
                            <p className="text-[13px] font-medium text-zinc-500 mb-4">{t('finance.audit_description')}</p>
                            
                            <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-md">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-black/5 dark:bg-white/5 text-[11px] font-black text-zinc-500 uppercase tracking-wider">
                                            <th className="p-4 rounded-tl-xl">{t('finance.audit_col_time')}</th>
                                            <th className="p-4">{t('finance.audit_col_action')}</th>
                                            <th className="p-4">{t('finance.audit_col_user')}</th>
                                            <th className="p-4 rounded-tr-xl">{t('finance.audit_col_amount')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 divide-y divide-black/5 dark:divide-white/5">
                                        {auditLogs.map(log => {
                                            let actionBg = 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
                                            if (log.action === 'CREATED') actionBg = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
                                            if (log.action === 'UPDATED') actionBg = 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
                                            if (log.action === 'DELETED') actionBg = 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';

                                            return (
                                                <tr key={log.id} className="hover:bg-white dark:hover:bg-white/5 transition-colors">
                                                    <td className="p-4 whitespace-nowrap text-zinc-500">{new Date(log.modified_at).toLocaleString('vi-VN')}</td>
                                                    <td className="p-4 whitespace-nowrap">
                                                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${actionBg}`}>
                                                            {AUDIT_ACTION_MAP[log.action] || log.action}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-bold">{log.modified_by_user?.display_name || t('finance.audit_unknown')}</td>
                                                    <td className="p-4 min-w-[200px]">
                                                        {log.action === 'CREATED' && <span>{t('finance.audit_new_amount')} <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(log.new_amount)}</strong></span>}
                                                        {log.action === 'UPDATED' && <span className="flex items-center gap-2"><span className="line-through opacity-50">{formatCurrency(log.old_amount)}</span> <span>→</span> <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(log.new_amount)}</strong></span>}
                                                        {log.action === 'DELETED' && <span>{t('finance.audit_old_deleted')} <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(log.old_amount)}</strong></span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
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
