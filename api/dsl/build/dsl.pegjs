/*
 * Grammaire PEG.js pour le DSL HFM avec support des fonctions
 * Syntaxe: RULE nom(params) ... ENDRULE et CALLRULE nom(args)
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
  / CallRuleStatement
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
  = _ stmt:(ReturnStatement / ExpressionStatement) _ {
      return stmt;
    }

ReturnStatement
  = "RETURN" !([a-zA-Z0-9_]) _ expr:Expression _ ";"? {
      return {
        type: 'ReturnStatement',
        expression: expr
      };
    }

CallRuleStatement
  = _ "CALLRULE" !([a-zA-Z0-9_]) _ name:Identifier _ "(" _ args:ArgumentList? _ ")" _ ";"? {
      return {
        type: 'CallRuleStatement',
        name: name,
        arguments: args || []
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
  = left:RelationalExpression rest:(_ ("==" / "!=" / "=" / "<>") _ RelationalExpression)* {
      return rest.reduce((acc, curr) => ({
        type: 'BinaryExpression',
        operator: curr[1] === '=' ? '==' : curr[1] === '<>' ? '!=' : curr[1],
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
  / CallRuleExpression
  / FunctionCall
  / Variable
  / ArrayLiteral
  / NumberLiteral
  / StringLiteral
  / BooleanLiteral
  / NullLiteral
  / name:Identifier {
      return {
        type: 'Variable',
        name: name
      };
    }

FunctionCall
  = name:Identifier _ "(" _ args:ArgumentList? _ ")" {
      return {
        type: 'FunctionCall',
        name: name,
        arguments: args || []
      };
    }

CallRuleExpression
  = "CALLRULE" !([a-zA-Z0-9_]) _ name:Identifier _ "(" _ args:ArgumentList? _ ")" {
      return {
        type: 'CallRuleExpression',
        name: name,
        arguments: args || []
      };
    }

ArgumentList
  = first:Expression rest:(_ "," _ Expression)* {
      return [first].concat(rest.map(r => r[3]));
    }

Variable
  = "@" name:Identifier {
      return {
        type: 'Variable',
        name: name
      };
    }
  / "$" name:Identifier {
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
  = !("RULE" / "ENDRULE" / "RETURN" / "CALLRULE" / "TRUE" / "FALSE" / "NULL" / "OR" / "AND" / "NOT") 
    first:[a-zA-Z_] rest:[a-zA-Z0-9_]* {
      return first + rest.join('');
    }

DoubleStringCharacter
  = !('"' / "\\") char:. { return char; }
  / "\\" sequence:EscapeSequence { return sequence; }

SingleStringCharacter
  = !("'" / "\\") char:. { return char; }
  / "\\" sequence:EscapeSequence { return sequence; }

EscapeSequence
  = "'"
  / "\""
  / "\\"
  / "/"
  / "b" { return "\b"; }
  / "f" { return "\f"; }
  / "n" { return "\n"; }
  / "r" { return "\r"; }
  / "t" { return "\t"; }
  / "v" { return "\v"; }
  / "0" { return "\0"; }
  / "u" digits:$(HexDigit HexDigit HexDigit HexDigit) {
      return String.fromCharCode(parseInt(digits, 16));
    }
  / "x" digits:$(HexDigit HexDigit) {
      return String.fromCharCode(parseInt(digits, 16));
    }

HexDigit
  = [0-9a-fA-F]

Comment
  = "//" [^\n\r]*
  / "/*" (!"*/" .)* "*/"

_
  = ([ \t\n\r] / Comment)*