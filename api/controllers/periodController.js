const db = require('../config/db');

// Créer une période
const createPeriod = async (req, res) => {
    const { period_name, month, start_date, end_date } = req.body;

    try {
        const query = `
            INSERT INTO Periods (period_name, month, start_date, end_date)
            VALUES ($1, $2, $3, $4) RETURNING *;
        `;
        const result = await db.query(query, [period_name, month, start_date, end_date]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creating period' });
    }
};

// Récupérer toutes les périodes
const getAllPeriods = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Periods');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching periods:', err.message);
        res.status(500).json({ error: 'Error fetching periods' });
    }
};

// Récupérer une période par ID
const getPeriodById = async (req, res) => {
    const { periodId } = req.params;

    try {
        const result = await db.query('SELECT * FROM Periods WHERE period_id = $1', [periodId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Period not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching period:', err.message);
        res.status(500).json({ error: 'Error fetching period' });
    }
};

// Modifier une période
const updatePeriod = async (req, res) => {
    const { periodId } = req.params;
    const { period_name, month, start_date, end_date } = req.body;

    try {
        const query = `
            UPDATE Periods
            SET period_name = COALESCE($1, period_name),
                month = COALESCE($2, month),
                start_date = COALESCE($3, start_date),
                end_date = COALESCE($4, end_date)
            WHERE period_id = $5
            RETURNING *;
        `;
        const values = [period_name, month, start_date, end_date, periodId];
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Period not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error updating period:', err.message);
        res.status(500).json({ error: 'Error updating period' });
    }
};

// Supprimer une période
const deletePeriod = async (req, res) => {
    const { periodId } = req.params;

    try {
        const result = await db.query('DELETE FROM Periods WHERE period_id = $1 RETURNING *', [periodId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Period not found' });
        }

        res.status(200).json({ message: 'Period deleted', periodId: result.rows[0].period_id });
    } catch (err) {
        console.error('Error deleting period:', err.message);
        res.status(500).json({ error: 'Error deleting period' });
    }
};

module.exports = {
    createPeriod,
    getAllPeriods,
    getPeriodById,
    updatePeriod,
    deletePeriod,
};
