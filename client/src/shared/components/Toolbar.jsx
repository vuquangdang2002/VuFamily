// Toolbar.jsx — Thanh công cụ phía trên giao diện chính
import { useTranslation } from '../hooks/useTranslation.js';

export default function Toolbar({ theme, setTheme }) {
    const { t } = useTranslation();

    return (
        <div className="toolbar">
            <div className="toolbar-group">
                <button className="btn btn-icon" onClick={() => window.__treeCanvas?.zoomIn()} title={t('toolbar.zoom_in')}>🔍+</button>
                <button className="btn btn-icon" onClick={() => window.__treeCanvas?.zoomOut()} title={t('toolbar.zoom_out')}>🔍−</button>
                <div className="divider" />
                <button className="btn" onClick={() => window.__treeCanvas?.fitView()} title={t('toolbar.fit_view')}>{t('toolbar.fit_text')}</button>
            </div>
            <div className="toolbar-group">
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 12 }}>{t('toolbar.hint')}</span>
            </div>
        </div>
    );
}
