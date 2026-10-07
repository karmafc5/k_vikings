import { Token, TokenType } from "./token";
import {
  Program,
  Statement,
  SetStatement,
  SayStatement,
  AskStatement,
  IfStatement,
  Expression,
  LiteralExpression,
  VariableExpression,
  BinaryExpression,
} from "./ast";

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Program {
    const statements: Statement[] = [];

    while (!this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }

      statements.push(this.statement());
    }

    return { statements };
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

    throw this.error(
      this.peek(),
      `Expected 'set', 'say', 'ask', or 'if'.`
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

    this.consume(
      TokenType.NEWLINE,
      "Expected new line after set statement."
    );

    return {
      type: "SetStatement",
      name: name.value,
      value,
    };
  }

  private sayStatement(): SayStatement {
    const expression = this.expression();

    if (this.check(TokenType.NEWLINE)) {
      this.advance();
    }

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

    if (this.check(TokenType.NEWLINE)) {
      this.advance();
    }

    return {
      type: "AskStatement",
      name: name.value,
    };
  }

  private ifStatement(): IfStatement {
    const condition = this.expression();

    this.consume(
      TokenType.NEWLINE,
      "Expected new line after if condition."
    );

    while (this.match(TokenType.NEWLINE)) {
      // Skip empty lines after the if condition.
    }

    const thenBranch: Statement[] = [];

    if (!this.isAtEnd()) {
      thenBranch.push(this.statement());
    }

    return {
      type: "IfStatement",
      condition,
      thenBranch,
    };
  }

  private expression(): Expression {
    return this.equality();
  }

  private equality(): Expression {
    let expression = this.comparison();

    while (
      this.match(TokenType.EQUAL_EQUAL, TokenType.NOT_EQUAL)
    ) {
      const operator = this.previous();
      const right = this.comparison();

      expression = {
        type: "BinaryExpression",
        left: expression,
        operator: operator.value,
        right,
      };
    }

    return expression;
  }

  private comparison(): Expression {
    let expression = this.term();

    while (
      this.match(
        TokenType.LESS,
        TokenType.LESS_EQUAL,
        TokenType.GREATER,
        TokenType.GREATER_EQUAL
      )
    ) {
      const operator = this.previous();
      const right = this.term();

      expression = {
        type: "BinaryExpression",
        left: expression,
        operator: operator.value,
        right,
      };
    }

    return expression;
  }

  private term(): Expression {
    let expression = this.factor();

    while (
      this.match(TokenType.PLUS, TokenType.MINUS)
    ) {
      const operator = this.previous();
      const right = this.factor();

      expression = {
        type: "BinaryExpression",
        left: expression,
        operator: operator.value,
        right,
      };
    }

    return expression;
  }

  private factor(): Expression {
    let expression = this.primary();

    while (
      this.match(TokenType.STAR, TokenType.SLASH)
    ) {
      const operator = this.previous();
      const right = this.primary();

      expression = {
        type: "BinaryExpression",
        left: expression,
        operator: operator.value,
        right,
      };
    }

    return expression;
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

    if (this.match(TokenType.IDENTIFIER)) {
      return {
        type: "VariableExpression",
        name: this.previous().value,
      };
    }

    throw this.error(
      this.peek(),
      "Expected expression."
    );
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
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

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) {
      return type === TokenType.EOF;
    }

    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }

    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private error(token: Token, message: string): Error {
    return new Error(
      `[line ${token.line}] Error: ${message}`
    );
  }
}