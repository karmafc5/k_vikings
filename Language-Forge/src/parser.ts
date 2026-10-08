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
      return this.setStatement(this.previous().line);
    }

    if (this.match(TokenType.SAY)) {
      return this.sayStatement(this.previous().line);
    }

    if (this.match(TokenType.ASK)) {
      return this.askStatement(this.previous().line);
    }

    if (this.match(TokenType.IF)) {
      return this.ifStatement(this.previous().line);
    }

    if (this.match(TokenType.WHILE)) {
      return this.whileStatement(this.previous().line);
    }

    throw this.error(
      this.peek(),
      "Expected 'set', 'say', 'ask', 'if', or 'while'."
    );
  }

  // --------------------------------------------------
  // SET
  // --------------------------------------------------

  private setStatement(line: number): SetStatement {
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
      kind: "set",
      line,
      name: name.value,
      value,
      expression: value,
    };
  }

  // --------------------------------------------------
  // SAY
  // --------------------------------------------------

  private sayStatement(line: number): SayStatement {
    const expression = this.expression();

    this.consumeLineEnd();

    return {
      type: "SayStatement",
      kind: "say",
      line,
      expression,
    };
  }

  // --------------------------------------------------
  // ASK
  // --------------------------------------------------

  private askStatement(line: number): AskStatement {
    const name = this.consume(
      TokenType.IDENTIFIER,
      "Expected variable name after 'ask'."
    );

    let prompt: string | undefined;

    /*
     * Optional custom prompt:
     *
     * ask name "What is your name?"
     */

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
      kind: "ask",
      line,
      name: name.value,
      prompt,
    };
  }

  // --------------------------------------------------
  // IF
  // --------------------------------------------------

  private ifStatement(line: number): IfStatement {
    const condition = this.expression();

    this.consumeLineEnd();

    /*
     * The next token should be INDENT.
     */
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

    /*
     * Check for else.
     */
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
      kind: "if",
      line,
      condition,
      thenBranch,
      elseBranch,
    };
  }

  // --------------------------------------------------
  // WHILE
  // --------------------------------------------------

  private whileStatement(line: number): WhileStatement {
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
      kind: "while",
      line,
      condition,
      body,
    };
  }

  // --------------------------------------------------
  // EXPRESSIONS
  // --------------------------------------------------

  private expression(): Expression {
    return this.or();
  }

  // OR
  private or(): Expression {
    let expression = this.and();

    while (this.match(TokenType.OR)) {
      const operator = this.previous().value;
      const right = this.and();

      expression = {
        type: "BinaryExpression",
        kind: "binary",
        line: this.previous().line,
        left: expression,
        operator,
        right,
      };
    }

    return expression;
  }

  // AND
  private and(): Expression {
    let expression = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous().value;
      const right = this.equality();

      expression = {
        type: "BinaryExpression",
        kind: "binary",
        line: this.previous().line,
        left: expression,
        operator,
        right,
      };
    }

    return expression;
  }

  // == !=
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
        kind: "binary",
        line: this.previous().line,
        left: expression,
        operator,
        right,
      };
    }

    return expression;
  }

  // < <= > >=
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
        kind: "binary",
        line: this.previous().line,
        left: expression,
        operator,
        right,
      };
    }

    return expression;
  }

  // + -
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
        kind: "binary",
        line: this.previous().line,
        left: expression,
        operator,
        right,
      };
    }

    return expression;
  }

  // * /
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
        kind: "binary",
        line: this.previous().line,
        left: expression,
        operator,
        right,
      };
    }

    return expression;
  }

  // NOT
  private unary(): Expression {
    if (this.match(TokenType.NOT)) {
      const right = this.unary();

      /*
       * Vico currently represents "not" as
       * a BinaryExpression.
       *
       * We keep this because the interpreter
       * already supports it.
       */

      return {
        type: "BinaryExpression",
        kind: "binary",
        line: this.previous().line,
        left: {
          type: "LiteralExpression",
          kind: "literal",
          line: this.previous().line,
          value: true,
        },
        operator: "not",
        right,
      };
    }

    return this.primary();
  }

  // --------------------------------------------------
  // PRIMARY
  // --------------------------------------------------

  private primary(): Expression {
    if (this.match(TokenType.NUMBER)) {
      const token = this.previous();
      return {
        type: "LiteralExpression",
        kind: "literal",
        line: token.line,
        value: Number(token.value),
      };
    }

    if (this.match(TokenType.STRING)) {
      const token = this.previous();
      return {
        type: "LiteralExpression",
        kind: "literal",
        line: token.line,
        value: token.value,
      };
    }

    if (this.match(TokenType.TRUE)) {
      const token = this.previous();
      return {
        type: "LiteralExpression",
        kind: "literal",
        line: token.line,
        value: true,
      };
    }

    if (this.match(TokenType.FALSE)) {
      const token = this.previous();
      return {
        type: "LiteralExpression",
        kind: "literal",
        line: token.line,
        value: false,
      };
    }

    if (this.match(TokenType.IDENTIFIER)) {
      const token = this.previous();
      return {
        type: "VariableExpression",
        kind: "variable",
        line: token.line,
        name: token.value,
      };
    }

    /*
     * Parentheses.
     *
     * Example:
     *
     * (10 + 5) * 2
     */

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

  // --------------------------------------------------
  // TOKEN HELPERS
  // --------------------------------------------------

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