/**
 * Enhanced interpreter avec nouveau style DSL
 * SET var = expr; CALL func(args); LOG message; EXPORT var;
 */

const { EventEmitter } = require('events');
const dslFunctions = require('./dsl-functions');

class RuntimeError extends Error {
    constructor(message, node, context) {
        super(message);
        this.name = 'RuntimeError';
        this.node = node;
        this.context = context;
    }
}

class UserDefinedFunction {
    constructor(name, parameters, body) {
        this.name = name;
        this.parameters = parameters;
        this.body = body;
    }
}

class ExecutionContext {
    constructor(variables = {}, parent = null) {
        this.variables = new Map(Object.entries(variables));
        this.parent = parent;
        this.functions = new Map();
        this.userDefinedFunctions = new Map();
        this.constants = new Map();
        this.metadata = {
            startTime: Date.now(),
            callStack: [],
            executionDepth: 0
        };
        this.calculatedVariables = new Map();
        this.returnValue = null;
        this.shouldReturn = false;
        this.exports = new Map(); // Variables exportées pour l'API
        this.logs = []; // Messages de log

        this._loadDSLFunctions();
    }

    setVariable(name, value) {
        this.variables.set(name, value);
        this.calculatedVariables.set(name, value);
    }

    getVariable(name) {
        if (this.variables.has(name)) {
            return this.variables.get(name);
        }
        if (this.parent) {
            return this.parent.getVariable(name);
        }
        throw new RuntimeError(`Variable non définie: ${name}`);
    }

    hasVariable(name) {
        return this.variables.has(name) || (this.parent && this.parent.hasVariable(name));
    }

    setFunction(name, func) {
        this.functions.set(name, func);
    }

    getFunction(name) {
        if (this.functions.has(name)) {
            return this.functions.get(name);
        }
        if (this.parent) {
            return this.parent.getFunction(name);
        }
        throw new RuntimeError(`Fonction non définie: ${name}`);
    }

    setUserDefinedFunction(name, func) {
        this.userDefinedFunctions.set(name, func);
    }

    getUserDefinedFunction(name) {
        if (this.userDefinedFunctions.has(name)) {
            return this.userDefinedFunctions.get(name);
        }
        if (this.parent) {
            return this.parent.getUserDefinedFunction(name);
        }
        throw new RuntimeError(`Fonction utilisateur non définie: ${name}`);
    }

    hasUserDefinedFunction(name) {
        return this.userDefinedFunctions.has(name) || (this.parent && this.parent.hasUserDefinedFunction(name));
    }

    // Nouveau : gestion des exports
    exportVariable(name) {
        if (!this.hasVariable(name)) {
            throw new RuntimeError(`Variable à exporter non définie: ${name}`);
        }
        const value = this.getVariable(name);
        this.exports.set(name, value);
    }

    // Nouveau : gestion des logs
    addLog(message) {
        this.logs.push({
            timestamp: new Date().toISOString(),
            message: message
        });
    }

    createChild(variables = {}) {
        const child = new ExecutionContext(variables, this);
        return child;
    }

    _loadDSLFunctions() {
        for (const [name, func] of Object.entries(dslFunctions)) {
            this.setFunction(name, func);
        }
    }

    pushCall(functionName, args) {
        this.metadata.callStack.push({ functionName, args, timestamp: Date.now() });
        this.metadata.executionDepth++;
    }

    popCall() {
        this.metadata.callStack.pop();
        this.metadata.executionDepth--;
    }

    clone() {
        const newContext = new ExecutionContext({}, this.parent);
        newContext.variables = new Map(this.variables);
        newContext.functions = new Map(this.functions);
        newContext.userDefinedFunctions = new Map(this.userDefinedFunctions);
        newContext.constants = new Map(this.constants);
        newContext.calculatedVariables = new Map(this.calculatedVariables);
        newContext.exports = new Map(this.exports);
        newContext.logs = [...this.logs];
        return newContext;
    }

