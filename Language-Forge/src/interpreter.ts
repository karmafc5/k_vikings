import * as readline from "readline";

import {
  Program,
  Statement,
  SetStatement,
  SayStatement,
  AskStatement,
  IfStatement,
  WhileStatement,
  FunctionStatement,
  ReturnStatement,
  Expression,
  BinaryExpression,
  CallExpression,
} from "./ast";

type Value = string | number | boolean;

class ReturnSignal {
  constructor(public value: Value | undefined) {}
}

export class Interpreter {
  private variables = new Map<string, Value>();
  private functions = new Map<string, FunctionStatement>();

  async interpret(program: Program): Promise<void> {
    // First collect all function declarations.
    // This allows a function to be called before or after
    // its declaration in the Vico program.
    for (const statement of program.statements) {
      if (statement.type === "FunctionStatement") {
        if (this.functions.has(statement.name)) {
          throw new Error(
            `Function '${statement.name}' is already defined.`
          );
        }

        this.functions.set(
          statement.name,
          statement
        );
      }
    }

    // Execute the normal top-level statements.
    for (const statement of program.statements) {
      if (statement.type === "FunctionStatement") {
        continue;
      }

      await this.execute(statement);
    }
  }

  private async execute(
    statement: Statement
  ): Promise<void> {
    switch (statement.type) {
      case "SetStatement":
        await this.executeSet(statement);
        break;

      case "SayStatement":
        await this.executeSay(statement);
        break;

      case "AskStatement":
        await this.executeAsk(statement);
        break;

      case "IfStatement":
        await this.executeIf(statement);
        break;

      case "WhileStatement":
        await this.executeWhile(statement);
        break;

      case "FunctionStatement":
        this.functions.set(
          statement.name,
          statement
        );
        break;

      case "ReturnStatement":
        await this.executeReturn(statement);
        break;

      case "ExpressionStatement":
        await this.evaluate(
          statement.expression
        );
        break;
    }
  }

  private async executeSet(
    statement: SetStatement
  ): Promise<void> {
    const value = await this.evaluate(
      statement.value
    );

    this.variables.set(
      statement.name,
      value
    );
  }

  private async executeSay(
    statement: SayStatement
  ): Promise<void> {
    const value = await this.evaluate(
      statement.expression
    );

    console.log(value);
  }

  private async executeAsk(
    statement: AskStatement
  ): Promise<void> {
    const question =
      statement.prompt ??
      `What is ${statement.name}? `;

    const answer = await this.getInput(
      question
    );

    const value = this.convertInput(
      answer
    );

    this.variables.set(
      statement.name,
      value
    );
  }

  private async executeReturn(
    statement: ReturnStatement
  ): Promise<void> {
    let value: Value | undefined;

    if (statement.value) {
      value = await this.evaluate(
        statement.value
      );
    }

    throw new ReturnSignal(value);
  }

  private getInput(
    question: string
  ): Promise<string> {
    const rl =
      readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

    return new Promise((resolve) => {
      rl.question(
        question,
        (answer) => {
          rl.close();
          resolve(answer);
        }
      );
    });
  }

  private convertInput(
    input: string
  ): Value {
    const value = input.trim();

    if (
      value.toLowerCase() === "true"
    ) {
      return true;
    }

    if (
      value.toLowerCase() === "false"
    ) {
      return false;
    }

    if (
      value !== "" &&
      !Number.isNaN(Number(value))
    ) {
      return Number(value);
    }

    return value;
  }

  private async executeIf(
    statement: IfStatement
  ): Promise<void> {
    const condition = await this.evaluate(
      statement.condition
    );

    if (this.isTruthy(condition)) {
      for (const childStatement of statement.thenBranch) {
        await this.execute(
          childStatement
        );
      }
    } else if (statement.elseBranch) {
      for (const childStatement of statement.elseBranch) {
        await this.execute(
          childStatement
        );
      }
    }
  }

