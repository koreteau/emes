#!/usr/bin/env node

/**
 * Script pour construire le parser à partir de la grammaire PEG.js
 * Usage: node build-parser.js
 */

const fs = require('fs');
const path = require('path');
const peg = require('pegjs');

// Configuration
const GRAMMAR_FILE = 'dsl.pegjs';
const OUTPUT_FILE = 'parser.js';
const OUTPUT_DIR = 'results';

// Couleurs pour les logs
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function buildParser() {
    try {
        log('cyan', '🚀 Construction du parser DSL HFM...');

        // Vérifier que le fichier de grammaire existe
        const grammarPath = path.join(__dirname, GRAMMAR_FILE);
        if (!fs.existsSync(grammarPath)) {
            throw new Error(`Fichier de grammaire non trouvé: ${grammarPath}`);
        }

        // Lire la grammaire
        log('blue', `📖 Lecture de la grammaire: ${GRAMMAR_FILE}`);
        const grammar = fs.readFileSync(grammarPath, 'utf8');

        // Générer le parser
        log('yellow', '⚙️  Génération du parser...');
        const parser = peg.generate(grammar, {
            output: 'source',
            format: 'commonjs',
            optimize: 'speed',
            cache: true,
            trace: false
        });

        // Créer le répertoire de sortie s'il n'existe pas
        const outputDir = path.join(__dirname, OUTPUT_DIR);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Écrire le parser généré avec un wrapper approprié
        const outputPath = path.join(outputDir, OUTPUT_FILE);
        const parserCode = `// Parser généré automatiquement à partir de ${GRAMMAR_FILE}
// Ne pas modifier ce fichier directement
// Généré le: ${new Date().toISOString()}

${parser}

// Export principal
module.exports = module.exports || {};
if (typeof module.exports === 'function') {
  // Si module.exports est déjà une fonction (le parser), on l'utilise
  module.exports.parse = module.exports;
} else {
  // Sinon, on cherche la fonction parse dans les exports
  if (typeof parse !== 'undefined') {
    module.exports = parse;
    module.exports.parse = parse;
  }
}

// Export de SyntaxError si disponible
if (typeof peg$SyntaxError !== 'undefined') {
  module.exports.SyntaxError = peg$SyntaxError;
}
`;

        fs.writeFileSync(outputPath, parserCode);

        log('green', `✅ Parser généré avec succès: ${outputPath}`);

        // Statistiques
        const stats = fs.statSync(outputPath);
        const sizeKB = Math.round(stats.size / 1024);
        log('magenta', `📊 Taille du parser: ${sizeKB} KB`);

        // Test rapide du parser
        log('blue', '🧪 Test rapide du parser...');
        testParser(outputPath);

    } catch (error) {
        log('red', `❌ Erreur lors de la construction: ${error.message}`);
        process.exit(1);
    }
}

