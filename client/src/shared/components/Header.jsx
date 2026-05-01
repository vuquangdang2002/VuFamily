import { useState, useRef, useEffect } from 'react';

export default function Header({ stats, onSearch, searchResults, onSelectResult, onAddRoot, onExport, onExportCSV, onImport, onReset, isAdmin }) {
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
        <header className="flex items-center justify-between px-6 h-16 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-50 shrink-0 gap-4">
            {/* Left: Search */}
            <div className="flex-1 min-w-0 max-w-md">
                <div className="relative" onClick={e => e.stopPropagation()}>
                    <div className="relative flex items-center">
                        <span className="absolute left-3 text-slate-400">🔍</span>
                        <input 
                            className="w-full pl-10 pr-10 py-2 bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-black focus:bg-white dark:focus:bg-black rounded-xl text-sm transition-all text-black dark:text-white placeholder-slate-400 focus:ring-4 focus:ring-black/10 outline-none"
                            placeholder="Tìm kiếm thành viên..." 
                            value={query}
                            onChange={e => handleSearch(e.target.value)} 
                            onFocus={() => query && setShowResults(true)} 
                        />
                        {query && (
                            <button className="absolute right-3 text-slate-400 hover:text-slate-600" onClick={clearSearch}>✕</button>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {showResults && query && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                            {searchResults.length === 0 && <div className="p-4 text-center text-sm text-slate-500">Không tìm thấy</div>}
                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                {searchResults.map(m => (
                                    <div key={m.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors" onClick={() => handleResultClick(m)}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${m.gender === 1 ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400'}`}>
                                            {m.gender === 1 ? '👨' : '👩'}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-black dark:text-white truncate">{m.name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.birthPlace || ''}{m.occupation ? ` · ${m.occupation}` : ''}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Center: Stats */}
            <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span className="text-sm">👥</span>
                    <span className="font-bold text-black dark:text-white">{stats.totalMembers}</span> thành viên
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span className="text-sm">📊</span>
                    <span className="font-bold text-black dark:text-white">{stats.totalGenerations}</span> thế hệ
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
                {isAdmin && onAddRoot && (
                    <button className="px-4 py-2 bg-black hover:bg-slate-800 dark:bg-black dark:hover:bg-gray-900 text-white rounded-xl text-sm font-semibold transition-all shadow-sm" onClick={onAddRoot}>
                        ＋ Thêm gốc
                    </button>
                )}

                {isAdmin && onExport && (
                    <div className="relative" ref={exportMenuRef} onClick={e => e.stopPropagation()}>
                        <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium transition-all" onClick={() => { setShowExportMenu(!showExportMenu); setShowImportMenu(false); }}>
                            📥 Xuất
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-slate-700 dark:text-slate-200" onClick={() => { onExport('json'); setShowExportMenu(false); }}>📄 JSON</button>
                                <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-slate-700 dark:text-slate-200 border-t border-slate-100 dark:border-slate-700" onClick={() => { onExport('csv'); setShowExportMenu(false); }}>📊 CSV</button>
                            </div>
                        )}
                    </div>
                )}

                {isAdmin && onImport && (
                    <div className="relative" ref={importMenuRef} onClick={e => e.stopPropagation()}>
                        <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium transition-all" onClick={() => { setShowImportMenu(!showImportMenu); setShowExportMenu(false); }}>
                            📤 Nhập
                        </button>
                        {showImportMenu && (
                            <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-slate-700 dark:text-slate-200" onClick={() => fileJsonRef.current?.click()}>📄 JSON</button>
                                <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-slate-700 dark:text-slate-200 border-t border-slate-100 dark:border-slate-700" onClick={() => fileCsvRef.current?.click()}>📊 CSV</button>
                            </div>
                        )}
                    </div>
                )}

                {isAdmin && onReset && (
                    <button className="w-9 h-9 flex items-center justify-center bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl transition-all" onClick={onReset} title="Khôi phục dữ liệu mẫu">
                        🔄
                    </button>
                )}
                
                <input ref={fileJsonRef} type="file" accept=".json" className="hidden" onChange={handleImportJson} />
                <input ref={fileCsvRef} type="file" accept=".csv" className="hidden" onChange={handleImportCsv} />
            </div>
        </header>
    );
}
