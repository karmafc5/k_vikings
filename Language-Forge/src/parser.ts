import {
	type BinaryExpression,
	type Expression,
	type Program,
	type Statement,
} from "./ast";
import { Token, TokenType } from "./token";

export class Parser {
	private current = 0;

	constructor(private readonly tokens: Token[]) {}

	parse(): Program {
		const statements: Statement[] = [];
		this.skipNewlines();

		while (!this.isAtEnd()) {
			statements.push(this.statement());
			if (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
				throw this.error(this.peek(), "Expected a newline after statement.");
			}
			this.skipNewlines();
		}

		return { statements };
	}

	private statement(): Statement {
		if (this.match(TokenType.ASK)) {
			const keyword = this.previous();
			const name = this.consume(TokenType.IDENTIFIER, "Expected a variable name after 'ask'.");
			return { kind: "ask", name: name.value, line: keyword.line };
		}

		if (this.match(TokenType.SAY)) {
			const keyword = this.previous();
			return { kind: "say", expression: this.expression(), line: keyword.line };
		}

		if (this.match(TokenType.SET)) {
			const keyword = this.previous();
			const name = this.consume(TokenType.IDENTIFIER, "Expected a variable name after 'set'.");
			this.consume(TokenType.EQUAL, "Expected '=' after the variable name.");
			return {
				kind: "set",
				name: name.value,
				expression: this.expression(),
				line: keyword.line,
			};
		}

		throw this.error(this.peek(), "Expected 'ask', 'say', or 'set'.");
	}

	private expression(): Expression {
		return this.addition();
	}

	private addition(): Expression {
		let expression = this.multiplication();

		while (this.match(TokenType.PLUS, TokenType.MINUS)) {
			const operator = this.previous();
			expression = this.binary(expression, operator, this.multiplication());
		}

		return expression;
	}

	private multiplication(): Expression {
		let expression = this.unary();

		while (this.match(TokenType.STAR, TokenType.SLASH)) {
			const operator = this.previous();
			expression = this.binary(expression, operator, this.unary());
		}

		return expression;
	}

	private unary(): Expression {
		if (this.match(TokenType.MINUS)) {
			const operator = this.previous();
			return {
				kind: "unary",
				operator: "-",
				operand: this.unary(),
				line: operator.line,
			};
		}

		return this.primary();
	}

	private primary(): Expression {
		if (this.match(TokenType.NUMBER)) {
			const token = this.previous();
			return { kind: "literal", value: Number(token.value), line: token.line };
		}

		if (this.match(TokenType.STRING)) {
			const token = this.previous();
			return { kind: "literal", value: token.value, line: token.line };
		}

		if (this.match(TokenType.IDENTIFIER)) {
			const token = this.previous();
			return { kind: "variable", name: token.value, line: token.line };
		}

		if (this.match(TokenType.LEFT_PAREN)) {
			const expression = this.expression();
			this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression.");
			return expression;
		}

		throw this.error(this.peek(), "Expected an expression.");
	}

	private binary(
		left: Expression,
		operator: Token,
		right: Expression,
	): BinaryExpression {
		const operators: Partial<Record<TokenType, BinaryExpression["operator"]>> = {
			[TokenType.PLUS]: "+",
			[TokenType.MINUS]: "-",
			[TokenType.STAR]: "*",
			[TokenType.SLASH]: "/",
		};
		const symbol = operators[operator.type];

		if (!symbol) {
			throw this.error(operator, "Unsupported binary operator.");
		}

		return { kind: "binary", operator: symbol, left, right, line: operator.line };
	}

	private match(...types: TokenType[]): boolean {
		if (!types.some((type) => this.check(type))) {
			return false;
		}

		this.advance();
		return true;
	}

	private consume(type: TokenType, message: string): Token {
		if (this.check(type)) {
			return this.advance();
		}

		throw this.error(this.peek(), message);
	}

	private check(type: TokenType): boolean {
		return this.peek().type === type;
	}

	private advance(): Token {
		if (!this.isAtEnd()) {
			this.current++;
		}

		return this.previous();
	}

	private isAtEnd(): boolean {
		return this.check(TokenType.EOF);
	}

	private peek(): Token {
		return this.tokens[this.current];
	}

	private previous(): Token {
		return this.tokens[this.current - 1];
	}

	private skipNewlines(): void {
		while (this.match(TokenType.NEWLINE)) {
			// Blank lines separate statements but do not create AST nodes.
		}
	}

	private error(token: Token, message: string): Error {
		return new Error(`[line ${token.line}] ${message}`);
	}
}