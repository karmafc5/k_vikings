import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Compiler } from "../src/compiler";
import { Lexer } from "../src/lexer";
import { Parser } from "../src/parser";

async function main(): Promise<void> {
	const filename = process.argv[2];
	if (!filename) {
		throw new Error("Usage: npm run bootstrap -- <source.vico>");
	}

	const source = await readFile(resolve(process.cwd(), filename), "utf8");
	const tokens = new Lexer(source).scanTokens();
	const program = new Parser(tokens).parse();
	const bytecode = new Compiler().compile(program);
	process.stdout.write(`${JSON.stringify(bytecode, null, 2)}\n`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});