import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Interpreter } from "./interpreter";

const source = `set count = 1

while count <= 5
    say count
    set count = count + 1
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