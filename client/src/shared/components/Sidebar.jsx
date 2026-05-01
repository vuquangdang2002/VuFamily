import { useState, useRef, useEffect } from 'react';

const MENU_ITEMS = [
    { id: 'tree', icon: '🌳', label: 'Gia phả' },
    { id: 'newsfeed', icon: '📰', label: 'Bảng tin' },
    { id: 'calendar', icon: '📅', label: 'Lịch & Sự kiện' },
];

const EDITOR_ITEMS = [
    { id: 'requests', icon: '📋', label: 'Yêu cầu chỉnh sửa' },
];

const ADMIN_ITEMS = [
    { id: 'accounts', icon: '👥', label: 'Quản lý tài khoản' },
];

const COMMON_ITEMS = [
    { id: 'chat', icon: '💬', label: 'Trò chuyện' },
    { id: 'history', icon: '📜', label: 'Lịch sử' },
];

function getRoleLabel(role) {
    if (role === 'admin') return 'Quản trị viên';
    if (role === 'editor') return 'Biên tập viên';
    return 'Thành viên';
}

export default function Sidebar({ activePage, onNavigate, isAdmin, user, onLogout, collapsed, onToggle, pendingCount, onOpenProfile }) {
    const isEditorOrAdmin = user?.role === 'admin' || user?.role === 'editor';
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!showUserMenu) return;
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showUserMenu]);

    return (
        <aside className={`relative flex flex-col h-full bg-white/95 dark:bg-black/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-[100] shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)] ${collapsed ? 'w-[72px] min-w-[72px]' : 'w-[260px] min-w-[260px]'}`}>
            
            {/* Header / Logo */}
            <div className="flex items-center justify-between px-4 h-[72px] border-b border-slate-100 dark:border-slate-800/50 shrink-0">
                {!collapsed && (
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-black to-purple-600 shadow-lg shadow-black/20 text-white text-xl shrink-0">
                            🏛️
                        </div>
                        <div className="flex flex-col">
                            <span className="font-heading text-lg font-bold text-black dark:text-white leading-tight">Gia Phả</span>
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dòng Họ Vũ</span>
                        </div>
                    </div>
                )}
                <button 
                    onClick={onToggle}
                    className={`flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors ${collapsed ? 'mx-auto' : ''}`}
                >
                    {collapsed ? '›' : '‹'}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 custom-scrollbar">
                {MENU_ITEMS.map(item => (
                    <NavItem 
                        key={item.id} item={item} active={activePage === item.id} 
                        collapsed={collapsed} onClick={() => onNavigate(item.id)} 
                    />
                ))}

                <div className="h-px bg-slate-100 dark:bg-slate-800/50 my-3 mx-2" />

                {isEditorOrAdmin && EDITOR_ITEMS.map(item => (
                    <NavItem 
                        key={item.id} item={item} active={activePage === item.id} 
                        collapsed={collapsed} onClick={() => onNavigate(item.id)} 
                        badge={pendingCount}
                    />
                ))}
                
                {isAdmin && ADMIN_ITEMS.map(item => (
                    <NavItem 
                        key={item.id} item={item} active={activePage === item.id} 
                        collapsed={collapsed} onClick={() => onNavigate(item.id)} 
                    />
                ))}

                <div className="h-px bg-slate-100 dark:bg-slate-800/50 my-3 mx-2" />

                {COMMON_ITEMS.map(item => (
                    <NavItem 
                        key={item.id} item={item} active={activePage === item.id} 
                        collapsed={collapsed} onClick={() => onNavigate(item.id)} 
                    />
                ))}
            </nav>

            {/* User Footer */}
            <div className="relative p-3 border-t border-slate-100 dark:border-slate-800/50 mt-auto shrink-0" ref={menuRef}>
                {/* Popup Menu */}
                {showUserMenu && (
                    <div className={`absolute bottom-[calc(100%+8px)] ${collapsed ? 'left-[calc(100%+8px)]' : 'left-3 right-3'} min-w-[240px] bg-white dark:bg-slate-800 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-slate-100 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-2 duration-200 z-50`}>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-black/50">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                                {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : (user?.role === 'admin' ? '👑' : '👤')}
                            </div>
                            <div className="overflow-hidden">
                                <div className="font-semibold text-sm text-black dark:text-white truncate">{user?.displayName || user?.username}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{getRoleLabel(user?.role)}</div>
                            </div>
                        </div>
                        
                        <div className="p-2 space-y-1">
                            <button onClick={() => { setShowUserMenu(false); onOpenProfile && onOpenProfile(); }} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-left">
                                <span className="text-lg">⚙️</span> Hồ sơ & Mật khẩu
                            </button>
                            <button onClick={() => { setShowUserMenu(false); onNavigate('guide'); }} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-left">
                                <span className="text-lg">❓</span> Hướng dẫn sử dụng
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2" />
                            <button onClick={() => { setShowUserMenu(false); onLogout(); }} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors text-left">
                                <span className="text-lg">🚪</span> Đăng xuất
                            </button>
                        </div>
                    </div>
                )}

                <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0 overflow-hidden ring-2 ring-transparent hover:ring-black/30 transition-all">
                        {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : (user?.role === 'admin' ? '👑' : '👤')}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 overflow-hidden">
                            <div className="font-semibold text-sm text-black dark:text-white truncate">{user?.displayName || user?.username}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{getRoleLabel(user?.role)}</div>
                        </div>
                    )}
                </button>
            </div>
        </aside>
    );
}

function NavItem({ item, active, collapsed, onClick, badge }) {
    return (
        <button
            onClick={onClick}
            title={collapsed ? item.label : ''}
            className={`
                relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all duration-200 group
                ${active 
                    ? 'bg-indigo-50 dark:bg-black/10 text-black dark:text-gray-400 font-semibold shadow-sm shadow-black/5' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-black dark:hover:text-slate-200'
                }
                ${collapsed ? 'justify-center px-0' : ''}
            `}
        >
            <span className={`text-[20px] transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
            </span>
            
            {!collapsed && (
                <span className="text-sm truncate flex-1">{item.label}</span>
            )}

            {badge > 0 && (
                <span className={`
                    flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold text-white bg-rose-500 shadow-md shadow-rose-500/20
                    ${collapsed ? 'absolute top-1 right-1 border-2 border-white dark:border-black w-3 h-3 p-0 min-w-0 text-[0px]' : ''}
                `}>
                    {collapsed ? '' : badge}
                </span>
            )}
        </button>
    );
}
