import React from 'react';
import { useTranslation } from '../../shared/hooks/useTranslation';

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
        <div className="modal-overlay open" onClick={() => !importLoading && onClose()}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 780, width: '90%' }}>
                <div className="modal-header">
                    <h2>📥 {t('finance.import_modal_title')}</h2>
                    <button className="detail-close" onClick={() => !importLoading && onClose()}>✕</button>
                </div>
                <div className="modal-body" style={{ position: 'relative' }}>
                    {importLoading && importProgress.total > 0 && (
                        <div className="progress-overlay">
                            <div className="progress-spinner"></div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>
                                {t('finance.import_processing').replace('{current}', importProgress.current).replace('{total}', importProgress.total)}
                            </div>
                        </div>
                    )}
                    <div className="import-upload-zone" onClick={() => document.getElementById('import-file-input').click()}>
                        <input type="file" id="import-file-input" accept=".csv" onChange={handleFileSelect} style={{ display: 'none' }} />
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{t('finance.import_select_file')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>CSV (Unicode, UTF-8)</div>
                    </div>
                    <div className="import-sheet-zone">
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>{t('finance.import_google_sheet')}</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <input type="url" className="form-input" placeholder={t('finance.import_google_sheet_placeholder')} value={googleSheetUrl} onChange={e => setGoogleSheetUrl(e.target.value)} style={{ flex: 1 }} />
                            <button className="btn btn-primary" onClick={handleLoadSheet} disabled={importLoading || !googleSheetUrl.trim()}>⚡ {t('finance.import_load_btn')}</button>
                        </div>
                        <small style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, display: 'block' }}>⚠️ {t('finance.import_google_sheet_hint')}</small>
                    </div>
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
                                            <tr key={item.id} className={!item.valid ? 'invalid-row' : ''}>
                                                <td style={{ textAlign: 'center' }}>
                                                    <input type="checkbox" checked={item.selected} onChange={() => item.valid && handleRowSelect(item.id)} disabled={!item.valid} />
                                                </td>
                                                <td>
                                                    <select className="form-input" value={item.type} onChange={e => handleRowChange(item.id, 'type', e.target.value)}>
                                                        <option value="INCOME">{t('finance.type_income').substring(0, 3)}</option>
                                                        <option value="EXPENSE">{t('finance.type_expense').substring(0, 3)}</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <input type="number" className={`form-input ${item.amount <= 0 ? 'invalid-field' : ''}`} value={item.amount === 0 ? '' : item.amount} onChange={e => handleRowChange(item.id, 'amount', e.target.value)} placeholder="Amount..." />
                                                </td>
                                                <td>
                                                    <select className="form-input" value={item.category} onChange={e => handleRowChange(item.id, 'category', e.target.value)}>
                                                        {Object.entries(categories).map(([key, cat]) => <option key={key} value={key}>{cat.label}</option>)}
                                                    </select>
                                                </td>
                                                <td>
                                                    <input type="text" className={`form-input ${item.description.trim().length === 0 ? 'invalid-field' : ''}`} value={item.description} onChange={e => handleRowChange(item.id, 'description', e.target.value)} placeholder="Description..." />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" onClick={onClose} disabled={importLoading}>{t('finance.cancel_btn')}</button>
                                <button type="button" className="btn btn-primary" onClick={onSave} disabled={importLoading || validCount === 0}>
                                    🚀 {t('finance.import_confirm_btn').replace('{count}', validCount)}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
