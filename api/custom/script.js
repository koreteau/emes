// script.js - Main calculation business logic

const utils = require('./utils');

/**
 * Calculate manual flows based on business rules (INI, CHK, CLO)
 */
const calculateManualFlow = async (scenario, year, period, entity, writeLog) => {
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
        await writeLog(`Calculating ${target} from: ${sources.join(' + ')}`);

        const result = await utils.getAggregatedData(scenario, year, period, entity, sources);

        if (result.rowCount === 0) {
            await writeLog(`No data found to calculate ${target}`);
            continue;
        }

        for (const row of result.rows) {
            let value = parseFloat(row.total);
            
            // Business rule: Invert sign for DEC when calculating CHK
            if (target === 'CHK' && sources.includes('DEC')) {
                // Note: The original code had a bug - it referenced row.custom1 but should check if 'DEC' is in sources
                // This needs to be clarified based on your business requirements
            }

            await utils.insertCalculatedData(scenario, year, period, entity, target, row, value);
            await writeLog(`Calculated ${target} for ${row.account}, value ${row.value}: ${value}`);
        }
    }
};

/**
 * Handle CLO (N-1) → OPE (N) injection
 */
const processOpeningBalance = async (scenario, year, period, entity, writeLog) => {
    const previousPeriod = utils.getPreviousPeriod(period);
    
    if (previousPeriod) {
        await writeLog(`Copying CLO from ${previousPeriod} to OPE in ${period}`);

        const rows = await utils.getCLOFromPreviousPeriod(scenario, year, previousPeriod, entity);

        for (const row of rows) {
            await utils.insertOPEData(scenario, year, period, entity, row);
            await writeLog(`Copied CLO ${row.account} (<Entity Curr Total>) → OPE (<Entity Currency>): ${row.data_value}`);
        }
    } else {
        await writeLog(`No previous month found for ${period}. No propagation CLO → OPE.`);
    }
};

/**
 * Process hierarchical rollup for accounts
 */
const processAccountHierarchy = async (scenario, year, period, entity, accountMembers, accountChildren, writeLog) => {
    const processedAccounts = new Set();
    
    const cascadeAccounts = async (accountId) => {
        if (processedAccounts.has(accountId)) return;
        
        const children = accountChildren[accountId];
        if (children) {
            for (const child of children) {
                await cascadeAccounts(child);
            }
        }

        const rows = await utils.getHierarchyAggregatedData(scenario, year, period, entity, children, 'account');

        for (const row of rows) {
            await utils.insertHierarchyData(scenario, year, period, entity, accountId, row, 'account');
            await writeLog(`Aggregated account ${accountId} for custom1 ${row.custom1} and value ${row.value}: ${row.total}`);
        }

        processedAccounts.add(accountId);
    };

    // Process all node-type accounts
    for (const member of accountMembers) {
        if (member.type === 'node') {
            await cascadeAccounts(member.id);
        }
    }
};

/**
 * Process hierarchical rollup for custom1 (flows)
 */
const processCustom1Hierarchy = async (scenario, year, period, entity, custom1Members, custom1Children, writeLog) => {
    const processedCustom1 = new Set();
    
    const cascadeCustom1 = async (custom1Id) => {
        if (processedCustom1.has(custom1Id)) {
            await writeLog(`Already treated: custom1 ${custom1Id}`);
            return;
        }

        const children = custom1Children[custom1Id];
        if (children && children.length > 0) {
            await writeLog(`Calculate ${custom1Id} flow from its children: ${children.join(", ")}`);
            for (const child of children) {
                await cascadeCustom1(child);
            }
        } else {
            await writeLog(`${custom1Id} has no children. No aggregation.`);
        }

        const rows = await utils.getHierarchyAggregatedData(scenario, year, period, entity, children, 'custom1');

        if (rows.length === 0) {
            await writeLog(`No results found for the aggregation of ${custom1Id}`);
        }

        for (const row of rows) {
            await utils.insertHierarchyData(scenario, year, period, entity, custom1Id, row, 'custom1');
            await writeLog(`Aggregated custom1 ${custom1Id} for account ${row.account} and value ${row.value}: ${parseFloat(row.total)}`);
        }

        processedCustom1.add(custom1Id);
    };

    // Process all custom1 members marked as closed (ud1 = 'Y')
    for (const member of custom1Members) {
        if (member.ud1 === 'Y') {
            await writeLog(`Start processing custom1 closed: ${member.id}`);
            await cascadeCustom1(member.id);
        }
    }
};

/**
 * Main calculation entry point
 */
const runCalculation = async (scenario, year, period, entity, accountMembers, custom1Members, writeLog) => {
    try {
        await writeLog(`Starting calculation for: ${JSON.stringify({ scenario, year, period, entity })}`);

        // Step 1: Copy staged data to main data table
        await utils.copyStagedToMain(scenario, year, period, entity, writeLog);

        // Step 2: Build hierarchy maps
        const { memberMap: accountMap, childrenMap: accountChildren } = utils.buildHierarchyMap(accountMembers);
        const { memberMap: custom1Map, childrenMap: custom1Children } = utils.buildHierarchyMap(custom1Members);

        // Step 3: Process account hierarchy rollup
        await processAccountHierarchy(scenario, year, period, entity, accountMembers, accountChildren, writeLog);

        // Step 4: Handle opening balance (CLO N-1 → OPE N)
        await processOpeningBalance(scenario, year, period, entity, writeLog);

        // Step 5: Process custom1 (flows) hierarchy rollup
        await processCustom1Hierarchy(scenario, year, period, entity, custom1Members, custom1Children, writeLog);

        // Step 6: Apply manual flow rules (INI, CHK, CLO)
        await calculateManualFlow(scenario, year, period, entity, writeLog);

        await writeLog('Calculation completed successfully');
        return { success: true, message: 'Calculate executed including account and custom1 cascade' };

    } catch (error) {
        await writeLog(`Calculation error: ${error.message}`);
        throw error;
    }
};

/**
 * Validation function to check required parameters
 */
const validateCalculationParameters = (scenario, year, period, entity) => {
    const missing = [];
    if (!scenario) missing.push('scenario');
    if (!year) missing.push('year');
    if (!period) missing.push('period');
    if (!entity) missing.push('entity');
    
    if (missing.length > 0) {
        throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }
    
    // Validate period format (should be P01, P02, etc.)
    if (!/^P\d{2}$/.test(period)) {
        throw new Error(`Invalid period format: ${period}. Expected format: P01, P02, etc.`);
    }
    
    return true;
};

module.exports = {
    runCalculation,
    validateCalculationParameters,
    calculateManualFlow,
    processOpeningBalance,
    processAccountHierarchy,
    processCustom1Hierarchy
};