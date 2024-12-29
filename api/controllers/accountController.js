const db = require('../config/db');
const { checkPermissions } = require('../middleware/permissions');

// Créer un compte
const createAccount = async (req, res) => {
    const { account_name, account_type, currency, entity_id, iban } = req.body;

    try {
        const query = `
            INSERT INTO Accounts (account_name, account_type, currency, entity_id, iban)
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
        const result = await db.query(query, [account_name, account_type, currency, entity_id, iban]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            // Gestion de l'unicité de l'IBAN
            return res.status(400).json({ error: 'IBAN must be unique.' });
        }
        res.status(500).json({ error: 'Error creating account' });
    }
};

// Récupérer tous les comptes
const getAllAccounts = async (req, res) => {
    const userId = req.user.id;

    try {
        if (req.user.is_admin) {
            // Si admin, retourne tous les comptes
            const result = await db.query('SELECT * FROM Accounts');
            return res.status(200).json(result.rows);
        }

        // Si non-admin, applique les autorisations
        const authorizedAccounts = await checkPermissions(userId, 'account', 'read');

        if (authorizedAccounts.length === 0) {
            return res.status(200).json([]); // Aucun accès
        }

        const query = `
            SELECT * FROM Accounts WHERE account_id = ANY($1);
        `;
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
    const userId = req.user.id;

    try {
        if (req.user.is_admin) {
            // Si admin, retourne directement le compte
            const result = await db.query('SELECT * FROM Accounts WHERE account_id = $1', [accountId]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Account not found' });
            }
            return res.status(200).json(result.rows[0]);
        }

        // Vérifie si l'utilisateur a accès à ce compte
        const hasAccess = await checkPermissions(userId, accountId, 'account', 'read');
        if (!hasAccess.includes(accountId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

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

// Modifier un compte
const updateAccount = async (req, res) => {
    const { accountId } = req.params;
    const { account_name, account_type, currency, entity_id, iban } = req.body;

    try {
        const query = `
            UPDATE Accounts
            SET account_name = COALESCE($1, account_name),
                account_type = COALESCE($2, account_type),
                currency = COALESCE($3, currency),
                entity_id = COALESCE($4, entity_id),
                iban = COALESCE($5, iban)
            WHERE account_id = $6
            RETURNING *;
        `;
        const values = [account_name, account_type, currency, entity_id, iban, accountId];
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            // Gestion de l'unicité de l'IBAN
            return res.status(400).json({ error: 'IBAN must be unique.' });
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