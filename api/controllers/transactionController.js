const db = require('../config/db');
const { checkPermissions } = require('../middleware/permissions');

// Créer une transaction
const createTransaction = async (req, res) => {
    const {
        transaction_date,
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
            INSERT INTO Transactions (
                transaction_date, amount, currency, description, account_id, profit_center_id,
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
            transaction_date,
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
        console.error('Error creating transaction:', err.message);
        res.status(500).json({ error: 'Error creating transaction' });
    }
};

// Récupérer toutes les transactions (avec filtrage par permissions)
const getAllTransactions = async (req, res) => {
    const userId = req.user.id;

    try {
        let query;
        let values = [];

        if (req.user.is_admin) {
            // Admin : Récupère toutes les transactions
            query = 'SELECT * FROM Transactions ORDER BY transaction_date DESC';
        } else {
            // Filtrage par permissions pour les utilisateurs non-admin
            const authorizedEntities = await checkPermissions(userId, 'entity', 'read');
            const authorizedCostCenters = await checkPermissions(userId, 'cost_center', 'read');
            const authorizedProfitCenters = await checkPermissions(userId, 'profit_center', 'read');

            query = `
                SELECT * FROM Transactions
                WHERE entity_id = ANY($1)
                OR cost_center_id = ANY($2)
                OR profit_center_id = ANY($3)
                ORDER BY transaction_date DESC;
            `;
            values = [authorizedEntities, authorizedCostCenters, authorizedProfitCenters];
        }

        const result = await db.query(query, values);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching transactions:', err.message);
        res.status(500).json({ error: 'Error fetching transactions' });
    }
};

// Récupérer une transaction par ID
const getTransactionById = async (req, res) => {
    const { transactionId } = req.params;
    const userId = req.user.id;

    try {
        let query = 'SELECT * FROM Transactions WHERE transaction_id = $1';
        let values = [transactionId];

        if (!req.user.is_admin) {
            const authorizedEntities = await checkPermissions(userId, 'entity', 'read');
            const authorizedCostCenters = await checkPermissions(userId, 'cost_center', 'read');
            const authorizedProfitCenters = await checkPermissions(userId, 'profit_center', 'read');

            query += `
                AND (entity_id = ANY($2)
                     OR cost_center_id = ANY($3)
                     OR profit_center_id = ANY($4))
            `;
            values = [transactionId, authorizedEntities, authorizedCostCenters, authorizedProfitCenters];
        }

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching transaction:', err.message);
        res.status(500).json({ error: 'Error fetching transaction' });
    }
};

// Modifier une transaction
const updateTransaction = async (req, res) => {
    const { transactionId } = req.params;
    const {
        transaction_date,
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
            UPDATE Transactions
            SET transaction_date = COALESCE($1, transaction_date),
                amount = COALESCE($2, amount),
                currency = COALESCE($3, currency),
                description = COALESCE($4, description),
                account_id = COALESCE(CAST(NULLIF($5, '') AS uuid), account_id),
                profit_center_id = COALESCE(CAST(NULLIF($6, '') AS uuid), profit_center_id),
                cost_center_id = COALESCE(CAST(NULLIF($7, '') AS uuid), cost_center_id),
                entity_id = COALESCE(CAST(NULLIF($8, '') AS uuid), entity_id),
                scenario_id = COALESCE(CAST(NULLIF($9, '') AS uuid), scenario_id)
            WHERE transaction_id = $10
            RETURNING *;
        `;
        const values = [
            transaction_date,
            amount,
            currency,
            description,
            account_id,
            profit_center_id,
            cost_center_id,
            entity_id,
            scenario_id,
            transactionId,
        ];

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error updating transaction:', err.message);
        res.status(500).json({ error: 'Error updating transaction' });
    }
};

// Supprimer une transaction
const deleteTransaction = async (req, res) => {
    const { transactionId } = req.params;

    try {
        const result = await db.query('DELETE FROM Transactions WHERE transaction_id = $1 RETURNING *', [transactionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.status(200).json({ message: 'Transaction deleted', transactionId: result.rows[0].transaction_id });
    } catch (err) {
        console.error('Error deleting transaction:', err.message);
        res.status(500).json({ error: 'Error deleting transaction' });
    }
};

module.exports = {
    createTransaction,
    getAllTransactions,
    getTransactionById,
    updateTransaction,
    deleteTransaction,
};
