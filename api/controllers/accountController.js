const db = require('../config/db');
const { checkPermissions } = require('../middleware/permissions');

// Créer un compte
const createAccount = async (req, res) => {
    const {
        account_name, account_type, currency, entity_id, iban, internal_id,
        exchange_fee_rate, transfer_fee, maintenance_fee, min_balance,
        max_balance, overdraft_limit, opening_date, closing_date
    } = req.body;

    try {
        const query = `
            INSERT INTO Accounts (
                account_name, account_type, currency, entity_id, iban, internal_id,
                exchange_fee_rate, transfer_fee, maintenance_fee, min_balance,
                max_balance, overdraft_limit, opening_date, closing_date
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
            ) RETURNING *;
        `;
        const values = [
            account_name, account_type, currency, entity_id, iban, internal_id,
            exchange_fee_rate, transfer_fee, maintenance_fee, min_balance,
            max_balance, overdraft_limit, opening_date, closing_date
        ];
        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            // Gestion de l'unicité de l'IBAN ou autre clé unique
            return res.status(400).json({ error: 'IBAN or Internal ID must be unique.' });
        }
        res.status(500).json({ error: 'Error creating account' });
    }
};

// Récupérer tous les comptes
const getAllAccounts = async (req, res) => {
    const userId = req.user.id;

    try {
        if (req.user.is_admin) {
            const result = await db.query('SELECT * FROM Accounts');
            const adjustedData = result.rows.map((account) => ({
                ...account,
                opening_date: account.opening_date
                    ? new Date(account.opening_date).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })
                    : null,
                closing_date: account.closing_date
                    ? new Date(account.closing_date).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })
                    : null,
            }));
            return res.status(200).json(adjustedData);
        }

        const authorizedAccounts = await checkPermissions(userId, 'account', 'read');
        if (authorizedAccounts.length === 0) {
            return res.status(200).json([]);
        }

        const query = `SELECT * FROM Accounts WHERE account_id = ANY($1)`;
        const result = await db.query(query, [authorizedAccounts]);
        const adjustedData = result.rows.map((account) => ({
            ...account,
            opening_date: account.opening_date
                ? new Date(account.opening_date).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })
                : null,
            closing_date: account.closing_date
                ? new Date(account.closing_date).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })
                : null,
        }));
        res.status(200).json(adjustedData);
    } catch (err) {
        console.error('Error fetching accounts:', err.message);
        res.status(500).json({ error: 'Error fetching accounts' });
    }
};


// Récupérer un compte par ID
const getAccountById = async (req, res) => {
    const { accountId } = req.params;
    const userId = req.user.id;

    try {
        const result = await db.query('SELECT * FROM Accounts WHERE account_id = $1', [accountId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const account = result.rows[0];
        const adjustedAccount = {
            ...account,
            opening_date: account.opening_date
                ? new Date(account.opening_date).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })
                : null,
            closing_date: account.closing_date
                ? new Date(account.closing_date).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })
                : null,
        };

        res.status(200).json(adjustedAccount);
    } catch (err) {
        console.error('Error fetching account:', err.message);
        res.status(500).json({ error: 'Error fetching account' });
    }
};


// Modifier un compte
const updateAccount = async (req, res) => {
    const { accountId } = req.params;
    const {
        account_name, account_type, currency, entity_id, iban, internal_id,
        exchange_fee_rate, transfer_fee, maintenance_fee, min_balance,
        max_balance, overdraft_limit, opening_date, closing_date
    } = req.body;

    try {
        const query = `
            UPDATE Accounts
            SET account_name = COALESCE($1, account_name),
                account_type = COALESCE($2, account_type),
                currency = COALESCE($3, currency),
                entity_id = COALESCE($4, entity_id),
                iban = COALESCE($5, iban),
                internal_id = COALESCE($6, internal_id),
                exchange_fee_rate = COALESCE($7, exchange_fee_rate),
                transfer_fee = COALESCE($8, transfer_fee),
                maintenance_fee = COALESCE($9, maintenance_fee),
                min_balance = COALESCE($10, min_balance),
                max_balance = COALESCE($11, max_balance),
                overdraft_limit = COALESCE($12, overdraft_limit),
                opening_date = COALESCE($13, opening_date),
                closing_date = COALESCE($14, closing_date)
            WHERE account_id = $15
            RETURNING *;
        `;
        const values = [
            account_name, account_type, currency, entity_id, iban, internal_id,
            exchange_fee_rate, transfer_fee, maintenance_fee, min_balance,
            max_balance, overdraft_limit, opening_date, closing_date, accountId
        ];
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'IBAN or Internal ID must be unique.' });
        }
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
    updateAccount,
    deleteAccount,
};