// functionsController.js - Updated to use script.js
const db = require('../config/db');
const { getLatestDimensionData } = require('./dimensionController');
const createLogger = require('../utils/writeLogs');
const calculationScript = require('../custom/script'); // Import the main calculation script

/**
 * Main calculation endpoint - now uses the dedicated script.js
 */
const calculate = async (req, res) => {
    const writeLog = createLogger({
        app: 'capaci',
        name: 'calculate',
        user: req.user?.id || 'system',
        type: 'info'
    });

    try {
        const { scenario, year, period, entity } = req.query;

        // Validate parameters using the script's validation function
        calculationScript.validateCalculationParameters(scenario, year, period, entity);

        await writeLog(`Launching calculate with: ${JSON.stringify({ scenario, year, period, entity })}`);

        // Load dimension data
        const accountDim = await getLatestDimensionData('account');
        const custom1Dim = await getLatestDimensionData('custom1');

        const accountMembers = accountDim?.members || [];
        const custom1Members = custom1Dim?.members || [];

        await writeLog(`Loaded ${accountMembers.length} accounts and ${custom1Members.length} custom1 values`);

        // Execute the main calculation script
        const result = await calculationScript.runCalculation(
            scenario, year, period, entity, 
            accountMembers, custom1Members, 
            writeLog
        );

        await writeLog('Calculate executed successfully', true);
        return res.status(200).json(result);

    } catch (err) {
        await writeLog(`Calculate error: ${err.message}`, true);
        return res.status(500).json({ 
            error: 'Internal server error', 
            details: err.message 
        });
    }
};

/**
 * Raise data endpoint - handles currency conversion and consolidation
 * This could also be moved to script.js if it becomes more complex
 */
