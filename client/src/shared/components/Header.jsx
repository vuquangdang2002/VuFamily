import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';

export default function Header({ stats, onSearch, searchResults, onSelectResult, onAddRoot, onExport, onExportCSV, onImport, onReset, isAdmin }) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showImportMenu, setShowImportMenu] = useState(false);
    const fileJsonRef = useRef(null);
    const fileCsvRef = useRef(null);
    const exportMenuRef = useRef(null);
    const importMenuRef = useRef(null);

    const handleSearch = (val) => { setQuery(val); onSearch(val); setShowResults(val.length > 0); };
    const clearSearch = () => { setQuery(''); onSearch(''); setShowResults(false); };
    const handleResultClick = (member) => { onSelectResult(member); clearSearch(); };
    const handleImportJson = (e) => { if (e.target.files[0]) { onImport(e.target.files[0], 'json'); e.target.value = ''; } setShowImportMenu(false); };
    const handleImportCsv = (e) => { if (e.target.files[0]) { onImport(e.target.files[0], 'csv'); e.target.value = ''; } setShowImportMenu(false); };

    useEffect(() => {
        const close = (e) => {
            setShowResults(false);
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setShowExportMenu(false);
            if (importMenuRef.current && !importMenuRef.current.contains(e.target)) setShowImportMenu(false);
        };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, []);

    return (
        <header className="header">
            <div className="header-left">
                <div className="search-container" onClick={e => e.stopPropagation()}>
                    <div className="search-wrapper">
                        <span className="search-icon">🔍</span>
                        <input className="search-input" placeholder={t('header.search_placeholder')} value={query}
                            onChange={e => handleSearch(e.target.value)} onFocus={() => query && setShowResults(true)} />
                        {query && <button className="btn-clear-search" onClick={clearSearch}>✕</button>}
                    </div>
                    <div className={`search-results ${showResults && query ? 'open' : ''}`}>
                        {searchResults.length === 0 && <div className="search-empty">{t('header.no_results')}</div>}
                        {searchResults.map(m => (
                            <div key={m.id} className="search-item" onClick={() => handleResultClick(m)}>
                                <span className="search-item-icon">{m.gender === 1 ? '👨' : '👩'}</span>
                                <div>
                                    <div className="search-item-name">{m.name}</div>
                                    <div className="search-item-info">{m.birthPlace || ''}{m.occupation ? ` · ${m.occupation}` : ''}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="header-center">
                <div className="stat-badge">👥 <span className="stat-value">{stats.totalMembers}</span> {t('header.members_label')}</div>
                <div className="stat-badge">📊 <span className="stat-value">{stats.totalGenerations}</span> {t('header.generations_label')}</div>
            </div>

            <div className="header-right">
                {isAdmin && onAddRoot && <button className="btn btn-primary" onClick={onAddRoot}>{t('header.add_root')}</button>}

                {/* ── Export Dropdown ── */}
                {isAdmin && onExport && (
                    <div className="header-dropdown" ref={exportMenuRef} onClick={e => e.stopPropagation()}>
                        <button className="btn" onClick={() => { setShowExportMenu(!showExportMenu); setShowImportMenu(false); }} title={t('header.export')}>
                            {t('header.export')}
                        </button>
                        {showExportMenu && (
                            <div className="header-dropdown-menu">
                                <button className="header-dropdown-item" onClick={() => { onExport('json'); setShowExportMenu(false); }}>
                                    {t('header.export_json')}
                                </button>
                                <button className="header-dropdown-item" onClick={() => { onExport('csv'); setShowExportMenu(false); }}>
                                    {t('header.export_csv')}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Import Dropdown ── */}
                {isAdmin && onImport && (
                    <div className="header-dropdown" ref={importMenuRef} onClick={e => e.stopPropagation()}>
                        <button className="btn" onClick={() => { setShowImportMenu(!showImportMenu); setShowExportMenu(false); }} title={t('header.import')}>
                            {t('header.import')}
                        </button>
                        {showImportMenu && (
                            <div className="header-dropdown-menu">
                                <button className="header-dropdown-item" onClick={() => fileJsonRef.current?.click()}>
                                    {t('header.import_json')}
                                </button>
                                <button className="header-dropdown-item" onClick={() => fileCsvRef.current?.click()}>
                                    {t('header.import_csv')}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {isAdmin && onReset && <button className="btn btn-danger" onClick={onReset} title={t('header.reset_title')}>🔄</button>}
                <input ref={fileJsonRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportJson} />
                <input ref={fileCsvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCsv} />
            </div>
        </header>
    );
}
