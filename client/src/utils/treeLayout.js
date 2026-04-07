// Tree layout utility functions

// Build hierarchical tree from flat members array
export function buildHierarchy(members) {
    if (!members || members.length === 0) return null;

    const memberMap = new Map();
    members.forEach(m => memberMap.set(m.id, m));

    const getSpouse = (m) => m.spouseId ? memberMap.get(m.spouseId) || null : null;

    const getChildren = (parentId) =>
        members.filter(m => m.parentId === parentId).sort((a, b) => (a.birthDate || '').localeCompare(b.birthDate || ''));

    // Find root: member with no parentId, not a spouse-only
    const roots = members.filter(m => {
        if (m.parentId) return false;
        const spouse = getSpouse(m);
        if (spouse && spouse.parentId) return false;
        const children = getChildren(m.id);
        if (children.length > 0) return true;
        if (spouse) {
            const spouseChildren = getChildren(spouse.id);
            if (spouseChildren.length > 0) return false;
        }
        return !m.spouseId;
    });

    const root = roots[0] || members[0];
    if (!root) return null;

    const buildNode = (member) => {
        const spouse = getSpouse(member);
        let allChildren = [...getChildren(member.id)];
        if (spouse) {
            getChildren(spouse.id).forEach(sc => {
                if (!allChildren.find(c => c.id === sc.id)) allChildren.push(sc);
            });
        }
        allChildren.sort((a, b) => (a.birthDate || '').localeCompare(b.birthDate || ''));
        return { member, spouse, children: allChildren.map(c => buildNode(c)) };
    };

    return buildNode(root);
}

// Calculate layout positions for tree nodes
export function calculateLayout(hierarchy, nodeWidth = 260, nodeHeight = 170, hGap = 50, vGap = 100) {
    if (!hierarchy) return [];

    const COUPLE_W = nodeWidth * 2 + 40;
    const positions = [];

    const calcWidth = (node) => {
        if (node.children.length === 0) return node.spouse ? COUPLE_W : nodeWidth;
        let cw = 0;
        node.children.forEach((c, i) => { if (i > 0) cw += hGap; cw += calcWidth(c); });
        return Math.max(node.spouse ? COUPLE_W : nodeWidth, cw);
    };

    const positionNode = (node, x, y, availW) => {
        const selfW = node.spouse ? COUPLE_W : nodeWidth;
        const cx = x + availW / 2;
        const memberX = node.spouse ? cx - nodeWidth - 20 : cx - nodeWidth / 2;

        positions.push({ member: node.member, x: memberX, y, width: nodeWidth, height: nodeHeight, isSpouse: false });

        if (node.spouse) {
            positions.push({ member: node.spouse, x: cx + 20, y, width: nodeWidth, height: nodeHeight, isSpouse: true });
        }

        if (node.children.length > 0) {
            const childWidths = node.children.map(c => calcWidth(c));
            let totalCW = childWidths.reduce((a, b) => a + b, 0) + (node.children.length - 1) * hGap;
            let childX = cx - totalCW / 2;
            const childY = y + nodeHeight + vGap;

            node.children.forEach((child, i) => {
                positionNode(child, childX, childY, childWidths[i]);
                childX += childWidths[i] + hGap;
            });
        }
    };

    const totalW = calcWidth(hierarchy);
    positionNode(hierarchy, 0, 0, totalW);
    return positions;
}
