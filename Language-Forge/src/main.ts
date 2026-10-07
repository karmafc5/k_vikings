import { Lexer } from "./lexer";

const source = `set age = 20
age == 20
age != 18
age <= 20
age >= 18`;

const lexer = new Lexer(source);
const tokens = lexer.scanTokens();

for (const token of tokens) {
  console.log(
    `${token.type}: "${token.value}" (line ${token.line})`
  );
}