    setReturnValue(value) {
        this.returnValue = value;
        this.shouldReturn = true;
    }

    clearReturn() {
        this.returnValue = null;
        this.shouldReturn = false;
    }
}

class DSLInterpreter extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = {
            maxExecutionTime: 30000,
            maxCallStackDepth: 1000,
            strictMode: false,
            enableTracing: false,
            enableProfiling: false,
            enableDependencyResolution: true,
            continueOnError: false,
            ...options
        };

        this.dataStore = null;
        this.hierarchyManager = null;
        this.periodUtils = null;
        this.formatter = null;
        this.conversionTable = null;

        this.stats = {
            totalExecutions: 0,
            totalTime: 0,
            functionCalls: new Map(),
            errors: 0
        };

        this.profiler = {
            enabled: this.options.enableProfiling,
            data: new Map()
        };
    }

    configure(services) {
        this.dataStore = services.dataStore;
        this.hierarchyManager = services.hierarchyManager;
        this.periodUtils = services.periodUtils;
        this.formatter = services.formatter;
        this.conversionTable = services.conversionTable;
        return this;
    }

    async execute(parseResult, context = {}) {
        const startTime = Date.now();
        const executionContext = new ExecutionContext(context);
        
        this.currentContext = executionContext;
        this._injectServices(executionContext);

        try {
            this.emit('execution:start', { parseResult, context });

            const timeoutId = setTimeout(() => {
                throw new RuntimeError('Timeout d\'exécution dépassé');
            }, this.options.maxExecutionTime);

            const result = await this._executeProgram(parseResult.ast, executionContext);

            clearTimeout(timeoutId);

            const executionTime = Date.now() - startTime;
            this.stats.totalExecutions++;
            this.stats.totalTime += executionTime;

            this.emit('execution:complete', { result, executionTime });

            return {
                success: true,
                result,
                executionTime,
                context: executionContext,
                exports: Object.fromEntries(executionContext.exports), // Variables exportées
                logs: executionContext.logs, // Messages de log
                metadata: {
                    statementCount: parseResult.ast.statements.length,
                    callStack: executionContext.metadata.callStack,
                    profiling: this.profiler.enabled ? this.profiler.data : null
                }
            };

        } catch (error) {
            this.stats.errors++;
            this.emit('execution:error', { error, context: executionContext });

            if (this.options.continueOnError) {
                console.warn(`Warning: ${error.message}`);
                return {
                    success: true,
                    result: [],
                    executionTime: Date.now() - startTime,
                    context: executionContext,
                    exports: Object.fromEntries(executionContext.exports),
                    logs: executionContext.logs,
                    warnings: [error.message]
                };
            }

            return {
                success: false,
                error: error.message,
                executionTime: Date.now() - startTime,
                context: executionContext,
                exports: Object.fromEntries(executionContext.exports),
                logs: executionContext.logs,
                stack: error.stack
            };
        }
    }

    async _executeProgram(ast, context) {
        if (!ast || ast.type !== 'Program') {
            throw new RuntimeError('AST invalide: type Program attendu');
        }

        const results = [];

        // First pass: collect all function definitions
        for (const statement of ast.statements) {
            if (statement.type === 'FunctionDefinition') {
                const func = new UserDefinedFunction(
                    statement.name,
                    statement.parameters,
                    statement.body
                );
                context.setUserDefinedFunction(statement.name, func);
                
                if (this.options.enableTracing) {
                    console.log(`📝 Fonction définie: ${statement.name}(${statement.parameters.join(', ')})`);
                }
            }
        }

        // Second pass: execute non-function statements
        for (const statement of ast.statements) {
            if (statement.type !== 'FunctionDefinition') {
                try {
                    const result = await this._executeStatement(statement, context);
                    if (result !== null && result !== undefined) {
                        results.push(result);
                    }
                } catch (error) {
                    if (this.options.continueOnError) {
                        console.warn(`⚠️  Erreur dans statement: ${error.message}`);
                        continue;
                    } else {
                        throw error;
                    }
                }
            }
        }

        return results;
    }

    async _executeStatement(statement, context) {
        if (!statement) {
            return null;
        }

        if (this.options.enableTracing) {
            console.log(`🔄 Exécution statement: ${statement.type}`);
        }

        switch (statement.type) {
            case 'FunctionDefinition':
                // Already handled in first pass
                return null;

            case 'SetStatement':
                return await this._executeSetStatement(statement, context);

            case 'CallStatement':
                return await this._executeCallStatement(statement, context);

            case 'LogStatement':
                return await this._executeLogStatement(statement, context);

            case 'ExportStatement':
                return await this._executeExportStatement(statement, context);

            case 'ExpressionStatement':
                return await this._evaluateExpression(statement.expression, context);

            case 'ReturnStatement':
                const value = await this._evaluateExpression(statement.expression, context);
                context.setReturnValue(value);
                return value;

            case 'BlockStatement':
                return await this._executeBlock(statement, context);

            default:
                throw new RuntimeError(`Type de statement non supporté: ${statement.type}`);
        }
    }

    async _executeSetStatement(statement, context) {
        const value = await this._evaluateExpression(statement.expression, context);
        context.setVariable(statement.name, value);
        
        if (this.options.enableTracing) {
            console.log(`📦 SET ${statement.name} = ${typeof value === 'object' ? JSON.stringify(value).substring(0, 100) + '...' : value}`);
        }
        
        return value;
    }

    async _executeCallStatement(statement, context) {
        const functionName = statement.name;
        const args = [];

        // Evaluate arguments
        for (const arg of statement.arguments) {
            args.push(await this._evaluateExpression(arg, context));
        }

        if (this.options.enableTracing) {
            console.log(`📞 CALL ${functionName}(${args.map(a => typeof a === 'object' ? '[Object]' : a).join(', ')})`);
        }

        // Check if it's a user-defined function
        if (context.hasUserDefinedFunction(functionName)) {
            return await this._callUserDefinedFunction(functionName, args, context);
        }

        // Check if it's a built-in function
        if (context.functions.has(functionName)) {
            const func = context.getFunction(functionName);
            context.pushCall(functionName, args);

            try {
                const result = await func.apply(context, args);
                context.popCall();
                return result;
            } catch (error) {
                context.popCall();
                throw new RuntimeError(`Erreur dans la fonction ${functionName}: ${error.message}`);
            }
        }

        throw new RuntimeError(`Fonction non trouvée: ${functionName}`);
    }

    async _executeLogStatement(statement, context) {
        const message = await this._evaluateExpression(statement.expression, context);
        const logMessage = String(message);
        
        context.addLog(logMessage);
        
        if (this.options.enableTracing) {
            console.log(`📝 LOG: ${logMessage}`);
        }
        
        return logMessage;
    }

    async _executeExportStatement(statement, context) {
        context.exportVariable(statement.name);
        
        if (this.options.enableTracing) {
            console.log(`📤 EXPORT ${statement.name}`);
        }
        
        return context.getVariable(statement.name);
    }

    async _executeBlock(statement, context) {
        let lastResult = null;

        for (const stmt of statement.statements) {
            if (context.shouldReturn) {
                break;
            }

            const result = await this._executeStatement(stmt, context);
            if (result !== null && result !== undefined) {
                lastResult = result;
            }
        }

        return context.shouldReturn ? context.returnValue : lastResult;
    }

    async _callUserDefinedFunction(functionName, args, context) {
        const func = context.getUserDefinedFunction(functionName);

        if (args.length !== func.parameters.length) {
            throw new RuntimeError(
                `Nombre d'arguments incorrect pour ${functionName}. Attendu: ${func.parameters.length}, reçu: ${args.length}`
            );
        }

        if (context.metadata.executionDepth >= this.options.maxCallStackDepth) {
            throw new RuntimeError(`Profondeur de récursion maximale atteinte (${this.options.maxCallStackDepth}) dans ${functionName}`);
        }

        const callStack = context.metadata.callStack;
        const sameFunction = callStack.filter(call => call.functionName === functionName);
        if (sameFunction.length >= 10) {
            throw new RuntimeError(`Récursion excessive détectée dans ${functionName} (${sameFunction.length} appels)`);
        }

        if (this.options.enableTracing) {
            console.log(`🎯 Exécution fonction utilisateur: ${functionName}(${args.join(', ')}) [depth: ${context.metadata.executionDepth}]`);
        }

        const functionContext = context.createChild();

        // Bind parameters to arguments
        for (let i = 0; i < func.parameters.length; i++) {
            functionContext.setVariable(func.parameters[i], args[i]);
        }

        context.pushCall(functionName, args);

        try {
            const result = await this._executeBlock(func.body, functionContext);
            context.popCall();
            
            if (this.options.enableTracing) {
                console.log(`✅ Fonction ${functionName} retourne: ${result} [depth: ${context.metadata.executionDepth}]`);
            }
            
            return result;
        } catch (error) {
            context.popCall();
            
            if (error.message.includes('récursion') || error.message.includes('call stack') || error.message.includes('Maximum call stack')) {
                throw error;
            }
            
            throw new RuntimeError(`Erreur dans la fonction utilisateur ${functionName}: ${error.message}`);
        }
    }

    async _evaluateExpression(expr, context) {
        if (!expr) {
            return null;
        }

        switch (expr.type) {
            case 'NumberLiteral':
                return parseFloat(expr.value);
            case 'StringLiteral':
                return expr.value;
            case 'BooleanLiteral':
                return expr.value;
            case 'NullLiteral':
                return null;
            case 'Variable':
                return context.getVariable(expr.name);
            case 'BinaryExpression':
                return await this._evaluateBinaryExpression(expr, context);
            case 'UnaryExpression':
                return await this._evaluateUnaryExpression(expr, context);
            case 'FunctionCall':
                return await this._evaluateFunctionCall(expr, context);
            case 'ConditionalExpression':
                return await this._evaluateConditionalExpression(expr, context);
            case 'ArrayExpression':
                return await this._evaluateArrayExpression(expr, context);
            case 'MemberExpression':
                return await this._evaluateMemberExpression(expr, context);
            default:
                throw new RuntimeError(`Type d'expression non supporté: ${expr.type}`);
        }
    }

    async _evaluateBinaryExpression(expr, context) {
        const left = await this._evaluateExpression(expr.left, context);
        const right = await this._evaluateExpression(expr.right, context);

        switch (expr.operator) {
            case '+': return left + right;
            case '-': return left - right;
            case '*': return left * right;
            case '/': return right !== 0 ? left / right : 0;
            case '%': return left % right;
            case '^': return Math.pow(left, right);

            // Comparators
            case '==': return left === right;
            case '!=': return left !== right;
            case '<': return left < right;
            case '<=': return left <= right;
            case '>': return left > right;
            case '>=': return left >= right;

            // Logical
            case 'AND':
            case '&&': return Boolean(left) && Boolean(right);
            case 'OR':
            case '||': return Boolean(left) || Boolean(right);

            default:
                throw new RuntimeError(`Opérateur binaire non supporté: ${expr.operator}`);
        }
    }

    async _evaluateUnaryExpression(expr, context) {
        const operand = await this._evaluateExpression(expr.operand, context);

        switch (expr.operator) {
            case '+': return +operand;
            case '-': return -operand;
            case '!': return !operand;
            case '~': return ~operand;
            default:
                throw new RuntimeError(`Opérateur unaire non supporté: ${expr.operator}`);
        }
    }

    async _evaluateFunctionCall(expr, context) {
        const func = context.getFunction(expr.name);
        const args = [];

        for (const arg of expr.arguments) {
            args.push(await this._evaluateExpression(arg, context));
        }

        const callCount = this.stats.functionCalls.get(expr.name) || 0;
        this.stats.functionCalls.set(expr.name, callCount + 1);

        context.pushCall(expr.name, args);

        try {
            const result = await func.apply(context, args);
            context.popCall();
            return result;
        } catch (error) {
            context.popCall();
            throw new RuntimeError(`Erreur dans la fonction ${expr.name}: ${error.message}`);
        }
    }

    async _evaluateConditionalExpression(expr, context) {
        const condition = await this._evaluateExpression(expr.condition, context);

        if (condition) {
            return await this._evaluateExpression(expr.consequent, context);
        } else {
            return await this._evaluateExpression(expr.alternate, context);
        }
    }

    async _evaluateArrayExpression(expr, context) {
        const elements = [];
        for (const element of expr.elements) {
            elements.push(await this._evaluateExpression(element, context));
        }
        return elements;
    }

    async _evaluateMemberExpression(expr, context) {
        const object = await this._evaluateExpression(expr.object, context);
        const property = expr.computed
            ? await this._evaluateExpression(expr.property, context)
            : expr.property.name;

        return object[property];
    }

    // Service injection methods
    _injectServices(context) {
        context.setVariable('$dataStore', this.dataStore);
        context.setVariable('$hierarchyManager', this.hierarchyManager);
        context.setVariable('$periodUtils', this.periodUtils);
        context.setVariable('$formatter', this.formatter);
        context.setVariable('$conversionTable', this.conversionTable);

        context.setFunction('GET_DATA', this._createGetDataFunction());
        context.setFunction('SET_DATA', this._createSetDataFunction());
        context.setFunction('GET_HIERARCHY', this._createGetHierarchyFunction());
        context.setFunction('FORMAT_VALUE', this._createFormatValueFunction());
    }

    _createGetDataFunction() {
        return (entity, period, scenario, version) => {
            if (!this.dataStore) {
                throw new RuntimeError('DataStore non configuré');
            }
            return this.dataStore.getData(entity, period, scenario, version);
        };
    }

    _createSetDataFunction() {
        return (entity, period, scenario, version, value) => {
            if (!this.dataStore) {
                throw new RuntimeError('DataStore non configuré');
            }
            return this.dataStore.setData(entity, period, scenario, version, value);
        };
    }

    _createGetHierarchyFunction() {
        return (dimension, member) => {
            if (!this.hierarchyManager) {
                throw new RuntimeError('HierarchyManager non configuré');
            }
            return this.hierarchyManager.getHierarchy(dimension, member);
        };
    }

    _createFormatValueFunction() {
        return (value, format) => {
            if (!this.formatter) {
                throw new RuntimeError('Formatter non configuré');
            }
            return this.formatter.format(value, format);
        };
    }

    // Stats methods
    getStats() {
        return {
            totalExecutions: this.stats.totalExecutions,
            totalTime: this.stats.totalTime,
            averageExecutionTime: this.stats.totalExecutions > 0 ? this.stats.totalTime / this.stats.totalExecutions : 0,
            errors: this.stats.errors,
            functionCalls: Array.from(this.stats.functionCalls.entries()).map(([name, count]) => ({ name, count })),
            successRate: this.stats.totalExecutions > 0 ? ((this.stats.totalExecutions - this.stats.errors) / this.stats.totalExecutions) * 100 : 0
        };
    }

    resetStats() {
        this.stats = {
            totalExecutions: 0,
            totalTime: 0,
            functionCalls: new Map(),
            errors: 0
        };
    }

    setProfilingEnabled(enabled) {
        this.profiler.enabled = enabled;
        if (!enabled) {
            this.profiler.data.clear();
        }
    }
}

module.exports = {
    DSLInterpreter,
    RuntimeError,
    ExecutionContext,
    UserDefinedFunction
};