  private async executeWhile(
    statement: WhileStatement
  ): Promise<void> {
    while (
      this.isTruthy(
        await this.evaluate(
          statement.condition
        )
      )
    ) {
      for (const childStatement of statement.body) {
        await this.execute(
          childStatement
        );
      }
    }
  }

  private async evaluate(
    expression: Expression
  ): Promise<Value> {
    switch (expression.type) {
      case "LiteralExpression":
        return expression.value;

      case "VariableExpression":
        return this.getVariable(
          expression.name
        );

      case "BinaryExpression":
        return await this.evaluateBinary(
          expression
        );

      case "CallExpression":
        return await this.executeCall(
          expression
        );
    }
  }

  private async executeCall(
    expression: CallExpression
  ): Promise<Value> {
    const functionStatement =
      this.functions.get(
        expression.name
      );

    if (!functionStatement) {
      throw new Error(
        `Undefined function '${expression.name}'.`
      );
    }

    if (
      expression.arguments.length !==
      functionStatement.parameters.length
    ) {
      throw new Error(
        `Function '${expression.name}' expects ${functionStatement.parameters.length} argument(s), but got ${expression.arguments.length}.`
      );
    }

    // Evaluate the arguments BEFORE changing
    // the current variable scope.
    const argumentValues: Value[] = [];

    for (
      const argument of expression.arguments
    ) {
      argumentValues.push(
        await this.evaluate(argument)
      );
    }

    // Save the current variables.
    const previousVariables =
      this.variables;

    // Create a fresh local scope.
    this.variables =
      new Map<string, Value>();

    // Put arguments into the local scope.
    for (
      let i = 0;
      i < functionStatement.parameters.length;
      i++
    ) {
      const parameter =
        functionStatement.parameters[i];

      const value =
        argumentValues[i];

      this.variables.set(
        parameter,
        value
      );
    }

    try {
      for (
        const statement of functionStatement.body
      ) {
        await this.execute(statement);
      }

      // No return statement.
      return true;
    } catch (error) {
      if (error instanceof ReturnSignal) {
        return (
          error.value ?? true
        );
      }

      throw error;
    } finally {
      // Restore the previous scope.
      this.variables =
        previousVariables;
    }
  }

  private getVariable(
    name: string
  ): Value {
    if (!this.variables.has(name)) {
      throw new Error(
        `Undefined variable '${name}'.`
      );
    }

    return this.variables.get(name)!;
  }

  private isTruthy(
    value: Value
  ): boolean {
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

  private async evaluateBinary(
    expression: BinaryExpression
  ): Promise<Value> {
    const left =
      await this.evaluate(
        expression.left
      );

    const right =
      await this.evaluate(
        expression.right
      );

    switch (expression.operator) {
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

      case "-":
        return (
          this.toNumber(left) -
          this.toNumber(right)
        );

      case "*":
        return (
          this.toNumber(left) *
          this.toNumber(right)
        );

      case "/":
        return (
          this.toNumber(left) /
          this.toNumber(right)
        );

      case "==":
        return left === right;

      case "!=":
        return left !== right;

      case "<":
        return this.compare(
          left,
          right,
          "<"
        );

      case "<=":
        return this.compare(
          left,
          right,
          "<="
        );

      case ">":
        return this.compare(
          left,
          right,
          ">"
        );

      case ">=":
        return this.compare(
          left,
          right,
          ">="
        );

      case "and":
        return (
          this.isTruthy(left) &&
          this.isTruthy(right)
        );

      case "or":
        return (
          this.isTruthy(left) ||
          this.isTruthy(right)
        );

      case "not":
        return !this.isTruthy(right);

      default:
        throw new Error(
          `Unknown operator '${expression.operator}'.`
        );
    }
  }

  private toNumber(
    value: Value
  ): number {
    if (typeof value === "number") {
      return value;
    }

    throw new Error(
      `Expected number but got ${typeof value}.`
    );
  }

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