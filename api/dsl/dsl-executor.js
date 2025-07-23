/**
 * Exécuteur DSL avec support base de données
 */

const { DSLInterpreter } = require('./interpreter');
const { DSLParser } = require('./parse');

/**
 * Exécute un fichier DSL avec accès à la base de données
 * @param {string} dslFilePath - Chemin vers le fichier .dsl
 * @param {Object} variables - Variables à injecter dans le DSL
 * @param {Object} dbConnection - Connexion à la base de données PostgreSQL
 * @param {Object} options - Options d'exécution
 * @returns {Promise<Object>} - Résultat de l'exécution
 */
async function executeDSLWithDB(dslFilePath, variables = {}, dbConnection = null, options = {}) {
    try {
        // Créer le parser et l'interpréteur
        const parser = new DSLParser();
        const interpreter = new DSLInterpreter({
            enableTracing: options.debug || false,
            continueOnError: options.continueOnError || false,
            maxExecutionTime: options.timeout || 30000,
            maxCallStackDepth: options.maxDepth || 10
        });

        // Parser le fichier DSL
        console.log(`🔄 Exécution du fichier DSL avec DB: ${dslFilePath}`);
        const parseResult = parser.parseFile(dslFilePath);

        // Afficher les variables injectées si en mode debug
        if (options.debug) {
            console.log('📥 Variables injectées:', Object.keys(variables));
            console.log('💾 DB Connection:', dbConnection ? 'Configured' : 'Not configured');
        }

        // Préparer le contexte avec la connexion DB
        const context = {
            ...variables,
            // Injecter la connexion DB dans le contexte
            $dbConnection: dbConnection
        };

        // Configurer la connexion DB dans les fonctions DSL si disponible
        if (dbConnection) {
            const dslFunctions = require('./dsl-functions');
            if (dslFunctions.SET_DB_CONNECTION) {
                dslFunctions.SET_DB_CONNECTION(dbConnection);
                console.log('✅ Connexion DB configurée pour les fonctions DSL');
            }
        }

        // Exécuter le DSL
        const result = await interpreter.execute(parseResult, context);

        if (result.success) {
            console.log('✅ Exécution DSL avec DB réussie');
            
            // Afficher les résultats
            if (options.showResults !== false) {
                console.log('\n📋 Résultats:');
                result.result.forEach((value, index) => {
                    console.log(`  ${index + 1}: ${typeof value === 'object' ? JSON.stringify(value).substring(0, 100) + '...' : value}`);
                });
            }

            // Afficher les variables calculées
            if (options.showVariables && result.context?.calculatedVariables) {
                console.log('\n📊 Variables calculées:');
                for (const [name, value] of result.context.calculatedVariables) {
                    if (!variables.hasOwnProperty(name) && name !== '$dbConnection') {
                        const displayValue = typeof value === 'object' ? 
                            `[Object avec ${Array.isArray(value) ? value.length + ' éléments' : Object.keys(value).length + ' propriétés'}]` :
                            value;
                        console.log(`  ${name}: ${displayValue}`);
                    }
                }
            }

            return {
                success: true,
                results: result.result,
                variables: result.context?.calculatedVariables,
                executionTime: result.executionTime
            };

        } else {
            console.error('❌ Erreur DSL:', result.error);
            return {
                success: false,
                error: result.error,
                executionTime: result.executionTime
            };
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Fonction wrapper pour compatibilité avec l'ancien executeDSL
async function executeDSL(dslFilePath, variables = {}, options = {}) {
    return await executeDSLWithDB(dslFilePath, variables, null, options);
}

module.exports = { executeDSL, executeDSLWithDB };