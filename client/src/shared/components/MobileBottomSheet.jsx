import React from 'react';
import { ConfigAPI } from '../../config.js';
import { useTranslation } from '../hooks/useTranslation';

export default function MobileBottomSheet({
    showMobileMenu,
    setShowMobileMenu,
    setActivePage,
    setProfileModalOpen,
    user,
    isAdmin,
    pendingCount,
    theme,
    setTheme,
    handleLogout
}) {
    const { t, lang, changeLanguage } = useTranslation();

    if (!showMobileMenu) return null;

    return (
        <div className="bottom-sheet-overlay" onClick={() => setShowMobileMenu(false)}>
            <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="bottom-sheet-drag-handle" />
                <div className="bottom-sheet-title">{t('sidebar.admin_section')}</div>

                <div className="bottom-sheet-grid">
                    <div className="bottom-sheet-item" onClick={() => { setProfileModalOpen(true); setShowMobileMenu(false); }}>
                        <span className="bottom-sheet-item-icon">👤</span>
                        <span>{t('sidebar.profile_password')}</span>
                    </div>

                    <div className="bottom-sheet-item" onClick={() => { setActivePage('calendar'); setShowMobileMenu(false); }}>
                        <span className="bottom-sheet-item-icon">📅</span>
                        <span>{t('nav.calendar')}</span>
                    </div>

                    {(user?.role === 'admin' || user?.role === 'editor') && (
                        <div className="bottom-sheet-item" onClick={() => { setActivePage('requests'); setShowMobileMenu(false); }}>
                            <span className="bottom-sheet-item-icon">📋</span>
                            <span>{t('nav.requests')}</span>
                            {pendingCount > 0 && <span className="bottom-nav-badge">{pendingCount}</span>}
                        </div>
                    )}

                    {isAdmin && (
                        <div className="bottom-sheet-item" onClick={() => { setActivePage('system'); setShowMobileMenu(false); }}>
                            <span className="bottom-sheet-item-icon">⚙️</span>
                            <span>{t('nav.system')}</span>
                        </div>
                    )}

                    <div className="bottom-sheet-item" onClick={() => { setActivePage('history'); setShowMobileMenu(false); }}>
                        <span className="bottom-sheet-item-icon">📜</span>
                        <span>{t('nav.history')}</span>
                    </div>

                    <div className="bottom-sheet-item" onClick={() => { setActivePage('finance'); setShowMobileMenu(false); }}>
                        <span className="bottom-sheet-item-icon">💰</span>
                        <span>{t('nav.finance')}</span>
                    </div>

                    <div className="bottom-sheet-item" onClick={() => { setActivePage('guide'); setShowMobileMenu(false); }}>
                        <span className="bottom-sheet-item-icon">❓</span>
                        <span>{t('sidebar.user_guide')}</span>
                    </div>
                </div>

                {/* Theme and Language Settings */}
                <div className="bottom-sheet-settings">
                    <div className="bottom-sheet-setting-row">
                        <div className="bottom-sheet-setting-label">
                            <span>🌓</span> {t('app.theme')}
                        </div>
                        <div className="bottom-sheet-setting-control">
                            <button
                                className={`bottom-sheet-setting-btn ${theme === 'light' ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setTheme('light', e); }}
                            >
                                {t('theme.light')}
                            </button>
                            <button
                                className={`bottom-sheet-setting-btn ${theme === 'dark' ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setTheme('dark', e); }}
                            >
                                {t('theme.dark')}
                            </button>
                        </div>
                    </div>

                    {ConfigAPI.getBoolean('feature_localize_enabled', true) && (
                        <div className="bottom-sheet-setting-row">
                            <div className="bottom-sheet-setting-label">
                                <span>🌐</span> {t('app.language')}
                            </div>
                            <div className="bottom-sheet-setting-control">
                                <button
                                    className={`bottom-sheet-setting-btn ${lang === 'vi' ? 'active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); changeLanguage('vi'); }}
                                >
                                    VI
                                </button>
                                <button
                                    className={`bottom-sheet-setting-btn ${lang === 'en' ? 'active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); changeLanguage('en'); }}
                                >
                                    EN
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <button className="bottom-sheet-logout" onClick={() => { handleLogout(); setShowMobileMenu(false); }}>
                    🚪 {t('app.logout')}
                </button>
            </div>
        </div>
    );
}
