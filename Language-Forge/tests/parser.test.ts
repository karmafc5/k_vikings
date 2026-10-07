import { describe, expect, it } from "vitest";
import { Lexer } from "../src/lexer";
import { Parser } from "../src/parser";

function parse(source: string) {
	return new Parser(new Lexer(source).scanTokens()).parse();
}

describe("parser", () => {
	it("parses input, output, assignment, and arithmetic precedence", () => {
		const program = parse('ask name\nset total = 2 + 3 * 4\nsay "Hi " + name');

		expect(program.statements.map(({ kind }) => kind)).toEqual(["ask", "set", "say"]);
		const assignment = program.statements[1];
		expect(assignment.kind).toBe("set");
		if (assignment.kind === "set") {
			expect(assignment.expression.kind).toBe("binary");
			if (assignment.expression.kind === "binary") {
				expect(assignment.expression.operator).toBe("+");
				expect(assignment.expression.right.kind).toBe("binary");
			}
		}
	});

	it("reports malformed statements with line numbers", () => {
		expect(() => parse("say\nask name")).toThrow("[line 1]");
		expect(() => parse("ask\n")).toThrow("[line 1]");
	});
});