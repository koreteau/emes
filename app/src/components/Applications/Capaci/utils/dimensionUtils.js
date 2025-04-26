// utils/dimensionUtils.js

// Trouver tous les descendants d'un noeud donné
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

// Trouver uniquement les bases (feuilles) descendants d'un noeud donné
export function getBaseMembers(members, parentId) {
    const baseDescendants = [];

    const traverse = (nodeId) => {
        members
            .filter(m => m.parent === nodeId)
            .forEach(child => {
                if (child.type === "base" || !members.some(m => m.parent === child.id)) {
                    baseDescendants.push(child);
                } else {
                    traverse(child.id);
                }
            });
    };

    traverse(parentId);
    return baseDescendants;
}

// Résoudre un chemin du type "CURRENCY[Descendants]" ou "Year[Base]"
export function resolveDimensionMembers(members, expression) {
    if (!expression.includes('[')) {
        // Cas simple : id direct
        return members.filter(m => m.id === expression);
    }

    const match = expression.match(/(.*?)\[(.*?)\]/);
    if (!match) return [];

    const [, baseId, mode] = match;

    if (mode === "Descendants") {
        return getDescendants(members, baseId);
    } else if (mode === "Base") {
        return getBaseMembers(members, baseId);
    }

    return [];
}  