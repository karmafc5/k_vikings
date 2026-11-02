// @ts-nocheck
import { describe, expect, it } from "vitest";
import { Lexer } from "../src/lexer";
import { Parser } from "../src/parser";
function parse(source) {
    return new Parser(new Lexer(source).scanTokens()).parse();
}
describe("parser", () => {
    it("parses input, output, assignment, and arithmetic precedence", () => {
        const program = parse('ask name\nset total = 2 + 3 * 4\nsay "Hi " + name');
        expect(program.statements.map(({ type }) => type)).toEqual([
            "AskStatement",
            "SetStatement",
            "SayStatement",
        ]);
        const assignment = program.statements[1];
        expect(assignment.type).toBe("SetStatement");
        if (assignment.type === "SetStatement") {
            expect(assignment.value.type).toBe("BinaryExpression");
            if (assignment.value.type === "BinaryExpression") {
                expect(assignment.value.operator).toBe("+");
                expect(assignment.value.right.type).toBe("BinaryExpression");
            }
        }
    });
    it("reports malformed statements with line numbers", () => {
        expect(() => parse("say\nask name")).toThrow("[line 1]");
        expect(() => parse("ask\n")).toThrow("[line 1]");
    });
});
