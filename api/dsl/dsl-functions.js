/**
 * DSL Functions for the HFM System
 * Mathematical, Utility and Financial Functions
 */

/**
 * Basic mathematical functions
 */
function ABS(value) {
    if (value === null || value === undefined) return 0;
    return Math.abs(parseFloat(value));
}

function ROUND(value, decimals = 0) {
    if (value === null || value === undefined) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(parseFloat(value) * factor) / factor;
}

function FLOOR(value) {
    if (value === null || value === undefined) return 0;
    return Math.floor(parseFloat(value));
}

function CEIL(value) {
    if (value === null || value === undefined) return 0;
    return Math.ceil(parseFloat(value));
}

function MAX(...values) {
    const numValues = values.filter(v => v !== null && v !== undefined).map(v => parseFloat(v));
    return numValues.length > 0 ? Math.max(...numValues) : 0;
}

function MIN(...values) {
    const numValues = values.filter(v => v !== null && v !== undefined).map(v => parseFloat(v));
    return numValues.length > 0 ? Math.min(...numValues) : 0;
}

function SUM(...values) {
    return values.reduce((sum, val) => {
        if (val === null || val === undefined) return sum;
        return sum + parseFloat(val);
    }, 0);
}

function AVG(...values) {
    const numValues = values.filter(v => v !== null && v !== undefined).map(v => parseFloat(v));
    return numValues.length > 0 ? numValues.reduce((sum, val) => sum + val, 0) / numValues.length : 0;
}

function POWER(base, exponent) {
    if (base === null || base === undefined) return 0;
    if (exponent === null || exponent === undefined) return 1;
    return Math.pow(parseFloat(base), parseFloat(exponent));
}

function SQRT(value) {
    if (value === null || value === undefined) return 0;
    const num = parseFloat(value);
    return num >= 0 ? Math.sqrt(num) : 0;
}

function LOG(value, base = Math.E) {
    if (value === null || value === undefined || value <= 0) return 0;
    return Math.log(parseFloat(value)) / Math.log(base);
}

function EXP(value) {
    if (value === null || value === undefined) return 1;
    return Math.exp(parseFloat(value));
}

/**
 * Conditional functions
 */
function IF(condition, trueValue, falseValue) {
    return condition ? trueValue : falseValue;
}

function IIF(condition, trueValue, falseValue) {
    return IF(condition, trueValue, falseValue);
}

function CASE(testValue, ...pairs) {
    for (let i = 0; i < pairs.length - 1; i += 2) {
        if (testValue === pairs[i]) {
            return pairs[i + 1];
        }
    }
    // Default value (last value if odd)
    return pairs.length % 2 === 1 ? pairs[pairs.length - 1] : null;
}

function SWITCH(testValue, ...cases) {
    return CASE(testValue, ...cases);
}

/**
 * Logical functions
 */
function AND(...values) {
    return values.every(v => Boolean(v));
}

function OR(...values) {
    return values.some(v => Boolean(v));
}

function NOT(value) {
    return !Boolean(value);
}

function XOR(a, b) {
    return Boolean(a) !== Boolean(b);
}

/**
 * Comparison functions
 */
function EQUAL(a, b) {
    return a === b;
}

function GREATER(a, b) {
    return parseFloat(a) > parseFloat(b);
}

function LESS(a, b) {
    return parseFloat(a) < parseFloat(b);
}

function GREATER_EQUAL(a, b) {
    return parseFloat(a) >= parseFloat(b);
}

function LESS_EQUAL(a, b) {
    return parseFloat(a) <= parseFloat(b);
}

/**
 * String functions
 */
function CONCAT(...strings) {
    return strings.map(s => s === null || s === undefined ? '' : String(s)).join('');
}

function LEFT(string, length) {
    if (string === null || string === undefined) return '';
    return String(string).substring(0, length);
}