const raiseData = async (req, res) => {
    try {
        const { scenario, year, period, entity } = req.query;

        if (!scenario || !year || !period || !entity) {
            return res.status(400).json({ error: 'Missing required query parameters: scenario, year, period, entity' });
        }

        const writeLog = createLogger({
            app: 'capaci',
            name: 'raiseData',
            user: req.user?.id || 'system',
            type: 'info'
        });

        await writeLog(`Launching raiseData with: ${JSON.stringify({ scenario, year, period, entity })}`);

        // Load entity dimension data
        const entityDim = await getLatestDimensionData('entity');
        const entityMap = {};
        (entityDim?.members || []).forEach(member => {
            entityMap[member.id] = member;
        });

        const entityMeta = entityMap[entity];
        const parentMeta = entityMeta?.parent ? entityMap[entityMeta.parent] : null;
        const sourceCurrency = entityMeta?.defaultCurr || 'EUR';
        const targetCurrency = parentMeta?.defaultCurr || 'EUR';

        await writeLog(`Entity meta: ${JSON.stringify(entityMeta)}`);
        await writeLog(`Parent meta: ${JSON.stringify(parentMeta)}`);
        await writeLog(`Source currency: ${sourceCurrency}`);
        await writeLog(`Target currency: ${targetCurrency}`);

        // Load relevant lines from capaci_data
        const result = await db.query(`
            SELECT *
            FROM capaci_data
            WHERE scenario = $1 AND year = $2 AND period = $3 AND entity = $4
              AND value IN (
                '<Entity Currency>', '<Entity Curr Adjs>', '<Parent Curr Adjs>',
                '[Parent Adjs]', '[Contribution Adjs]'
              )
        `, [scenario, year, period, entity]);

        const lines = result.rows;
        await writeLog(`Loaded ${lines.length} lines from capaci_data`);

        // Group by POV
        const povMap = {};
        for (const row of lines) {
            const key = `${row.account}_${row.custom1}_${row.custom2}_${row.custom3}_${row.custom4}_${row.icp}_${row.view}`;
            if (!povMap[key]) povMap[key] = {};
            povMap[key][row.value] = parseFloat(row.data_value);
        }

        // Process each POV
        for (const key in povMap) {
            const values = povMap[key];
            const [account, custom1, custom2, custom3, custom4, icp, view] = key.split('_');

            const insert = async (value, data_value) => {
                const rounded = Number(data_value.toFixed(3));
                await writeLog(`Inserting ${value} = ${rounded}`);
                await db.query(`
                    INSERT INTO capaci_data (
                    scenario, year, period, entity, account,
                    custom1, custom2, custom3, custom4, icp,
                    view, value, data_value
                    ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9, $10,
                    $11, $12, $13
                    )
                    ON CONFLICT (
                    scenario, year, period, entity, account,
                    custom1, custom2, custom3, custom4, icp,
                    view, value
                    ) DO UPDATE SET data_value = EXCLUDED.data_value
                `, [
                    scenario, year, period, entity, account,
                    custom1, custom2, custom3, custom4, icp,
                    view, value, rounded
                ]);
            };

            // Calculate <Entity Curr Total>
            const ect = (values['<Entity Currency>'] || 0) + (values['<Entity Curr Adjs>'] || 0);
            await writeLog(`<Entity Curr Total>: ${ect}`);
            await insert('<Entity Curr Total>', ect);

            // Stop if no parent entity
            if (!parentMeta) {
                await writeLog(`No parent entity found — stopping here`);
                continue;
            }

            // Get FX rate using SOURCE currency
            const fxQuery = await db.query(`
                SELECT data_value FROM capaci_data
                WHERE scenario = $1 AND year = $2 AND period = $3
                  AND account = 'CLOSING' AND custom2 = $4 AND entity = '[None]'
                LIMIT 1
            `, [scenario, year, period, sourceCurrency]);

            const fxRate = parseFloat(fxQuery.rows[0]?.data_value || 1);
            await writeLog(`FX rate (1 EUR = ${fxRate} ${sourceCurrency})`);

            // Convert to parent currency (EUR)
            const pc = fxRate !== 0 ? ect / fxRate : ect;
            await writeLog(`<Parent Currency> (converted): ${pc}`);
            await insert('<Parent Currency>', pc);

            // Calculate <Parent Curr Total>
            const pct = pc + (values['<Parent Curr Adjs>'] || 0);
            await insert('<Parent Curr Total>', pct);

            // Calculate [Parent] & [Parent Total]
            await insert('[Parent]', pct);
            const pt = pct + (values['[Parent Adjs]'] || 0);
            await insert('[Parent Total]', Number(pt.toFixed(3)));

            // Handle [Elimination] or [Proportion]
            let contribution = 0;

            if (icp !== '[None]') {
                await writeLog(`Interco detected — inserting elimination = ${pt}`);
                await insert('[Elimination]', pt);
            } else {
                const ownerQuery = await db.query(`
                    SELECT data_value FROM capaci_data
                    WHERE scenario = $1 AND year = $2 AND period = $3
                    AND entity = $4 AND account = 'PERCENTAGE'
                    LIMIT 1
                `, [scenario, year, period, entity]);

                const ownership = parseFloat(ownerQuery.rows[0]?.data_value || 100);
                const proportion = pt * (ownership / 100);
                contribution = proportion;

                await writeLog(`Ownership = ${ownership}%, → Proportion = ${proportion}`);
                await insert('[Proportion]', proportion);
                await insert('[Contribution]', proportion);
            }

            const contribAdj = values['[Contribution Adjs]'] || 0;
            const contribTotal = contribution + contribAdj;
            await insert('[Contribution Total]', contribTotal);
        }

        await writeLog('Raise Data completed successfully', true);
        res.status(200).json({ message: 'Raise Data executed with debug logs' });
    } catch (err) {
        await writeLog(`Raise Data error: ${err.message}`, true)
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};

/**
 * Rollup to parent endpoint
 */
const rollupToParent = async (req, res) => {
    try {
        const { scenario, year, period, entity } = req.query;
        const author = req.user?.id || 'system';

        const writeLog = createLogger({
            app: 'capaci',
            name: 'rollupToParent',
            user: author,
            type: 'info'
        });

        if (!scenario || !year || !period || !entity) {
            await writeLog(`Missing parameters : ${JSON.stringify({ scenario, year, period, entity })}`);
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Load hierarchy
        const entityDim = await getLatestDimensionData('entity');
        const children = entityDim.members.filter(m => m.parent === entity).map(m => m.id);

        if (children.length === 0) {
            await writeLog(`No descendants found for ${entity}`);
            return res.status(400).json({ error: 'No children found for entity' });
        }

        await writeLog(`Rollup from ${children.length} descendants towards ${entity}...`);

        // Find data to rollup
        const { rows } = await db.query(`
            SELECT *
            FROM capaci_data
            WHERE scenario = $1 AND year = $2 AND period = $3
              AND value = '[Contribution Total]'
              AND entity = ANY($4)
        `, [scenario, year, period, children]);

        await writeLog(`${rows.length} rows found to rollup`);

        const seen = new Set();
        let insertedCount = 0;

        for (const row of rows) {
            const key = [
                row.account, row.custom1, row.custom2, row.custom3, row.custom4,
                row.icp, row.view
            ].join("|");

            if (seen.has(key)) {
                console.log(`🟡 Duplicate ignored for: ${key}`);
                continue;
            }
            seen.add(key);

            // Delete old version (same POV + source)
            const deleteRes = await db.query(`
                DELETE FROM capaci_staged_data
                WHERE scenario = $1 AND year = $2 AND period = $3
                  AND entity = $4 AND value = '<Entity Currency>'
                  AND account = $5 AND custom1 = $6 AND custom2 = $7 AND custom3 = $8 AND custom4 = $9
                  AND icp = $10 AND view = $11 AND source = $12
            `, [
                scenario, year, period, entity,
                row.account, row.custom1, row.custom2, row.custom3, row.custom4,
                row.icp, row.view, row.entity
            ]);

            await writeLog(`Deletion: ${deleteRes.rowCount} row(s) deleted for source ${row.entity}`);

            // Insert new data
            await db.query(`
                INSERT INTO capaci_staged_data (
                    scenario, year, period, entity,
                    account, custom1, custom2, custom3, custom4,
                    icp, view, value, data_value,
                    source, status, author
                ) VALUES (
                    $1, $2, $3, $4,
                    $5, $6, $7, $8, $9,
                    $10, $11, '<Entity Currency>', $12,
                    $13, 'posted', $14
                )
            `, [
                scenario, year, period, entity,
                row.account, row.custom1, row.custom2, row.custom3, row.custom4,
                row.icp, row.view, parseFloat(row.data_value),
                row.entity,
                author
            ]);

            await writeLog(`Insert: ${key} from ${row.entity} (value = ${row.data_value})`);
            insertedCount++;
        }

        await writeLog(`Rollup completed: ${insertedCount} rows inserted in ${entity}`, true);

        res.status(200).json({ 
            message: `Rolled up ${insertedCount} unique lines from ${children.length} children into ${entity}` 
        });
    } catch (err) {
        await writeLog(`Error in rollupToParent: ${err.message}`, true);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};

module.exports = {
    calculate,
    raiseData,
    rollupToParent
};