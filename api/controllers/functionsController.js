const db = require('../config/db');
const { getLatestDimensionData } = require('./dimensionController');
const createLogger = require('../utils/writeLogs');


const calculateManualFlow = async (scenario, year, period, entity, writeLog) => {
    // console.log('Calculating manual flows based on business rules...');
    await writeLog('Calculating manual flows based on business rules...');

    const manualFormulas = [
        { target: 'INI', sources: ['OPE', 'CHO'] },
        {
            target: 'CHK', sources: [
                'INI', 'CTA', 'CAI', 'CAR', 'INC', 'DEC', 'RIV', 'DEV', 'CWC',
                'MRG', 'INT', 'SIT', 'SOT', 'SVA', 'REC', 'ACT', 'APP', 'NIN', 'EQY', 'REL', 'MKV'
            ]
        },
        { target: 'CLO', sources: ['CHK'] }
    ];

    for (const { target, sources } of manualFormulas) {
        // console.log(`Calculating ${target} from: ${sources.join(' + ')}`);
        await writeLog(`Calculating ${target} from: ${sources.join(' + ')}`);

        const result = await db.query(`
            SELECT account, custom2, custom3, custom4, icp, view, value,
                   SUM(data_value) as total
            FROM capaci_data
            WHERE scenario = $1 AND year = $2 AND period = $3 AND entity = $4
              AND custom1 = ANY($5)
            GROUP BY account, custom2, custom3, custom4, icp, view, value
        `, [scenario, year, period, entity, sources]);

        if (result.rowCount === 0) {
            // console.log(`No data found to calculate ${target}`);
            await writeLog(`No data found to calculate ${target}`);
            continue;
        }

        for (const row of result.rows) {
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
                    custom1, custom2, custom3, custom4, icp, view, value
                )
                DO UPDATE SET data_value = EXCLUDED.data_value
            `, [
                scenario, year, period, entity, row.account,
                target, row.custom2, row.custom3, row.custom4,
                row.icp, row.view, row.value, parseFloat(row.total)
            ]);
            // console.log(`Calculated ${target} for ${row.account}, value ${row.value}: ${parseFloat(row.total)}`);
            await writeLog(`Calculated ${target} for ${row.account}, value ${row.value}: ${parseFloat(row.total)}`);
        }
    }
};


const getPreviousPeriod = (period) => {
    const match = period.match(/^P(\d{2})$/);
    if (!match) return null;
    const num = parseInt(match[1], 10);
    if (num <= 1) return null;
    const prev = num - 1;
    return `P${prev.toString().padStart(2, '0')}`;
};



const calculate = async (req, res) => {
    const writeLog = createLogger({
        app: 'capaci',
        name: 'calculate',
        user: req.user?.id || 'system',
        type: 'info'
    });

    try {
        const { scenario, year, period, entity } = req.query;

        if (!scenario || !year || !period || !entity) {
            return res.status(400).json({ error: 'Missing required query parameters' });
        }

        // console.log('Launching calculate with:', { scenario, year, period, entity });
        await writeLog(`Launching calculate with: ${JSON.stringify({ scenario, year, period, entity })}`);

        const accountDim = await getLatestDimensionData('account');
        const custom1Dim = await getLatestDimensionData('custom1');

        const accountMembers = accountDim?.members || [];
        const custom1Members = custom1Dim?.members || [];

        const accountMap = {};
        const accountChildren = {};
        const custom1Map = {};
        const custom1Children = {};

        for (const m of accountMembers) {
            accountMap[m.id] = m;
            if (m.parent) {
                if (!accountChildren[m.parent]) accountChildren[m.parent] = [];
                accountChildren[m.parent].push(m.id);
            }
        }

        for (const m of custom1Members) {
            custom1Map[m.id] = m;
            if (m.parent) {
                if (!custom1Children[m.parent]) custom1Children[m.parent] = [];
                custom1Children[m.parent].push(m.id);
            }
        }

        // console.log(`Loaded ${accountMembers.length} accounts and ${custom1Members.length} custom1 values`);
        await writeLog(`Loaded ${accountMembers.length} accounts and ${custom1Members.length} custom1 values`);


        const povsResult = await db.query(`
            SELECT DISTINCT account, custom1, custom2, custom3, custom4, icp, view
            FROM capaci_staged_data
            WHERE scenario = $1 AND year = $2 AND period = $3 AND entity = $4
        `, [scenario, year, period, entity]);

        const povs = povsResult.rows;

        for (const pov of povs) {
            const lines = await db.query(`
                SELECT value, data_value FROM capaci_staged_data
                WHERE scenario = $1 AND year = $2 AND period = $3 AND entity = $4
                  AND account = $5 AND custom1 = $6 AND custom2 = $7 AND custom3 = $8 AND custom4 = $9
                  AND icp = $10 AND view = $11
            `, [
                scenario, year, period, entity,
                pov.account, pov.custom1, pov.custom2, pov.custom3, pov.custom4,
                pov.icp, pov.view
            ]);

            for (const row of lines.rows) {
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
                        custom1, custom2, custom3, custom4, icp, view, value
                    )
                    DO UPDATE SET data_value = EXCLUDED.data_value
                `, [
                    scenario, year, period, entity, pov.account,
                    pov.custom1, pov.custom2, pov.custom3, pov.custom4,
                    pov.icp, pov.view, row.value, parseFloat(row.data_value)
                ]);
                // console.log(`Inserted/Updated ${pov.account} / ${pov.custom1} with value ${row.value} = ${row.data_value}`);
                await writeLog(`Inserted/Updated ${pov.account} / ${pov.custom1} with value ${row.value} = ${row.data_value}`);
            }
        }

        // Remontée hiérarchique des comptes
        const processedAccounts = new Set();
        const cascadeAccounts = async (accountId) => {
            if (processedAccounts.has(accountId)) return;
            const children = accountChildren[accountId];
            if (children) {
                for (const child of children) await cascadeAccounts(child);
            }

            const rows = await db.query(`
                SELECT custom1, custom2, custom3, custom4, icp, view, value,
                       SUM(data_value) as total
                FROM capaci_data
                WHERE scenario = $1 AND year = $2 AND period = $3 AND entity = $4
                  AND account = ANY($5)
                GROUP BY custom1, custom2, custom3, custom4, icp, view, value
            `, [scenario, year, period, entity, children || []]);

            for (const row of rows.rows) {
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
                        custom1, custom2, custom3, custom4, icp, view, value
                    )
                    DO UPDATE SET data_value = EXCLUDED.data_value
                `, [
                    scenario, year, period, entity, accountId,
                    row.custom1, row.custom2, row.custom3, row.custom4,
                    row.icp, row.view, row.value, parseFloat(row.total)
                ]);
                // console.log(`Aggregated account ${accountId} for custom1 ${row.custom1} and value ${row.value}: ${row.total}`);
                await writeLog(`Aggregated account ${accountId} for custom1 ${row.custom1} and value ${row.value}: ${row.total}`);
            }

            processedAccounts.add(accountId);
        };

        for (const member of accountMembers) {
            if (member.type === 'node') {
                await cascadeAccounts(member.id);
            }
        }

        // Injection de CLO (N-1) → OPE (N)
        const previousPeriod = getPreviousPeriod(period);
        if (previousPeriod) {
            // console.log(`Copying CLO from ${previousPeriod} to OPE in ${period}`);
            await writeLog(`Copying CLO from ${previousPeriod} to OPE in ${period}`);

            const { rows } = await db.query(`
        SELECT account, custom2, custom3, custom4, icp, view, data_value
        FROM capaci_data
        WHERE scenario = $1 AND year = $2 AND period = $3 AND entity = $4
          AND custom1 = 'CLO'
          AND value = '<Entity Curr Total>'
    `, [scenario, year, previousPeriod, entity]);

            for (const row of rows) {
                await db.query(`
            INSERT INTO capaci_data (
                scenario, year, period, entity, account,
                custom1, custom2, custom3, custom4, icp,
                view, value, data_value
            ) VALUES (
                $1, $2, $3, $4, $5,
                'OPE', $6, $7, $8, $9,
                $10, '<Entity Currency>', $11
            )
            ON CONFLICT (
                scenario, year, period, entity, account,
                custom1, custom2, custom3, custom4, icp, view, value
            )
            DO UPDATE SET data_value = EXCLUDED.data_value
        `, [
                    scenario, year, period, entity, row.account,
                    row.custom2, row.custom3, row.custom4, row.icp,
                    row.view, parseFloat(row.data_value)
                ]);

                // console.log(`Copied CLO ${row.account} (<Entity Curr Total>) → OPE (<Entity Currency>): ${row.data_value}`);
                await writeLog(`Copied CLO ${row.account} (<Entity Curr Total>) → OPE (<Entity Currency>): ${row.data_value}`);
            }
        } else {
            // console.log(`No previous month found for ${period}. No propagation CLO → OPE.`);
            await writeLog(`No previous month found for ${period}. No propagation CLO → OPE.`);
        }


        // Remontée hiérarchique des flux (custom1)
        const processedCustom1 = new Set();
        const cascadeCustom1 = async (custom1Id) => {
            if (processedCustom1.has(custom1Id)) {
                // console.log(`Already treated: custom1 ${custom1Id}`);
                await writeLog(`Already treated: custom1 ${custom1Id}`);
                return;
            }

            const children = custom1Children[custom1Id];
            if (children && children.length > 0) {
                // console.log(`Calculate ${custom1Id} flow from its children:: ${children.join(", ")}`);
                await writeLog(`Calculate ${custom1Id} flow from its children:: ${children.join(", ")}`);
                for (const child of children) await cascadeCustom1(child);
            } else {
                // console.log(`${custom1Id} has no children. No aggregation.`);
                await writeLog(`${custom1Id} has no children. No aggregation.`);
            }

            const { rows } = await db.query(`
                SELECT account, custom2, custom3, custom4, icp, view, value,
                       SUM(data_value) as total
                FROM capaci_data
                WHERE scenario = $1 AND year = $2 AND period = $3 AND entity = $4
                  AND custom1 = ANY($5)
                GROUP BY account, custom2, custom3, custom4, icp, view, value
            `, [scenario, year, period, entity, children || []]);

            if (rows.length === 0) {
                // console.log(`No results found for the aggregation of ${custom1Id}`);
                await writeLog(`No results found for the aggregation of ${custom1Id}`);
            }

            for (const row of rows) {
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
                        custom1, custom2, custom3, custom4, icp, view, value
                    )
                    DO UPDATE SET data_value = EXCLUDED.data_value
                `, [
                    scenario, year, period, entity, row.account,
                    custom1Id, row.custom2, row.custom3, row.custom4,
                    row.icp, row.view, row.value, parseFloat(row.total)
                ]);
                // console.log(`Aggregated custom1 ${custom1Id} for account ${row.account} and value ${row.value}: ${parseFloat(row.total)}`);
                await writeLog(`Aggregated custom1 ${custom1Id} for account ${row.account} and value ${row.value}: ${parseFloat(row.total)}`);
            }

            processedCustom1.add(custom1Id);
        };

        for (const member of custom1Members) {
            if (member.ud1 === 'Y') {
                // console.log(`Start processing custom1 closed: ${member.id}`);
                await writeLog(`Start processing custom1 closed: ${member.id}`);
                await cascadeCustom1(member.id);
            }
        }

        // Application des règles de flux manuels (INI, CHK, CLO)
        await calculateManualFlow(scenario, year, period, entity, writeLog);

        // console.log('Calculate executed including account and custom1 cascade');
        await writeLog(`Calculate executed including account and custom1 cascade`, true);
        return res.status(200).json({ message: 'Calculate executed with account + flux logic' });

    } catch (err) {
        // console.error('Calculate error:', err);
        await writeLog(`Calculate error: ${err}`, true);
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};


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

        // console.log('Launching raiseData with:', { scenario, year, period, entity });
        await writeLog(`Launching raiseData with: ${JSON.stringify({ scenario, year, period, entity })}`);

        // Charger les dimensions entity
        const entityDim = await getLatestDimensionData('entity');
        const entityMap = {};
        (entityDim?.members || []).forEach(member => {
            entityMap[member.id] = member;
        });

        const entityMeta = entityMap[entity];
        const parentMeta = entityMeta?.parent ? entityMap[entityMeta.parent] : null;
        const sourceCurrency = entityMeta?.defaultCurr || 'EUR';
        const targetCurrency = parentMeta?.defaultCurr || 'EUR';

        // console.log('Entity meta:', entityMeta);
        // console.log('Parent meta:', parentMeta);
        // console.log('Source currency:', sourceCurrency);
        // console.log('Target currency:', targetCurrency);
        await writeLog(`Entity meta: ${JSON.stringify(entityMeta)}`);
        await writeLog(`Parent meta: ${JSON.stringify(parentMeta)}`);
        await writeLog(`Source currency: ${sourceCurrency}`);
        await writeLog(`Target currency: ${targetCurrency}`);

        // Charger les lignes concernées de capaci_data
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
        // console.log(`Loaded ${lines.length} lines from capaci_data`);
        await writeLog(`Loaded ${lines.length} lines from capaci_data`);


        const povMap = {};
        for (const row of lines) {
            const key = `${row.account}_${row.custom1}_${row.custom2}_${row.custom3}_${row.custom4}_${row.icp}_${row.view}`;
            if (!povMap[key]) povMap[key] = {};
            povMap[key][row.value] = parseFloat(row.data_value);
        }

        for (const key in povMap) {
            const values = povMap[key];
            const [account, custom1, custom2, custom3, custom4, icp, view] = key.split('_');

            const insert = async (value, data_value) => {
                const rounded = Number(data_value.toFixed(3));
                // console.log(`Inserting ${value} = ${rounded}`);
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


            // 1. <Entity Curr Total>
            const ect = (values['<Entity Currency>'] || 0) + (values['<Entity Curr Adjs>'] || 0);
            // console.log(`<Entity Curr Total>: ${ect}`);
            await writeLog(`<Entity Curr Total>: ${ect}`);
            await insert('<Entity Curr Total>', ect);

            // 2. Stop si pas de parent
            if (!parentMeta) {
                // console.log('No parent entity found — stopping here');
                await writeLog(`No parent entity found — stopping here`);
                continue;
            }

            // 3. Récupérer le taux via la MONNAIE SOURCE
            const fxQuery = await db.query(`
                SELECT data_value FROM capaci_data
                WHERE scenario = $1 AND year = $2 AND period = $3
                  AND account = 'CLOSING' AND custom2 = $4 AND entity = '[None]'
                LIMIT 1
            `, [scenario, year, period, sourceCurrency]);

            const fxRate = parseFloat(fxQuery.rows[0]?.data_value || 1);
            // console.log(`FX rate (1 EUR = ${fxRate} ${sourceCurrency})`);
            await writeLog(`FX rate (1 EUR = ${fxRate} ${sourceCurrency})`);

            // 4. Conversion en devise de la holding (EUR)
            const pc = fxRate !== 0 ? ect / fxRate : ect;
            // console.log(`<Parent Currency> (converted): ${pc}`);
            await writeLog(`<Parent Currency> (converted): ${pc}`);
            await insert('<Parent Currency>', pc);

            // 5. <Parent Curr Total>
            const pct = pc + (values['<Parent Curr Adjs>'] || 0);
            await insert('<Parent Curr Total>', pct);

            // 6. [Parent] & [Parent Total]
            await insert('[Parent]', pct);
            const pt = pct + (values['[Parent Adjs]'] || 0);
            await insert('[Parent Total]', Number(pt.toFixed(3)));

            // 7. [Elimination] ou [Proportion]
            let contribution = 0;

            if (icp !== '[None]') {
                // console.log(`Interco detected — inserting elimination = ${pt}`);
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

                // console.log(`Ownership = ${ownership}%, → Proportion = ${proportion}`);
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
        // console.error('Raise Data error:', err);
        await writeLog(`Raise Data error: ${err.message}`, true)
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};


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
            // console.log("Missing parameters :", { scenario, year, period, entity });
            await writeLog(`Missing parameters : ${JSON.stringify({ scenario, year, period, entity })}`);
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Charger la hiérarchie
        const entityDim = await getLatestDimensionData('entity');
        const children = entityDim.members.filter(m => m.parent === entity).map(m => m.id);

        if (children.length === 0) {
            // console.log(`No descendants found for ${entity}`);
            await writeLog(`No descendants found for ${entity}`);
            return res.status(400).json({ error: 'No children found for entity' });
        }

        // console.log(`Rollup from ${children.length} descendants towards ${entity}...`);
        await writeLog(`Rollup from ${children.length} descendants towards ${entity}...`);

        // Rechercher les données à remonter
        const { rows } = await db.query(`
            SELECT *
            FROM capaci_data
            WHERE scenario = $1 AND year = $2 AND period = $3
              AND value = '[Contribution Total]'
              AND entity = ANY($4)
        `, [scenario, year, period, children]);

        // console.log(`${rows.length} rows found to rollup`);
        await writeLog(`${rows.length} rows found to rollup`);

        const seen = new Set();
        let insertedCount = 0;

        for (const row of rows) {
            const key = [
                row.account, row.custom1, row.custom2, row.custom3, row.custom4,
                row.icp, row.view
            ].join("|");

            if (seen.has(key)) {
                console.log(`🟡 Doublon ignoré pour : ${key}`);
                continue;
            }
            seen.add(key);

            // Supprimer ancienne version (même POV + source)
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

            // console.log(`Deletion: ${deleteRes.rowCount} row(s) deleted for source ${row.entity}`);
            await writeLog(`Deletion: ${deleteRes.rowCount} row(s) deleted for source ${row.entity}`);

            // Insertion
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

            // console.log(`Insert : ${key} from ${row.entity} (value = ${row.data_value})`);
            await writeLog(`Insert : ${key} from ${row.entity} (value = ${row.data_value})`);
            insertedCount++;
        }

        // console.log(`Rollup completed : ${insertedCount} rows inserted in ${entity}`);
        await writeLog(`Rollup completed : ${insertedCount} rows inserted in ${entity}`, true);

        res.status(200).json({ message: `Rolled up ${insertedCount} unique lines from ${children.length} children into ${entity}` });
    } catch (err) {
        // console.error("Error in rollupToParent:", err);
        await writeLog(`Error in rollupToParent: ${err.message}`, true);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};



module.exports = {
    calculate,
    raiseData,
    rollupToParent
}