function RIGHT(string, length) {
    if (string === null || string === undefined) return '';
    const str = String(string);
    return str.substring(str.length - length);
}

function MID(string, start, length) {
    if (string === null || string === undefined) return '';
    return String(string).substring(start, start + length);
}

function UPPER(string) {
    if (string === null || string === undefined) return '';
    return String(string).toUpperCase();
}

function LOWER(string) {
    if (string === null || string === undefined) return '';
    return String(string).toLowerCase();
}

function TRIM(string) {
    if (string === null || string === undefined) return '';
    return String(string).trim();
}

function LENGTH(string) {
    if (string === null || string === undefined) return 0;
    return String(string).length;
}

function REPLACE(string, search, replacement) {
    if (string === null || string === undefined) return '';
    return String(string).replace(new RegExp(search, 'g'), replacement);
}

function FIND(string, substring) {
    if (string === null || string === undefined) return -1;
    return String(string).indexOf(substring);
}

/**
 * Validation functions
 */
function ISNULL(value) {
    return value === null || value === undefined;
}

function ISNOTNULL(value) {
    return !ISNULL(value);
}

function ISEMPTY(value) {
    return value === null || value === undefined || String(value).trim() === '';
}

function ISNOTEMPTY(value) {
    return !ISEMPTY(value);
}

function ISNUMBER(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}

function ISSTRING(value) {
    return typeof value === 'string';
}

function ISBOOLEAN(value) {
    return typeof value === 'boolean';
}

/**
 * Financial functions
 */
function PV(rate, nper, pmt, fv = 0, type = 0) {
    // Valeur actuelle
    if (rate === 0) {
        return -(pmt * nper + fv);
    }

    const factor = Math.pow(1 + rate, nper);
    const presentValue = -(pmt * (factor - 1) / rate + fv) / factor;

    return type === 0 ? presentValue : presentValue / (1 + rate);
}

function FV(rate, nper, pmt, pv = 0, type = 0) {
    // Future value
    if (rate === 0) {
        return -(pv + pmt * nper);
    }

    const factor = Math.pow(1 + rate, nper);
    const futureValue = -(pv * factor + pmt * (factor - 1) / rate);

    return type === 0 ? futureValue : futureValue * (1 + rate);
}

function PMT(rate, nper, pv, fv = 0, type = 0) {
    // Periodic payment
    if (rate === 0) {
        return -(pv + fv) / nper;
    }

    const factor = Math.pow(1 + rate, nper);
    const payment = -(pv * factor + fv) * rate / (factor - 1);

    return type === 0 ? payment : payment / (1 + rate);
}

function NPV(rate, ...cashFlows) {
    // Net present value
    let npv = 0;
    for (let i = 0; i < cashFlows.length; i++) {
        npv += cashFlows[i] / Math.pow(1 + rate, i + 1);
    }
    return npv;
}

function IRR(cashFlows, guess = 0.1) {
    // Internal rate of return (approximation)
    const maxIterations = 100;
    const tolerance = 1e-10;

    let rate = guess;

    for (let i = 0; i < maxIterations; i++) {
        let npv = 0;
        let dnpv = 0;

        for (let j = 0; j < cashFlows.length; j++) {
            const factor = Math.pow(1 + rate, j);
            npv += cashFlows[j] / factor;
            dnpv -= j * cashFlows[j] / (factor * (1 + rate));
        }

        if (Math.abs(npv) < tolerance) {
            return rate;
        }

        rate = rate - npv / dnpv;
    }

    return rate;
}

/**
 * Date functions
 */
function TODAY() {
    return new Date();
}

function NOW() {
    return new Date();
}

function YEAR(date) {
    return new Date(date).getFullYear();
}

function MONTH(date) {
    return new Date(date).getMonth() + 1;
}

function DAY(date) {
    return new Date(date).getDate();
}

function DATEVALUE(dateString) {
    return new Date(dateString);
}

