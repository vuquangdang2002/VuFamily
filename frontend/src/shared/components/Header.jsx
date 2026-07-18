import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Search, Users, Network, Download, Upload, RotateCcw, X, Plus, ChevronDown, User as UserIcon, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Header.css';

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
        <header className="header-container">
            {/* Left: Search */}
            <div className="header-search-wrapper">
                <div className="header-search-box">
                    <div className="header-search-icon">
                        <Search size={18} />
                    </div>
                    <input 
                        className="header-search-input" 
                        placeholder={t('header.search_placeholder') || 'Tìm kiếm thành viên...'} 
                        value={query}
                        onChange={e => handleSearch(e.target.value)} 
                        onFocus={() => query && setShowResults(true)} 
                        onClick={e => e.stopPropagation()}
                    />
                    {query && (
                        <button className="header-search-clear" onClick={clearSearch}>
                            <X size={16}/>
                        </button>
                    )}
                </div>

                {/* Search Results Dropdown */}
                <AnimatePresence>
                    {showResults && query && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.98 }} 
                            animate={{ opacity: 1, y: 0, scale: 1 }} 
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            className="header-search-dropdown custom-scrollbar"
                            onClick={e => e.stopPropagation()}
                        >
                            {searchResults.length === 0 ? (
                                <div className="header-search-empty">Không tìm thấy "{query}"</div>
                            ) : (
                                searchResults.map(m => (
                                    <button 
                                        key={m.id} 
                                        className="header-search-result-btn" 
                                        onClick={() => handleResultClick(m)}
                                    >
                                        <div className={`header-search-avatar ${m.gender === 1 ? 'male' : 'female'}`}>
                                            <UserIcon size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm text-zinc-900 dark:text-white truncate">{m.name}</div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                                {m.birthYear || '?'} {m.birthPlace ? `- ${m.birthPlace}` : ''}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Center: Stats */}
            <div className="header-stats-group">
                <div className="header-stat-item">
                    <div className="header-stat-icon users"><Users size={14} /></div>
                    {stats.totalMembers} <span className="text-zinc-500 font-medium">{t('header.members_label') || 'Thành viên'}</span>
                </div>
                <div className="header-stat-divider" />
                <div className="header-stat-item">
                    <div className="header-stat-icon network"><Network size={14} /></div>
                    {stats.totalGenerations} <span className="text-zinc-500 font-medium">{t('header.generations_label') || 'Thế hệ'}</span>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="header-actions-group no-scrollbar">
                {isAdmin && onAddRoot && (
                    <button className="header-action-btn-primary" onClick={onAddRoot}>
                        <Plus size={16} /> <span className="hidden sm:inline">{t('header.add_root')}</span>
                    </button>
                )}

                {/* ── Export Dropdown ── */}
                {isAdmin && onExport && (
                    <div className="relative shrink-0" ref={exportMenuRef}>
                        <button className="header-action-btn-secondary" onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); setShowImportMenu(false); }}>
                            <Download size={16} /> <span className="hidden xl:inline">{t('header.export')}</span> <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {showExportMenu && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }} 
                                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                    className="header-dropdown-menu"
                                >
                                    <button className="header-dropdown-item" onClick={() => { onExport('json'); setShowExportMenu(false); }}>
                                        {t('header.export_json') || 'Xuất JSON'}
                                    </button>
                                    <button className="header-dropdown-item" onClick={() => { onExport('csv'); setShowExportMenu(false); }}>
                                        {t('header.export_csv') || 'Xuất CSV'}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* ── Import Dropdown ── */}
                {isAdmin && onImport && (
                    <div className="relative shrink-0" ref={importMenuRef}>
                        <button className="header-action-btn-secondary" onClick={(e) => { e.stopPropagation(); setShowImportMenu(!showImportMenu); setShowExportMenu(false); }}>
                            <Upload size={16} /> <span className="hidden xl:inline">{t('header.import')}</span> <ChevronDown size={14} className={`transition-transform ${showImportMenu ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {showImportMenu && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }} 
                                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                    className="header-dropdown-menu"
                                >
                                    <button className="header-dropdown-item" onClick={() => fileJsonRef.current?.click()}>
                                        {t('header.import_json') || 'Nhập JSON'}
                                    </button>
                                    <button className="header-dropdown-item" onClick={() => fileCsvRef.current?.click()}>
                                        {t('header.import_csv') || 'Nhập CSV'}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {isAdmin && onReset && (
                    <button className="header-action-btn-danger" onClick={onReset} title={t('header.reset_title')}>
                        <RotateCcw size={18} />
                    </button>
                )}
                
                <input ref={fileJsonRef} type="file" accept=".json" className="hidden" onChange={handleImportJson} />
                <input ref={fileCsvRef} type="file" accept=".csv" className="hidden" onChange={handleImportCsv} />
            </div>
        </header>
    );
}
