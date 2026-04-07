
export default function Toolbar({ theme, setTheme }) {
    return (
        <div className="toolbar">
            <div className="toolbar-group">
                <button className="btn btn-icon" onClick={() => window.__treeCanvas?.zoomIn()} title="Phóng to">🔍+</button>
                <button className="btn btn-icon" onClick={() => window.__treeCanvas?.zoomOut()} title="Thu nhỏ">🔍−</button>
                <div className="divider" />
                <button className="btn" onClick={() => window.__treeCanvas?.fitView()} title="Xem toàn bộ">📐 Vừa màn hình</button>
            </div>
            <div className="toolbar-group">
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 12 }}>Kéo để di chuyển · Cuộn để zoom</span>
            </div>
        </div>
    );
}
