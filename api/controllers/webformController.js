const db = require('../config/db');

// Créer une nouvelle webform
const createWebform = async (req, res) => {
    const { name, path, security_group } = req.body;

    try {
        const query = `
            INSERT INTO webforms (name, path, security_group)
            VALUES ($1, $2, $3) RETURNING *;
        `;
        const values = [name, path, security_group || 'public'];

        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating webform:', err.message);
        res.status(500).json({ error: 'Error creating webform' });
    }
};

// Récupérer toutes les webforms avec filtrage sur security_group
const getAllWebforms = async (req, res) => {
    const userGroup = req.user.security_group;

    try {
        const query = `
            SELECT * FROM webforms
            WHERE security_group = $1 OR security_group = 'public'
            ORDER BY name;
        `;
        const values = [userGroup];

        const result = await db.query(query, values);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching webforms:', err.message);
        res.status(500).json({ error: 'Error fetching webforms' });
    }
};

// Récupérer une webform spécifique avec contrôle de sécurité
const getWebformById = async (req, res) => {
    const { webformId } = req.params;
    const userGroup = req.user.security_group;

    try {
        const query = `
            SELECT * FROM webforms
            WHERE id = $1 AND (security_group = $2 OR security_group = 'public');
        `;
        const values = [webformId, userGroup];

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching webform:', err.message);
        res.status(500).json({ error: 'Error fetching webform' });
    }
};

// Modifier une webform
const updateWebform = async (req, res) => {
    const { webformId } = req.params;
    const { name, path, security_group } = req.body;

    try {
        const query = `
            UPDATE webforms
            SET name = COALESCE($1, name),
                path = COALESCE($2, path),
                security_group = COALESCE($3, security_group)
            WHERE id = $4
            RETURNING *;
        `;
        const values = [name, path, security_group, webformId];

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Webform non trouvée' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error updating webform:', err.message);
        res.status(500).json({ error: 'Error updating webform' });
    }
};

// Supprimer une webform
const deleteWebform = async (req, res) => {
    const { webformId } = req.params;

    try {
        const result = await db.query('DELETE FROM webforms WHERE id = $1 RETURNING *', [webformId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Webform non trouvée' });
        }

        res.status(200).json({ message: 'Webform supprimée', webformId: result.rows[0].id });
    } catch (err) {
        console.error('Error deleting webform:', err.message);
        res.status(500).json({ error: 'Error deleting webform' });
    }
};

module.exports = {
    createWebform,
    getAllWebforms,
    getWebformById,
    updateWebform,
    deleteWebform
};
