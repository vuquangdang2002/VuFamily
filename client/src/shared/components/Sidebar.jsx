import { useState, useRef, useEffect } from 'react';
import { ConfigAPI } from '../../config.js';
import { useTranslation } from '../hooks/useTranslation.js';
import { 
    Home, Network, Newspaper, Calendar, ClipboardList, Settings, 
    MessageSquare, Wallet, History, ChevronLeft, ChevronRight, 
    Sun, Moon, Globe, LogOut, UserCog, HelpCircle, User, Crown,
    ChevronUp, ChevronDown
} from 'lucide-react';

const MENU_ITEMS = [
    { id: 'home', icon: <Home size={18} />, label: 'Trang chủ' },
    { id: 'tree', icon: <Network size={18} />, label: 'Gia phả' },
    { id: 'newsfeed', icon: <Newspaper size={18} />, label: 'Bảng tin' },
    { id: 'calendar', icon: <Calendar size={18} />, label: 'Lịch & Sự kiện' },
];

// Items visible to editors AND admins
const EDITOR_ITEMS = [
    { id: 'requests', icon: <ClipboardList size={18} />, label: 'Yêu cầu chỉnh sửa' },
];

// Items visible to admins ONLY
const ADMIN_ITEMS = [
    { id: 'system', icon: <Settings size={18} />, label: 'Hệ thống quản trị' },
];

const COMMON_ITEMS = [
    { id: 'chat', icon: <MessageSquare size={18} />, label: 'Trò chuyện' },
    { id: 'finance', icon: <Wallet size={18} />, label: 'Tài chính' },
    { id: 'history', icon: <History size={18} />, label: 'Lịch sử' },
];

function getRoleLabel(role, t) {
    if (role === 'admin') return t('role.admin') || 'Quản trị viên';
    if (role === 'editor') return t('role.editor') || 'Biên tập viên';
    return t('role.member') || 'Thành viên';
}

