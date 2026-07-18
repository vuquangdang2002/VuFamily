import React from 'react';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { X, UploadCloud, Link as LinkIcon, AlertTriangle, CheckCircle2, FileSpreadsheet } from 'lucide-react';

// CSV parser utility
function parseCSV(text) {
    const lines = [];
    let row = [""];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const next = text[i + 1];
        if (c === '"') {
            if (inQuotes && next === '"') { row[row.length - 1] += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
            row.push("");
        } else if ((c === '\r' || c === '\n') && !inQuotes) {
            if (c === '\r' && next === '\n') i++;
            lines.push(row); row = [""];
        } else {
            row[row.length - 1] += c;
        }
    }
    if (row.length > 1 || row[0] !== "") lines.push(row);
    return lines.filter(l => l.some(cell => cell.trim()));
}

function resolveGoogleSheetsUrl(url) {
    if (url.includes('docs.google.com/spreadsheets')) {
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1])
            return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }
    return url;
}

function mapCategory(val) {
    const clean = (s) => (s || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const text = clean(val);
    if (text.includes('khuyen hoc') || text.includes('education')) return 'education';
    if (text.includes('gio') || text.includes('memorial') || text.includes('anniversary') || text.includes('chap')) return 'death_anniversary';
    if (text.includes('du lich') || text.includes('travel') || text.includes('choi')) return 'travel';
    if (text.includes('xay') || text.includes('construction') || text.includes('nha tho')) return 'construction';
    if (text.includes('khen') || text.includes('award') || text.includes('thuong')) return 'award';
    return 'other';
}

function mapType(val) {
    const text = (val || '').toLowerCase().trim();
    if (text.includes('chi') || text.includes('expense') || text === '-' || text.includes('out')) return 'EXPENSE';
    return 'INCOME';
}

export default function FinanceImportModal({
    categories, parsedTransactions, setParsedTransactions,
    importLoading, importProgress, googleSheetUrl, setGoogleSheetUrl,
    onClose, onSave, addToast
}) {
    const { t } = useTranslation();

    const parseLoadedCSV = (text) => {
        const lines = parseCSV(text);
        if (lines.length < 2) { addToast(t('app.csv_empty'), 'error'); return; }
        const headerRow = lines[0];
        const mapping = { typeIdx: -1, amountIdx: -1, categoryIdx: -1, descIdx: -1 };
        const clean = (s) => (s || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        headerRow.forEach((col, idx) => {
            const name = clean(col);
            if (name.includes('loai') || name.includes('type')) mapping.typeIdx = idx;
            else if (name.includes('tien') || name.includes('amount') || name.includes('so tien')) mapping.amountIdx = idx;
            else if (name.includes('muc') || name.includes('category') || name.includes('danh muc')) mapping.categoryIdx = idx;
            else if (name.includes('mo ta') || name.includes('description') || name.includes('dien giai') || name.includes('noi dung')) mapping.descIdx = idx;
        });
        if (mapping.typeIdx === -1) mapping.typeIdx = 0;
        if (mapping.amountIdx === -1) mapping.amountIdx = 1;
        if (mapping.categoryIdx === -1) mapping.categoryIdx = 2;
        if (mapping.descIdx === -1) mapping.descIdx = 3;
        const items = lines.slice(1).map((row, index) => {
            const amountRaw = row[mapping.amountIdx] || '';
            const cleanAmount = parseFloat(amountRaw.replace(/[^0-9.-]/g, ''));
            const type = mapType(row[mapping.typeIdx] || '');
            const category = mapCategory(row[mapping.categoryIdx] || '');
            const description = (row[mapping.descIdx] || '').trim();
            const amount = isNaN(cleanAmount) ? 0 : cleanAmount;
            const valid = amount > 0 && description.length > 0;
            return { id: `import-${index}-${Date.now()}`, type, amount, category, description, selected: valid, valid };
        });
        setParsedTransactions(items);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => { if (ev.target?.result) parseLoadedCSV(ev.target.result); };
        reader.readAsText(file);
    };

    const handleLoadSheet = async () => {
        if (!googleSheetUrl.trim()) return;
        try {
            const fetchUrl = resolveGoogleSheetsUrl(googleSheetUrl);
            const res = await fetch(fetchUrl);
            const text = await res.text();
            parseLoadedCSV(text);
        } catch { addToast(t('finance.offline_warning'), 'error'); }
    };

    const handleRowChange = (id, field, value) => {
        setParsedTransactions(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: field === 'amount' ? (parseFloat(value) || 0) : value };
            updated.valid = updated.amount > 0 && updated.description.trim().length > 0;
            return updated;
        }));
    };

    const handleRowSelect = (id) =>
        setParsedTransactions(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item));

    const validCount = parsedTransactions.filter(item => item.selected && item.valid).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => !importLoading && onClose()}>
            <div className="bg-white dark:bg-[#111111] border border-black/10 dark:border-white/10 rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transform scale-100" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-white/5 shrink-0">
                    <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                        <FileSpreadsheet size={20} className="text-blue-500" /> {t('finance.import_modal_title')}
                    </h2>
                    <button className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-500 transition-colors" onClick={() => !importLoading && onClose()}>
                        <X size={16} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 relative">
                    {importLoading && importProgress.total > 0 && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-b-[2rem]">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <div className="text-[15px] font-bold text-zinc-900 dark:text-white">
                                {t('finance.import_processing').replace('{current}', importProgress.current).replace('{total}', importProgress.total)}
                            </div>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-500/20 rounded-2xl cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors text-center group" onClick={() => document.getElementById('import-file-input').click()}>
                            <input type="file" id="import-file-input" accept=".csv" onChange={handleFileSelect} className="hidden" />
                            <div className="w-12 h-12 rounded-full bg-white dark:bg-black flex items-center justify-center text-blue-500 mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                <UploadCloud size={24} />
                            </div>
                            <div className="text-[14px] font-bold text-blue-700 dark:text-blue-400 mb-1">{t('finance.import_select_file')}</div>
                            <div className="text-[11px] font-medium text-blue-500/70">CSV (Unicode, UTF-8)</div>
                        </div>
                        
                        <div className="flex flex-col justify-center p-6 bg-zinc-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <LinkIcon size={14} /> {t('finance.import_google_sheet')}
                            </label>
                            <div className="flex flex-col gap-3">
                                <input type="url" className="w-full bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-[14px] font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50" placeholder={t('finance.import_google_sheet_placeholder')} value={googleSheetUrl} onChange={e => setGoogleSheetUrl(e.target.value)} />
                                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleLoadSheet} disabled={importLoading || !googleSheetUrl.trim()}>
                                    ⚡ {t('finance.import_load_btn')}
                                </button>
                            </div>
                            <div className="flex items-start gap-1.5 mt-3 text-[11px] font-medium text-amber-600 dark:text-amber-500">
                                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                <span>{t('finance.import_google_sheet_hint')}</span>
                            </div>
                        </div>
                    </div>
                    
                    {parsedTransactions.length > 0 && (
                        <div className="flex flex-col gap-3 mt-4 border-t border-black/5 dark:border-white/5 pt-6">
                            <h4 className="text-[14px] font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center text-xs">{parsedTransactions.length}</span>
                                {t('finance.import_preview_title').replace('{count}', '')}
                            </h4>
                            
                            <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-md">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="bg-black/5 dark:bg-white/5 text-[11px] font-black text-zinc-500 uppercase tracking-wider">
                                            <th className="p-3 w-12 text-center rounded-tl-xl">{t('finance.import_col_select')}</th>
                                            <th className="p-3 w-[120px]">{t('finance.import_col_type')}</th>
                                            <th className="p-3 w-[140px]">{t('finance.import_col_amount')}</th>
                                            <th className="p-3 w-[160px]">{t('finance.import_col_category')}</th>
                                            <th className="p-3 rounded-tr-xl">{t('finance.import_col_description')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 divide-y divide-black/5 dark:divide-white/5">
                                        {parsedTransactions.map(item => (
                                            <tr key={item.id} className={`transition-colors ${!item.valid ? 'bg-rose-50/50 dark:bg-rose-900/10' : 'hover:bg-white dark:hover:bg-white/5'}`}>
                                                <td className="p-2 text-center">
                                                    <input type="checkbox" className="w-4 h-4 rounded border-black/20 text-blue-600 focus:ring-blue-500/50" checked={item.selected} onChange={() => item.valid && handleRowSelect(item.id)} disabled={!item.valid} />
                                                </td>
                                                <td className="p-2">
                                                    <select className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[12px] font-bold outline-none focus:ring-2 focus:ring-blue-500/50" value={item.type} onChange={e => handleRowChange(item.id, 'type', e.target.value)}>
                                                        <option value="INCOME">{t('finance.type_income').substring(0, 3)}</option>
                                                        <option value="EXPENSE">{t('finance.type_expense').substring(0, 3)}</option>
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" className={`w-full bg-white dark:bg-black border rounded-lg px-3 py-1.5 text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-500/50 ${item.amount <= 0 ? 'border-rose-300 dark:border-rose-800 text-rose-600' : 'border-black/10 dark:border-white/10'}`} value={item.amount === 0 ? '' : item.amount} onChange={e => handleRowChange(item.id, 'amount', e.target.value)} placeholder="0" />
                                                </td>
                                                <td className="p-2">
                                                    <select className="w-full bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[12px] font-bold outline-none focus:ring-2 focus:ring-blue-500/50" value={item.category} onChange={e => handleRowChange(item.id, 'category', e.target.value)}>
                                                        {Object.entries(categories).map(([key, cat]) => <option key={key} value={key}>{cat.label}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <input type="text" className={`w-full bg-white dark:bg-black border rounded-lg px-3 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/50 ${item.description.trim().length === 0 ? 'border-rose-300 dark:border-rose-800' : 'border-black/10 dark:border-white/10'}`} value={item.description} onChange={e => handleRowChange(item.id, 'description', e.target.value)} placeholder="Description..." />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="flex items-center justify-end gap-3 mt-4 shrink-0">
                                <button type="button" className="px-5 py-2.5 rounded-xl font-bold text-[13px] bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/10 transition-colors" onClick={onClose} disabled={importLoading}>
                                    {t('finance.cancel_btn')}
                                </button>
                                <button type="button" className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-[13px] bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={onSave} disabled={importLoading || validCount === 0}>
                                    <CheckCircle2 size={16} /> {t('finance.import_confirm_btn').replace('{count}', validCount)}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
