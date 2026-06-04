import { useRef, useEffect, useCallback } from 'react';
import './Tree.css';
import { buildHierarchy, calculateLayout } from '../../shared/utils/treeLayout';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { useTranslation } from '../../shared/hooks/useTranslation.js';

// ─── Read canvas colors from CSS custom properties (cached) ───
let _cachedColors = null;

function getThemeColors() {
    if (_cachedColors) return _cachedColors;
    const s = getComputedStyle(document.documentElement);
    const v = (name) => s.getPropertyValue(name).trim();
    _cachedColors = {
        bg: v('--tree-bg'),
        grid: v('--tree-grid'),
        nodeFill: v('--tree-node-bg'),
        nodeBorder: v('--tree-node-border'),
        nodeBorderSelected: v('--tree-node-border-active'),
        nodeBorderSearch: v('--tree-node-border-active'),
        nodeShadow: v('--tree-node-shadow'),
        nodeShadowSelected: v('--tree-node-shadow-active'),
        textPrimary: v('--text-primary'),
        textDead: v('--text-muted'),
        textMuted: v('--text-muted'),
        genBadgeBg: v('--tree-badge-bg'),
        genBadgeBorder: v('--tree-badge-border'),
        genBadgeText: v('--tree-badge-text'),
        spouseLine: v('--tree-line-spouse'),
        childLine: v('--tree-line-parent'),
    };
    return _cachedColors;
}

function invalidateThemeColors() { _cachedColors = null; }

