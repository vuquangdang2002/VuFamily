// Toolbar.jsx — Thanh công cụ phía trên giao diện chính
import { useTranslation } from '../hooks/useTranslation.js';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

export default function Toolbar({ theme, setTheme }) {
    const { t } = useTranslation();

    return (
        <div className="toolbar">
            <div className="toolbar-group">
                <button className="btn btn-icon" onClick={() => window.__treeCanvas?.zoomIn()} title={t('toolbar.zoom_in')}><ZoomIn size={16} /></button>
                <button className="btn btn-icon" onClick={() => window.__treeCanvas?.zoomOut()} title={t('toolbar.zoom_out')}><ZoomOut size={16} /></button>
                <div className="divider" />
                <button className="btn" style={{ gap: '6px' }} onClick={() => window.__treeCanvas?.fitView()} title={t('toolbar.fit_view')}><Maximize size={14} /> {t('toolbar.fit_text')}</button>
            </div>
            <div className="toolbar-group">
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 12 }}>{t('toolbar.hint')}</span>
            </div>
        </div>
    );
}
