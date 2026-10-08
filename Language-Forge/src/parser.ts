import { Token, TokenType } from "./token";

import {
  Program,
  Statement,
  SetStatement,
  SayStatement,
  AskStatement,
  IfStatement,
  WhileStatement,
  Expression,
} from "./ast";

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.current = 0;
  }

  parse(): Program {
    const statements: Statement[] = [];

    while (!this.isAtEnd()) {
      // Ignore blank lines.
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }

      // Indentation at the top level is invalid.
      if (this.check(TokenType.INDENT)) {
        throw this.error(
          this.peek(),
          "Unexpected indentation."
        );
      }

      statements.push(this.statement());
    }

    return {
      statements,
    };
  }

  // ============================================================
  // STATEMENTS
  // ============================================================

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

    throw this.error(
      this.peek(),
      "Expected 'set', 'say', 'ask', 'if', or 'while'."
    );
  }

  // ============================================================
  // SET
  // ============================================================

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

  // ============================================================
  // SAY
  // ============================================================

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

  // ============================================================
  // ASK
  // ============================================================

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

  // ============================================================
  // IF / ELSE
  // ============================================================

  private ifStatement(): IfStatement {
    const condition = this.expression();

    this.consume(
      TokenType.NEWLINE,
      "Expected new line after if condition."
    );

    this.skipNewlines();

    this.consume(
      TokenType.INDENT,
      "Expected indented block after if."
    );

    const thenBranch: Statement[] = [];

    while (
      !this.isAtEnd() &&
      !this.check(TokenType.DEDENT)
    ) {
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }

      thenBranch.push(this.statement());
    }

    this.consume(
      TokenType.DEDENT,
      "Expected end of if block."
    );

    let elseBranch: Statement[] | undefined;

    this.skipNewlines();

    if (this.match(TokenType.ELSE)) {
      this.consume(
        TokenType.NEWLINE,
        "Expected new line after else."
      );

      this.skipNewlines();

      this.consume(
        TokenType.INDENT,
        "Expected indented block after else."
      );

      elseBranch = [];

      while (
        !this.isAtEnd() &&
        !this.check(TokenType.DEDENT)
      ) {
        if (this.match(TokenType.NEWLINE)) {
          continue;
        }

        elseBranch.push(this.statement());
      }

      this.consume(
        TokenType.DEDENT,
        "Expected end of else block."
      );
    }

    return {
      type: "IfStatement",
      condition,
      thenBranch,
      elseBranch,
    };
  }

  // ============================================================
  // WHILE
  // ============================================================

  private whileStatement(): WhileStatement {
    const condition = this.expression();

    this.consume(
      TokenType.NEWLINE,
      "Expected new line after while condition."
    );

    this.skipNewlines();

    this.consume(
      TokenType.INDENT,
      "Expected indented block after while."
    );

    const body: Statement[] = [];

    while (
      !this.isAtEnd() &&
      !this.check(TokenType.DEDENT)
    ) {
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }

      body.push(this.statement());
    }

    this.consume(
      TokenType.DEDENT,
      "Expected end of while block."
    );

    return {
      type: "WhileStatement",
      condition,
      body,
    };
  }

  // ============================================================
  // EXPRESSIONS
  // ============================================================

  /*
   * Expression precedence:
   *
   * or
   *   ↓
   * and
   *   ↓
   * equality
   *   ↓
   * comparison
   *   ↓
   * term
   *   ↓
   * factor
   *   ↓
   * primary
   */

  private expression(): Expression {
    return this.or();
  }

  // ============================================================
  // OR
  // ============================================================

  private or(): Expression {
    let expression = this.and();

    while (this.match(TokenType.OR)) {
      const operator = this.previous();

      const right = this.and();

      expression = {
        type: "BinaryExpression",
        left: expression,
        operator: operator.value,
        right,
      };
    }

    return expression;
  }

  // ============================================================
  // AND
  // ============================================================

  private and(): Expression {
    let expression = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous();

      const right = this.equality();

      expression = {
        type: "BinaryExpression",
        left: expression,
        operator: operator.value,
        right,
      };
    }

    return expression;
  }

  // ============================================================
  // EQUALITY
  // ============================================================

  private equality(): Expression {
    let expression = this.comparison();

    while (
      this.match(
        TokenType.EQUAL_EQUAL,
        TokenType.NOT_EQUAL
      )
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

  // ============================================================
  // COMPARISON
  // ============================================================

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

  // ============================================================
  // ADDITION / SUBTRACTION
  // ============================================================

  private term(): Expression {
    let expression = this.factor();

    while (
      this.match(
        TokenType.PLUS,
        TokenType.MINUS
      )
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

  // ============================================================
  // MULTIPLICATION / DIVISION
  // ============================================================

  private factor(): Expression {
    let expression = this.primary();

    while (
      this.match(
        TokenType.STAR,
        TokenType.SLASH
      )
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

  // ============================================================
  // PRIMARY
  // ============================================================

  private primary(): Expression {
    // Number
    if (this.match(TokenType.NUMBER)) {
      return {
        type: "LiteralExpression",
        value: Number(this.previous().value),
      };
    }

    // String
    if (this.match(TokenType.STRING)) {
      return {
        type: "LiteralExpression",
        value: this.previous().value,
      };
    }

    // true
    if (this.match(TokenType.TRUE)) {
      return {
        type: "LiteralExpression",
        value: true,
      };
    }

    // false
    if (this.match(TokenType.FALSE)) {
      return {
        type: "LiteralExpression",
        value: false,
      };
    }

    // Variable
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

  // ============================================================
  // NEWLINES
  // ============================================================

  private skipNewlines(): void {
    while (this.match(TokenType.NEWLINE)) {
      // Keep consuming blank lines.
    }
  }

  // ============================================================
  // TOKEN HELPERS
  // ============================================================

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

    throw this.error(
      this.peek(),
      message
    );
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

  // ============================================================
  // ERROR HANDLING
  // ============================================================

  private error(
    token: Token,
    message: string
  ): Error {
    return new Error(
      `[line ${token.line}] Error: ${message}`
    );
  }
}