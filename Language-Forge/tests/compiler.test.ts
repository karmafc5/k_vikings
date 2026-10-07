import { describe, expect, it } from "vitest";
import { Compiler } from "../src/compiler";
import { Lexer } from "../src/lexer";
import { Parser } from "../src/parser";
import { VirtualMachine } from "../src/vm";

function compile(source: string) {
	return new Compiler().compile(new Parser(new Lexer(source).scanTokens()).parse());
}

describe("compiler", () => {
	it("emits arithmetic bytecode in precedence order", () => {
		const bytecode = compile("say 2 + 3 * 4");

		expect(bytecode.map(({ op }) => op)).toEqual([
			"CONSTANT",
			"CONSTANT",
			"CONSTANT",
			"MULTIPLY",
			"ADD",
			"SAY",
		]);
	});

	it("runs the name example through input, variables, and string concatenation", async () => {
		const output: string[] = [];
		const prompts: string[] = [];
		const vm = new VirtualMachine({
			input: (prompt) => {
				prompts.push(prompt);
				return "Ada";
			},
			output: (value) => output.push(value),
		});

		await vm.run(compile('ask name\nsay "My name is " + name'));

		expect(prompts).toEqual(["name: "]);
		expect(output).toEqual(["My name is Ada"]);
	});

	it("evaluates calculator expressions", async () => {
		const output: string[] = [];
		const vm = new VirtualMachine({ input: () => "", output: (value) => output.push(value) });

		await vm.run(compile("set total = (2 + 3) * 4\nsay \"Total: \" + total"));

		expect(output).toEqual(["Total: 20"]);
	});

	it("reports runtime errors with source lines", async () => {
		const vm = new VirtualMachine({ input: () => "", output: () => undefined });

		await expect(vm.run(compile("say missing"))).rejects.toThrow("[line 1] Unknown variable 'missing'");
	});
});