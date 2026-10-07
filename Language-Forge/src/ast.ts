export interface Program {
	statements: Statement[];
}

export type Statement = AskStatement | SayStatement | SetStatement;

export interface AskStatement {
	kind: "ask";
	name: string;
	line: number;
}

export interface SayStatement {
	kind: "say";
	expression: Expression;
	line: number;
}

export interface SetStatement {
	kind: "set";
	name: string;
	expression: Expression;
	line: number;
}

export type Expression =
	| LiteralExpression
	| VariableExpression
	| UnaryExpression
	| BinaryExpression;

export interface LiteralExpression {
	kind: "literal";
	value: number | string;
	line: number;
}

export interface VariableExpression {
	kind: "variable";
	name: string;
	line: number;
}

export interface UnaryExpression {
	kind: "unary";
	operator: "-";
	operand: Expression;
	line: number;
}

export interface BinaryExpression {
	kind: "binary";
	operator: "+" | "-" | "*" | "/";
	left: Expression;
	right: Expression;
	line: number;
}