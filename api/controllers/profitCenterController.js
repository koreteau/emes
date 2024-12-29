const db = require('../config/db');
const { checkPermissions } = require('../middleware/permissions');

// Créer un Profit Center
const createProfitCenter = async (req, res) => {
    const { profit_center_name, parent_profit_center_id } = req.body;

    try {
        const result = await db.query(
            `INSERT INTO ProfitCenters (profit_center_name, parent_profit_center_id)
             VALUES ($1, $2) RETURNING *`,
            [profit_center_name, parent_profit_center_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creating Profit Center' });
    }
};

// Récupérer tous les Profit Centers
const getAllProfitCenters = async (req, res) => {
    const userId = req.user.id;

    try {
        if (req.user.is_admin) {
            // Si admin, retourne tous les Profit Centers
            const result = await db.query('SELECT * FROM ProfitCenters');
            return res.status(200).json(result.rows);
        }

        // Si non-admin, applique les autorisations
        const authorizedProfitCenters = await checkPermissions(userId, 'profit_center', 'read');

        if (authorizedProfitCenters.length === 0) {
            return res.status(200).json([]); // Aucun accès
        }

        // Requête récursive pour récupérer les Profit Centers autorisés et leurs descendants
        const query = `
            WITH RECURSIVE ProfitCenterTree AS (
                SELECT * FROM ProfitCenters WHERE profit_center_id = ANY($1)
                UNION ALL
                SELECT p.* FROM ProfitCenters p
                INNER JOIN ProfitCenterTree pt ON p.parent_profit_center_id = pt.profit_center_id
            )
            SELECT * FROM ProfitCenterTree;
        `;
        const result = await db.query(query, [authorizedProfitCenters]);

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching Profit Centers:', err.message);
        res.status(500).json({ error: 'Error fetching Profit Centers' });
    }
};

// Récupérer un Profit Center par ID
const getProfitCenterById = async (req, res) => {
    const { profitCenterId } = req.params;
    const userId = req.user.id;

    try {
        if (req.user.is_admin) {
            // Si admin, retourne directement le Profit Center
            const result = await db.query('SELECT * FROM ProfitCenters WHERE profit_center_id = $1', [profitCenterId]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Profit Center not found' });
            }
            return res.status(200).json(result.rows[0]);
        }

        // Vérifie si l'utilisateur a accès à ce Profit Center
        const hasAccess = await checkPermissions(userId, 'profit_center', 'read');

        if (!hasAccess.includes(profitCenterId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await db.query('SELECT * FROM ProfitCenters WHERE profit_center_id = $1', [profitCenterId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Profit Center not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching Profit Center:', err.message);
        res.status(500).json({ error: 'Error fetching Profit Center' });
    }
};


// Modifier un Profit Center
const updateProfitCenter = async (req, res) => {
    const { profitCenterId } = req.params;
    const { profit_center_name, parent_profit_center_id } = req.body;

    try {
        const query = `
            UPDATE ProfitCenters
            SET profit_center_name = COALESCE($1, profit_center_name),
                parent_profit_center_id = COALESCE($2, parent_profit_center_id)
            WHERE profit_center_id = $3
            RETURNING *;
        `;
        const result = await db.query(query, [profit_center_name, parent_profit_center_id, profitCenterId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Profit Center not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating Profit Center' });
    }
};

// Supprimer un Profit Center
const deleteProfitCenter = async (req, res) => {
    const { profitCenterId } = req.params;

    try {
        const result = await db.query('DELETE FROM ProfitCenters WHERE profit_center_id = $1 RETURNING *', [profitCenterId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Profit Center not found' });
        }

        res.status(200).json({ message: 'Profit Center deleted', profitCenterId: result.rows[0].profit_center_id });
    } catch (err) {
        console.error('Error deleting Profit Center:', err.message);
        res.status(500).json({ error: 'Error deleting Profit Center' });
    }
};

module.exports = {
    createProfitCenter,
    getAllProfitCenters,
    getProfitCenterById,
    updateProfitCenter,
    deleteProfitCenter,
};
