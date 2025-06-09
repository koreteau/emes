const db = require('../config/db');
const { getLatestDimensionData } = require('./dimensionController');

const calculate = async (req, res) => {
    try {
        const { scenario, year, period, entity } = req.query;

        if (!scenario || !year || !period || !entity) {
            return res.status(400).json({ error: 'Missing required query parameters: scenario, year, period, entity' });
        }

        const accountDim = await getLatestDimensionData('account');
        const accountMembers = accountDim?.members || [];

        const accountMap = {};
        accountMembers.forEach(member => {
            accountMap[member.id] = {
                isCalculated: member.isCalculated === true,
                accountType: member.accountType || 'Asset'
            };
        });

        // 📥 POVs filtrés par semi-POV
        const povsResult = await db.query(`
      SELECT DISTINCT entity, year, period, scenario, account,
                      custom1, custom2, custom3, custom4, icp, view
      FROM staged_data
      WHERE scenario = $1 AND year = $2 AND period = $3 AND entity = $4
        AND value IN (
          '<Entity Currency>', '<Entity Curr Adjs>', '<Parent Curr Adjs>',
          '[Parent Adjs]', '[Elimination]', '[Contribution Adjs]'
        )
    `, [scenario, year, period, entity]);

        const povs = povsResult.rows;

        for (const pov of povs) {
            const metadata = accountMap[pov.account] || { isCalculated: true, accountType: 'Asset' };
            if (!metadata.isCalculated) continue;

            const sourceResult = await db.query(`
        SELECT data_value
        FROM staged_data
        WHERE scenario = $1 AND year = $2 AND period = $3 AND entity = $4
          AND account = $5 AND custom1 = $6 AND custom2 = $7 AND custom3 = $8 AND custom4 = $9
          AND icp = $10 AND view = $11
          AND value IN (
            '<Entity Currency>', '<Entity Curr Adjs>', '<Parent Curr Adjs>',
            '[Parent Adjs]', '[Elimination]', '[Contribution Adjs]'
          )
      `, [
                pov.scenario, pov.year, pov.period, pov.entity,
                pov.account, pov.custom1, pov.custom2, pov.custom3, pov.custom4,
                pov.icp, pov.view
            ]);

            let total = 0;
            for (const line of sourceResult.rows) {
                const sign = ['Liability', 'Expense'].includes(metadata.accountType) ? -1 : 1;
                total += parseFloat(line.data_value) * sign;
            }

            // 💾 Écriture dans data (avec data_value, view, value, etc.)
            await db.query(`
        INSERT INTO data (
          scenario, year, period, entity, account,
          custom1, custom2, custom3, custom4, icp,
          view, value, data_value
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, '<Entity Currency>', $12
        )
        ON CONFLICT (
          scenario, year, period, entity, account,
          custom1, custom2, custom3, custom4, icp, view, value
        )
        DO UPDATE SET data_value = EXCLUDED.data_value
      `, [
                pov.scenario, pov.year, pov.period, pov.entity, pov.account,
                pov.custom1, pov.custom2, pov.custom3, pov.custom4,
                pov.icp, pov.view, total
            ]);
        }

        return res.status(200).json({ message: 'Calculate executed successfully' });
    } catch (error) {
        console.error('Calculate error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};


module.exports = {
    calculate
}