export default function Sidebar({ activePage, onNavigate, isAdmin, user, onLogout, collapsed, onToggle, pendingCount, onOpenProfile, theme, setTheme }) {
    const { t, lang, changeLanguage } = useTranslation();
    const isEditorOrAdmin = user?.role === 'admin' || user?.role === 'editor';
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);

    // Lọc tính năng (Feature Toggles) dựa trên Remote Config
    const activeMenuItems = MENU_ITEMS.filter(item => ConfigAPI.getBoolean(`feature_${item.id}_enabled`, true));
    const activeCommonItems = COMMON_ITEMS.filter(item => ConfigAPI.getBoolean(`feature_${item.id}_enabled`, true));
    const activeEditorItems = EDITOR_ITEMS.filter(item => ConfigAPI.getBoolean(`feature_${item.id}_enabled`, true));

    const [showMobileMore, setShowMobileMore] = useState(false);

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
                            <span className="sidebar-logo-title">{t('sidebar.logo_title')}</span>
                            <span className="sidebar-logo-sub">{t('sidebar.logo_sub')}</span>
                        </div>
                    </div>
                )}
                <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? t('sidebar.open_menu') : t('sidebar.collapse')}>
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Main nav */}
            <nav className="sidebar-nav">
                {activeMenuItems.map(item => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                        title={collapsed ? t('nav.' + item.id) : ''}
                    >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        {!collapsed && <span className="sidebar-item-label">{t('nav.' + item.id) || item.label}</span>}
                    </button>
                ))}

                {activeCommonItems.map(item => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                        title={collapsed ? t('nav.' + item.id) : ''}
                    >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        {!collapsed && <span className="sidebar-item-label">{t('nav.' + item.id) || item.label}</span>}
                    </button>
                ))}

                {(isEditorOrAdmin) && (
                    <>
                        <div className="sidebar-divider" style={{ marginTop: '16px' }} />
                        {!collapsed && <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '12px 16px 4px', letterSpacing: '0.5px' }}>{t('sidebar.admin_section')}</div>}
                    </>
                )}

                {isEditorOrAdmin && activeEditorItems.map(item => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                        title={collapsed ? t('nav.' + item.id) : ''}
                    >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        {!collapsed && <span className="sidebar-item-label">{t('nav.' + item.id) || item.label}</span>}
                        {item.id === 'requests' && pendingCount > 0 && (
                            <span className="sidebar-badge">{pendingCount}</span>
                        )}
                    </button>
                ))}
                {isAdmin && ADMIN_ITEMS.map(item => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                        title={collapsed ? t('nav.' + item.id) : ''}
                    >
                        <span className="sidebar-item-icon">{item.icon}</span>
                        {!collapsed && <span className="sidebar-item-label">{t('nav.' + item.id) || item.label}</span>}
                    </button>
                ))}
            </nav>

            {/* User profile at bottom */}
            <div className="sidebar-footer" ref={menuRef}>
                {/* Popup user menu (Works on Desktop & Mobile now) */}
                {showUserMenu && (
                <div className="sidebar-user-menu">
                    <div className="sidebar-user-menu-header">
                        <span className="sidebar-user-menu-avatar">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                user?.role === 'admin' ? <Crown size={20} /> : <User size={20} />
                            )}
                        </span>
                        <div>
                            <div className="sidebar-user-menu-name">{user?.displayName || user?.username}</div>
                            <div className="sidebar-user-menu-role">{getRoleLabel(user?.role, t)}</div>
                        </div>
                    </div>
                    <div className="sidebar-user-menu-divider" />
                    
                    <div className="sidebar-user-menu-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'default' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>{theme === 'light' ? <Sun size={14}/> : <Moon size={14}/>}</span> {t('app.theme')}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card)', borderRadius: '6px', padding: '2px' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setTheme('light', e); }}
                                style={{ border: 'none', background: theme === 'light' ? 'var(--primary)' : 'transparent', color: theme === 'light' ? '#fff' : 'var(--text-muted)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' }}
                            >{t('theme.light')}</button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setTheme('dark', e); }}
                                style={{ border: 'none', background: theme === 'dark' ? 'var(--primary)' : 'transparent', color: theme === 'dark' ? '#fff' : 'var(--text-muted)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' }}
                            >{t('theme.dark')}</button>
                        </div>
                    </div>

                    {ConfigAPI.getBoolean('feature_localize_enabled', true) && (
                        <>
                            <div className="sidebar-user-menu-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'default' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span><Globe size={14}/></span> {t('app.language')}
                                </div>
                                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card)', borderRadius: '6px', padding: '2px' }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); changeLanguage('vi'); }}
                                        style={{ border: 'none', background: lang === 'vi' ? 'var(--primary)' : 'transparent', color: lang === 'vi' ? '#fff' : 'var(--text-muted)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' }}
                                    >VI</button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); changeLanguage('en'); }}
                                        style={{ border: 'none', background: lang === 'en' ? 'var(--primary)' : 'transparent', color: lang === 'en' ? '#fff' : 'var(--text-muted)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' }}
                                    >EN</button>
                                </div>
                            </div>
                            <div className="sidebar-user-menu-divider" />
                        </>
                    )}

                    <button className="sidebar-user-menu-item" onClick={() => { setShowUserMenu(false); onOpenProfile && onOpenProfile(); }}>
                        <span><UserCog size={14}/></span> {t('sidebar.profile_password')}
                    </button>

                    <button className="sidebar-user-menu-item" onClick={() => { setShowUserMenu(false); onNavigate('guide'); }}>
                        <span><HelpCircle size={14}/></span> {t('sidebar.user_guide')}
                    </button>
                    <div className="sidebar-user-menu-divider" />
                    <button className="sidebar-user-menu-item logout" onClick={() => { setShowUserMenu(false); onLogout(); }}>
                        <span><LogOut size={14}/></span> {t('app.logout')}
                    </button>
                </div>
                )}

                <div className="sidebar-user" onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }} style={{ cursor: 'pointer' }}
                    title={user?.displayName}>
                    <span className="sidebar-user-avatar" style={user?.avatar ? { padding: 0 } : {}}>
                        {user?.avatar ? (
                            <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            user?.role === 'admin' ? <Crown size={20} /> : <User size={20} />
                        )}
                    </span>
                    <div className="sidebar-user-info">
                        <span className="sidebar-user-name">{user?.displayName || user?.username}</span>
                        <span className="sidebar-user-role">{getRoleLabel(user?.role, t)}</span>
                    </div>
                    {!collapsed && (
                        <span className="sidebar-user-expand">{showUserMenu ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}</span>
                    )}
                </div>
            </div>
        </aside>
    );
}
