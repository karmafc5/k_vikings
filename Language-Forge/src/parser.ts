import { Token, TokenType } from "./token";

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
  ExpressionStatement,
  Expression,
} from "./ast";

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Program {
    const statements: Statement[] = [];

    this.skipNewlines();

    while (!this.isAtEnd()) {
      statements.push(this.statement());
      this.skipNewlines();
    }

    return {
      statements,
    };
  }

  private statement(): Statement {
    if (this.match(TokenType.SET)) {
      return this.setStatement();
    }

    if (this.match(TokenType.SAY)) {
      return this.sayStatement();
    }

    if (this.match(TokenType.ASK)) {
      return this.askStatement();
    }

    if (this.match(TokenType.IF)) {
      return this.ifStatement();
    }

    if (this.match(TokenType.WHILE)) {
      return this.whileStatement();
    }

    if (this.match(TokenType.FUNCTION)) {
      return this.functionStatement();
    }

    if (this.match(TokenType.RETURN)) {
      return this.returnStatement();
    }

    if (this.check(TokenType.IDENTIFIER)) {
      return this.expressionStatement();
    }

    throw this.error(
      this.peek(),
      "Expected 'set', 'say', 'ask', 'if', 'while', 'function', or 'return'."
    );
  }

  private setStatement(): SetStatement {
    const name = this.consume(
      TokenType.IDENTIFIER,
      "Expected variable name after 'set'."
    );

    this.consume(
      TokenType.EQUAL,
      "Expected '=' after variable name."
    );

    const value = this.expression();

    this.consumeLineEnd();

    return {
      type: "SetStatement",
      name: name.value,
      value,
    };
  }

  private sayStatement(): SayStatement {
    const expression = this.expression();

    this.consumeLineEnd();

    return {
      type: "SayStatement",
      expression,
    };
  }

  private askStatement(): AskStatement {
    const name = this.consume(
      TokenType.IDENTIFIER,
      "Expected variable name after 'ask'."
    );

    let prompt: string | undefined;

    if (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
      const promptToken = this.consume(
        TokenType.STRING,
        "Expected a string prompt after the variable name."
      );

      prompt = promptToken.value;
    }

    this.consumeLineEnd();

    return {
      type: "AskStatement",
      name: name.value,
      prompt,
    };
  }

  private ifStatement(): IfStatement {
    const condition = this.expression();

    this.consumeLineEnd();

    this.consume(
      TokenType.INDENT,
      "Expected indented block after 'if'."
    );

    const thenBranch: Statement[] = [];

    this.skipNewlines();

    while (
      !this.isAtEnd() &&
      !this.check(TokenType.DEDENT)
    ) {
      thenBranch.push(this.statement());
      this.skipNewlines();
    }

    this.consume(
      TokenType.DEDENT,
      "Expected end of 'if' block."
    );

    let elseBranch: Statement[] | undefined;

    if (this.match(TokenType.ELSE)) {
      this.consumeLineEnd();

      this.consume(
        TokenType.INDENT,
        "Expected indented block after 'else'."
      );

      elseBranch = [];

      this.skipNewlines();

      while (
        !this.isAtEnd() &&
        !this.check(TokenType.DEDENT)
      ) {
        elseBranch.push(this.statement());
        this.skipNewlines();
      }

      this.consume(
        TokenType.DEDENT,
        "Expected end of 'else' block."
      );
    }

    return {
      type: "IfStatement",
      condition,
      thenBranch,
      elseBranch,
    };
  }

  private whileStatement(): WhileStatement {
    const condition = this.expression();

    this.consumeLineEnd();

    this.consume(
      TokenType.INDENT,
      "Expected indented block after 'while'."
    );

    const body: Statement[] = [];

    this.skipNewlines();

    while (
      !this.isAtEnd() &&
      !this.check(TokenType.DEDENT)
    ) {
      body.push(this.statement());
      this.skipNewlines();
    }

    this.consume(
      TokenType.DEDENT,
      "Expected end of 'while' block."
    );

    return {
      type: "WhileStatement",
      condition,
      body,
    };
  }

  private functionStatement(): FunctionStatement {
    const name = this.consume(
      TokenType.IDENTIFIER,
      "Expected function name after 'function'."
    );

    this.consume(
      TokenType.LEFT_PAREN,
      "Expected '(' after function name."
    );

    const parameters: string[] = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        const parameter = this.consume(
          TokenType.IDENTIFIER,
          "Expected parameter name."
        );

        parameters.push(parameter.value);
      } while (
        this.match(TokenType.COMMA)
      );
    }

    this.consume(
      TokenType.RIGHT_PAREN,
      "Expected ')' after parameters."
    );

    this.consumeLineEnd();

    this.consume(
      TokenType.INDENT,
      "Expected indented block after function."
    );

    const body: Statement[] = [];

    this.skipNewlines();

    while (
      !this.isAtEnd() &&
      !this.check(TokenType.DEDENT)
    ) {
      body.push(this.statement());
      this.skipNewlines();
    }

    this.consume(
      TokenType.DEDENT,
      "Expected end of function block."
    );

    return {
      type: "FunctionStatement",
      name: name.value,
      parameters,
      body,
    };
  }

  private returnStatement(): ReturnStatement {
    let value: Expression | undefined;

    if (
      !this.check(TokenType.NEWLINE) &&
      !this.isAtEnd()
    ) {
      value = this.expression();
    }

    this.consumeLineEnd();

    return {
      type: "ReturnStatement",
      value,
    };
  }

  private expressionStatement(): ExpressionStatement {
    const expression = this.expression();

    this.consumeLineEnd();

    return {
      type: "ExpressionStatement",
      expression,
    };
  }

  private expression(): Expression {
    return this.or();
  }

  private or(): Expression {
    let expression = this.and();

    while (this.match(TokenType.OR)) {
      const operator = this.previous().value;
      const right = this.and();

      expression = {
        type: "BinaryExpression",
        left: expression,
        operator,
        right,
      };
    }

    return expression;
  }

  private and(): Expression {
    let expression = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous().value;
      const right = this.equality();

      expression = {
        type: "BinaryExpression",
        left: expression,
        operator,
        right,
      };
    }

    return expression;
  }

  private equality(): Expression {
    let expression = this.comparison();

    while (
      this.match(TokenType.EQUAL_EQUAL) ||
      this.match(TokenType.NOT_EQUAL)
    ) {
      const operator = this.previous().value;
      const right = this.comparison();

      expression = {
        type: "BinaryExpression",
        left: expression,
        operator,
        right,
      };
    }

    return expression;
  }

  private comparison(): Expression {
    let expression = this.term();

    while (
      this.match(TokenType.LESS) ||
      this.match(TokenType.LESS_EQUAL) ||
      this.match(TokenType.GREATER) ||
      this.match(TokenType.GREATER_EQUAL)
    ) {
      const operator = this.previous().value;
      const right = this.term();

      expression = {
        type: "BinaryExpression",
        left: expression,
        operator,
        right,
      };
    }

    return expression;
  }

  private term(): Expression {
    let expression = this.factor();

    while (
      this.match(TokenType.PLUS) ||
      this.match(TokenType.MINUS)
    ) {
      const operator = this.previous().value;
      const right = this.factor();

      expression = {
        type: "BinaryExpression",
        left: expression,
        operator,
        right,
      };
    }

    return expression;
  }

  private factor(): Expression {
    let expression = this.unary();

    while (
      this.match(TokenType.STAR) ||
      this.match(TokenType.SLASH)
    ) {
      const operator = this.previous().value;
      const right = this.unary();

      expression = {
        type: "BinaryExpression",
        left: expression,
        operator,
        right,
      };
    }

    return expression;
  }

  private unary(): Expression {
    if (this.match(TokenType.NOT)) {
      const right = this.unary();

      return {
        type: "BinaryExpression",
        left: {
          type: "LiteralExpression",
          value: true,
        },
        operator: "not",
        right,
      };
    }

    if (this.match(TokenType.MINUS)) {
      const right = this.unary();

      return {
        type: "BinaryExpression",
        left: {
          type: "LiteralExpression",
          value: 0,
        },
        operator: "-",
        right,
      };
    }

    return this.primary();
  }

  private primary(): Expression {
    if (this.match(TokenType.NUMBER)) {
      return {
        type: "LiteralExpression",
        value: Number(this.previous().value),
      };
    }

    if (this.match(TokenType.STRING)) {
      return {
        type: "LiteralExpression",
        value: this.previous().value,
      };
    }

    if (this.match(TokenType.TRUE)) {
      return {
        type: "LiteralExpression",
        value: true,
      };
    }

    if (this.match(TokenType.FALSE)) {
      return {
        type: "LiteralExpression",
        value: false,
      };
    }

    if (this.match(TokenType.IDENTIFIER)) {
      const name = this.previous().value;

      if (this.match(TokenType.LEFT_PAREN)) {
        const args: Expression[] = [];

        if (!this.check(TokenType.RIGHT_PAREN)) {
          do {
            args.push(this.expression());
          } while (this.match(TokenType.COMMA));
        }

        this.consume(
          TokenType.RIGHT_PAREN,
          "Expected ')' after arguments."
        );

        return {
          type: "CallExpression",
          name,
          arguments: args,
        };
      }

      return {
        type: "VariableExpression",
        name,
      };
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expression = this.expression();

      this.consume(
        TokenType.RIGHT_PAREN,
        "Expected ')' after expression."
      );

      return expression;
    }

    throw this.error(
      this.peek(),
      "Expected expression."
    );
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }

    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) {
      return type === TokenType.EOF;
    }

    return this.peek().type === type;
  }

  private consume(
    type: TokenType,
    message: string
  ): Token {
    if (this.check(type)) {
      return this.advance();
    }

    throw this.error(this.peek(), message);
  }

  private consumeLineEnd(): void {
    if (this.check(TokenType.NEWLINE)) {
      this.advance();
      return;
    }

    if (this.isAtEnd()) {
      return;
    }

    throw this.error(
      this.peek(),
      "Expected end of line."
    );
  }

  private skipNewlines(): void {
    while (this.check(TokenType.NEWLINE)) {
      this.advance();
    }
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }

    return this.previous();
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private error(
    token: Token,
    message: string
  ): Error {
    return new Error(
      `[line ${token.line}] Error: ${message}`
    );
  }
}