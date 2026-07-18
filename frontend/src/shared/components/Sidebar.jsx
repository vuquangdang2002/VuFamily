import { useState, useRef, useEffect } from 'react';
import { ConfigAPI } from '../../config.js';
import { useTranslation } from '../hooks/useTranslation.js';
import { 
    Home, Network, Newspaper, Calendar, ClipboardList, Settings, 
    MessageSquare, Wallet, History, ChevronLeft, ChevronRight, 
    Sun, Moon, Globe, LogOut, UserCog, HelpCircle, User, Crown,
    ChevronUp, ChevronDown, AlignLeft, Hexagon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Sidebar.css';

const MENU_ITEMS = [
    { id: 'home', icon: <Home size={20} />, label: 'Trang chủ' },
    { id: 'tree', icon: <Network size={20} />, label: 'Gia phả' },
    { id: 'newsfeed', icon: <Newspaper size={20} />, label: 'Bảng tin' },
    { id: 'calendar', icon: <Calendar size={20} />, label: 'Lịch sự kiện' },
];

const EDITOR_ITEMS = [
    { id: 'requests', icon: <ClipboardList size={20} />, label: 'Yêu cầu chỉnh sửa' },
];

const ADMIN_ITEMS = [
    { id: 'system', icon: <Settings size={20} />, label: 'Quản trị hệ thống' },
];

const COMMON_ITEMS = [
    { id: 'chat', icon: <MessageSquare size={20} />, label: 'Trò chuyện' },
    { id: 'finance', icon: <Wallet size={20} />, label: 'Tài chính' },
    { id: 'history', icon: <History size={20} />, label: 'Lịch sử' },
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

    const activeMenuItems = MENU_ITEMS.filter(item => ConfigAPI.getBoolean(`feature_${item.id}_enabled`, true));
    const activeCommonItems = COMMON_ITEMS.filter(item => ConfigAPI.getBoolean(`feature_${item.id}_enabled`, true));
    const activeEditorItems = EDITOR_ITEMS.filter(item => ConfigAPI.getBoolean(`feature_${item.id}_enabled`, true));

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

    const NavButton = ({ item, isBadge = false, badgeCount = 0 }) => {
        const isActive = activePage === item.id;
        return (
            <button
                onClick={() => onNavigate(item.id)}
                title={collapsed ? (t('nav.' + item.id) || item.label) : ''}
                className={`sidebar-nav-btn group ${isActive ? 'active' : 'inactive'} ${collapsed ? 'justify-center' : 'justify-start'}`}
            >
                <span className={`shrink-0 transition-transform duration-300 ${!isActive && 'group-hover:scale-110'}`}>{item.icon}</span>
                {!collapsed && (
                    <span className="font-medium text-[15px] truncate">{t('nav.' + item.id) || item.label}</span>
                )}
                {isBadge && badgeCount > 0 && (
                    <span className={`absolute ${collapsed ? 'top-1 right-1' : 'right-3'} flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm`}>
                        {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                )}
            </button>
        );
    };

    return (
        <aside className={`sidebar-container ${collapsed ? 'collapsed' : 'expanded'}`}>
            
            {/* Header / Logo */}
            <div className="sidebar-header">
                {!collapsed && (
                    <div className="sidebar-logo-group" onClick={() => onNavigate('home')}>
                        <div className="sidebar-logo-icon group">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#fe6e00]/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                            <img src="/logo.png" alt="Vu Gia Logo" className="w-7 h-7 object-contain relative z-10 drop-shadow-[0_0_5px_rgba(254,110,0,0.8)]" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-extrabold text-[17px] tracking-tight text-zinc-900 dark:text-white leading-tight truncate">VŨ GIA</span>
                            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest truncate">Genealogy</span>
                        </div>
                    </div>
                )}
                <button 
                    onClick={onToggle} 
                    className={`flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${collapsed ? 'mx-auto' : ''}`}
                >
                    {collapsed ? <AlignLeft size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            {/* Navigation Menus */}
            <nav className="sidebar-nav custom-scrollbar">
                <div className="sidebar-nav-group">
                    {activeMenuItems.map(item => <NavButton key={item.id} item={item} />)}
                </div>

                <div className="sidebar-divider" />

                <div className="sidebar-nav-group">
                    {activeCommonItems.map(item => <NavButton key={item.id} item={item} />)}
                </div>

                {isEditorOrAdmin && (
                    <>
                        <div className="sidebar-divider" />
                        {!collapsed && <div className="sidebar-section-title">{t('sidebar.admin_area') || 'Khu vực quản trị'}</div>}
                        <div className="sidebar-nav-group">
                            {activeEditorItems.map(item => <NavButton key={item.id} item={item} isBadge={item.id === 'requests'} badgeCount={pendingCount} />)}
                            {isAdmin && ADMIN_ITEMS.map(item => <NavButton key={item.id} item={item} />)}
                        </div>
                    </>
                )}
            </nav>

            {/* User Profile Footer */}
            <div className="sidebar-user-footer" ref={menuRef}>
                {/* Quick Theme Toggle placed right above user menu for convenience */}
                <div className={`flex mb-2 mx-3 ${collapsed ? 'mx-1' : ''}`}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setTheme(theme === 'dark' ? 'light' : 'dark', e); }} 
                        className="w-full py-2 flex items-center justify-center gap-2 text-sm rounded-xl font-medium transition-colors bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5"
                    >
                        {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                        {!collapsed && (theme === 'dark' ? (t('sidebar.theme_dark') || 'Giao diện Tối') : (t('sidebar.theme_light') || 'Giao diện Sáng'))}
                    </button>
                </div>

                <AnimatePresence>
                    {showUserMenu && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className={`sidebar-user-popup ${collapsed ? 'collapsed' : 'expanded'}`}
                        >
                            <div className="sidebar-user-popup-header">
                                <div className="sidebar-avatar light">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        user?.role === 'admin' ? <Crown size={18} className="text-amber-500" /> : <User size={18} className="text-zinc-500" />
                                    )}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="font-bold text-sm text-zinc-900 dark:text-white truncate">{user?.displayName || user?.username}</span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{getRoleLabel(user?.role, t)}</span>
                                </div>
                            </div>
                            
                            <div className="sidebar-user-popup-body">
                                <div className="sidebar-menu-row">
                                    <div className="flex items-center gap-2"><Sun size={16} className="text-zinc-400" /> Giao diện</div>
                                    <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
                                        <button onClick={(e) => { e.stopPropagation(); setTheme('light', e); }} className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${theme === 'light' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Sáng</button>
                                        <button onClick={(e) => { e.stopPropagation(); setTheme('dark', e); }} className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${theme === 'dark' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Tối</button>
                                    </div>
                                </div>
                                
                                {ConfigAPI.getBoolean('feature_localize_enabled', true) && (
                                    <div className="sidebar-menu-row">
                                        <div className="flex items-center gap-2"><Globe size={16} className="text-zinc-400" /> Ngôn ngữ</div>
                                        <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
                                            <button onClick={(e) => { e.stopPropagation(); changeLanguage('vi'); }} className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${lang === 'vi' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>VI</button>
                                            <button onClick={(e) => { e.stopPropagation(); changeLanguage('en'); }} className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${lang === 'en' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>EN</button>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="sidebar-divider" style={{ margin: '4px 0' }} />
                                
                                <button onClick={() => { setShowUserMenu(false); onOpenProfile && onOpenProfile(); }} className="sidebar-menu-btn default">
                                    <UserCog size={16} className="text-zinc-400" /> {t('sidebar.profile_password')}
                                </button>
                                
                                <button onClick={() => { setShowUserMenu(false); onNavigate('guide'); }} className="sidebar-menu-btn default">
                                    <HelpCircle size={16} className="text-zinc-400" /> {t('sidebar.user_guide')}
                                </button>
                                
                                <button onClick={() => { setShowUserMenu(false); onLogout(); }} className="sidebar-menu-btn danger">
                                    <LogOut size={16} /> {t('app.logout')}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button 
                    onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
                    className={`sidebar-user-toggle ${showUserMenu ? 'active' : ''} ${collapsed ? 'justify-center' : 'justify-start'}`}
                >
                    <div className="sidebar-avatar dark">
                        {user?.avatar ? (
                            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            user?.role === 'admin' ? <Crown size={18} className="text-amber-500" /> : <User size={18} className="text-zinc-500" />
                        )}
                    </div>
                    {!collapsed && (
                        <>
                            <div className="flex flex-col flex-1 overflow-hidden text-left">
                                <span className="font-bold text-sm text-zinc-900 dark:text-white truncate">{user?.displayName || user?.username}</span>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{getRoleLabel(user?.role, t)}</span>
                            </div>
                            <ChevronUp size={16} className={`shrink-0 text-zinc-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
}
