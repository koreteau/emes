const db = require('../config/db');
const { checkPermissions } = require('../middleware/permissions');

// Créer une entrée dans la table Data
const createData = async (req, res) => {
    const {
        data_date,
        amount,
        currency,
        description,
        account_id,
        profit_center_id,
        cost_center_id,
        entity_id,
        scenario_id,
    } = req.body;

    try {
        const query = `
            INSERT INTO data (
                data_date, amount, currency, description, account_id, profit_center_id,
                cost_center_id, entity_id, scenario_id
            )
            VALUES (
                $1, $2, $3, $4, 
                CAST(NULLIF($5, '') AS uuid), CAST(NULLIF($6, '') AS uuid),
                CAST(NULLIF($7, '') AS uuid), CAST(NULLIF($8, '') AS uuid),
                CAST(NULLIF($9, '') AS uuid)
            )
            RETURNING *;
        `;

        const values = [
            data_date,
            amount,
            currency,
            description,
            account_id,
            profit_center_id,
            cost_center_id,
            entity_id,
            scenario_id,
        ];

        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating data:', err.message);
        res.status(500).json({ error: 'Error creating data' });
    }
};

// Récupérer toutes les entrées Data (avec filtrage par permissions)
const getAllData = async (req, res) => {
    const userId = req.user.id;

    try {
        let query;
        let values = [];

        if (req.user.is_admin) {
            // Admin : Récupère toutes les entrées
            query = 'SELECT * FROM data ORDER BY data_date DESC';
        } else {
            // Filtrage par permissions pour les utilisateurs non-admin
            const authorizedEntities = await checkPermissions(userId, 'entity', 'read');
            const authorizedCostCenters = await checkPermissions(userId, 'cost_center', 'read');
            const authorizedProfitCenters = await checkPermissions(userId, 'profit_center', 'read');

            query = `
                SELECT * FROM data
                WHERE entity_id = ANY($1)
                OR cost_center_id = ANY($2)
                OR profit_center_id = ANY($3)
                ORDER BY data_date DESC;
            `;
            values = [authorizedEntities, authorizedCostCenters, authorizedProfitCenters];
        }

        const result = await db.query(query, values);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching data:', err.message);
        res.status(500).json({ error: 'Error fetching data' });
    }
};

// Récupérer une entrée Data par ID
const getDataById = async (req, res) => {
    const { dataId } = req.params;
    const userId = req.user.id;

    try {
        let query = 'SELECT * FROM data WHERE data_id = $1';
        let values = [dataId];

        if (!req.user.is_admin) {
            const authorizedEntities = await checkPermissions(userId, 'entity', 'read');
            const authorizedCostCenters = await checkPermissions(userId, 'cost_center', 'read');
            const authorizedProfitCenters = await checkPermissions(userId, 'profit_center', 'read');

            query += `
                AND (entity_id = ANY($2)
                     OR cost_center_id = ANY($3)
                     OR profit_center_id = ANY($4))
            `;
            values = [dataId, authorizedEntities, authorizedCostCenters, authorizedProfitCenters];
        }

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Data not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching data:', err.message);
        res.status(500).json({ error: 'Error fetching data' });
    }
};

// Modifier une entrée Data
const updateData = async (req, res) => {
    const { dataId } = req.params;
    const {
        data_date,
        amount,
        currency,
        description,
        account_id,
        profit_center_id,
        cost_center_id,
        entity_id,
        scenario_id,
    } = req.body;

    try {
        const query = `
            UPDATE data
            SET data_date = COALESCE($1, data_date),
                amount = COALESCE($2, amount),
                currency = COALESCE($3, currency),
                description = COALESCE($4, description),
                account_id = COALESCE(CAST(NULLIF($5, '') AS uuid), account_id),
                profit_center_id = COALESCE(CAST(NULLIF($6, '') AS uuid), profit_center_id),
                cost_center_id = COALESCE(CAST(NULLIF($7, '') AS uuid), cost_center_id),
                entity_id = COALESCE(CAST(NULLIF($8, '') AS uuid), entity_id),
                scenario_id = COALESCE(CAST(NULLIF($9, '') AS uuid), scenario_id)
            WHERE data_id = $10
            RETURNING *;
        `;
        const values = [
            data_date,
            amount,
            currency,
            description,
            account_id,
            profit_center_id,
            cost_center_id,
            entity_id,
            scenario_id,
            dataId,
        ];

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Data not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error updating data:', err.message);
        res.status(500).json({ error: 'Error updating data' });
    }
};

// Supprimer une entrée Data
const deleteData = async (req, res) => {
    const { dataId } = req.params;

    try {
        const result = await db.query('DELETE FROM data WHERE data_id = $1 RETURNING *', [dataId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Data not found' });
        }

        res.status(200).json({ message: 'Data deleted', dataId: result.rows[0].data_id });
    } catch (err) {
        console.error('Error deleting data:', err.message);
        res.status(500).json({ error: 'Error deleting data' });
    }
};

module.exports = {
    createData,
    getAllData,
    getDataById,
    updateData,
    deleteData,
};
