export const tableOperationsGrammar = `
// Simplified grammar for a "chat with your data" demo
start: query

// A query can show columns and optionally filter with "where"
query: "show" columns ("where" condition)?

// You can select all columns with "*" or list them by name
columns: "*" | column_list
column_list: IDENTIFIER ("," IDENTIFIER)*

// A condition is a simple comparison between a column, an operator, and a value
condition: IDENTIFIER OPERATOR value

// Define the allowed values and operators
value: STRING | NUMBER
OPERATOR: "=" | "!=" | ">" | "<" | ">=" | "<="

// Define the basic building blocks (Terminals)
IDENTIFIER: /[a-zA-Z_][a-zA-Z0-9_]*/
STRING: /"[^"]*"/ | /'[^']*'/
NUMBER: /-?\\d+(\.\\d+)?/

// Ignore whitespace between tokens
%import common.WS
%ignore WS
`.trim();
