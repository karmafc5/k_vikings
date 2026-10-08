import {
  Program,
  Statement,
  Expression,
  BinaryExpression,
  FunctionStatement,
} from "./ast";

export interface Instruction {
  op: string;
  name?: string;
  value?: string | number | boolean;
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
        });
        break;

      case "SayStatement":
        this.compileExpression(
          statement.expression,
          instructions
        );

        instructions.push({
          op: "SAY",
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
        });
        break;

      case "IfStatement":
        this.compileExpression(
          statement.condition,
          instructions
        );

        instructions.push({
          op: "IF_START",
        });

        for (const child of statement.thenBranch) {
          this.compileStatement(child, instructions);
        }

        if (statement.elseBranch) {
          instructions.push({
            op: "ELSE",
          });

          for (const child of statement.elseBranch) {
            this.compileStatement(child, instructions);
          }
        }

        instructions.push({
          op: "IF_END",
        });

        break;

      case "WhileStatement":
        instructions.push({
          op: "WHILE_START",
        });

        this.compileExpression(
          statement.condition,
          instructions
        );

        for (const child of statement.body) {
          this.compileStatement(child, instructions);
        }

        instructions.push({
          op: "WHILE_END",
        });

        break;

      case "FunctionStatement":
        this.compileFunction(
          statement,
          instructions
        );
        break;

      case "ReturnStatement":
        if (statement.value) {
          this.compileExpression(
            statement.value,
            instructions
          );
        }

        instructions.push({
          op: "RETURN",
        });

        break;

      case "ExpressionStatement":
        this.compileExpression(
          statement.expression,
          instructions
        );

        instructions.push({
          op: "POP",
        });

        break;
    }
  }

  private compileFunction(
    statement: FunctionStatement,
    instructions: Instruction[]
  ): void {
    instructions.push({
      op: "FUNCTION_START",
      name: statement.name,
    });

    for (const parameter of statement.parameters) {
      instructions.push({
        op: "PARAMETER",
        name: parameter,
      });
    }

    for (const child of statement.body) {
      this.compileStatement(child, instructions);
    }

    instructions.push({
      op: "FUNCTION_END",
      name: statement.name,
    });
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
        });
        break;

      case "VariableExpression":
        instructions.push({
          op: "LOAD",
          name: expression.name,
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
        });

        break;

      case "CallExpression":
        for (const argument of expression.arguments) {
          this.compileExpression(
            argument,
            instructions
          );
        }

        instructions.push({
          op: "CALL",
          name: expression.name,
          value: expression.arguments.length,
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