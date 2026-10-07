import {
  Program,
  Statement,
  SetStatement,
  SayStatement,
  AskStatement,
  IfStatement,
  Expression,
} from "./ast";

export class Interpreter {
  private variables = new Map<string, string | number>();

  interpret(program: Program): void {
    for (const statement of program.statements) {
      this.execute(statement);
    }
  }

  private execute(statement: Statement): void {
    switch (statement.type) {
      case "SetStatement":
        this.executeSet(statement);
        break;

      case "SayStatement":
        this.executeSay(statement);
        break;

      case "AskStatement":
        this.executeAsk(statement);
        break;

      case "IfStatement":
        this.executeIf(statement);
        break;
    }
  }

  private executeSet(statement: SetStatement): void {
    const value = this.evaluate(statement.value);

    this.variables.set(statement.name, value);
  }

  private executeSay(statement: SayStatement): void {
    const value = this.evaluate(statement.expression);

    console.log(value);
  }

  private executeAsk(statement: AskStatement): void {
    console.log(`ASK: ${statement.name}`);
  }

  private executeIf(statement: IfStatement): void {
    const condition = this.evaluate(statement.condition);

    if (condition === 1) {
      for (const childStatement of statement.thenBranch) {
        this.execute(childStatement);
      }
    }
  }

  private evaluate(expression: Expression): string | number {
    switch (expression.type) {
      case "LiteralExpression":
        return expression.value;

      case "VariableExpression":
        return this.getVariable(expression.name);

      case "BinaryExpression":
        return this.evaluateBinary(expression);
    }
  }

  private getVariable(name: string): string | number {
    if (!this.variables.has(name)) {
      throw new Error(`Undefined variable '${name}'.`);
    }

    return this.variables.get(name)!;
  }

  private evaluateBinary(expression: any): string | number {
    const left = this.evaluate(expression.left);
    const right = this.evaluate(expression.right);

    switch (expression.operator) {
      case "+":
        if (typeof left === "string" || typeof right === "string") {
          return String(left) + String(right);
        }

        return left + right;

      case "-":
        return Number(left) - Number(right);

      case "*":
        return Number(left) * Number(right);

      case "/":
        return Number(left) / Number(right);

      case "==":
        return left === right ? 1 : 0;

      case "!=":
        return left !== right ? 1 : 0;

      case "<":
        return left < right ? 1 : 0;

      case "<=":
        return left <= right ? 1 : 0;

      case ">":
        return left > right ? 1 : 0;

      case ">=":
        return left >= right ? 1 : 0;

      default:
        throw new Error(
          `Unknown operator '${expression.operator}'.`
        );
    }
  }
}