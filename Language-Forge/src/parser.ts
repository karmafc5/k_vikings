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

    while (!this.isAtEnd()) {
      this.skipNewlines();

      if (this.isAtEnd()) {
        break;
      }

      statements.push(this.statement());
    }

    return {
      statements,
    };
  }

  private statement(): Statement {
    this.skipNewlines();

    if (this.matchLexeme("set")) {
      return this.setStatement();
    }

    if (this.matchLexeme("say")) {
      return this.sayStatement();
    }

    if (this.matchLexeme("ask")) {
      return this.askStatement();
    }

    if (this.matchLexeme("if")) {
      return this.ifStatement();
    }

    if (this.matchLexeme("while")) {
      return this.whileStatement();
    }

    throw this.error(
      this.peek(),
      "Expected 'set', 'say', 'ask', 'if', or 'while'."
    );
  }

  private setStatement(): SetStatement {
    const name = this.consumeIdentifier(
      "Expected variable name after 'set'."
    );

    this.consumeLexeme(
      "=",
      "Expected '=' after variable name."
    );

    const value = this.expression();

    this.consumeLineEnd();

    return {
      type: "SetStatement",
      name,
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
    const name = this.consumeIdentifier(
      "Expected variable name after 'ask'."
    );

    let prompt: string | undefined;

    if (!this.isAtLineEnd()) {
      prompt = this.consumeString(
        "Expected a string prompt after the variable name."
      );
    }

    this.consumeLineEnd();

    return {
      type: "AskStatement",
      name,
      prompt,
    };
  }

  private ifStatement(): IfStatement {
    const condition = this.expression();

    this.consumeLineEnd();

    const thenBranch = this.block();

    let elseBranch: Statement[] | undefined;

    if (this.checkLexeme("else")) {
      this.advance();
      this.consumeLineEnd();

      elseBranch = this.block();
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

    const body = this.block();

    return {
      type: "WhileStatement",
      condition,
      body,
    };
  }

  private block(): Statement[] {
    const statements: Statement[] = [];

    this.skipNewlines();

    while (!this.isAtEnd()) {
      if (this.checkLexeme("else")) {
        break;
      }

      if (this.isIndented()) {
        statements.push(this.statement());
      } else {
        break;
      }

      this.skipNewlines();
    }

    return statements;
  }

  private expression(): Expression {
    return this.or();
  }

  private or(): Expression {
    let expression = this.and();

    while (this.matchLexeme("or")) {
      const operator = this.previous().lexeme;
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

    while (this.matchLexeme("and")) {
      const operator = this.previous().lexeme;
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
      this.matchLexeme("==") ||
      this.matchLexeme("!=")
    ) {
      const operator = this.previous().lexeme;
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
      this.matchLexeme("<") ||
      this.matchLexeme("<=") ||
      this.matchLexeme(">") ||
      this.matchLexeme(">=")
    ) {
      const operator = this.previous().lexeme;
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
      this.matchLexeme("+") ||
      this.matchLexeme("-")
    ) {
      const operator = this.previous().lexeme;
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
      this.matchLexeme("*") ||
      this.matchLexeme("/")
    ) {
      const operator = this.previous().lexeme;
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
    if (this.matchLexeme("not")) {
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

    return this.primary();
  }

  private primary(): Expression {
    if (this.match(TokenType.NUMBER)) {
      return {
        type: "LiteralExpression",
        value: Number(this.previous().lexeme),
      };
    }

    if (this.match(TokenType.STRING)) {
      return {
        type: "LiteralExpression",
        value: this.previous().lexeme,
      };
    }

    if (this.matchLexeme("true")) {
      return {
        type: "LiteralExpression",
        value: true,
      };
    }

    if (this.matchLexeme("false")) {
      return {
        type: "LiteralExpression",
        value: false,
      };
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return {
        type: "VariableExpression",
        name: this.previous().lexeme,
      };
    }

    if (this.matchLexeme("(")) {
      const expression = this.expression();

      this.consumeLexeme(
        ")",
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

  private matchLexeme(lexeme: string): boolean {
    if (this.checkLexeme(lexeme)) {
      this.advance();
      return true;
    }

    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) {
      return false;
    }

    return this.peek().type === type;
  }

  private checkLexeme(lexeme: string): boolean {
    if (this.isAtEnd()) {
      return false;
    }

    return this.peek().lexeme === lexeme;
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

  private skipNewlines(): void {
    while (
      !this.isAtEnd() &&
      this.peek().type === TokenType.NEWLINE
    ) {
      this.advance();
    }
  }

  private isAtLineEnd(): boolean {
    return (
      this.isAtEnd() ||
      this.peek().type === TokenType.NEWLINE
    );
  }

  private consumeLineEnd(): void {
    if (!this.isAtEnd()) {
      if (this.peek().type === TokenType.NEWLINE) {
        this.advance();
      } else {
        throw this.error(
          this.peek(),
          "Expected end of line."
        );
      }
    }
  }

  private consumeIdentifier(message: string): string {
    if (this.match(TokenType.IDENTIFIER)) {
      return this.previous().lexeme;
    }

    throw this.error(this.peek(), message);
  }

  private consumeString(message: string): string {
    if (this.match(TokenType.STRING)) {
      return this.previous().lexeme;
    }

    throw this.error(this.peek(), message);
  }

  private consumeLexeme(
    lexeme: string,
    message: string
  ): Token {
    if (this.matchLexeme(lexeme)) {
      return this.previous();
    }

    throw this.error(this.peek(), message);
  }

  private isIndented(): boolean {
    return this.peek().indent > 0;
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