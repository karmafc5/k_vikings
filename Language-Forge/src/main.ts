import { Lexer } from "./lexer";

const source = `say "Hello\\nWorld"
say "Hello\\tWorld"
say "He said \\"hello\\""
say "C:\\\\Users\\\\Victor"`;

const lexer = new Lexer(source);
const tokens = lexer.scanTokens();

for (const token of tokens) {
  console.log(
    `${token.type}: "${token.value}" (line ${token.line})`
  );
}
