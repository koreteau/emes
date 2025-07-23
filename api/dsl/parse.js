/**
 * Module de parsing pour le DSL HFM
 * Fournit une interface haut niveau pour parser les règles
 */

const fs = require('fs');
const path = require('path');

// Import du parser généré
let parser;
try {
    parser = require('./parser.js');
} catch (error) {
    console.error('❌ Parser non trouvé. Exécutez: node build-parser.js');
    process.exit(1);
}

/**
 * Classe pour gérer les erreurs de parsing
 */
class ParseError extends Error {
    constructor(message, location, source) {
        super(message);
        this.name = 'ParseError';
        this.location = location;
        this.source = source;
    }

    toString() {
        if (this.location) {
            return `${this.name} at line ${this.location.line}, column ${this.location.column}: ${this.message}`;
        }
        return `${this.name}: ${this.message}`;
    }
}

/**
 * Classe principale pour le parsing
 */
class DSLParser {
    constructor(options = {}) {
        this.options = {
            strict: false,
            validateSyntax: true,
            includeComments: false,
            includeLocations: false,
            ...options
        };

        this.cache = new Map();
        this.stats = {
            totalParsed: 0,
            cacheHits: 0,
            errors: 0
        };
    }

    /**
     * Parse une chaîne de caractères contenant des règles DSL
     */
    parse(input, options = {}) {
        const opts = { ...this.options, ...options };

        // Vérification du cache
        const cacheKey = this._getCacheKey(input, opts);
        if (this.cache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.cache.get(cacheKey);
        }

        try {
            // Préprocessing
            const preprocessed = this._preprocess(input, opts);

            // Parsing
            const ast = parser.parse(preprocessed, {
                startRule: 'Start',
                tracer: opts.trace ? this._createTracer() : null
            });

            // Post-processing
            const result = this._postprocess(ast, opts);

            // Mise en cache
            this.cache.set(cacheKey, result);
            this.stats.totalParsed++;

            return result;

        } catch (error) {
            this.stats.errors++;
            throw this._enhanceError(error, input, opts);
        }
    }

    /**
     * Parse un fichier contenant des règles DSL
     */
    parseFile(filePath, options = {}) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const result = this.parse(content, options);

            // Ajouter des métadonnées sur le fichier
            result.metadata = {
                ...result.metadata,
                filePath: path.resolve(filePath),
                fileName: path.basename(filePath),
                lastModified: fs.statSync(filePath).mtime
            };

