const db = require('../config/db');

// Récupère les Cost Centers accessibles à un utilisateur et leurs descendants
const getAccessibleCostCenters = async (userId) => {
    try {
        // Récupère les Cost Centers définis dans les Security Classes
        const result = await db.query(`
            SELECT cost_center_id
            FROM SecurityClasses
            WHERE user_id = $1 AND access_type IN ('read', 'all')
        `, [userId]);

        const accessibleCostCenters = result.rows.map(row => row.cost_center_id);

        // Récupère les descendants des Cost Centers accessibles
        const descendants = await getDescendantCostCenters(accessibleCostCenters);

        // Combine les Cost Centers accessibles et leurs descendants
        return [...new Set([...accessibleCostCenters, ...descendants])];
    } catch (err) {
        console.error(err);
        throw new Error('Permission check failed');
    }
};

// Fonction récursive pour récupérer les descendants
const getDescendantCostCenters = async (parentIds) => {
    try {
        const result = await db.query(`
            SELECT cost_center_id
            FROM CostCenters
            WHERE parent_cost_center_id = ANY($1)
        `, [parentIds]);

        const childIds = result.rows.map(row => row.cost_center_id);

        if (childIds.length > 0) {
            // Récursivité : trouve les descendants des enfants
            const grandchildren = await getDescendantCostCenters(childIds);
            return [...childIds, ...grandchildren];
        }

        return childIds;
    } catch (err) {
        console.error(err);
        throw new Error('Failed to fetch descendant Cost Centers');
    }
};

module.exports = { getAccessibleCostCenters };
