const db = require('../config/db');
const { getLatestDimensionData } = require('./dimensionController');


const resolvePovSelection = (pov, dimensionData) => {
    const resolved = {};

    for (const [dim, rawVals] of Object.entries(pov)) {
        const members = dimensionData[dim] || [];
        const flatVals = [];

        for (const raw of rawVals) {
            if (!raw.includes('$[')) {
                flatVals.push(raw);
                continue;
            }

            const [id, modeRaw] = raw.split('$[');
            const mode = modeRaw.replace(']', '');

            if (mode === 'Only') {
                flatVals.push(id);
            } else if (mode === 'Descendants') {
                const stack = [id];
                while (stack.length) {
                    const current = stack.pop();
                    flatVals.push(current);
                    const children = members.filter(m => m.parent === current).map(m => m.id);
                    stack.push(...children);
                }
            } else if (mode === 'Base') {
                const stack = [id];
                while (stack.length) {
                    const current = stack.pop();
                    const children = members.filter(m => m.parent === current);
                    if (children.length === 0) {
                        flatVals.push(current);
                    } else {
                        stack.push(...children.map(m => m.id));
                    }
                }
            }
        }

        resolved[dim] = [...new Set(flatVals)];
    }

    return resolved;
};

const extractStagedData = async (req, res) => {
    try {
        const queryParams = req.query;

        // 1. Récupérer les données de dimensions
        const dimensionData = await getLatestDimensionData();

        // 2. Reconstituer les POV depuis query string
        const pov = {};
        for (const [key, value] of Object.entries(queryParams)) {
            pov[key] = Array.isArray(value) ? value : [value];
        }

        // 3. Résoudre les sélections (descendants, base, etc.)
        const resolvedPov = resolvePovSelection(pov, dimensionData);

        // 4. Construire la requête SQL
        const allowedDims = [
            "scenario", "year", "period", "entity", "account",
            "custom1", "custom2", "custom3", "custom4", "icp", "view", "value"
        ];

        const filters = [];
        const values = [];
        let idx = 1;

        for (const dim of allowedDims) {
            if (resolvedPov[dim] && resolvedPov[dim].length > 0) {
                filters.push(`${dim} = ANY($${idx})`);
                values.push(resolvedPov[dim]);
                idx++;
            }
        }

        const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
        const query = `
            SELECT scenario, year, period, entity, account, custom1,
                   custom2, custom3, custom4, icp, view, value, data_value
            FROM capaci_staged_data
            ${whereClause}
        `;

        const result = await db.query(query, values);

        res.status(200).json(result.rows);
    } catch (err) {
        console.error("❌ Error in extractStagedData:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = { extractStagedData };
