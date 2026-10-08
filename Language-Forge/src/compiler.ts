import {
  Program,
  Statement,
  Expression,
} from "./ast";

export interface Instruction {
  op: string;
  name?: string;
  value?: string | number | boolean;
  line?: number;
}

export class Compiler {
  compile(program: Program): Instruction[] {
    const instructions: Instruction[] = [];

    for (const statement of program.statements) {
      this.compileStatement(statement, instructions);
    }

    return instructions;
  }

  private compileStatement(
    statement: Statement,
    instructions: Instruction[]
  ): void {
    switch (statement.type) {
      case "AskStatement":
        instructions.push({
          op: "ASK",
          name: statement.name,
          line: statement.line,
        });
        break;

      case "SayStatement":
        this.compileExpression(
          statement.expression,
          instructions
        );

        instructions.push({
          op: "SAY",
          line: statement.line,
        });
        break;

      case "SetStatement":
        this.compileExpression(
          statement.value,
          instructions
        );

        instructions.push({
          op: "SET",
          name: statement.name,
          line: statement.line,
        });
        break;

      case "IfStatement":
        /*
         * Control-flow bytecode will be added later.
         *
         * For now, compile the condition and branches
         * so the compiler understands the new AST.
         */

        this.compileExpression(
          statement.condition,
          instructions
        );

        for (const child of statement.thenBranch) {
          this.compileStatement(child, instructions);
        }

        if (statement.elseBranch) {
          for (const child of statement.elseBranch) {
            this.compileStatement(child, instructions);
          }
        }

        break;

      case "WhileStatement":
        this.compileExpression(
          statement.condition,
          instructions
        );

        for (const child of statement.body) {
          this.compileStatement(child, instructions);
        }

        break;
    }
  }

  private compileExpression(
    expression: Expression,
    instructions: Instruction[]
  ): void {
    switch (expression.type) {
      case "LiteralExpression":
        instructions.push({
          op: "CONSTANT",
          value: expression.value,
          line: expression.line,
        });
        break;

      case "VariableExpression":
        instructions.push({
          op: "LOAD",
          name: expression.name,
          line: expression.line,
        });
        break;

      case "BinaryExpression":
        this.compileExpression(
          expression.left,
          instructions
        );

        this.compileExpression(
          expression.right,
          instructions
        );

        instructions.push({
          op: this.binaryOpcode(
            expression.operator
          ),
          line: expression.line,
        });

        break;
    }
  }

  private binaryOpcode(operator: string): string {
    switch (operator) {
      case "+":
        return "ADD";

      case "-":
        return "SUBTRACT";

      case "*":
        return "MULTIPLY";

      case "/":
        return "DIVIDE";

      case "==":
        return "EQUAL";

      case "!=":
        return "NOT_EQUAL";

      case "<":
        return "LESS";

      case "<=":
        return "LESS_EQUAL";

      case ">":
        return "GREATER";

      case ">=":
        return "GREATER_EQUAL";

      case "and":
        return "AND";

      case "or":
        return "OR";

      case "not":
        return "NOT";

      default:
        throw new Error(
          `Unknown operator '${operator}'.`
        );
    }
  }
}