export default function TreeCanvas({ members, selectedId, searchResultIds, onSelectMember, onDeselect }) {
    const { t } = useTranslation();
    const canvasRef = useRef(null);
    const stateRef = useRef({ panX: 0, panY: 0, scale: 1, isPanning: false, lastPt: null });
    const imgCacheRef = useRef(new Map()); // Cache for member photo Image objects

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
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { panX, panY, scale } = stateRef.current;
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr, h = canvas.height / dpr;
        const colors = getThemeColors();

        // Reset transform and clear with DPR
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        // Background fill
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, w, h);
        // Subtle grid
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(scale, scale);

        const hierarchy = buildHierarchy(members);
        if (!hierarchy) { ctx.restore(); return; }
        const positions = calculateLayout(hierarchy);
        drawConnections(ctx, hierarchy, positions, colors);
        positions.forEach(p => drawNode(ctx, p, selectedId, searchResultIds || [], imgCacheRef.current, colors, t));
        ctx.restore();
    }, [members, selectedId, searchResultIds, t]);

    // ─── Observe theme changes and redraw ───
    useEffect(() => {
        const observer = new MutationObserver(() => { invalidateThemeColors(); draw(); });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, [draw]);

    function drawConnections(ctx, node, positions, colors) {
        const posMap = new Map();
        positions.forEach(p => posMap.set(p.member.id, p));
        drawConRec(ctx, node, posMap, colors);
    }

    function drawConRec(ctx, node, posMap, colors) {
        const pp = posMap.get(node.member.id);
        if (!pp) return;
        let parentCX;

        // Ancestors/Senior generation connection lines get a golden neon accent, others get cyan neon
        const isGoldLine = node.member.generation === 1;
        const lineColor = isGoldLine ? '#D4AF37' : '#00F0FF';
        const lineGlow = isGoldLine ? 'rgba(212, 175, 55, 0.4)' : 'rgba(0, 240, 255, 0.4)';

        if (node.spouse) {
            const sp = posMap.get(node.spouse.id);
            if (sp) {
                parentCX = (pp.x + sp.x + sp.width) / 2;
                ctx.save();
                ctx.shadowColor = '#D4AF37';
                ctx.shadowBlur = 6;
                ctx.strokeStyle = '#D4AF37';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(pp.x + pp.width, pp.y + pp.height / 2);
                ctx.lineTo(sp.x, sp.y + sp.height / 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            } else { parentCX = pp.x + pp.width / 2; }
        } else { parentCX = pp.x + pp.width / 2; }

        const botY = pp.y + pp.height;
        if (node.children.length > 0) {
            const midY = botY + 50;

            ctx.save();
            ctx.shadowColor = lineGlow;
            ctx.shadowBlur = 8;
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 2.5;

            // Vertical line down from parent
            ctx.beginPath();
            ctx.moveTo(parentCX, botY);
            ctx.lineTo(parentCX, midY);
            ctx.stroke();

            const ccs = node.children.map(c => {
                const cp = posMap.get(c.member.id);
                if (!cp) return parentCX;
                if (c.spouse) { const csp = posMap.get(c.spouse.id); if (csp) return (cp.x + csp.x + csp.width) / 2; }
                return cp.x + cp.width / 2;
            });

            // Horizontal connection bar
            if (ccs.length > 1) {
                ctx.beginPath();
                ctx.moveTo(Math.min(...ccs), midY);
                ctx.lineTo(Math.max(...ccs), midY);
                ctx.stroke();
            }

            // Vertical lines to each child
            node.children.forEach((child, i) => {
                const cp = posMap.get(child.member.id);
                if (!cp) return;
                ctx.beginPath();
                ctx.moveTo(ccs[i], midY);
                ctx.lineTo(ccs[i], cp.y);
                ctx.stroke();
            });

            ctx.restore();
        }
        node.children.forEach(c => drawConRec(ctx, c, posMap, colors));
    }

    function getYearFromDate(dateStr) {
        if (!dateStr) return null;
        const y = parseInt(dateStr);
        return isNaN(y) ? null : y;
    }

    function drawNode(ctx, nodePos, selId, searchIds, imgCache, colors, t) {
        const { member, x, y, width: w, height: h } = nodePos;
        const isSel = selId === member.id;
        const isSearch = searchIds.includes(member.id);
        const isDead = !!member.deathDate;
        const isMale = member.gender === 1;
        const r = 20;

        const birthYear = getYearFromDate(member.birthDate);
        const deathYear = getYearFromDate(member.deathDate);

        // Glassmorphic Node Card Background
        ctx.save();
        ctx.shadowColor = isSel ? '#00F0FF' : 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = isSel ? 16 : 8;
        ctx.shadowOffsetY = 4;

        ctx.beginPath(); roundRect(ctx, x, y, w, h, r);
        ctx.fillStyle = 'rgba(10, 15, 30, 0.75)'; // Dark glass
        ctx.fill();
        ctx.restore();

        // Card fine border
        ctx.beginPath(); roundRect(ctx, x, y, w, h, r);
        ctx.strokeStyle = isSel ? '#00F0FF' : isSearch ? '#00F0FF' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = isSel ? 2 : 1;
        ctx.stroke();

        // Glowing Avatar Ring (mockup style)
        // Ancestors, admins, and females get a gold glowing ring; young males get a cyan glowing ring.
        const isGoldRing = member.generation === 1 || (member.role && member.role.toLowerCase() === 'admin') || !isMale;
        const ringColor = isGoldRing ? '#D4AF37' : '#00F0FF';
        const ringGlow = isGoldRing ? 'rgba(212, 175, 55, 0.5)' : 'rgba(0, 240, 255, 0.5)';

        const ax = x + w / 2, ay = y + 46, ar = 30;

        ctx.save();
        ctx.shadowColor = ringGlow;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(ax, ay, ar + 3, 0, Math.PI * 2);
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        // Avatar Clip
        const cachedImg = imgCache ? imgCache.get(member.id) : null;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ax, ay, ar, 0, Math.PI * 2);
        ctx.clip();

        if (cachedImg && cachedImg instanceof Image && cachedImg.complete) {
            ctx.drawImage(cachedImg, ax - ar, ay - ar, ar * 2, ar * 2);
        } else {
            ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2);
            const ag = ctx.createRadialGradient(ax, ay, 0, ax, ay, ar);
            if (isMale) {
                ag.addColorStop(0, '#102a45');
                ag.addColorStop(1, '#051220');
            } else {
                ag.addColorStop(0, '#3a1a2b');
                ag.addColorStop(1, '#1b0510');
            }
            ctx.fillStyle = ag; ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `bold 24px "Inter", sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(member.name ? member.name.charAt(0) : '👤', ax, ay);
        }
        ctx.restore();

        // Name — premium bold white text
        ctx.fillStyle = isDead ? '#64748B' : '#FFFFFF';
        ctx.font = 'bold 15px "Inter", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let dn = member.name || '';
        while (ctx.measureText(dn).width > w - 24 && dn.length > 3) dn = dn.slice(0, -1);
        if (dn !== member.name) dn += '…';
        ctx.fillText(dn, x + w / 2, y + 98);

        // Sub-label (Role/Relationship in localized string)
        ctx.fillStyle = isGoldRing ? '#D4AF37' : '#00F0FF';
        ctx.font = '600 12px "Inter", sans-serif';
        let roleLabel = '';
        if (member.role && member.role.toLowerCase() === 'admin') {
            roleLabel = t('tree.founder');
        } else if (member.generation === 1) {
            roleLabel = isMale ? t('tree.patriarch') : t('tree.matriarch');
        } else {
            roleLabel = isMale ? t('tree.son_gen').replace('{gen}', member.generation) : t('tree.daughter_gen').replace('{gen}', member.generation);
        }
        ctx.fillText(roleLabel, x + w / 2, y + 118);

        // Timeline Years
        const yt = deathYear ? `${birthYear || '?'} - ${deathYear}` : birthYear ? `${birthYear} - ${t('detail.present')}` : '';
        if (yt) {
            ctx.fillStyle = '#64748B';
            ctx.font = '500 11px "Inter", sans-serif';
            ctx.fillText(yt, x + w / 2, y + 138);
        }

        // Dead Indicator
        if (isDead) {
            ctx.fillStyle = '#64748B';
            ctx.font = '12px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('✝', x + w - 16, y + 18);
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