function testParser(parserPath) {
    try {
        // Supprimer le cache pour forcer le rechargement
        delete require.cache[require.resolve(parserPath)];
        
        log('blue', '🔍 Diagnostic du parser généré...');
        
        // Lire le contenu du fichier pour diagnostiquer
        const parserContent = fs.readFileSync(parserPath, 'utf8');
        const hasModuleExports = parserContent.includes('module.exports');
        const hasParseFunction = parserContent.includes('function parse(');
        const hasParseVar = parserContent.includes('parse =');
        
        log('yellow', `  - module.exports présent: ${hasModuleExports}`);
        log('yellow', `  - function parse présent: ${hasParseFunction}`);
        log('yellow', `  - variable parse présent: ${hasParseVar}`);
        
        const parser = require(parserPath);
        
        log('yellow', `  - Type du module importé: ${typeof parser}`);
        log('yellow', `  - Clés disponibles: ${Object.keys(parser)}`);
        
        // Essayer différentes façons d'accéder au parser
        let parseFunction = null;
        if (typeof parser === 'function') {
            parseFunction = parser;
        } else if (typeof parser.parse === 'function') {
            parseFunction = parser.parse;
        } else if (typeof parser.default === 'function') {
            parseFunction = parser.default;
        }
        
        if (!parseFunction) {
            throw new Error('Aucune fonction de parsing trouvée dans le module');
        }
        
        log('green', '✓ Fonction de parsing trouvée');

        // Tests mis à jour pour la nouvelle syntaxe avec parenthèses et ENDRULE
        const testCases = [
            // Tests de définition de fonction
            'RULE SimpleFunction() RETURN 42; ENDRULE',
            'RULE WithParams(x, y) RETURN x + y; ENDRULE',
            'RULE ComplexFunction(a) RETURN ABS(a * -1); ENDRULE',
            'RULE VariableFunction() RETURN @Entity; ENDRULE',
            'RULE ExpressionFunction() RETURN 1 + 2 * 3; ENDRULE',
            'RULE ConditionalFunction(flag) RETURN IF(flag, TRUE, FALSE); ENDRULE',
            'RULE BooleanFunction() RETURN TRUE; ENDRULE',
            'RULE ArrayFunction() RETURN [1, 2, 3]; ENDRULE',
            'RULE StringFunction() RETURN "Hello World"; ENDRULE',
            
            // Tests d'appel de fonction
            'CALLRULE SimpleFunction();',
            'CALLRULE WithParams(5, 10);',
            
            // Tests d'expressions simples
            '42',
            '"Hello"',
            'TRUE',
            '@Entity',
            '1 + 2',
            'ABS(-5)',
            '[1, 2, 3]',
            
            // Tests de programmes complets
            `RULE TestFunction(x) 
                RETURN x * 2; 
             ENDRULE 
             CALLRULE TestFunction(5);`,
             
            `RULE Calculate(a, b) 
                RETURN a + b * 2; 
             ENDRULE 
             RULE Display() 
                RETURN "Result: " + CALLRULE Calculate(10, 5); 
             ENDRULE`
        ];

        let passedTests = 0;

        testCases.forEach((testCase, index) => {
            try {
                const ast = parseFunction(testCase);
                if (ast && ast.type === 'Program') {
                    passedTests++;
                    log('green', `  ✓ Test ${index + 1}: OK`);
                    // Afficher un aperçu de l'AST pour les tests importants
                    if (index < 5) {
                        log('blue', `    AST: ${JSON.stringify(ast, null, 2).substring(0, 200)}...`);
                    }
                } else {
                    log('red', `  ✗ Test ${index + 1}: AST invalide`);
                    console.log('    AST reçu:', JSON.stringify(ast, null, 2));
                }
            } catch (error) {
                log('red', `  ✗ Test ${index + 1}: ${error.message}`);
                // Afficher plus de détails sur l'erreur pour le débogage
                if (error.location) {
                    console.log(`    Position: ligne ${error.location.start.line}, colonne ${error.location.start.column}`);
                }
                // Afficher le cas de test qui a échoué
                console.log(`    Test: ${testCase.substring(0, 100)}${testCase.length > 100 ? '...' : ''}`);
            }
        });

        if (passedTests === testCases.length) {
            log('green', `🎉 Tous les tests passés (${passedTests}/${testCases.length})`);
        } else {
            log('yellow', `⚠️  Tests passés: ${passedTests}/${testCases.length}`);
        }

        // Test spécial pour vérifier la structure AST
        log('blue', '🔍 Test de structure AST...');
        try {
            const simpleAST = parseFunction('RULE Test() RETURN 42; ENDRULE');
            if (simpleAST && simpleAST.type === 'Program' && simpleAST.statements && simpleAST.statements.length > 0) {
                const firstStatement = simpleAST.statements[0];
                if (firstStatement.type === 'FunctionDefinition') {
                    log('green', '✓ Structure AST correcte pour FunctionDefinition');
                    log('blue', `    Nom: ${firstStatement.name}`);
                    log('blue', `    Paramètres: ${firstStatement.parameters.length}`);
                    log('blue', `    Corps: ${firstStatement.body.type}`);
                } else {
                    log('red', `✗ Type de statement incorrect: ${firstStatement.type}`);
                }
            } else {
                log('red', '✗ Structure AST incorrecte');
            }
        } catch (error) {
            log('red', `✗ Erreur test AST: ${error.message}`);
        }

    } catch (error) {
        log('red', `❌ Erreur lors du test: ${error.message}`);
        console.log('Stack trace:', error.stack);
    }
}

// Fonction pour surveiller les changements (mode watch)
function watchMode() {
    try {
        const chokidar = require('chokidar');
        const grammarPath = path.join(__dirname, GRAMMAR_FILE);

        log('cyan', '👁️  Mode surveillance activé...');
        log('blue', `📁 Surveillance du fichier: ${grammarPath}`);

        const watcher = chokidar.watch(grammarPath);

        watcher.on('change', () => {
            log('yellow', '🔄 Fichier modifié, reconstruction...');
            buildParser();
        });

        watcher.on('error', (error) => {
            log('red', `❌ Erreur de surveillance: ${error.message}`);
        });

        // Construction initiale
        buildParser();
    } catch (error) {
        log('red', `❌ Chokidar non installé. Installez-le avec: npm install chokidar`);
        log('yellow', '⚠️  Mode surveillance non disponible, construction unique...');
        buildParser();
    }
}

// Fonction pour nettoyer les fichiers générés
function clean() {
    const outputPath = path.join(__dirname, OUTPUT_DIR, OUTPUT_FILE);

    if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
        log('green', `🧹 Fichier nettoyé: ${outputPath}`);
    } else {
        log('yellow', '⚠️  Aucun fichier à nettoyer');
    }
}

// Fonction pour afficher l'aide
function showHelp() {
    console.log(`
${colors.cyan}DSL HFM Parser Builder${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node build-parser.js [options]

${colors.yellow}Options:${colors.reset}
  --help, -h     Afficher cette aide
  --watch, -w    Mode surveillance (reconstruction automatique)
  --clean, -c    Nettoyer les fichiers générés
  --verbose, -v  Mode verbeux

${colors.yellow}Exemples:${colors.reset}
  node build-parser.js              # Construction simple
  node build-parser.js --watch      # Mode surveillance
  node build-parser.js --clean      # Nettoyage

${colors.yellow}Nouvelle syntaxe DSL:${colors.reset}
  RULE FunctionName(param1, param2)
    RETURN expression;
  ENDRULE

  CALLRULE FunctionName(arg1, arg2);
`);
}

// Gestion des arguments de ligne de commande
function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }

    if (args.includes('--clean') || args.includes('-c')) {
        clean();
        return;
    }

    if (args.includes('--watch') || args.includes('-w')) {
        watchMode();
        return;
    }

    // Construction par défaut
    buildParser();
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    log('red', `❌ Erreur non capturée: ${error.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log('red', `❌ Promesse rejetée: ${reason}`);
    process.exit(1);
});

// Point d'entrée
if (require.main === module) {
    main();
}

module.exports = {
    buildParser,
    testParser,
    watchMode,
    clean
};