function DATEDIFF(date1, date2, unit = 'days') {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);

    switch (unit.toLowerCase()) {
        case 'days':
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        case 'hours':
            return Math.ceil(diffTime / (1000 * 60 * 60));
        case 'minutes':
            return Math.ceil(diffTime / (1000 * 60));
        case 'seconds':
            return Math.ceil(diffTime / 1000);
        default:
            return diffTime;
    }
}


/**
 * Fonctions utilitaires
 */
function PRINT(message) {
    console.log(message);
    return message;
}

function DEBUG(label, value) {
    console.log(`[DEBUG] ${label}:`, value);
    return value;
}

function ERROR(message) {
    throw new Error(message);
}

function WARNING(message) {
    console.warn(`[WARNING] ${message}`);
    return message;
}

function TRACE(message) {
    console.trace(`[TRACE] ${message}`);
    return message;
}

/**
 * Fonctions de conversion
 */
function TONUMBER(value) {
    if (value === null || value === undefined) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

function TOSTRING(value) {
    if (value === null || value === undefined) return '';
    return String(value);
}

function TOBOOLEAN(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return Boolean(value);
}

/**
 * Fonctions de formatage
 */
function FORMAT(value, format) {
    if (value === null || value === undefined) return '';

    switch (format.toLowerCase()) {
        case 'currency':
            return new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR'
            }).format(value);
        case 'percent':
            return new Intl.NumberFormat('fr-FR', {
                style: 'percent'
            }).format(value);
        case 'number':
            return new Intl.NumberFormat('fr-FR').format(value);
        default:
            return String(value);
    }
}

function PERCENTAGE(value, total) {
    if (total === 0) return 0;
    return (value / total) * 100;
}

function VARIANCE(actual, budget) {
    return actual - budget;
}

function VARIANCE_PERCENT(actual, budget) {
    if (budget === 0) return 0;
    return ((actual - budget) / budget) * 100;
}


/**
 * Fonctions génériques pour arrays
 */
function ARRAY_LENGTH(arr) {
    if (!Array.isArray(arr)) return 0;
    return arr.length;
}

function GET_AT(arr, index) {
    if (!Array.isArray(arr) || index < 0 || index >= arr.length) return null;
    return arr[index];
}

function IS_ARRAY(value) {
    return Array.isArray(value);
}

/**
 * Fonctions génériques pour objets
 */
function GET_PROP(obj, prop) {
    if (!obj || typeof obj !== 'object') return null;
    return obj[prop] || null;
}

function HAS_PROP(obj, prop) {
    if (!obj || typeof obj !== 'object') return false;
    return obj.hasOwnProperty(prop);
}

