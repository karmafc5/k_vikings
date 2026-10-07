import { describe, expect, it } from "vitest";
import { Lexer } from "../src/lexer";
import { TokenType } from "../src/token";

describe("lexer", () => {
	it("tokenizes the name example", () => {
		const tokens = new Lexer('ask name\nsay "My name is " + name').scanTokens();

		expect(tokens.map(({ type }) => type)).toEqual([
			TokenType.ASK,
			TokenType.IDENTIFIER,
			TokenType.NEWLINE,
			TokenType.SAY,
			TokenType.STRING,
			TokenType.PLUS,
			TokenType.IDENTIFIER,
			TokenType.EOF,
		]);
		expect(tokens[4].value).toBe("My name is ");
	});

	it("handles decimal values, parentheses, and comments", () => {
		const tokens = new Lexer("say (12.5 + 3) // note").scanTokens();

		expect(tokens.map(({ type }) => type)).toEqual([
			TokenType.SAY,
			TokenType.LEFT_PAREN,
			TokenType.NUMBER,
			TokenType.PLUS,
			TokenType.NUMBER,
			TokenType.RIGHT_PAREN,
			TokenType.EOF,
		]);
		expect(tokens[2].value).toBe("12.5");
	});

	it("reports unexpected characters and unterminated strings", () => {
		expect(() => new Lexer("say @").scanTokens()).toThrow("Unexpected character");
		expect(() => new Lexer('say "unfinished').scanTokens()).toThrow("Unterminated string");
	});
});