import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Interpreter } from "./interpreter";

async function main(): Promise<void> {
  const source = `
ask name "What is your name?"
say "Hello " + name

ask age "How old are you?"
if age >= 18
    say "You are an adult"
else
    say "You are a minor"
`;

  const lexer = new Lexer(source);
  const tokens = lexer.scanTokens();

  const parser = new Parser(tokens);
  const program = parser.parse();

  const interpreter = new Interpreter();

  await interpreter.interpret(program);
}

main().catch((error) => {
  console.error(error.message);
});