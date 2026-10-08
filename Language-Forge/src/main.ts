import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Interpreter } from "./interpreter";

const source = `set loggedIn = false

set age = 13
set loggedIn = true

if age >= 18 and loggedIn
    say "Welcome"
else
    say "Access Denied"
`;

const lexer = new Lexer(source);
const tokens = lexer.scanTokens();

const parser = new Parser(tokens);
const program = parser.parse();

const interpreter = new Interpreter();
interpreter.interpret(program);