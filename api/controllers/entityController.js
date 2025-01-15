const db = require('../config/db');
const { checkPermissions } = require('../middleware/permissions');

// Créer une entité
const createEntity = async (req, res) => {
    const { entity_name, entity_type, legal_identifier, parent_entity_id, internal_id } = req.body;

    try {
        const query = `
            INSERT INTO Entities (entity_name, entity_type, legal_identifier, parent_entity_id, internal_id)
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
        const result = await db.query(query, [
            entity_name, entity_type, legal_identifier, parent_entity_id || null, internal_id
        ]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creating entity' });
    }
};

// Récupérer toutes les entités
const getAllEntities = async (req, res) => {
    const userId = req.user.id;

    try {
        if (req.user.is_admin) {
            // Si admin, retourne toutes les entités
            const result = await db.query('SELECT * FROM Entities');
            return res.status(200).json(result.rows);
        }

        // Si non-admin, applique les autorisations
        const authorizedEntities = await checkPermissions(userId, 'entity', 'read');

        if (authorizedEntities.length === 0) {
            return res.status(200).json([]); // Aucun accès
        }

        // Requête récursive pour récupérer les entités autorisées et leurs descendants
        const query = `
            WITH RECURSIVE EntityTree AS (
                SELECT * FROM Entities WHERE entity_id = ANY($1)
                UNION ALL
                SELECT e.* FROM Entities e
                INNER JOIN EntityTree et ON e.parent_entity_id = et.entity_id
            )
            SELECT * FROM EntityTree;
        `;
        const result = await db.query(query, [authorizedEntities]);

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching entities:', err.message);
        res.status(500).json({ error: 'Error fetching entities' });
    }
};

// Récupérer une entité par ID
const getEntityById = async (req, res) => {
    const { entityId } = req.params;
    const userId = req.user.id;

    try {
        if (req.user.is_admin) {
            // Si admin, retourne directement l'entité
            const result = await db.query('SELECT * FROM Entities WHERE entity_id = $1', [entityId]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Entity not found' });
            }
            return res.status(200).json(result.rows[0]);
        }

        // Vérifie si l'utilisateur a accès à cette entité
        const hasAccess = await checkPermissions(userId, entityId, 'entity', 'read');
        if (!hasAccess.includes(entityId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await db.query('SELECT * FROM Entities WHERE entity_id = $1', [entityId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Entity not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching entity:', err.message);
        res.status(500).json({ error: 'Error fetching entity' });
    }
};

// Modifier une entité
const updateEntity = async (req, res) => {
    const { entityId } = req.params;
    const { entity_name, entity_type, legal_identifier, parent_entity_id, internal_id } = req.body;

    try {
        const query = `
            UPDATE Entities
            SET entity_name = COALESCE($1, entity_name),
                entity_type = COALESCE($2, entity_type),
                legal_identifier = COALESCE($3, legal_identifier),
                parent_entity_id = COALESCE($4, parent_entity_id),
                internal_id = COALESCE($5, internal_id)
            WHERE entity_id = $6
            RETURNING *;
        `;
        const values = [
            entity_name, entity_type, legal_identifier, parent_entity_id, internal_id, entityId
        ];
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Entity not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating entity' });
    }
};

// Supprimer une entité
const deleteEntity = async (req, res) => {
    const { entityId } = req.params;

    try {
        // Supprime l'entité
        const result = await db.query('DELETE FROM Entities WHERE entity_id = $1 RETURNING *', [entityId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Entity not found' });
        }

        res.status(200).json({ message: 'Entity deleted', entityId: result.rows[0].entity_id });
    } catch (err) {
        if (err.code === '23503') {
            // Gérer l'erreur de contrainte de clé étrangère
            return res.status(400).json({
                error: 'Cannot delete entity because it is referenced in other tables (e.g., Accounts).',
                details: err.detail,
            });
        }

        // Autres erreurs
        console.error('Error deleting entity:', err.message);
        res.status(500).json({ error: 'Error deleting entity' });
    }
};


module.exports = {
    createEntity,
    getAllEntities,
    getEntityById,
    updateEntity,
    deleteEntity,
};