/**
 * Script pour régénérer le parser à partir de la nouvelle grammaire
 * À exécuter : node regenerate-parser.js
 */

const fs = require('fs');
const path = require('path');

// Installer PEG.js si nécessaire : npm install pegjs
let peg;
try {
    peg = require('pegjs');
} catch (error) {
    console.error('❌ PEG.js non trouvé. Installez-le avec: npm install pegjs');
    process.exit(1);
}

async function regenerateParser() {
    try {
        console.log('🔄 Génération du nouveau parser...');

        // Lire la nouvelle grammaire
        const grammarFile = path.join(__dirname, 'dsl.pegjs');
        
        // Si le fichier n'existe pas, créer la grammaire inline
        let grammar;
        if (fs.existsSync(grammarFile)) {
            grammar = fs.readFileSync(grammarFile, 'utf8');
        } else {
            // Utiliser la grammaire inline (copiée depuis l'artifact)
            grammar = `/*
 * Grammaire PEG.js pour le DSL HFM avec style amélioré
 * Style: SET var = expr; CALL func(args); LOG message; EXPORT var;
 */

Start
  = _ program:Program _ { return program; }

Program
  = statements:Statement* {
      return {
        type: 'Program',
        statements: statements
      };
    }

Statement
  = FunctionDefinition
  / SetStatement
  / CallStatement
  / LogStatement
  / ExportStatement
  / ExpressionStatement

FunctionDefinition
  = _ "RULE" !([a-zA-Z0-9_]) _ name:Identifier _ "(" _ params:ParameterList? _ ")" _ body:FunctionBody _ "ENDRULE" !([a-zA-Z0-9_]) _ {
      return {
        type: 'FunctionDefinition',
        name: name,
        parameters: params || [],
        body: body
      };
    }

SetStatement
  = _ "SET" !([a-zA-Z0-9_]) _ name:Identifier _ "=" _ expr:Expression _ ";"? {
      return {
        type: 'SetStatement',
        name: name,
        expression: expr
      };
    }

CallStatement
  = _ "CALL" !([a-zA-Z0-9_]) _ name:Identifier _ "(" _ args:ArgumentList? _ ")" _ ";"? {
      return {
        type: 'CallStatement',
        name: name,
        arguments: args || []
      };
    }

LogStatement
  = _ "LOG" !([a-zA-Z0-9_]) _ expr:Expression _ ";"? {
      return {
        type: 'LogStatement',
        expression: expr
      };
    }

ExportStatement
  = _ "EXPORT" !([a-zA-Z0-9_]) _ name:Identifier _ ";"? {
      return {
        type: 'ExportStatement',
        name: name
      };
    }

ParameterList
  = first:Identifier rest:(_ "," _ Identifier)* {
      return [first].concat(rest.map(r => r[3]));
    }

FunctionBody
  = statements:FunctionStatement* {
      return {
        type: 'BlockStatement',
        statements: statements
      };
    }

FunctionStatement
  = _ stmt:(ReturnStatement / SetStatement / CallStatement / LogStatement / ExpressionStatement) _ {
      return stmt;
    }

ReturnStatement
  = "RETURN" !([a-zA-Z0-9_]) _ expr:Expression _ ";"? {
      return {
        type: 'ReturnStatement',
        expression: expr
      };
    }

ExpressionStatement
  = _ expr:Expression _ ";"? {
      return {
        type: 'ExpressionStatement',
        expression: expr
      };
    }

Expression
  = ConditionalExpression

ConditionalExpression
  = condition:LogicalOrExpression _ "?" _ consequent:Expression _ ":" _ alternate:Expression {
      return {
        type: 'ConditionalExpression',
        condition: condition,
        consequent: consequent,
        alternate: alternate
      };
    }
  / LogicalOrExpression

LogicalOrExpression
  = left:LogicalAndExpression rest:(_ ("||" / "OR") _ LogicalAndExpression)* {
      return rest.reduce((acc, curr) => ({
        type: 'BinaryExpression',
        operator: curr[1],
        left: acc,
        right: curr[3]
      }), left);
    }

LogicalAndExpression
  = left:EqualityExpression rest:(_ ("&&" / "AND") _ EqualityExpression)* {
      return rest.reduce((acc, curr) => ({
        type: 'BinaryExpression',
        operator: curr[1],
        left: acc,
        right: curr[3]
      }), left);
    }

EqualityExpression
  = left:RelationalExpression rest:(_ ("==" / "!=" / "<>") _ RelationalExpression)* {
      return rest.reduce((acc, curr) => ({
        type: 'BinaryExpression',
        operator: curr[1] === '<>' ? '!=' : curr[1],
        left: acc,
        right: curr[3]
      }), left);
    }

RelationalExpression
  = left:AdditiveExpression rest:(_ ("<=" / ">=" / "<" / ">") _ AdditiveExpression)* {
      return rest.reduce((acc, curr) => ({
        type: 'BinaryExpression',
        operator: curr[1],
        left: acc,
        right: curr[3]
      }), left);
    }

AdditiveExpression
  = left:MultiplicativeExpression rest:(_ ("+" / "-") _ MultiplicativeExpression)* {
      return rest.reduce((acc, curr) => ({
        type: 'BinaryExpression',
        operator: curr[1],
        left: acc,
        right: curr[3]
      }), left);
    }

MultiplicativeExpression
  = left:PowerExpression rest:(_ ("*" / "/" / "%") _ PowerExpression)* {
      return rest.reduce((acc, curr) => ({
        type: 'BinaryExpression',
        operator: curr[1],
        left: acc,
        right: curr[3]
      }), left);
    }

PowerExpression
  = left:UnaryExpression rest:(_ ("^" / "**") _ UnaryExpression)* {
      return rest.reduce((acc, curr) => ({
        type: 'BinaryExpression',
        operator: '^',
        left: acc,
        right: curr[3]
      }), left);
    }

UnaryExpression
  = operator:("+" / "-" / "!" / "NOT") _ operand:UnaryExpression {
      return {
        type: 'UnaryExpression',
        operator: operator === 'NOT' ? '!' : operator,
        operand: operand
      };
    }
  / PostfixExpression

PostfixExpression
  = left:PrimaryExpression rest:PostfixOperator* {
      return rest.reduce((acc, curr) => {
        if (curr.type === 'MemberExpression') {
          return {
            type: 'MemberExpression',
            object: acc,
            property: curr.property,
            computed: curr.computed
          };
        }
        return acc;
      }, left);
    }

PostfixOperator
  = _ "[" _ property:Expression _ "]" {
      return {
        type: 'MemberExpression',
        property: property,
        computed: true
      };
    }
  / _ "." property:Identifier {
      return {
        type: 'MemberExpression',
        property: property,
        computed: false
      };
    }

PrimaryExpression
  = "(" _ expr:Expression _ ")" { return expr; }
  / FunctionCall
  / Variable
  / ArrayLiteral
  / NumberLiteral
  / StringLiteral
  / BooleanLiteral
  / NullLiteral

FunctionCall
  = name:Identifier _ "(" _ args:ArgumentList? _ ")" {
      return {
        type: 'FunctionCall',
        name: name,
        arguments: args || []
      };
    }

ArgumentList
  = first:Expression rest:(_ "," _ Expression)* {
      return [first].concat(rest.map(r => r[3]));
    }

Variable
  = name:Identifier {
      return {
        type: 'Variable',
        name: name
      };
    }

ArrayLiteral
  = "[" _ elements:ElementList? _ "]" {
      return {
        type: 'ArrayExpression',
        elements: elements || []
      };
    }

ElementList
  = first:Expression rest:(_ "," _ Expression)* {
      return [first].concat(rest.map(r => r[3]));
    }

NumberLiteral
  = number:Number {
      return {
        type: 'NumberLiteral',
        value: number
      };
    }

StringLiteral
  = "\"" chars:DoubleStringCharacter* "\"" {
      return {
        type: 'StringLiteral',
        value: chars.join('')
      };
    }
  / "'" chars:SingleStringCharacter* "'" {
      return {
        type: 'StringLiteral',
        value: chars.join('')
      };
    }

BooleanLiteral
  = ("TRUE" !([a-zA-Z0-9_]) / "true" !([a-zA-Z0-9_])) {
      return {
        type: 'BooleanLiteral',
        value: true
      };
    }
  / ("FALSE" !([a-zA-Z0-9_]) / "false" !([a-zA-Z0-9_])) {
      return {
        type: 'BooleanLiteral',
        value: false
      };
    }

NullLiteral
  = ("NULL" !([a-zA-Z0-9_]) / "null" !([a-zA-Z0-9_])) {
      return {
        type: 'NullLiteral',
        value: null
      };
    }

Number
  = float:Float { return parseFloat(float); }
  / integer:Integer { return parseInt(integer, 10); }

Float
  = digits:Digits "." fractional:Digits? exponent:Exponent? {
      return digits + "." + (fractional || "") + (exponent || "");
    }
  / "." fractional:Digits exponent:Exponent? {
      return "." + fractional + (exponent || "");
    }
  / digits:Digits exponent:Exponent {
      return digits + exponent;
    }

Integer
  = digits:Digits { return digits; }

Digits
  = digits:[0-9]+ { return digits.join(''); }

Exponent
  = [eE] sign:[+-]? digits:Digits {
      return "e" + (sign || "") + digits;
    }

Identifier
  = !("RULE" / "ENDRULE" / "RETURN" / "SET" / "CALL" / "LOG" / "EXPORT" / "TRUE" / "FALSE" / "NULL" / "OR" / "AND" / "NOT") 
    first:[a-zA-Z_] rest:[a-zA-Z0-9_]* {
      return first + rest.join('');
    }

DoubleStringCharacter
  = !('"' / "\\\\") char:. { return char; }
  / "\\\\" sequence:EscapeSequence { return sequence; }

SingleStringCharacter
  = !("'" / "\\\\") char:. { return char; }
  / "\\\\" sequence:EscapeSequence { return sequence; }

EscapeSequence
  = "'"
  / "\\""
  / "\\\\"
  / "/"
  / "b" { return "\\b"; }
  / "f" { return "\\f"; }
  / "n" { return "\\n"; }
  / "r" { return "\\r"; }
  / "t" { return "\\t"; }
  / "v" { return "\\v"; }
  / "0" { return "\\0"; }
  / "u" digits:$(HexDigit HexDigit HexDigit HexDigit) {
      return String.fromCharCode(parseInt(digits, 16));
    }
  / "x" digits:$(HexDigit HexDigit) {
      return String.fromCharCode(parseInt(digits, 16));
    }

HexDigit
  = [0-9a-fA-F]

Comment
  = "//" [^\\n\\r]*
  / "/*" (!"*/" .)* "*/"

_
  = ([ \\t\\n\\r] / Comment)*`;
        }

        // Générer le parser
        const generatedParser = peg.generate(grammar, {
            output: 'source',
            format: 'commonjs'
        });

        // Ajouter le header et l'export à la fin
        const parserCode = `// Parser généré automatiquement à partir de la nouvelle grammaire DSL
// Ne pas modifier ce fichier directement
// Généré le: ${new Date().toISOString()}

${generatedParser}

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

        // Écrire le nouveau parser
        const outputFile = path.join(__dirname, 'parser.js');
        fs.writeFileSync(outputFile, parserCode);

        console.log('✅ Nouveau parser généré avec succès!');
        console.log(`📁 Fichier: ${outputFile}`);
        console.log('');
        console.log('🔄 Types de statements supportés:');
        console.log('   • SetStatement (SET var = expr)');
        console.log('   • CallStatement (CALL func(args))');
        console.log('   • LogStatement (LOG message)'); 
        console.log('   • ExportStatement (EXPORT var)');
        console.log('   • FunctionDefinition (RULE...ENDRULE)');
        console.log('   • ExpressionStatement');
        console.log('   • ReturnStatement');

        return true;

    } catch (error) {
        console.error('❌ Erreur lors de la génération:', error.message);
        return false;
    }
}

// Fonction pour tester le nouveau parser
async function testNewParser() {
    try {
        console.log('🧪 Test du nouveau parser...');
        
        // Recharger le nouveau parser
        delete require.cache[require.resolve('./parser.js')];
        const parser = require('../parser.js');

        // Test avec la nouvelle syntaxe
        const testCode = `
            SET result = SQL_QUERY("SELECT * FROM test");
            LOG "Test message";
            CALL MyFunction(result);
            EXPORT result;
        `;

        const ast = parser.parse(testCode);
        console.log('✅ Parser fonctionne!');
        console.log('📋 Statements détectés:');
        
        ast.statements.forEach((stmt, i) => {
            console.log(`   ${i + 1}. ${stmt.type}`);
        });

        return true;

    } catch (error) {
        console.error('❌ Erreur de test:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Régénération du parser DSL');
    console.log('================================\n');

    const success = await regenerateParser();
    
    if (success) {
        console.log('\n🧪 Test du nouveau parser...');
        await testNewParser();
        
        console.log('\n🎉 Tout est prêt!');
        console.log('💡 Vous pouvez maintenant utiliser la nouvelle syntaxe:');
        console.log('   SET var = expression;');
        console.log('   CALL function(args);');
        console.log('   LOG message;');
        console.log('   EXPORT var;');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { regenerateParser, testNewParser };