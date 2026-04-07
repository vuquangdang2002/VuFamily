import { useRef, useEffect, useCallback } from 'react';
import { buildHierarchy, calculateLayout } from '../../shared/utils/treeLayout';

export default function TreeCanvas({ members, selectedId, searchResultIds, onSelectMember, onDeselect }) {
    const canvasRef = useRef(null);
    const stateRef = useRef({ panX: 0, panY: 0, scale: 1, isPanning: false, lastPt: null });
    const imgCacheRef = useRef(new Map()); // Cache for member photo Image objects

    // Preload member photos into Image cache
    useEffect(() => {
        const cache = imgCacheRef.current;
        members.forEach(m => {
            if (m.photo && !cache.has(m.id)) {
                const img = new Image();
                img.onload = () => { cache.set(m.id, img); draw(); };
                img.onerror = () => { cache.set(m.id, null); };
                img.src = m.photo;
                cache.set(m.id, 'loading');
            } else if (!m.photo && cache.has(m.id)) {
                cache.delete(m.id);
            }
        });
    }, [members]);

    const getPositions = useCallback(() => {
        const hierarchy = buildHierarchy(members);
        return hierarchy ? calculateLayout(hierarchy) : [];
    }, [members]);

    // ─── Draw ───
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { panX, panY, scale } = stateRef.current;
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr, h = canvas.height / dpr;

        // Reset transform and clear with DPR
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        // Light background fill
        ctx.fillStyle = '#EDF0F7';
        ctx.fillRect(0, 0, w, h);
        // Subtle grid
        ctx.strokeStyle = 'rgba(59, 111, 207, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(scale, scale);

        const hierarchy = buildHierarchy(members);
        if (!hierarchy) { ctx.restore(); return; }
        const positions = calculateLayout(hierarchy);
        drawConnections(ctx, hierarchy, positions);
        positions.forEach(p => drawNode(ctx, p, selectedId, searchResultIds || [], imgCacheRef.current));
        ctx.restore();
    }, [members, selectedId, searchResultIds]);

    function drawConnections(ctx, node, positions) {
        const posMap = new Map();
        positions.forEach(p => posMap.set(p.member.id, p));
        drawConRec(ctx, node, posMap);
    }

    function drawConRec(ctx, node, posMap) {
        const pp = posMap.get(node.member.id);
        if (!pp) return;
        let parentCX;
        if (node.spouse) {
            const sp = posMap.get(node.spouse.id);
            if (sp) {
                parentCX = (pp.x + sp.x + sp.width) / 2;
                ctx.strokeStyle = 'rgba(209, 107, 138, 0.5)';
                ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(pp.x + pp.width, pp.y + pp.height / 2);
                ctx.lineTo(sp.x, sp.y + sp.height / 2);
                ctx.stroke(); ctx.setLineDash([]);
            } else { parentCX = pp.x + pp.width / 2; }
        } else { parentCX = pp.x + pp.width / 2; }

        const botY = pp.y + pp.height;
        if (node.children.length > 0) {
            const midY = botY + 50;
            ctx.strokeStyle = 'rgba(59, 111, 207, 0.4)';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(parentCX, botY); ctx.lineTo(parentCX, midY); ctx.stroke();
            const ccs = node.children.map(c => {
                const cp = posMap.get(c.member.id);
                if (!cp) return parentCX;
                if (c.spouse) { const csp = posMap.get(c.spouse.id); if (csp) return (cp.x + csp.x + csp.width) / 2; }
                return cp.x + cp.width / 2;
            });
            if (ccs.length > 1) { ctx.beginPath(); ctx.moveTo(Math.min(...ccs), midY); ctx.lineTo(Math.max(...ccs), midY); ctx.stroke(); }
            node.children.forEach((child, i) => {
                const cp = posMap.get(child.member.id);
                if (!cp) return;
                ctx.beginPath(); ctx.moveTo(ccs[i], midY); ctx.lineTo(ccs[i], cp.y); ctx.stroke();
            });
        }
        node.children.forEach(c => drawConRec(ctx, c, posMap));
    }

    function getYearFromDate(dateStr) {
        if (!dateStr) return null;
        const y = parseInt(dateStr);
        return isNaN(y) ? null : y;
    }

    function drawNode(ctx, nodePos, selId, searchIds, imgCache) {
        const { member, x, y, width: w, height: h } = nodePos;
        const isSel = selId === member.id;
        const isSearch = searchIds.includes(member.id);
        const isDead = !!member.deathDate;
        const isMale = member.gender === 1;
        const r = 16;

        const birthYear = getYearFromDate(member.birthDate);
        const deathYear = getYearFromDate(member.deathDate);

        ctx.shadowColor = isSel ? 'rgba(59,111,207,0.4)' : 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = isSel ? 20 : 10; ctx.shadowOffsetY = 4;

        ctx.beginPath(); roundRect(ctx, x, y, w, h, r);
        ctx.fillStyle = '#fff';
        ctx.fill();

        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.strokeStyle = isSel ? '#3B6FCF' : isSearch ? '#5A8FE8' : 'rgba(0,0,0,0.08)';
        ctx.lineWidth = isSel ? 3 : 1; ctx.stroke();

        // Gender bar (thicker)
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + 6);
        ctx.lineTo(x, y + 6); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
        ctx.fillStyle = isMale ? 'rgba(59,111,207,0.85)' : 'rgba(209,107,138,0.85)';
        ctx.fill();

        // Avatar — bigger (24px radius)
        const ax = x + w / 2, ay = y + 42, ar = 24;
        const cachedImg = imgCache ? imgCache.get(member.id) : null;

        if (cachedImg && cachedImg instanceof Image && cachedImg.complete) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(ax, ay, ar, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(cachedImg, ax - ar, ay - ar, ar * 2, ar * 2);
            ctx.restore();
            ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2);
            ctx.strokeStyle = isMale ? 'rgba(59,111,207,0.9)' : 'rgba(209,107,138,0.9)';
            ctx.lineWidth = 2.5; ctx.stroke();
        } else {
            ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2);
            const ag = ctx.createRadialGradient(ax, ay, 0, ax, ay, ar);
            if (isMale) { ag.addColorStop(0, '#5b8def'); ag.addColorStop(1, '#3a6bc5'); }
            else { ag.addColorStop(0, '#ef7b9a'); ag.addColorStop(1, '#c53a6b'); }
            ctx.fillStyle = ag; ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `${ar}px "Segoe UI Emoji", sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('👤', ax, ay);
        }

        // Name — bigger, bolder
        ctx.fillStyle = isDead ? '#9ba3b5' : '#1a2138';
        ctx.font = 'bold 16px "Inter", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let dn = member.name;
        while (ctx.measureText(dn).width > w - 24 && dn.length > 3) dn = dn.slice(0, -1);
        if (dn !== member.name) dn += '…';
        ctx.fillText(dn, x + w / 2, y + 82);

        // Years — larger
        const yt = deathYear ? `${birthYear || '?'} - ${deathYear}` : birthYear ? `${birthYear} - nay` : '';
        if (yt) { ctx.fillStyle = '#9ba3b5'; ctx.font = '13px "Inter", sans-serif'; ctx.fillText(yt, x + w / 2, y + 105); }

        // Gen badge — bigger
        if (member.generation) {
            const bt = `Đời ${member.generation}`;
            ctx.font = '12px "Inter", sans-serif';
            const bw = ctx.measureText(bt).width + 16;
            const bx = x + w / 2 - bw / 2, by = y + 120;
            ctx.beginPath(); roundRect(ctx, bx, by, bw, 22, 11);
            ctx.fillStyle = 'rgba(59,111,207,0.08)'; ctx.fill();
            ctx.strokeStyle = 'rgba(59,111,207,0.2)'; ctx.lineWidth = 0.5; ctx.stroke();
            ctx.fillStyle = '#3B6FCF'; ctx.fillText(bt, x + w / 2, by + 11);
        }

        if (isDead) {
            ctx.fillStyle = '#9ba3b5'; ctx.font = '13px "Inter", sans-serif';
            ctx.textAlign = 'center'; ctx.fillText('✝', x + w - 18, y + 18);
        }
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
    }

    // ─── Resize ───
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => {
            const p = canvas.parentElement;
            const dpr = window.devicePixelRatio || 1;
            const w = p.clientWidth;
            const h = p.clientHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            draw();
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [draw]);

    // ─── Center on load ───
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || members.length === 0) return;
        const positions = getPositions();
        if (positions.length === 0) return;
        const dpr = window.devicePixelRatio || 1;
        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        positions.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x + p.width); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y + p.height); });
        const tw = maxX - minX, th = maxY - minY, pad = 60;
        const s = Math.min((cw - pad * 2) / tw, (ch - pad * 2) / th, 1.2);
        stateRef.current.scale = s;
        stateRef.current.panX = (cw - tw * s) / 2 - minX * s;
        stateRef.current.panY = pad - minY * s + 20;
        draw();
    }, [members]);

    useEffect(() => { draw(); }, [draw]);

    // ─── Mouse/Touch events ───
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const onDown = (e) => { stateRef.current.isPanning = true; stateRef.current.didPan = false; stateRef.current.lastPt = { x: e.clientX, y: e.clientY }; canvas.style.cursor = 'grabbing'; };
        const onMove = (e) => { const st = stateRef.current; if (st.isPanning && st.lastPt) { const dx = e.clientX - st.lastPt.x, dy = e.clientY - st.lastPt.y; if (Math.abs(dx) > 2 || Math.abs(dy) > 2) st.didPan = true; st.panX += dx; st.panY += dy; st.lastPt = { x: e.clientX, y: e.clientY }; draw(); } };
        const onUp = () => { stateRef.current.isPanning = false; stateRef.current.lastPt = null; canvas.style.cursor = 'grab'; };
        const onWheel = (e) => { e.preventDefault(); const st = stateRef.current; const factor = e.deltaY < 0 ? 1.1 : 0.9; const old = st.scale; st.scale = Math.max(0.1, Math.min(3, st.scale * factor)); const rect = canvas.getBoundingClientRect(); const mx = e.clientX - rect.left, my = e.clientY - rect.top; st.panX = mx - (mx - st.panX) * (st.scale / old); st.panY = my - (my - st.panY) * (st.scale / old); draw(); };
        const onClick = (e) => { if (stateRef.current.didPan) return; const rect = canvas.getBoundingClientRect(); const st = stateRef.current; const cx = (e.clientX - rect.left - st.panX) / st.scale; const cy = (e.clientY - rect.top - st.panY) / st.scale; const positions = getPositions(); for (let i = positions.length - 1; i >= 0; i--) { const p = positions[i]; if (cx >= p.x && cx <= p.x + p.width && cy >= p.y && cy <= p.y + p.height) { onSelectMember(p.member); return; } } if (onDeselect) onDeselect(); };
        const getTouchDist = (t) => Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
        const getTouchCenter = (t) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });

        const onTouchStart = (e) => {
            e.preventDefault();
            const st = stateRef.current;
            if (e.touches.length === 1) {
                st.isPanning = true; st.didPan = false;
                st.lastPt = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                st.isPanning = false;
                st.pinchDist = getTouchDist(e.touches);
                st.pinchCenter = getTouchCenter(e.touches);
                st.pinchScale = st.scale;
            }
        };
        const onTouchMove = (e) => {
            e.preventDefault();
            const st = stateRef.current;
            if (e.touches.length === 1 && st.isPanning && st.lastPt) {
                const dx = e.touches[0].clientX - st.lastPt.x, dy = e.touches[0].clientY - st.lastPt.y;
                if (Math.abs(dx) > 2 || Math.abs(dy) > 2) st.didPan = true;
                st.panX += dx; st.panY += dy;
                st.lastPt = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                draw();
            } else if (e.touches.length === 2 && st.pinchDist) {
                const newDist = getTouchDist(e.touches);
                const center = getTouchCenter(e.touches);
                const rect = canvas.getBoundingClientRect();
                const mx = center.x - rect.left, my = center.y - rect.top;
                const oldScale = st.scale;
                st.scale = Math.max(0.1, Math.min(3, st.pinchScale * (newDist / st.pinchDist)));
                st.panX = mx - (mx - st.panX) * (st.scale / oldScale);
                st.panY = my - (my - st.panY) * (st.scale / oldScale);
                draw();
            }
        };
        const onTouchEnd = (e) => {
            const st = stateRef.current;
            if (e.touches.length === 0) {
                if (!st.didPan && e.changedTouches.length === 1) {
                    const t = e.changedTouches[0];
                    const rect = canvas.getBoundingClientRect();
                    const cx = (t.clientX - rect.left - st.panX) / st.scale;
                    const cy = (t.clientY - rect.top - st.panY) / st.scale;
                    const positions = getPositions();
                    let found = false;
                    for (let i = positions.length - 1; i >= 0; i--) {
                        const p = positions[i];
                        if (cx >= p.x && cx <= p.x + p.width && cy >= p.y && cy <= p.y + p.height) {
                            onSelectMember(p.member); found = true; break;
                        }
                    }
                    if (!found && onDeselect) onDeselect();
                }
                st.isPanning = false; st.lastPt = null; st.pinchDist = null;
            }
        };

        canvas.addEventListener('mousedown', onDown); canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseup', onUp); canvas.addEventListener('mouseleave', onUp);
        canvas.addEventListener('wheel', onWheel, { passive: false }); canvas.addEventListener('click', onClick);
        canvas.addEventListener('touchstart', onTouchStart, { passive: false }); canvas.addEventListener('touchmove', onTouchMove, { passive: false }); canvas.addEventListener('touchend', onTouchEnd);
        return () => { canvas.removeEventListener('mousedown', onDown); canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseup', onUp); canvas.removeEventListener('mouseleave', onUp); canvas.removeEventListener('wheel', onWheel); canvas.removeEventListener('click', onClick); canvas.removeEventListener('touchstart', onTouchStart); canvas.removeEventListener('touchmove', onTouchMove); canvas.removeEventListener('touchend', onTouchEnd); };
    }, [draw, getPositions, onSelectMember, onDeselect]);

    const zoomIn = () => { stateRef.current.scale = Math.min(3, stateRef.current.scale * 1.2); draw(); };
    const zoomOut = () => { stateRef.current.scale = Math.max(0.1, stateRef.current.scale * 0.8); draw(); };
    const fitView = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const positions = getPositions();
        if (positions.length === 0) return;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        positions.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x + p.width); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y + p.height); });
        const tw = maxX - minX, th = maxY - minY, pad = 100;
        const s = Math.min((canvas.width - pad * 2) / tw, (canvas.height - pad * 2) / th, 1);
        stateRef.current.scale = s; stateRef.current.panX = (canvas.width - tw * s) / 2 - minX * s; stateRef.current.panY = pad - minY * s + 20;
        draw();
    };

    useEffect(() => { window.__treeCanvas = { zoomIn, zoomOut, fitView }; return () => { delete window.__treeCanvas; }; });

    return (
        <div className="canvas-container">
            <canvas ref={canvasRef} className="tree-canvas" />
        </div>
    );
}
