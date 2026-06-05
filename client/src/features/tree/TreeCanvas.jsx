import React, { useRef, useEffect, useCallback } from 'react';
import './Tree.css';
import { buildHierarchy, calculateLayout } from '../../shared/utils/treeLayout';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { useTranslation } from '../../shared/hooks/useTranslation.js';
import { drawTree, invalidateThemeColors } from './utils/treeDraw';

export default function TreeCanvas({ members, selectedId, searchResultIds, onSelectMember, onDeselect }) {
    const { t } = useTranslation();
    const canvasRef = useRef(null);
    const stateRef = useRef({ panX: 0, panY: 0, scale: 1, isPanning: false, lastPt: null });
    const imgCacheRef = useRef(new Map());

    // ── Analytics ──
    useEffect(() => {
        if (members && members.length > 0) {
            TrackingHelper.trackViewFamilyTree(members.length);
        }
    }, [members.length > 0 ? true : false]);

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
        drawTree(
            canvasRef.current,
            stateRef.current,
            members,
            selectedId,
            searchResultIds,
            imgCacheRef.current,
            t
        );
    }, [members, selectedId, searchResultIds, t]);

    // ─── Observe theme changes and redraw ───
    useEffect(() => {
        const observer = new MutationObserver(() => { invalidateThemeColors(); draw(); });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, [draw]);

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
        positions.forEach(p => { 
            minX = Math.min(minX, p.x); 
            maxX = Math.max(maxX, p.x + p.width); 
            minY = Math.min(minY, p.y); 
            maxY = Math.max(maxY, p.y + p.height); 
        });
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
