import { useState, useRef, useEffect } from 'react';

const MENU_ITEMS = [
    { id: 'tree', icon: '🌳', label: 'Gia phả' },
    { id: 'newsfeed', icon: '📰', label: 'Bảng tin' },
    { id: 'calendar', icon: '📅', label: 'Lịch & Sự kiện' },
];

const ADMIN_ITEMS = [
    { id: 'requests', icon: '📋', label: 'Yêu cầu chỉnh sửa' },
];

const COMMON_ITEMS = [
    { id: 'history', icon: '📜', label: 'Lịch sử' },
];

export default function Sidebar({ activePage, onNavigate, isAdmin, user, onLogout, collapsed, onToggle, pendingCount }) {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);

    // Close menu on outside click
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
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            {/* Logo + toggle */}
            <div className="sidebar-header">
                {!collapsed && (
                    <div className="sidebar-logo">
                        <span className="sidebar-logo-icon">🏛️</span>
                        <div className="sidebar-logo-text">
                            <span className="sidebar-logo-title">Gia Phả</span>
                            <span className="sidebar-logo-sub">Dòng Họ Vũ</span>
                        </div>
                    </div>
                )}
                <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Mở menu' : 'Thu gọn'}>
                    {collapsed ? '›' : '‹'}
                </button>
            </div>

            {/* Main nav */}
            <nav className="sidebar-nav">
                {MENU_ITEMS.map(item => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                        title={collapsed ? item.label : ''}
                    >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
                    </button>
                ))}

                <div className="sidebar-divider" />

                {isAdmin && ADMIN_ITEMS.map(item => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                        title={collapsed ? item.label : ''}
                    >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
                        {item.id === 'requests' && pendingCount > 0 && (
                            <span className="sidebar-badge">{pendingCount}</span>
                        )}
                    </button>
                ))}

                {COMMON_ITEMS.map(item => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                        title={collapsed ? item.label : ''}
                    >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
                    </button>
                ))}
            </nav>

            {/* User profile at bottom */}
            <div className="sidebar-footer" ref={menuRef}>
                {/* Popup user menu */}
                {showUserMenu && (
                    <div className="sidebar-user-menu">
                        <div className="sidebar-user-menu-header">
                            <span className="sidebar-user-menu-avatar">
                                {user?.role === 'admin' ? '👑' : '👤'}
                            </span>
                            <div>
                                <div className="sidebar-user-menu-name">{user?.displayName || user?.username}</div>
                                <div className="sidebar-user-menu-role">{user?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}</div>
                            </div>
                        </div>
                        <div className="sidebar-user-menu-divider" />
                        <button className="sidebar-user-menu-item" onClick={() => { setShowUserMenu(false); onNavigate('guide'); }}>
                            <span>❓</span> Hướng dẫn sử dụng
                        </button>
                        <div className="sidebar-user-menu-divider" />
                        <button className="sidebar-user-menu-item logout" onClick={() => { setShowUserMenu(false); onLogout(); }}>
                            <span>🚪</span> Đăng xuất
                        </button>
                    </div>
                )}

                <div className="sidebar-user" onClick={() => setShowUserMenu(!showUserMenu)} style={{ cursor: 'pointer' }}
                    title={user?.displayName}>
                    <span className="sidebar-user-avatar">
                        {user?.role === 'admin' ? '👑' : '👁️'}
                    </span>
                    {!collapsed && (
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name">{user?.displayName || user?.username}</span>
                            <span className="sidebar-user-role">{user?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}</span>
                        </div>
                    )}
                    {!collapsed && (
                        <span className="sidebar-user-expand">{showUserMenu ? '▼' : '▲'}</span>
                    )}
                </div>
            </div>
        </aside>
    );
}
