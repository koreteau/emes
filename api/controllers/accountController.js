const db = require('../config/db');
const { checkPermissions } = require('../middleware/permissions');

// Créer un compte
const createAccount = async (req, res) => {
    const {
        account_name, account_type, currency, entity_id,
        opening, increase, decrease, equity,
        adjustment, checking, closing, revenue,
        expense, transfer, provision, depreciation, gain_loss
    } = req.body;

    try {
        const query = `
            INSERT INTO Accounts (
                account_name, account_type, currency, entity_id,
                opening, increase, decrease, equity, adjustment, checking, closing,
                revenue, expense, transfer, provision, depreciation, gain_loss
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            ) RETURNING *;
        `;
        const values = [
            account_name, account_type, currency, entity_id,
            opening, increase, decrease, equity, adjustment, checking, closing,
            revenue, expense, transfer, provision, depreciation, gain_loss
        ];
        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creating account' });
    }
};

// Récupérer tous les comptes
const getAllAccounts = async (req, res) => {
    const userId = req.user.id;

    try {
        if (req.user.is_admin) {
            const result = await db.query('SELECT * FROM Accounts');
            return res.status(200).json(result.rows);
        }

        const authorizedAccounts = await checkPermissions(userId, 'account', 'read');
        if (authorizedAccounts.length === 0) {
            return res.status(200).json([]);
        }

        const query = `SELECT * FROM Accounts WHERE account_id = ANY($1)`;
        const result = await db.query(query, [authorizedAccounts]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching accounts:', err.message);
        res.status(500).json({ error: 'Error fetching accounts' });
    }
};

// Récupérer un compte par ID
const getAccountById = async (req, res) => {
    const { accountId } = req.params;

    try {
        const result = await db.query('SELECT * FROM Accounts WHERE account_id = $1', [accountId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching account:', err.message);
        res.status(500).json({ error: 'Error fetching account' });
    }
};

// Récupérer les comptes associés à une entité spécifique
const getAccountsByEntityId = async (req, res) => {
    const { entityId } = req.params;

    try {
        const result = await db.query(
            'SELECT * FROM Accounts WHERE entity_id = $1',
            [entityId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No accounts found for this entity.' });
        }

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching accounts by entity:', err.message);
        res.status(500).json({ error: 'Error fetching accounts.' });
    }
};

// Modifier un compte
const updateAccount = async (req, res) => {
    const { accountId } = req.params;
    const {
        account_name, account_type, currency, entity_id,
        opening, increase, decrease, equity,
        adjustment, checking, closing, revenue,
        expense, transfer, provision, depreciation, gain_loss
    } = req.body;

    try {
        const query = `
            UPDATE Accounts
            SET account_name = COALESCE($1, account_name),
                account_type = COALESCE($2, account_type),
                currency = COALESCE($3, currency),
                entity_id = COALESCE($4, entity_id),
                opening = COALESCE($5, opening),
                increase = COALESCE($6, increase),
                decrease = COALESCE($7, decrease),
                equity = COALESCE($8, equity),
                adjustment = COALESCE($9, adjustment),
                checking = COALESCE($10, checking),
                closing = COALESCE($11, closing),
                revenue = COALESCE($12, revenue),
                expense = COALESCE($13, expense),
                transfer = COALESCE($14, transfer),
                provision = COALESCE($15, provision),
                depreciation = COALESCE($16, depreciation),
                gain_loss = COALESCE($17, gain_loss)
            WHERE account_id = $18
            RETURNING *;
        `;
        const values = [
            account_name, account_type, currency, entity_id,
            opening, increase, decrease, equity,
            adjustment, checking, closing, revenue,
            expense, transfer, provision, depreciation, gain_loss, accountId
        ];
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error updating account:', err.message);
        res.status(500).json({ error: 'Error updating account' });
    }
};

// Supprimer un compte
const deleteAccount = async (req, res) => {
    const { accountId } = req.params;

    try {
        const result = await db.query('DELETE FROM Accounts WHERE account_id = $1 RETURNING *', [accountId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.status(200).json({ message: 'Account deleted', accountId: result.rows[0].account_id });
    } catch (err) {
        console.error('Error deleting account:', err.message);
        res.status(500).json({ error: 'Error deleting account' });
    }
};

module.exports = {
    createAccount,
    getAllAccounts,
    getAccountById,
    getAccountsByEntityId,
    updateAccount,
    deleteAccount,
};