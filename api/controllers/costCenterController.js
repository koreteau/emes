const db = require('../config/db');
const { checkPermissions } = require('../middleware/permissions');

// Créer un Cost Center
const createCostCenter = async (req, res) => {
    const { cost_center_name, parent_cost_center_id } = req.body; // Vérifie que la clé correspond

    try {
        const result = await db.query(
            `INSERT INTO CostCenters (cost_center_name, parent_cost_center_id)
             VALUES ($1, $2) RETURNING *`,
            [cost_center_name, parent_cost_center_id] // Utilise la bonne clé
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creating Cost Center', details: err.message });
    }
};


// Récupérer tous les Cost Centers
const getAllCostCenters = async (req, res) => {
    const userId = req.user.id;

    try {
        if (req.user.is_admin) {
            // Si admin, retourne tous les Cost Centers
            const result = await db.query('SELECT * FROM CostCenters');
            return res.status(200).json(result.rows);
        }

        // Si non-admin, applique les autorisations
        const authorizedCostCenters = await checkPermissions(userId, 'cost_center', 'read');

        if (authorizedCostCenters.length === 0) {
            return res.status(200).json([]); // Aucun accès
        }

        // Requête récursive pour récupérer les Cost Centers autorisés et leurs descendants
        const query = `
            WITH RECURSIVE CostCenterTree AS (
                SELECT * FROM CostCenters WHERE cost_center_id = ANY($1)
                UNION ALL
                SELECT c.* FROM CostCenters c
                INNER JOIN CostCenterTree ct ON c.parent_cost_center_id = ct.cost_center_id
            )
            SELECT * FROM CostCenterTree;
        `;
        const result = await db.query(query, [authorizedCostCenters]);

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching Cost Centers:', err.message);
        res.status(500).json({ error: 'Error fetching Cost Centers' });
    }
};


// Récupérer un Cost Center par ID
const getCostCenterById = async (req, res) => {
    const { costCenterId } = req.params;
    const userId = req.user.id;

    try {
        if (req.user.is_admin) {
            // Si l'utilisateur est admin, retourne directement le Cost Center
            const result = await db.query('SELECT * FROM CostCenters WHERE cost_center_id = $1', [costCenterId]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Cost Center not found' });
            }
            return res.status(200).json(result.rows[0]);
        }

        // Vérifie si l'utilisateur a accès à ce Cost Center
        const hasAccess = await checkPermissions(userId, costCenterId, 'cost_center', 'read');
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await db.query('SELECT * FROM CostCenters WHERE cost_center_id = $1', [costCenterId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cost Center not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching Cost Center' });
    }
};

// Modifier un Cost Center
const updateCostCenter = async (req, res) => {
    const { costCenterId } = req.params;
    const { name, parent_cost_center_id } = req.body;

    try {
        const query = `
            UPDATE CostCenters
            SET cost_center_name = COALESCE($1, cost_center_name),
                parent_cost_center_id = COALESCE($2, parent_cost_center_id)
            WHERE cost_center_id = $3
            RETURNING *;
        `;
        const result = await db.query(query, [name, parent_cost_center_id, costCenterId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cost Center not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating Cost Center' });
    }
};

// Supprimer un Cost Center
const deleteCostCenter = async (req, res) => {
    const { costCenterId } = req.params;

    try {
        const result = await db.query('DELETE FROM CostCenters WHERE cost_center_id = $1 RETURNING *', [costCenterId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cost Center not found' });
        }

        res.status(200).json({ message: 'Cost Center deleted', costCenterId: result.rows[0].cost_center_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error deleting Cost Center' });
    }
};

module.exports = {
    createCostCenter,
    getAllCostCenters,
    getCostCenterById,
    updateCostCenter,
    deleteCostCenter,
};
