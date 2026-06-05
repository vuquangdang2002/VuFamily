import { buildHierarchy, calculateLayout } from '../../../shared/utils/treeLayout';

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

export function invalidateThemeColors() { 
    _cachedColors = null; 
}

function drawConnections(ctx, node, positions, colors) {
    const posMap = new Map();
    positions.forEach(p => posMap.set(p.member.id, p));
    drawConRec(ctx, node, posMap, colors);
}

function drawConRec(ctx, node, posMap, colors) {
    const pp = posMap.get(node.member.id);
    if (!pp) return;
    let parentCX;

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
        } else { 
            parentCX = pp.x + pp.width / 2; 
        }
    } else { 
        parentCX = pp.x + pp.width / 2; 
    }

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
            if (c.spouse) { 
                const csp = posMap.get(c.spouse.id); 
                if (csp) return (cp.x + csp.x + csp.width) / 2; 
            }
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

function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
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

    ctx.beginPath(); 
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = 'rgba(10, 15, 30, 0.75)';
    ctx.fill();
    ctx.restore();

    // Card fine border
    ctx.beginPath(); 
    roundRect(ctx, x, y, w, h, r);
    ctx.strokeStyle = isSel ? '#00F0FF' : isSearch ? '#00F0FF' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = isSel ? 2 : 1;
    ctx.stroke();

    // Glowing Avatar Ring
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
        ctx.beginPath(); 
        ctx.arc(ax, ay, ar, 0, Math.PI * 2);
        const ag = ctx.createRadialGradient(ax, ay, 0, ax, ay, ar);
        if (isMale) {
            ag.addColorStop(0, '#102a45');
            ag.addColorStop(1, '#051220');
        } else {
            ag.addColorStop(0, '#3a1a2b');
            ag.addColorStop(1, '#1b0510');
        }
        ctx.fillStyle = ag; 
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold 24px "Inter", sans-serif`;
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'middle';
        ctx.fillText(member.name ? member.name.charAt(0) : '👤', ax, ay);
    }
    ctx.restore();

    // Name
    ctx.fillStyle = isDead ? '#64748B' : '#FFFFFF';
    ctx.font = 'bold 15px "Inter", sans-serif';
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle';
    let dn = member.name || '';
    while (ctx.measureText(dn).width > w - 24 && dn.length > 3) dn = dn.slice(0, -1);
    if (dn !== member.name) dn += '…';
    ctx.fillText(dn, x + w / 2, y + 98);

    // Sub-label
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

export function drawTree(canvas, state, members, selectedId, searchResultIds, imgCache, t) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { panX, panY, scale } = state;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr, h = canvas.height / dpr;
    const colors = getThemeColors();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);
    
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    const hierarchy = buildHierarchy(members);
    if (!hierarchy) { 
        ctx.restore(); 
        return; 
    }
    
    const positions = calculateLayout(hierarchy);
    drawConnections(ctx, hierarchy, positions, colors);
    positions.forEach(p => drawNode(ctx, p, selectedId, searchResultIds || [], imgCache, colors, t));
    ctx.restore();
}
