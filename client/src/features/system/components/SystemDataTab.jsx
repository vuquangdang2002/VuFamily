import React, { useState } from 'react';
import { getApiBase } from '../../../shared/services/api';
import { AuthHelper } from '../../../shared/services/AuthHelper';
import { useTranslation } from '../../../shared/hooks/useTranslation';

export default function SystemDataTab({ addToast, fetchUsers }) {
    const { t } = useTranslation();
    const [exportFormat, setExportFormat] = useState('json');
    const [exportEncrypted, setExportEncrypted] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importEncrypted, setImportEncrypted] = useState(false);
    const [isProcessingDb, setIsProcessingDb] = useState(false);

    const allTables = ['members', 'achievements', 'users', 'posts', 'comments', 'reactions', 'chat_rooms', 'chat_room_members', 'messages', 'edit_history', 'pending_requests', 'funds_audit_logs', 'funds_transactions'];
    const [selectedTables, setSelectedTables] = useState(allTables);
    const [showTableModal, setShowTableModal] = useState(false);

    const handleExportDb = async () => {
        try {
            setIsProcessingDb(true);
            const res = await fetch(`${getApiBase()}/database/export?format=${exportFormat}&isEncrypted=${exportEncrypted}&tables=${selectedTables.join(',')}`, {
                headers: { 'x-auth-token': AuthHelper.getToken() }
            });
            if (!res.ok) {
                const text = await res.text();
                addToast(t('admin.export_fail') + ' ' + text, 'error');
                setIsProcessingDb(false);
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vufamily_backup_${new Date().toISOString().split('T')[0]}.${exportFormat}${exportEncrypted ? '_encrypted' : ''}.zip`;
            a.click();
            window.URL.revokeObjectURL(url);
            addToast(t('admin.export_success'));
        } catch (e) {
            addToast(t('admin.conn_error'), 'error');
        } finally {
            setIsProcessingDb(false);
        }
    };

    const handleImportDb = async () => {
        if (!importFile) {
            addToast(t('admin.import_file_required'), 'error');
            return;
        }
        if (!confirm(t('system.import_confirm'))) return;

        try {
            setIsProcessingDb(true);
            const formData = new FormData();
            formData.append('file', importFile);
            formData.append('isEncrypted', importEncrypted);
            formData.append('tables', selectedTables.join(','));

            const res = await fetch(`${getApiBase()}/database/import`, {
                method: 'POST',
                headers: { 'x-auth-token': AuthHelper.getToken() },
                body: formData
            });
            const json = await res.json();
            if (json.success) {
                addToast(json.message || t('admin.import_success'), 'success');
                setImportFile(null);
                fetchUsers?.();
            } else {
                addToast(json.error || t('admin.import_fail'), 'error');
            }
        } catch (e) {
            addToast(t('admin.conn_error'), 'error');
        } finally {
            setIsProcessingDb(false);
            const fileInput = document.getElementById('import-file-input');
            if (fileInput) fileInput.value = '';
        }
    };

    return (
        <div style={{ marginBottom: 24 }}>
            {/* Database section */}
            <div style={{ padding: 16, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)', flex: 1 }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>{t('system.db_title')}</h3>

                {/* Bảng dữ liệu được chọn */}
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                    <div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{t('system.selected_label')}</span>
                        <span style={{ fontSize: 13, color: 'var(--primary)', marginLeft: 8 }}>{selectedTables.length === allTables.length ? t('system.all_tables') : `${selectedTables.length} ${t('system.tables_count')}`}</span>
                    </div>
                    <button className="btn" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setShowTableModal(true)}>{t('system.config_tables')}</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Export */}
                    <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600 }}>{t('system.export_title')}</p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <select className="form-input" value={exportFormat} onChange={e => setExportFormat(e.target.value)} style={{ padding: '6px 10px', fontSize: 13, width: 90 }}>
                                <option value="json">JSON</option>
                                <option value="csv">CSV</option>
                            </select>
                            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input type="checkbox" checked={exportEncrypted} onChange={e => setExportEncrypted(e.target.checked)} />
                                {t('system.encrypt_content')}
                            </label>
                        </div>
                        <button className="btn btn-primary" onClick={handleExportDb} disabled={isProcessingDb} style={{ width: '100%', padding: '6px 0', fontSize: 13 }}>
                            {isProcessingDb ? t('system.processing') : t('system.export_btn')}
                        </button>
                    </div>

                    {/* Import */}
                    <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600 }}>{t('system.import_title')}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                            <input id="import-file-input" type="file" accept=".zip" onChange={e => setImportFile(e.target.files[0])} style={{ fontSize: 12, width: '100%' }} />
                            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input type="checkbox" checked={importEncrypted} onChange={e => setImportEncrypted(e.target.checked)} />
                                {t('system.decrypt_label')}
                            </label>
                        </div>
                        <button className="btn" onClick={handleImportDb} disabled={isProcessingDb || !importFile} style={{ width: '100%', padding: '6px 0', fontSize: 13, background: 'var(--accent-error)', color: '#fff', border: 'none' }}>
                            {isProcessingDb ? t('system.processing') : t('system.import_btn')}
                        </button>
                    </div>
                </div>
            </div>

            {/* DB Table Config Modal */}
            {showTableModal && (
                <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowTableModal(false)}>
                    <div className="modal" style={{ width: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h2>{t('system.table_config_title')}</h2>
                            <button className="detail-close" onClick={() => setShowTableModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ overflowY: 'auto' }}>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                                {t('system.table_config_desc')}
                            </p>

                            <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
                                <button className="btn" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setSelectedTables(allTables)}>{t('system.select_all')}</button>
                                <button className="btn" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setSelectedTables([])}>{t('system.deselect_all')}</button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                                {allTables.map(tb => (
                                    <label key={tb} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', padding: '6px 8px', borderRadius: 4, background: selectedTables.includes(tb) ? 'var(--bg-hover)' : 'transparent' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedTables.includes(tb)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedTables([...selectedTables, tb]);
                                                else setSelectedTables(selectedTables.filter(x => x !== tb));
                                            }}
                                        />
                                        {tb}
                                    </label>
                                ))}
                            </div>

                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="btn btn-primary" onClick={() => setShowTableModal(false)}>{t('system.done')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
