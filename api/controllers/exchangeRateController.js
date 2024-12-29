const db = require('../config/db');
const { checkPermissions } = require('../middleware/permissions');
const { DateTime } = require('luxon');

// Créer un taux de change
const createExchangeRate = async (req, res) => {
    const { from_currency, to_currency, rate, effective_date } = req.body;

    try {
        const query = `
            INSERT INTO ExchangeRates (from_currency, to_currency, rate, effective_date)
            VALUES ($1, $2, $3, $4) RETURNING *;
        `;
        const result = await db.query(query, [from_currency, to_currency, rate, effective_date]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creating exchange rate' });
    }
};

// Récupérer tous les taux de change
const getAllExchangeRates = async (req, res) => {
    const userId = req.user.id;

    try {
        if (req.user.is_admin) {
            // Si admin, retourne tous les taux de change
            const result = await db.query('SELECT * FROM ExchangeRates');
            return res.status(200).json(result.rows);
        }

        // Si non-admin, applique les autorisations
        const authorizedExchangeRates = await checkPermissions(userId, 'exchange_rate', 'read');

        if (authorizedExchangeRates.length === 0) {
            return res.status(200).json([]); // Aucun accès
        }

        const query = `
            SELECT * FROM ExchangeRates WHERE exchange_rate_id = ANY($1);
        `;
        const result = await db.query(query, [authorizedExchangeRates]);

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching exchange rates:', err.message);
        res.status(500).json({ error: 'Error fetching exchange rates' });
    }
};

// Récupérer un taux de change par ID
const getExchangeRateById = async (req, res) => {
    const { exchangeRateId } = req.params;
    const userId = req.user.id;

    try {
        if (req.user.is_admin) {
            // Si admin, retourne directement le taux de change
            const result = await db.query('SELECT * FROM ExchangeRates WHERE exchange_rate_id = $1', [exchangeRateId]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Exchange rate not found' });
            }
            return res.status(200).json(result.rows[0]);
        }

        // Vérifie si l'utilisateur a accès à ce taux de change
        const hasAccess = await checkPermissions(userId, exchangeRateId, 'exchange_rate', 'read');
        if (!hasAccess.includes(exchangeRateId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await db.query('SELECT * FROM ExchangeRates WHERE exchange_rate_id = $1', [exchangeRateId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Exchange rate not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching exchange rate:', err.message);
        res.status(500).json({ error: 'Error fetching exchange rate' });
    }
};

// Modifier un taux de change
const updateExchangeRate = async (req, res) => {
    const { exchangeRateId } = req.params;
    const { from_currency, to_currency, rate, effective_date } = req.body;

    try {
        const query = `
            UPDATE ExchangeRates
            SET from_currency = COALESCE($1, from_currency),
                to_currency = COALESCE($2, to_currency),
                rate = COALESCE($3, rate),
                effective_date = COALESCE($4, effective_date)
            WHERE exchange_rate_id = $5
            RETURNING *;
        `;
        const values = [from_currency, to_currency, rate, effective_date, exchangeRateId];
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Exchange rate not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating exchange rate' });
    }
};

// Supprimer un taux de change
const deleteExchangeRate = async (req, res) => {
    const { exchangeRateId } = req.params;

    try {
        const result = await db.query('DELETE FROM ExchangeRates WHERE exchange_rate_id = $1 RETURNING *', [exchangeRateId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Exchange rate not found' });
        }

        res.status(200).json({ message: 'Exchange rate deleted', exchangeRateId: result.rows[0].exchange_rate_id });
    } catch (err) {
        console.error('Error deleting exchange rate:', err.message);
        res.status(500).json({ error: 'Error deleting exchange rate' });
    }
};

module.exports = {
    createExchangeRate,
    getAllExchangeRates,
    getExchangeRateById,
    updateExchangeRate,
    deleteExchangeRate,
};
