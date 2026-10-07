import type { Expression, Program } from "./ast";
import type { Bytecode, Instruction } from "./bytecode";

export class Compiler {
	compile(program: Program): Bytecode {
		const instructions: Bytecode = [];

		for (const statement of program.statements) {
			switch (statement.kind) {
				case "ask":
					instructions.push({ op: "ASK", name: statement.name, line: statement.line });
					break;
				case "say":
					this.compileExpression(statement.expression, instructions);
					instructions.push({ op: "SAY", line: statement.line });
					break;
				case "set":
					this.compileExpression(statement.expression, instructions);
					instructions.push({ op: "SET", name: statement.name, line: statement.line });
					break;
			}
		}

		return instructions;
	}

	private compileExpression(expression: Expression, instructions: Bytecode): void {
		switch (expression.kind) {
			case "literal":
				instructions.push({ op: "CONSTANT", value: expression.value, line: expression.line });
				break;
			case "variable":
				instructions.push({ op: "LOAD", name: expression.name, line: expression.line });
				break;
			case "unary":
				this.compileExpression(expression.operand, instructions);
				instructions.push({ op: "NEGATE", line: expression.line });
				break;
			case "binary": {
				this.compileExpression(expression.left, instructions);
				this.compileExpression(expression.right, instructions);
				const op = this.binaryOpcode(expression.operator);
				instructions.push({ op, line: expression.line });
				break;
			}
		}
	}

	private binaryOpcode(operator: "+" | "-" | "*" | "/"):
		Extract<Instruction, { op: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE" }>["op"] {
		switch (operator) {
			case "+": return "ADD";
			case "-": return "SUBTRACT";
			case "*": return "MULTIPLY";
			case "/": return "DIVIDE";
		}
	}
}