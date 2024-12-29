const db = require('../config/db');

// Créer un scénario
const createScenario = async (req, res) => {
    const { scenario_name, description, calculation_rule } = req.body;

    try {
        const query = `
            INSERT INTO Scenarios (scenario_name, description, calculation_rule)
            VALUES ($1, $2, $3) RETURNING *;
        `;
        const result = await db.query(query, [scenario_name, description, calculation_rule]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creating scenario' });
    }
};

// Récupérer tous les scénarios
const getAllScenarios = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Scenarios');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching scenarios:', err.message);
        res.status(500).json({ error: 'Error fetching scenarios' });
    }
};

// Récupérer un scénario par ID
const getScenarioById = async (req, res) => {
    const { scenarioId } = req.params;

    try {
        const result = await db.query('SELECT * FROM Scenarios WHERE scenario_id = $1', [scenarioId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Scenario not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching scenario:', err.message);
        res.status(500).json({ error: 'Error fetching scenario' });
    }
};

// Modifier un scénario
const updateScenario = async (req, res) => {
    const { scenarioId } = req.params;
    const { scenario_name, description, calculation_rule } = req.body;

    try {
        const query = `
            UPDATE Scenarios
            SET scenario_name = COALESCE($1, scenario_name),
                description = COALESCE($2, description),
                calculation_rule = COALESCE($3, calculation_rule)
            WHERE scenario_id = $4
            RETURNING *;
        `;
        const values = [scenario_name, description, calculation_rule, scenarioId];
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Scenario not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error updating scenario:', err.message);
        res.status(500).json({ error: 'Error updating scenario' });
    }
};

// Supprimer un scénario
const deleteScenario = async (req, res) => {
    const { scenarioId } = req.params;

    try {
        const result = await db.query('DELETE FROM Scenarios WHERE scenario_id = $1 RETURNING *', [scenarioId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Scenario not found' });
        }

        res.status(200).json({ message: 'Scenario deleted', scenarioId: result.rows[0].scenario_id });
    } catch (err) {
        console.error('Error deleting scenario:', err.message);
        res.status(500).json({ error: 'Error deleting scenario' });
    }
};

module.exports = {
    createScenario,
    getAllScenarios,
    getScenarioById,
    updateScenario,
    deleteScenario,
};