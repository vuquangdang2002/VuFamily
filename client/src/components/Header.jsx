import { useState, useRef, useEffect } from 'react';

export default function Header({ stats, onSearch, searchResults, onSelectResult, onAddRoot, onExport, onImport, onReset, isAdmin }) {
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const fileRef = useRef(null);

    const handleSearch = (val) => { setQuery(val); onSearch(val); setShowResults(val.length > 0); };
    const clearSearch = () => { setQuery(''); onSearch(''); setShowResults(false); };
    const handleResultClick = (member) => { onSelectResult(member); clearSearch(); };
    const handleImport = (e) => { if (e.target.files[0]) { onImport(e.target.files[0]); e.target.value = ''; } };

    useEffect(() => { const close = () => setShowResults(false); document.addEventListener('click', close); return () => document.removeEventListener('click', close); }, []);

    return (
        <header className="header">
            <div className="header-left">
                <div className="search-container" onClick={e => e.stopPropagation()}>
                    <div className="search-wrapper">
                        <span className="search-icon">🔍</span>
                        <input className="search-input" placeholder="Tìm kiếm thành viên..." value={query}
                            onChange={e => handleSearch(e.target.value)} onFocus={() => query && setShowResults(true)} />
                        {query && <button className="btn-clear-search" onClick={clearSearch}>✕</button>}
                    </div>
                    <div className={`search-results ${showResults && query ? 'open' : ''}`}>
                        {searchResults.length === 0 && <div className="search-empty">Không tìm thấy</div>}
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
                <div className="stat-badge">👥 <span className="stat-value">{stats.totalMembers}</span> thành viên</div>
                <div className="stat-badge">📊 <span className="stat-value">{stats.totalGenerations}</span> thế hệ</div>
            </div>

            <div className="header-right">
                {isAdmin && onAddRoot && <button className="btn btn-primary" onClick={onAddRoot}>＋ Thêm gốc</button>}
                {isAdmin && onExport && <button className="btn" onClick={onExport} title="Xuất dữ liệu (Backup)">📥 Xuất</button>}
                {isAdmin && onImport && <button className="btn" onClick={() => fileRef.current?.click()} title="Nhập dữ liệu">📤 Nhập</button>}
                {isAdmin && onReset && <button className="btn btn-danger" onClick={onReset} title="Khôi phục dữ liệu mẫu">🔄</button>}
                <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            </div>
        </header>
    );
}

