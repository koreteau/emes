// controllers/logsController.js
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const getFilteredLogs = async (req, res) => {
    try {
        const { app, name, type, date } = req.query;
        const filters = [];
        const values = [];

        if (app) {
            filters.push(`app = $${values.length + 1}`);
            values.push(app);
        }
        if (name) {
            filters.push(`name = $${values.length + 1}`);
            values.push(name);
        }
        if (type) {
            filters.push(`type = $${values.length + 1}`);
            values.push(type);
        }

        if (date) {
            const center = new Date(date);
            const before = new Date(center.getTime() - 30 * 60000);
            const after = new Date(center.getTime() + 30 * 60000);

            filters.push(`created_at BETWEEN $${values.length + 1} AND $${values.length + 2}`);
            values.push(before.toISOString(), after.toISOString());
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const query = `SELECT * FROM logs ${whereClause} ORDER BY created_at DESC LIMIT 200`;

        const result = await db.query(query, values);
        const logsWithContent = result.rows.map(log => {
            let fileContent = null;

            if (log.path) {
                const absolutePath = path.resolve(__dirname, '..', log.path);
                try {
                    fileContent = fs.readFileSync(absolutePath, 'utf8');
                } catch (err) {
                    fileContent = `⚠️ Unable to read log file: ${err.message}`;
                }
            }

            return {
                ...log,
                log_file_content: fileContent
            };
        });

        res.status(200).json(logsWithContent);
    } catch (err) {
        console.error("❌ Error fetching logs:", err.message);
        res.status(500).json({ error: "Erreur lors de la récupération des logs" });
    }
};

module.exports = {
    getFilteredLogs,
};