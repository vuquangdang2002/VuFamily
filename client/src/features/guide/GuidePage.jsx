// GuidePage.jsx — Trang hướng dẫn sử dụng (localize 100% từ locales/*.json)
import React, { useState } from 'react';
import './GuidePage.css';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { GUIDE_SECTIONS } from './guideData';

export default function GuidePage({ user, onNavigate }) {
    const { t } = useTranslation();
    const isAdminOrEditor = user?.role === 'admin' || user?.role === 'editor';
    const [activeSection, setActiveSection] = useState(() => {
        const path = window.location.pathname;
        const pathParts = path.split('/');
        if (pathParts[1] === 'guide' && pathParts[2]) {
            return pathParts[2];
        }
        return 'tree';
    });

    // Sync URL with activeSection changes
    React.useEffect(() => {
        const currentPath = window.location.pathname;
        const targetPath = `/guide/${activeSection}`;
        if (currentPath !== targetPath) {
            window.history.pushState({}, '', targetPath);
        }
    }, [activeSection]);

    // Handle popstate for guide section transitions
    React.useEffect(() => {
        const handlePopState = () => {
            const path = window.location.pathname;
            const pathParts = path.split('/');
            if (pathParts[1] === 'guide') {
                setActiveSection(pathParts[2] || 'tree');
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    return (
        <div className="page-container">
            <div className="guide-header">
                <h1>{t('guide.page_title')}</h1>
                <p>{t('guide.page_desc')}</p>
            </div>

            <div className="guide-layout">
                {/* Sidebar Menu */}
                <div className="guide-sidebar">
                    {GUIDE_SECTIONS.map(sec => (
                        <button
                            key={sec.id}
                            className={`guide-nav-btn ${activeSection === sec.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(sec.id)}
                        >
                            <span className="guide-nav-icon">{sec.icon}</span>
                            <span>{t(sec.titleKey)}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="guide-content">
                    {GUIDE_SECTIONS.map(sec => (
                        <div
                            key={sec.id}
                            className={`guide-section ${activeSection === sec.id ? 'active' : ''}`}
                        >
                            <div className="guide-section-header">
                                <h2>{sec.icon} {t(sec.titleKey)}</h2>
                                <p className="guide-section-desc">{t(sec.descKey)}</p>
                            </div>

                            <div className="guide-card">
                                <h3>{t('guide.features_title')}</h3>
                                <ul className="guide-list">
                                    {sec.featureKeys.map((key, i) => (
                                        <li key={i}>{t(key)}</li>
                                    ))}
                                </ul>

                                {isAdminOrEditor && sec.adminKeys.length > 0 && (
                                    <div className="guide-admin-block">
                                        <h4>{t('guide.admin_title')}</h4>
                                        <ul className="guide-list admin">
                                            {sec.adminKeys.map((key, i) => (
                                                <li key={i}>{t(key)}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="guide-action">
                                <button className="btn btn-primary" onClick={() => onNavigate(sec.id)}>
                                    {t('guide.open_feature')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
