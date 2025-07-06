const db = require('../config/db');
const { getLatestDimensionData } = require('./dimensionController');


const calculateManualFlow = async (scenario, year, period, entity) => {
    console.log('🧠 Calculating manual flows based on business rules...');

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
        console.log(`🔁 Calculating ${target} from: ${sources.join(' + ')}`);

        const result = await db.query(`
            SELECT account, custom2, custom3, custom4, icp, view, value,
                   SUM(data_value) as total
            FROM capaci_data
            WHERE scenario = $1 AND year = $2 AND period = $3 AND entity = $4
              AND custom1 = ANY($5)
            GROUP BY account, custom2, custom3, custom4, icp, view, value
        `, [scenario, year, period, entity, sources]);

        if (result.rowCount === 0) {
            console.log(`⚠️ No data found to calculate ${target}`);
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
            console.log(`✅ Calculated ${target} for ${row.account}, value ${row.value}: ${parseFloat(row.total)}`);
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
    try {
        const { scenario, year, period, entity } = req.query;

        if (!scenario || !year || !period || !entity) {
            return res.status(400).json({ error: 'Missing required query parameters' });
        }

        console.log('▶️ Launching calculate with:', { scenario, year, period, entity });

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

        console.log(`📦 Loaded ${accountMembers.length} accounts and ${custom1Members.length} custom1 values`);

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
                console.log(`🧮 Inserted/Updated ${pov.account} / ${pov.custom1} with value ${row.value} = ${row.data_value}`);
            }
        }

        // ⛰️ Remontée hiérarchique des comptes
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
                console.log(`🔼 Aggregated account ${accountId} for custom1 ${row.custom1} and value ${row.value}: ${row.total}`);
            }

            processedAccounts.add(accountId);
        };

        for (const member of accountMembers) {
            if (member.type === 'node') {
                await cascadeAccounts(member.id);
            }
        }

        // 🔁 Injection de CLO (N-1) → OPE (N)
        const previousPeriod = getPreviousPeriod(period);
        if (previousPeriod) {
            console.log(`🔁 Copying CLO from ${previousPeriod} to OPE in ${period}`);

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

                console.log(`🔄 Copied CLO ${row.account} (<Entity Curr Total>) → OPE (<Entity Currency>): ${row.data_value}`);
            }
        } else {
            console.log(`⚠️ Aucun mois précédent trouvé pour ${period}. Pas de propagation CLO → OPE.`);
        }


        // 🔁 Remontée hiérarchique des flux (custom1)
        const processedCustom1 = new Set();
        const cascadeCustom1 = async (custom1Id) => {
            if (processedCustom1.has(custom1Id)) {
                console.log(`⏩ Déjà traité: custom1 ${custom1Id}`);
                return;
            }

            const children = custom1Children[custom1Id];
            if (children && children.length > 0) {
                console.log(`🔍 Calcul flux ${custom1Id} à partir de ses enfants: ${children.join(", ")}`);
                for (const child of children) await cascadeCustom1(child);
            } else {
                console.log(`ℹ️ Flux ${custom1Id} n’a pas d’enfants. Pas d’agrégation.`);
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
                console.log(`⚠️ Aucun résultat trouvé pour l'agrégation de ${custom1Id}`);
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
                console.log(`🔁 Aggregated custom1 ${custom1Id} for account ${row.account} and value ${row.value}: ${parseFloat(row.total)}`);
            }

            processedCustom1.add(custom1Id);
        };

        for (const member of custom1Members) {
            if (member.ud1 === 'Y') {
                console.log(`🚀 Début du traitement de custom1 fermé: ${member.id}`);
                await cascadeCustom1(member.id);
            }
        }

        // 🧠 Application des règles de flux manuels (INI, CHK, CLO)
        await calculateManualFlow(scenario, year, period, entity);

        console.log('✅ Calculate executed including account and custom1 cascade');
        return res.status(200).json({ message: 'Calculate executed with account + flux logic' });

    } catch (err) {
        console.error('❌ Calculate error:', err);
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};


