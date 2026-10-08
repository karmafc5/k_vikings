import {
  Program,
  Statement,
  SetStatement,
  SayStatement,
  AskStatement,
  IfStatement,
  WhileStatement,
  Expression,
  BinaryExpression,
} from "./ast";

type Value = string | number | boolean;

export class Interpreter {
  private variables = new Map<string, Value>();

  // ============================================================
  // PROGRAM
  // ============================================================

  interpret(program: Program): void {
    for (const statement of program.statements) {
      this.execute(statement);
    }
  }

  // ============================================================
  // STATEMENTS
  // ============================================================

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

      case "WhileStatement":
        this.executeWhile(statement);
        break;
    }
  }

  // ============================================================
  // SET
  // ============================================================

  private executeSet(statement: SetStatement): void {
    const value = this.evaluate(statement.value);

    this.variables.set(
      statement.name,
      value
    );
  }

  // ============================================================
  // SAY
  // ============================================================

  private executeSay(statement: SayStatement): void {
    const value = this.evaluate(
      statement.expression
    );

    console.log(value);
  }

  // ============================================================
  // ASK
  // ============================================================

  private executeAsk(statement: AskStatement): void {
    console.log(
      `ASK: ${statement.name}`
    );
  }

  // ============================================================
  // IF / ELSE
  // ============================================================

  private executeIf(statement: IfStatement): void {
    const condition = this.evaluate(
      statement.condition
    );

    if (this.isTruthy(condition)) {
      for (const childStatement of statement.thenBranch) {
        this.execute(childStatement);
      }
    } else if (statement.elseBranch) {
      for (const childStatement of statement.elseBranch) {
        this.execute(childStatement);
      }
    }
  }

  // ============================================================
  // WHILE
  // ============================================================

  private executeWhile(statement: WhileStatement): void {
    while (
      this.isTruthy(
        this.evaluate(statement.condition)
      )
    ) {
      for (const childStatement of statement.body) {
        this.execute(childStatement);
      }
    }
  }

  // ============================================================
  // EXPRESSIONS
  // ============================================================

  private evaluate(expression: Expression): Value {
    switch (expression.type) {
      case "LiteralExpression":
        return expression.value;

      case "VariableExpression":
        return this.getVariable(
          expression.name
        );

      case "BinaryExpression":
        return this.evaluateBinary(expression);
    }
  }

  // ============================================================
  // VARIABLES
  // ============================================================

  private getVariable(name: string): Value {
    if (!this.variables.has(name)) {
      throw new Error(
        `Undefined variable '${name}'.`
      );
    }

    return this.variables.get(name)!;
  }

  // ============================================================
  // TRUTHINESS
  // ============================================================

  private isTruthy(value: Value): boolean {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value !== 0;
    }

    if (typeof value === "string") {
      return value.length > 0;
    }

    return false;
  }

  // ============================================================
  // BINARY EXPRESSIONS
  // ============================================================

  private evaluateBinary(
    expression: BinaryExpression
  ): Value {
    const left = this.evaluate(
      expression.left
    );

    const right = this.evaluate(
      expression.right
    );

    switch (expression.operator) {

      // --------------------------------------------------------
      // ADDITION
      // --------------------------------------------------------

      case "+":
        if (
          typeof left === "string" ||
          typeof right === "string"
        ) {
          return (
            String(left) +
            String(right)
          );
        }

        if (
          typeof left === "number" &&
          typeof right === "number"
        ) {
          return left + right;
        }

        throw new Error(
          "Cannot add boolean values."
        );

      // --------------------------------------------------------
      // SUBTRACTION
      // --------------------------------------------------------

      case "-":
        return (
          this.toNumber(left) -
          this.toNumber(right)
        );

      // --------------------------------------------------------
      // MULTIPLICATION
      // --------------------------------------------------------

      case "*":
        return (
          this.toNumber(left) *
          this.toNumber(right)
        );

      // --------------------------------------------------------
      // DIVISION
      // --------------------------------------------------------

      case "/":
        return (
          this.toNumber(left) /
          this.toNumber(right)
        );

      // --------------------------------------------------------
      // EQUALITY
      // --------------------------------------------------------

      case "==":
        return left === right;

      // --------------------------------------------------------
      // NOT EQUAL
      // --------------------------------------------------------

      case "!=":
        return left !== right;

      // --------------------------------------------------------
      // LESS THAN
      // --------------------------------------------------------

      case "<":
        return this.compare(
          left,
          right,
          "<"
        );

      // --------------------------------------------------------
      // LESS THAN OR EQUAL
      // --------------------------------------------------------

      case "<=":
        return this.compare(
          left,
          right,
          "<="
        );

      // --------------------------------------------------------
      // GREATER THAN
      // --------------------------------------------------------

      case ">":
        return this.compare(
          left,
          right,
          ">"
        );

      // --------------------------------------------------------
      // GREATER THAN OR EQUAL
      // --------------------------------------------------------

      case ">=":
        return this.compare(
          left,
          right,
          ">="
        );

      // --------------------------------------------------------
      // AND
      // --------------------------------------------------------

      case "and":
        return (
          this.isTruthy(left) &&
          this.isTruthy(right)
        );

      // --------------------------------------------------------
      // OR
      // --------------------------------------------------------

      case "or":
        return (
          this.isTruthy(left) ||
          this.isTruthy(right)
        );

      // --------------------------------------------------------
      // UNKNOWN OPERATOR
      // --------------------------------------------------------

      default:
        throw new Error(
          `Unknown operator '${expression.operator}'.`
        );
    }
  }

  // ============================================================
  // NUMBER CONVERSION
  // ============================================================

  private toNumber(value: Value): number {
    if (typeof value === "number") {
      return value;
    }

    throw new Error(
      `Expected number but got ${typeof value}.`
    );
  }

  // ============================================================
  // COMPARISON
  // ============================================================

  private compare(
    left: Value,
    right: Value,
    operator: string
  ): boolean {

    if (
      typeof left !== "number" ||
      typeof right !== "number"
    ) {
      throw new Error(
        `Cannot use '${operator}' with non-number values.`
      );
    }

    switch (operator) {
      case "<":
        return left < right;

      case "<=":
        return left <= right;

      case ">":
        return left > right;

      case ">=":
        return left >= right;

      default:
        throw new Error(
          `Unknown comparison operator '${operator}'.`
        );
    }
  }
}