function IS_OBJECT(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Fonctions génériques de recherche
 */
function FIND_IN_ARRAY(arr, callback) {
    if (!Array.isArray(arr) || typeof callback !== 'function') return null;
    return arr.find(callback) || null;
}

function COUNT_IN_ARRAY(arr, callback) {
    if (!Array.isArray(arr) || typeof callback !== 'function') return 0;
    return arr.filter(callback).length;
}

function FILTER_ARRAY(arr, callback) {
    if (!Array.isArray(arr) || typeof callback !== 'function') return [];
    return arr.filter(callback);
}


// === FONCTIONS SQL ===

/**
 * Fonctions SQL génériques pour PostgreSQL
 */

// Variable globale pour stocker la connexion DB (sera injectée par le JS)
let _dbConnection = null;

function SET_DB_CONNECTION(dbConnection) {
    _dbConnection = dbConnection;
}

function GET_DB_CONNECTION() {
    return _dbConnection;
}

async function SQL_QUERY(query, params = [], allowWrite = false) {
    if (!_dbConnection) {
        throw new Error('Database connection not configured. Call SET_DB_CONNECTION first.');
    }

    if (!query || typeof query !== 'string') {
        throw new Error('Invalid SQL query: must be a non-empty string');
    }

    // Vérification sécurité pour les écritures
    const upperQuery = query.toUpperCase();
    const writeKeywords = ['INSERT', 'UPDATE', 'DELETE'];
    const hasWriteKeyword = writeKeywords.some(keyword => upperQuery.includes(keyword));

    if (hasWriteKeyword && !allowWrite) {
        throw new Error('Write operation detected. Use allowWrite=true as 3rd parameter.');
    }

    try {
        console.log('[SQL_QUERY] Executing:', query.substring(0, 100) + '...');
        const result = await _dbConnection.query(query, params);

        // Retourner selon le type d'opération
        if (upperQuery.startsWith('SELECT')) {
            return result.rows || [];
        } else if (hasWriteKeyword) {
            return {
                rowCount: result.rowCount,
                success: true
            };
        } else {
            return result.rows || [];
        }

    } catch (error) {
        console.error('[SQL_QUERY] Error:', error.message);
        throw new Error(`SQL execution failed: ${error.message}`);
    }
}

async function SQL_SELECT(table, columns = '*', whereClause = '', params = []) {
    // Validation des entrées
    if (!table || typeof table !== 'string') {
        throw new Error('Table name is required and must be a string');
    }

    // Construction de la requête
    const columnsStr = Array.isArray(columns) ? columns.join(', ') : columns;
    let query = `SELECT ${columnsStr} FROM ${table}`;

    if (whereClause) {
        query += ` WHERE ${whereClause}`;
    }

    return await SQL_QUERY(query, params);
}

async function SQL_COUNT(table, whereClause = '', params = []) {
    if (!table || typeof table !== 'string') {
        throw new Error('Table name is required and must be a string');
    }

    let query = `SELECT COUNT(*) as count FROM ${table}`;

    if (whereClause) {
        query += ` WHERE ${whereClause}`;
    }

    const result = await SQL_QUERY(query, params);
    return result.length > 0 ? parseInt(result[0].count) : 0;
}

async function SQL_EXISTS(table, whereClause, params = []) {
    if (!table || !whereClause) {
        throw new Error('Table name and where clause are required');
    }

    const query = `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${whereClause}) as exists`;
    const result = await SQL_QUERY(query, params);
    return result.length > 0 ? result[0].exists : false;
}

async function SQL_DISTINCT(table, column, whereClause = '', params = []) {
    if (!table || !column) {
        throw new Error('Table name and column are required');
    }

    let query = `SELECT DISTINCT ${column} FROM ${table}`;

    if (whereClause) {
        query += ` WHERE ${whereClause}`;
    }

    query += ` ORDER BY ${column}`;

    return await SQL_QUERY(query, params);
}

// Fonction utilitaire pour construire des clauses WHERE sécurisées
function BUILD_WHERE(conditions) {
    if (!Array.isArray(conditions) || conditions.length === 0) {
        return '';
    }

    const clauses = conditions.map(condition => {
        if (typeof condition === 'object' && condition.field && condition.operator && condition.value !== undefined) {
            // Format: {field: 'entity', operator: '=', value: 'US'}
            return `${condition.field} ${condition.operator} '${condition.value}'`;
        } else if (typeof condition === 'string') {
            // Format: "entity = 'US'"
            return condition;
        }
        throw new Error('Invalid WHERE condition format');
    });

    return clauses.join(' AND ');
}

// Fonction de test de connexion
async function SQL_TEST_CONNECTION() {
    if (!_dbConnection) {
        return { success: false, error: 'No database connection configured' };
    }

    try {
        const result = await SQL_QUERY('SELECT 1 as test');
        return {
            success: true,
            message: 'Database connection successful',
            testResult: result
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * STRUCTURES DE DONNÉES NATIVES
 */
function CREATE_SET() {
    return new Set();
}

function SET_ADD(set, item) {
    if (!(set instanceof Set)) {
        throw new Error('First argument must be a Set');
    }
    set.add(item);
    return set; // Pour chaînage
}

function SET_HAS(set, item) {
    if (!(set instanceof Set)) {
        return false;
    }
    return set.has(item);
}

function SET_SIZE(set) {
    if (!(set instanceof Set)) {
        return 0;
    }
    return set.size;
}

function CREATE_MAP() {
    return new Map();
}

function MAP_SET(map, key, value) {
    if (!(map instanceof Map)) {
        throw new Error('First argument must be a Map');
    }
    map.set(key, value);
    return map; // Pour chaînage
}

function MAP_GET(map, key) {
    if (!(map instanceof Map)) {
        return null;
    }
    return map.get(key) || null;
}

function MAP_HAS(map, key) {
    if (!(map instanceof Map)) {
        return false;
    }
    return map.has(key);
}

function MAP_KEYS(map) {
    if (!(map instanceof Map)) {
        return [];
    }
    return Array.from(map.keys());
}

/**
 * UTILITAIRES POUR BOUCLES (en attendant FOREACH natif)
 */
function ARRAY_EACH(array, callback) {
    // Note: Cette fonction nécessiterait un support spécial dans l'interpréteur
    // pour passer des fonctions comme callbacks. Pour l'instant, on peut simuler.
    if (!Array.isArray(array)) {
        return [];
    }
    
    const results = [];
    for (let i = 0; i < array.length; i++) {
        // Dans un vrai DSL, callback serait exécuté avec l'interpréteur
        results.push({ index: i, item: array[i] });
    }
    return results;
}

/**
 * UTILITAIRES RECURSION
 */
function IS_VALID_ID(id) {
    return id !== null && id !== undefined && id !== '';
}


// Export de toutes les fonctions
module.exports = {
    // Mathématiques
    ABS, ROUND, FLOOR, CEIL, MAX, MIN, SUM, AVG,
    POWER, SQRT, LOG, EXP,

    // Conditionnelles
    IF, IIF, CASE, SWITCH,

    // Logiques
    AND, OR, NOT, XOR,

    // Comparaisons
    EQUAL, GREATER, LESS, GREATER_EQUAL, LESS_EQUAL,

    // Chaînes
    CONCAT, LEFT, RIGHT, MID, UPPER, LOWER, TRIM, LENGTH,
    REPLACE, FIND,

    // Validation
    ISNULL, ISNOTNULL, ISEMPTY, ISNOTEMPTY, ISNUMBER, ISSTRING, ISBOOLEAN,

    // Financières
    PV, FV, PMT, NPV, IRR,

    // Dates
    TODAY, NOW, YEAR, MONTH, DAY, DATEVALUE, DATEDIFF,

    // Utilitaires
    PRINT, DEBUG, ERROR, WARNING, TRACE,

    // Conversion
    TONUMBER, TOSTRING, TOBOOLEAN,

    // Formatage
    FORMAT, PERCENTAGE, VARIANCE, VARIANCE_PERCENT,

    // Arrays génériques
    ARRAY_LENGTH, GET_AT, IS_ARRAY,

    // Objets génériques  
    GET_PROP, HAS_PROP, IS_OBJECT,
    
    // Recherche générique
    FIND_IN_ARRAY, COUNT_IN_ARRAY, FILTER_ARRAY,

    // Configuration DB
    SET_DB_CONNECTION, GET_DB_CONNECTION,

    // Requêtes SQL
    SQL_QUERY, SQL_SELECT, SQL_COUNT, SQL_EXISTS, SQL_DISTINCT,

    // Utilitaires SQL
    BUILD_WHERE, SQL_TEST_CONNECTION,

    // Structures de données
    CREATE_SET, SET_ADD, SET_HAS, SET_SIZE, CREATE_MAP, MAP_SET, MAP_GET, MAP_HAS, MAP_KEYS,
    
    // Utilitaires
    ARRAY_EACH, IS_VALID_ID,
};