const raiseData = async (req, res) => {
    try {
        const { scenario, year, period, entity } = req.query;

        if (!scenario || !year || !period || !entity) {
            return res.status(400).json({ error: 'Missing required query parameters: scenario, year, period, entity' });
        }

        console.log('▶️ Launching raiseData with:', { scenario, year, period, entity });

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

        console.log('🔎 Entity meta:', entityMeta);
        console.log('🔝 Parent meta:', parentMeta);
        console.log('💶 Source currency:', sourceCurrency);
        console.log('💶 Target currency:', targetCurrency);

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
        console.log(`📥 Loaded ${lines.length} lines from capaci_data`);

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
                console.log(`📝 Inserting ${value} = ${rounded}`);
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
            console.log(`🧮 <Entity Curr Total>: ${ect}`);
            await insert('<Entity Curr Total>', ect);

            // 2. Stop si pas de parent
            if (!parentMeta) {
                console.log('⚠️ No parent entity found — stopping here');
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
            console.log(`📊 FX rate (1 EUR = ${fxRate} ${sourceCurrency})`);

            // 4. Conversion en devise de la holding (EUR)
            const pc = fxRate !== 0 ? ect / fxRate : ect;
            console.log(`💱 <Parent Currency> (converted): ${pc}`);
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
                console.log(`🚫 Interco detected — inserting elimination = ${pt}`);
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

                console.log(`📐 Ownership = ${ownership}%, → Proportion = ${proportion}`);
                await insert('[Proportion]', proportion);
                await insert('[Contribution]', proportion);
            }

            const contribAdj = values['[Contribution Adjs]'] || 0;
            const contribTotal = contribution + contribAdj;
            await insert('[Contribution Total]', contribTotal);

        }

        res.status(200).json({ message: 'Raise Data executed with debug logs' });
    } catch (err) {
        console.error('❌ Raise Data error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};


const rollupToParent = async (req, res) => {
    try {
        const { scenario, year, period, entity } = req.query;
        const author = req.user?.id || 'system';

        if (!scenario || !year || !period || !entity) {
            return res.status(400).json({ error: 'Missing required query parameters: scenario, year, period, entity' });
        }

        console.log('🔁 Starting rollupToParent for:', { scenario, year, period, entity });

        // Charger les dimensions
        const entityDim = await getLatestDimensionData('entity');
        const entityMap = {};
        (entityDim?.members || []).forEach(e => {
            entityMap[e.id] = e;
        });

        const children = Object.values(entityMap).filter(e => e.parent === entity);
        if (children.length === 0) {
            return res.status(400).json({ error: 'Selected entity has no children' });
        }

        console.log(`👶 Found ${children.length} children of ${entity}:`, children.map(c => c.id));

        for (const child of children) {
            const result = await db.query(`
                SELECT *
                FROM capaci_data
                WHERE scenario = $1 AND year = $2 AND period = $3 AND entity = $4
                  AND value = '[Contribution Total]'
            `, [scenario, year, period, child.id]);

            if (result.rows.length === 0) {
                console.log(`⚠️ No [Contribution Total] data for child ${child.id}`);
                continue;
            }

            for (const row of result.rows) {
                await db.query(`
                    INSERT INTO capaci_staged_data (
                        scenario, year, period, entity, account,
                        custom1, custom2, custom3, custom4, icp,
                        view, value, data_value, source, status, author
                    ) VALUES (
                        $1, $2, $3, $4, $5,
                        $6, $7, $8, $9, $10,
                        $11, '<Entity Currency>', $12, 'rollup', 'posted', $13
                    )
                `, [
                    scenario, year, period, entity, row.account,
                    row.custom1, row.custom2, row.custom3, row.custom4, row.icp,
                    row.view, parseFloat(row.data_value), author
                ]);

                console.log(`✅ Rolled up ${child.id} to ${entity} — ${row.account} / ${row.custom1}`);
            }
        }

        res.status(200).json({ message: 'rollupToParent executed successfully' });
    } catch (err) {
        console.error('❌ rollupToParent error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};



module.exports = {
    calculate,
    raiseData,
    rollupToParent
}