            return result;

        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new ParseError(`Fichier non trouvé: ${filePath}`);
            }
            throw error;
        }
    }

    /**
     * Parse plusieurs fichiers
     */
    parseFiles(filePaths, options = {}) {
        const results = [];
        const errors = [];

        for (const filePath of filePaths) {
            try {
                const result = this.parseFile(filePath, options);
                results.push(result);
            } catch (error) {
                errors.push({ filePath, error });
            }
        }

        return {
            results,
            errors,
            summary: {
                total: filePaths.length,
                success: results.length,
                failed: errors.length
            }
        };
    }

    /**
     * Valide la syntaxe sans construire l'AST complet
     */
    validate(input, options = {}) {
        try {
            this.parse(input, { ...options, validateOnly: true });
            return { valid: true, errors: [] };
        } catch (error) {
            return {
                valid: false,
                errors: [error],
                message: error.message
            };
        }
    }

    /**
     * Analyse statique du code
     */
    analyze(input, options = {}) {
        const parseResult = this.parse(input, options);
        const ast = parseResult.ast;

        const analysis = {
            functions: [],
            calls: [],
            variables: new Set(),
            dependencies: new Map(),
            complexity: 0,
            metrics: {
                totalFunctions: 0,
                totalCalls: 0,
                totalVariables: 0,
                avgComplexity: 0,
                maxDepth: 0
            }
        };

        this._analyzeNode(ast, analysis);
        this._computeMetrics(analysis);

        return analysis;
    }

    /**
     * Formate le code DSL
     */
    format(input, options = {}) {
        const parseResult = this.parse(input, options);
        return this._formatAST(parseResult.ast, options);
    }

    /**
     * Obtient les statistiques du parser
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            hitRate: this.stats.totalParsed > 0 ? this.stats.cacheHits / this.stats.totalParsed * 100 : 0
        };
    }

    /**
     * Efface le cache
     */
    clearCache() {
        this.cache.clear();
    }

    // ===== MÉTHODES PRIVÉES =====

    _preprocess(input, options) {
        let processed = input;

        // Normaliser les fins de ligne
        processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Supprimer les commentaires si demandé
        if (!options.includeComments) {
            processed = processed.replace(/\/\/.*$/gm, '');
            processed = processed.replace(/\/\*[\s\S]*?\*\//g, '');
        }

        // Nettoyer les espaces en trop (mais pas trop agressivement)
        processed = processed.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();

        return processed;
    }

    _postprocess(ast, options) {
        // Enrichir l'AST avec des métadonnées
        const result = {
            type: 'ParseResult',
            ast,
            metadata: {
                parseTime: Date.now(),
                options: options,
                statementCount: this._countStatements(ast),
                functionCount: this._countFunctions(ast),
                version: '1.0.0'
            }
        };

        // Ajouter les locations si demandé
        if (options.includeLocations) {
            this._addLocations(result.ast);
        }

        // Validation post-parsing
        if (options.validateSyntax) {
            this._validateAST(result.ast);
        }

        return result;
    }

    _enhanceError(error, input, options) {
        if (error.location) {
            const lines = input.split('\n');
            const line = lines[error.location.start.line - 1];
            const pointer = ' '.repeat(error.location.start.column - 1) + '^';

            const enhancedMessage = `${error.message}\n\n` +
                `${error.location.start.line}: ${line}\n` +
                `${' '.repeat(error.location.start.line.toString().length + 2)}${pointer}`;

            return new ParseError(enhancedMessage, error.location, input);
        }

        return new ParseError(error.message, null, input);
    }

    _getCacheKey(input, options) {
        const optionsKey = JSON.stringify(options);
        return `${input.length}:${optionsKey}:${this._hash(input)}`;
    }

    _hash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash;
    }

    _createTracer() {
        return {
            trace: (event) => {
                console.log(`[TRACE] ${event.type}: ${event.rule} at ${event.location.line}:${event.location.column}`);
            }
        };
    }

    _countStatements(ast) {
        if (!ast || !ast.statements) return 0;
        return ast.statements.length;
    }

    _countFunctions(ast) {
        if (!ast || !ast.statements) return 0;
        return ast.statements.filter(stmt => stmt.type === 'FunctionDefinition').length;
    }

    _traverseAST(node, callback) {
        if (!node || typeof node !== 'object') return;

        callback(node);

        for (const key in node) {
            if (node.hasOwnProperty(key)) {
                const value = node[key];
                if (Array.isArray(value)) {
                    value.forEach(item => this._traverseAST(item, callback));
                } else if (typeof value === 'object') {
                    this._traverseAST(value, callback);
                }
            }
        }
    }

    _analyzeNode(node, analysis) {
        if (!node || typeof node !== 'object') return;

        switch (node.type) {
            case 'FunctionDefinition':
                analysis.functions.push({
                    name: node.name,
                    parameters: node.parameters || [],
                    complexity: this._calculateComplexity(node.body)
                });
                analysis.metrics.totalFunctions++;
                break;

            case 'CallRuleStatement':
            case 'CallRuleExpression':
                analysis.calls.push({
                    name: node.name,
                    arguments: node.arguments || []
                });
                analysis.metrics.totalCalls++;
                break;

            case 'FunctionCall':
                analysis.calls.push({
                    name: node.name,
                    arguments: node.arguments || []
                });
                analysis.metrics.totalCalls++;
                break;

            case 'Variable':
                analysis.variables.add(node.name);
                analysis.metrics.totalVariables++;
                break;
        }

        // Récursion sur les enfants
        for (const key in node) {
            if (node.hasOwnProperty(key)) {
                const value = node[key];
                if (Array.isArray(value)) {
                    value.forEach(item => this._analyzeNode(item, analysis));
                } else if (typeof value === 'object') {
                    this._analyzeNode(value, analysis);
                }
            }
        }
    }

    _calculateComplexity(node) {
        if (!node) return 0;

        let complexity = 0;

        switch (node.type) {
            case 'ConditionalExpression':
            case 'BinaryExpression':
                complexity += 1;
                break;
            case 'FunctionCall':
            case 'CallRuleExpression':
                complexity += node.name === 'IF' ? 1 : 0;
                break;
        }

        // Récursion sur les enfants
        for (const key in node) {
            if (node.hasOwnProperty(key)) {
                const value = node[key];
                if (Array.isArray(value)) {
                    complexity += value.reduce((sum, item) => sum + this._calculateComplexity(item), 0);
                } else if (typeof value === 'object') {
                    complexity += this._calculateComplexity(value);
                }
            }
        }

        return complexity;
    }

    _computeMetrics(analysis) {
        analysis.metrics.avgComplexity = analysis.functions.length > 0
            ? analysis.functions.reduce((sum, func) => sum + func.complexity, 0) / analysis.functions.length
            : 0;
    }

    _validateAST(ast) {
        // Validation basique de l'AST pour la nouvelle structure
        if (!ast || ast.type !== 'Program') {
            throw new ParseError('AST invalide: type Program attendu');
        }

        if (!Array.isArray(ast.statements)) {
            throw new ParseError('AST invalide: propriété statements attendue');
        }

        // Validation des types de statements
        for (const statement of ast.statements) {
            if (!statement || !statement.type) {
                throw new ParseError('AST invalide: statement sans type');
            }

            const validTypes = [
                'FunctionDefinition',
                'CallRuleStatement', 
                'ExpressionStatement',
                'ReturnStatement',
                'BlockStatement'
            ];

            if (!validTypes.includes(statement.type)) {
                throw new ParseError(`AST invalide: type de statement non supporté: ${statement.type}`);
            }
        }
    }

    _formatAST(ast, options) {
        // Formateur pour la nouvelle syntaxe RULE...ENDRULE
        const indent = options.indent || '  ';
        let result = '';

        if (!ast || !ast.statements) {
            return result;
        }

        for (const statement of ast.statements) {
            switch (statement.type) {
                case 'FunctionDefinition':
                    result += this._formatFunctionDefinition(statement, indent) + '\n\n';
                    break;
                case 'CallRuleStatement':
                    result += this._formatCallRuleStatement(statement, indent) + '\n';
                    break;
                case 'ExpressionStatement':
                    result += this._formatExpression(statement.expression, indent) + ';\n';
                    break;
                default:
                    result += `// Unsupported statement type: ${statement.type}\n`;
            }
        }

        return result.trim();
    }

    _formatFunctionDefinition(func, indent) {
        const params = func.parameters ? func.parameters.join(', ') : '';
        let result = `RULE ${func.name}(${params})\n`;
        
        if (func.body && func.body.statements) {
            for (const stmt of func.body.statements) {
                result += indent + this._formatStatement(stmt, indent) + '\n';
            }
        }
        
        result += 'ENDRULE';
        return result;
    }

    _formatCallRuleStatement(call, indent) {
        const args = call.arguments ? call.arguments.map(arg => this._formatExpression(arg, indent)).join(', ') : '';
        return `CALLRULE ${call.name}(${args});`;
    }

    _formatStatement(stmt, indent) {
        switch (stmt.type) {
            case 'ReturnStatement':
                return `RETURN ${this._formatExpression(stmt.expression, indent)};`;
            case 'ExpressionStatement':
                return this._formatExpression(stmt.expression, indent) + ';';
            default:
                return `// Unsupported statement: ${stmt.type}`;
        }
    }

    _formatExpression(expr, indent) {
        if (!expr) return '';

        switch (expr.type) {
            case 'FunctionCall':
                const args = expr.arguments ? expr.arguments.map(arg => this._formatExpression(arg, indent)).join(', ') : '';
                return `${expr.name}(${args})`;

            case 'CallRuleExpression':
                const callArgs = expr.arguments ? expr.arguments.map(arg => this._formatExpression(arg, indent)).join(', ') : '';
                return `CALLRULE ${expr.name}(${callArgs})`;

            case 'BinaryExpression':
                return `${this._formatExpression(expr.left, indent)} ${expr.operator} ${this._formatExpression(expr.right, indent)}`;

            case 'UnaryExpression':
                return `${expr.operator}${this._formatExpression(expr.operand, indent)}`;

            case 'ConditionalExpression':
                return `IF(${this._formatExpression(expr.condition, indent)}, ${this._formatExpression(expr.consequent, indent)}, ${this._formatExpression(expr.alternate, indent)})`;

            case 'Variable':
                return expr.name;

            case 'NumberLiteral':
                return expr.value.toString();

            case 'StringLiteral':
                return `"${expr.value}"`;

            case 'BooleanLiteral':
                return expr.value ? 'TRUE' : 'FALSE';

            case 'NullLiteral':
                return 'NULL';

            case 'ArrayExpression':
                const elements = expr.elements ? expr.elements.map(el => this._formatExpression(el, indent)).join(', ') : '';
                return `[${elements}]`;

            default:
                return JSON.stringify(expr);
        }
    }

    _addLocations(node, parent = null) {
        // Ajouter des informations de localisation (à implémenter selon les besoins)
        if (node && typeof node === 'object') {
            for (const key in node) {
                if (node.hasOwnProperty(key)) {
                    const value = node[key];
                    if (Array.isArray(value)) {
                        value.forEach(item => this._addLocations(item, node));
                    } else if (typeof value === 'object') {
                        this._addLocations(value, node);
                    }
                }
            }
        }
    }
}

// ===== EXPORTS =====

module.exports = {
    DSLParser,
    ParseError,

    // Fonctions utilitaires
    parse: (input, options) => new DSLParser(options).parse(input),
    parseFile: (filePath, options) => new DSLParser(options).parseFile(filePath),
    validate: (input, options) => new DSLParser(options).validate(input),
    analyze: (input, options) => new DSLParser(options).analyze(input),
    format: (input, options) => new DSLParser(options).format(input)
};