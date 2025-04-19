const db = require('../config/db');

// Créer une entrée
const createData = async (req, res) => {
    const {
        scenario, year, period, entity, account,
        custom1, custom2, custom3, custom4, ICP,
        value, view, data_value, author, journal_id
    } = req.body;

    try {
        const query = `
            INSERT INTO data (
                scenario, year, period, entity, account,
                custom1, custom2, custom3, custom4, ICP,
                value, view, data_value, author, journal_id
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15
            )
            RETURNING *;
        `;

        const values = [
            scenario, year, period, entity, account,
            custom1, custom2, custom3, custom4, ICP,
            value, view, data_value, author, journal_id || null
        ];

        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating data:', err.message);
        res.status(500).json({ error: 'Error creating data' });
    }
};

// Lire les entrées avec filtres dynamiques
const getAllData = async (req, res) => {
    const filters = [
        'scenario', 'year', 'period', 'entity', 'account',
        'custom1', 'custom2', 'custom3', 'custom4', 'ICP',
        'view', 'value'
    ];

    const conditions = [];
    const values = [];

    filters.forEach((field) => {
        if (req.query[field]) {
            conditions.push(`${field} = $${values.length + 1}`);
            values.push(req.query[field]);
        }
    });

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
        const result = await db.query(`SELECT * FROM data ${whereClause} ORDER BY timestamp DESC`, values);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching data:', err.message);
        res.status(500).json({ error: 'Error fetching data' });
    }
};

const getFilteredData = async (req, res) => {
    try {
      const allowedDims = [
        "scenario", "year", "period", "entity", "account",
        "custom1", "custom2", "custom3", "custom4", "ICP",
        "value", "view"
      ];
  
      const filters = [];
      const values = [];
  
      allowedDims.forEach((dim) => {
        if (req.query[dim]) {
          filters.push(`${dim} = $${filters.length + 1}`);
          values.push(req.query[dim]);
        }
      });
  
      const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  
      const result = await db.query(`SELECT * FROM data ${whereClause}`, values);
  
      res.status(200).json(result.rows);
    } catch (err) {
      console.error("❌ getFilteredData error:", err.message);
      res.status(500).json({ error: "Erreur lors de la récupération des données" });
    }
};
  

// Modifier une donnée
const updateData = async (req, res) => {
    const { dataId } = req.params;
    const fields = Object.keys(req.body);
    const values = Object.values(req.body);

    if (fields.length === 0) {
        return res.status(400).json({ error: 'Aucune donnée à modifier' });
    }

    const setClause = fields.map((key, i) => `${key} = $${i + 1}`).join(', ');

    try {
        const result = await db.query(
            `UPDATE data SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
            [...values, dataId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Entrée non trouvée' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error updating data:', err.message);
        res.status(500).json({ error: 'Error updating data' });
    }
};

// Supprimer une donnée
const deleteData = async (req, res) => {
    const { dataId } = req.params;

    try {
        const result = await db.query('DELETE FROM data WHERE id = $1 RETURNING *', [dataId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Entrée non trouvée' });
        }

        res.status(200).json({ message: 'Entrée supprimée', dataId });
    } catch (err) {
        console.error('Error deleting data:', err.message);
        res.status(500).json({ error: 'Error deleting data' });
    }
};

module.exports = {
    createData,
    getFilteredData,
    updateData,
    deleteData,
};