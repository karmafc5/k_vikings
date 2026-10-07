import { createInterface } from "node:readline/promises";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Compiler } from "./compiler";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { VirtualMachine } from "./vm";

async function main(): Promise<void> {
  const filename = process.argv[2] ?? "examples/hello.vico";
  const source = await readFile(resolve(process.cwd(), filename), "utf8");
  const program = new Parser(new Lexer(source).scanTokens()).parse();
  const bytecode = new Compiler().compile(program);
  const terminal = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const vm = new VirtualMachine({
      input: (prompt) => terminal.question(prompt),
      output: (value) => console.log(value),
    });
    await vm.run(bytecode);
  } finally {
    terminal.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});