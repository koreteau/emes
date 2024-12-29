const db = require('../config/db');
const { checkPermissions } = require('../middleware/permissions');

// Créer un InterCost
const createInterCost = async (req, res) => {
    const { origin_cost_center_id, destination_entity_id, amount, currency, transaction_date, description } = req.body;

    try {
        const query = `
            INSERT INTO InterCosts (origin_cost_center_id, destination_entity_id, amount, currency, transaction_date, description)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
        `;
        const result = await db.query(query, [
            origin_cost_center_id,
            destination_entity_id,
            amount,
            currency,
            transaction_date,
            description,
        ]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creating InterCost' });
    }
};

// Récupérer tous les InterCosts
const getAllInterCosts = async (req, res) => {
    const userId = req.user.id;

    try {
        if (req.user.is_admin) {
            // Si admin, retourne tous les InterCosts
            const result = await db.query('SELECT * FROM InterCosts');
            return res.status(200).json(result.rows);
        }

        // Si non-admin, applique les autorisations
        const authorizedInterCosts = await checkPermissions(userId, 'intercost', 'read');

        if (authorizedInterCosts.length === 0) {
            return res.status(200).json([]); // Aucun accès
        }

        const query = `
            SELECT * FROM InterCosts WHERE ic_id = ANY($1);
        `;
        const result = await db.query(query, [authorizedInterCosts]);

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching InterCosts:', err.message);
        res.status(500).json({ error: 'Error fetching InterCosts' });
    }
};

// Récupérer un InterCost par ID
const getInterCostById = async (req, res) => {
    const { icId } = req.params;
    const userId = req.user.id;

    try {
        if (req.user.is_admin) {
            const result = await db.query('SELECT * FROM InterCosts WHERE ic_id = $1', [icId]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'InterCost not found' });
            }
            return res.status(200).json(result.rows[0]);
        }

        // Vérifie si l'utilisateur a accès à ce InterCost
        const hasAccess = await checkPermissions(userId, icId, 'intercost', 'read');
        if (!hasAccess.includes(icId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await db.query('SELECT * FROM InterCosts WHERE ic_id = $1', [icId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'InterCost not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching InterCost:', err.message);
        res.status(500).json({ error: 'Error fetching InterCost' });
    }
};

// Modifier un InterCost
const updateInterCost = async (req, res) => {
    const { icId } = req.params;
    const { origin_cost_center_id, destination_entity_id, amount, currency, transaction_date, description } = req.body;

    try {
        const query = `
            UPDATE InterCosts
            SET origin_cost_center_id = COALESCE($1, origin_cost_center_id),
                destination_entity_id = COALESCE($2, destination_entity_id),
                amount = COALESCE($3, amount),
                currency = COALESCE($4, currency),
                transaction_date = COALESCE($5, transaction_date),
                description = COALESCE($6, description)
            WHERE ic_id = $7
            RETURNING *;
        `;
        const result = await db.query(query, [
            origin_cost_center_id,
            destination_entity_id,
            amount,
            currency,
            transaction_date,
            description,
            icId,
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'InterCost not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating InterCost' });
    }
};

// Supprimer un InterCost
const deleteInterCost = async (req, res) => {
    const { icId } = req.params;

    try {
        const result = await db.query('DELETE FROM InterCosts WHERE ic_id = $1 RETURNING *', [icId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'InterCost not found' });
        }

        res.status(200).json({ message: 'InterCost deleted', icId: result.rows[0].ic_id });
    } catch (err) {
        console.error('Error deleting InterCost:', err.message);
        res.status(500).json({ error: 'Error deleting InterCost' });
    }
};

module.exports = {
    createInterCost,
    getAllInterCosts,
    getInterCostById,
    updateInterCost,
    deleteInterCost,
};