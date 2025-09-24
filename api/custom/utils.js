// utils.js - Database operations and utility functions

const db = require('../config/db');

/**
 * Get previous period (P01 -> null, P02 -> P01, etc.)
 */
const getPreviousPeriod = (period) => {
    const match = period.match(/^P(\d{2})$/);
    if (!match) return null;
    const num = parseInt(match[1], 10);
    if (num <= 1) return null;
    const prev = num - 1;
    return `P${prev.toString().padStart(2, '0')}`;
};

/**
 * Copy staged data to main data table
 */
const copyStagedToMain = async (scenario, year, period, entity, writeLog) => {
    await writeLog('Copying staged data to main data table...');

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

            await writeLog(`Inserted/Updated ${pov.account} / ${pov.custom1} with value ${row.value} = ${row.data_value}`);
        }
    }
};

/**
 * Get aggregated data for manual flow calculations
 */
const getAggregatedData = async (scenario, year, period, entity, sources) => {
    const result = await db.query(`
        SELECT account, custom2, custom3, custom4, icp, view, value,
               SUM(data_value) as total
        FROM capaci_data
        WHERE scenario = $1 AND year = $2 AND period = $3 AND entity = $4
          AND custom1 = ANY($5)
        GROUP BY account, custom2, custom3, custom4, icp, view, value
    `, [scenario, year, period, entity, sources]);

    return result;
};

/**
 * Insert calculated data
 */
const insertCalculatedData = async (scenario, year, period, entity, target, row, total) => {
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
        row.icp, row.view, row.value, parseFloat(total)
    ]);
};

/**
 * Get CLO data from previous period
 */
const getCLOFromPreviousPeriod = async (scenario, year, previousPeriod, entity) => {
    const { rows } = await db.query(`
        SELECT account, custom2, custom3, custom4, icp, view, data_value
        FROM capaci_data
        WHERE scenario = $1 AND year = $2 AND period = $3 AND entity = $4
          AND custom1 = 'CLO'
          AND value = '<Entity Curr Total>'
    `, [scenario, year, previousPeriod, entity]);

    return rows;
};

/**
 * Insert OPE data (opening balance)
 */
const insertOPEData = async (scenario, year, period, entity, row) => {
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
};

/**
 * Get aggregated data for hierarchy rollup
 */
const getHierarchyAggregatedData = async (scenario, year, period, entity, children, dimension = 'account') => {
    let query;

    if (dimension === 'account') {
        query = `
            SELECT custom1, custom2, custom3, custom4, icp, view, value,
                   SUM(data_value) as total
            FROM capaci_data
            WHERE scenario = $1 AND year = $2 AND period = $3 AND entity = $4
              AND account = ANY($5)
            GROUP BY custom1, custom2, custom3, custom4, icp, view, value
        `;
    } else if (dimension === 'custom1') {
        query = `
            SELECT account, custom2, custom3, custom4, icp, view, value,
                   SUM(data_value) as total
            FROM capaci_data
            WHERE scenario = $1 AND year = $2 AND period = $3 AND entity = $4
              AND custom1 = ANY($5)
            GROUP BY account, custom2, custom3, custom4, icp, view, value
        `;
    }

    const result = await db.query(query, [scenario, year, period, entity, children || []]);
    return result.rows;
};

/**
 * Insert hierarchy aggregated data
 */
const insertHierarchyData = async (scenario, year, period, entity, parentId, row, dimension = 'account') => {
    if (dimension === 'account') {
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
            scenario, year, period, entity, parentId,
            row.custom1, row.custom2, row.custom3, row.custom4,
            row.icp, row.view, row.value, parseFloat(row.total)
        ]);
    } else if (dimension === 'custom1') {
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
            parentId, row.custom2, row.custom3, row.custom4,
            row.icp, row.view, row.value, parseFloat(row.total)
        ]);
    }
};

/**
 * Build hierarchy children map
 */
const buildHierarchyMap = (members) => {
    const memberMap = {};
    const childrenMap = {};

    for (const m of members) {
        memberMap[m.id] = m;
        if (m.parent) {
            if (!childrenMap[m.parent]) childrenMap[m.parent] = [];
            childrenMap[m.parent].push(m.id);
        }
    }

    return { memberMap, childrenMap };
};

module.exports = {
    getPreviousPeriod,
    copyStagedToMain,
    getAggregatedData,
    insertCalculatedData,
    getCLOFromPreviousPeriod,
    insertOPEData,
    getHierarchyAggregatedData,
    insertHierarchyData,
    buildHierarchyMap
};