import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Interpreter } from "./interpreter";

const source = `set age = 15

if age >= 18
    say "Adult"
`;

try {
  const lexer = new Lexer(source);
  const tokens = lexer.scanTokens();

  const parser = new Parser(tokens);
  const ast = parser.parse();

  const interpreter = new Interpreter();
  interpreter.interpret(ast);
} catch (error) {
  console.error((error as Error).message);
}