const db = require('../config/db');

// Créer une Security Class
const createSecurityClass = async (req, res) => {
    const { name, access_type, entity_id, account_id, cost_center_id, profit_center_id, intercost_id } = req.body;

    try {
        const result = await db.query(
            `INSERT INTO SecurityClasses (name, access_type, entity_id, account_id, cost_center_id, profit_center_id, intercost_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [name, access_type, entity_id, account_id, cost_center_id, profit_center_id, intercost_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creating Security Class' });
    }
};

// Récupérer toutes les Security Classes
const getAllSecurityClasses = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM SecurityClasses');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching Security Classes' });
    }
};

// Récupérer une Security Class par ID
const getSecurityClassById = async (req, res) => {
    const { securityClassId } = req.params;

    try {
        const result = await db.query('SELECT * FROM SecurityClasses WHERE security_class_id = $1', [securityClassId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Security Class not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching Security Class' });
    }
};

// Modifier une Security Class par ID
const updateSecurityClass = async (req, res) => {
    const { securityClassId } = req.params;
    const { name, access_type, entity_id, account_id, cost_center_id, profit_center_id, intercost_id } = req.body;

    try {
        const query = `
            UPDATE SecurityClasses
            SET name = COALESCE($1, name),
                access_type = COALESCE($2, access_type),
                entity_id = COALESCE($3, entity_id),
                account_id = COALESCE($4, account_id),
                cost_center_id = COALESCE($5, cost_center_id),
                profit_center_id = COALESCE($6, profit_center_id),
                intercost_id = COALESCE($7, intercost_id)
            WHERE security_class_id = $8
            RETURNING *;
        `;

        const values = [name, access_type, entity_id, account_id, cost_center_id, profit_center_id, intercost_id, securityClassId];
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Security Class not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating Security Class' });
    }
};

// Supprimer une Security Class par ID
const deleteSecurityClass = async (req, res) => {
    const { securityClassId } = req.params;

    try {
        const result = await db.query('DELETE FROM SecurityClasses WHERE security_class_id = $1 RETURNING *', [securityClassId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Security Class not found' });
        }

        res.status(200).json({ message: 'Security Class deleted', securityClassId: result.rows[0].security_class_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error deleting Security Class' });
    }
};

module.exports = {
    createSecurityClass,
    getAllSecurityClasses,
    getSecurityClassById,
    updateSecurityClass,
    deleteSecurityClass,
};
