const db = require('../config/db');

const checkPermissions = async (userId, resourceType, action) => {
    try {
        // Récupérer les SecurityClasses assignées à l'utilisateur
        const userResult = await db.query('SELECT security_classes FROM Users WHERE id = $1', [userId]);
        const securityClasses = userResult.rows[0]?.security_classes || [];

        if (securityClasses.length === 0) {
            return []; // Aucun accès si pas de SecurityClasses
        }

        // Construire dynamiquement le nom de la colonne en fonction du type de ressource
        const column = `${resourceType}_id`;

        // Récupérer les IDs autorisés pour le type de ressource
        const query = `
            SELECT ${column}
            FROM SecurityClasses
            WHERE security_class_id = ANY($1)
            AND access_type IN ($2, 'all');
        `;
        const result = await db.query(query, [securityClasses, action]);

        return result.rows.map(row => row[column]); // Retourne les IDs autorisés
    } catch (err) {
        console.error('Error in checkPermissions:', err.message);
        throw new Error('Permission check failed');
    }
};


module.exports = { checkPermissions };

