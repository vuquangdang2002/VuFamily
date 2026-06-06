import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

export default function MobileNavigation({ activePage, setActivePage, showMobileMenu, setShowMobileMenu, pendingCount }) {
    const { t } = useTranslation();

    return (
        <div className="bottom-nav">
            <button
                className={`bottom-nav-item ${activePage === 'home' && !showMobileMenu ? 'active' : ''}`}
                onClick={() => { setActivePage('home'); setShowMobileMenu(false); }}
            >
                <span className="bottom-nav-item-icon">🏠</span>
                <span>{t('nav.home')}</span>
            </button>
            <button
                className={`bottom-nav-item ${activePage === 'tree' && !showMobileMenu ? 'active' : ''}`}
                onClick={() => { setActivePage('tree'); setShowMobileMenu(false); }}
            >
                <span className="bottom-nav-item-icon">🌳</span>
                <span>{t('nav.tree')}</span>
            </button>
            <button
                className={`bottom-nav-item ${activePage === 'newsfeed' && !showMobileMenu ? 'active' : ''}`}
                onClick={() => { setActivePage('newsfeed'); setShowMobileMenu(false); }}
            >
                <span className="bottom-nav-item-icon">📰</span>
                <span>{t('nav.newsfeed')}</span>
            </button>
            <button
                className={`bottom-nav-item ${activePage === 'chat' && !showMobileMenu ? 'active' : ''}`}
                onClick={() => { setActivePage('chat'); setShowMobileMenu(false); }}
            >
                <span className="bottom-nav-item-icon">💬</span>
                <span>{t('nav.chat')}</span>
            </button>
            <button
                className={`bottom-nav-item ${showMobileMenu ? 'active' : ''}`}
                onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
                <span className="bottom-nav-item-icon">⚙️</span>
                <span>{t('nav.others')}</span>
                {pendingCount > 0 && <span className="bottom-nav-badge">{pendingCount}</span>}
            </button>
        </div>
    );
}
