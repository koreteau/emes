// utils/dimensionUtils.js

// ✅ Récupère tous les membres de la dimension
export function getAllMembers(members) {
    return members;
}

// ✅ Récupère tous les descendants d’un membre donné (récursif)
export function getDescendants(members, parentId) {
    const descendants = [];

    const traverse = (nodeId) => {
        members
            .filter(m => m.parent === nodeId)
            .forEach(child => {
                descendants.push(child);
                traverse(child.id);
            });
    };

    traverse(parentId);
    return descendants;
}

// ✅ Récupère uniquement les feuilles (base members) sous un membre
export function getBaseMembers(members, parentId) {
    const baseDescendants = [];

    const traverse = (nodeId) => {
        members
            .filter(m => m.parent === nodeId)
            .forEach(child => {
                const isLeaf = child.type === "base" || !members.some(m => m.parent === child.id);
                if (isLeaf) {
                    baseDescendants.push(child);
                } else {
                    traverse(child.id);
                }
            });
    };

    traverse(parentId);
    return baseDescendants;
}

// 🔍 Résout des expressions du type "ID$[Descendants]", "$[All]", etc.
export function resolveDimensionMembers(members, expression) {
    if (!expression.includes("$[")) {
        // Cas simple : nom ou id direct
        return members.filter(m => m.id === expression || m.name === expression);
    }

    // Cas $[All]
    if (expression === "$[All]") {
        return getAllMembers(members);
    }

    // Cas $[Base]
    if (expression === "$[Base]") {
        return members.filter(m => m.type === "base" || !members.some(n => n.parent === m.id));
    }

    // Cas "Nom$[Descendants]" ou "ID$[Base]"
    const match = expression.match(/^(.*?)\$\[(Descendants|Base)\]$/);
    if (!match) return [];

    const [, baseId, mode] = match;
    const baseMember = members.find(m => m.id === baseId || m.name === baseId);
    if (!baseMember) return [];

    if (mode === "Descendants") {
        return [baseMember, ...getDescendants(members, baseMember.id)];
    } else if (mode === "Base") {
        return getBaseMembers(members, baseMember.id);
    }

    return [];
}