const db = require('../config/db');


const createStagedData = async (req, res) => {
    const {
        scenario, year, period, entity, account,
        custom1, custom2, custom3, custom4, icp,
        view, value, data_value, source, status, author
    } = req.body;

    try {
        const result = await db.query(`
            INSERT INTO capaci_staged_data (
                scenario, year, period, entity, account,
                custom1, custom2, custom3, custom4, icp,
                view, value, data_value, source, status, author
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16
            )
            RETURNING *;
        `, [
            scenario, year, period, entity, account,
            custom1, custom2, custom3, custom4, icp,
            view, value, data_value, source, status, author
        ]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('❌ Error creating staged data:', err.message);
        res.status(500).json({ error: 'Error creating staged data' });
    }
};


const getFilteredStagedData = async (req, res) => {
    const allowedFields = [
        'scenario', 'year', 'period', 'entity', 'account',
        'custom1', 'custom2', 'custom3', 'custom4', 'icp',
        'view', 'value', 'source', 'status', 'author'
    ];

    const conditions = [];
    const values = [];

    allowedFields.forEach((field) => {
        if (req.query[field]) {
            conditions.push(`${field} = $${conditions.length + 1}`);
            values.push(req.query[field]);
        }
    });

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
        const result = await db.query(`SELECT * FROM capaci_staged_data ${whereClause} ORDER BY created_at DESC`, values);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('❌ Error fetching staged data:', err.message);
        res.status(500).json({ error: 'Error fetching staged data' });
    }
};


module.exports = {
    createStagedData,
    getFilteredStagedData,
};
