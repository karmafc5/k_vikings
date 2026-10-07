import { Token, TokenType } from "./token";

export class Lexer {
  private source: string;
  private tokens: Token[] = [];

  private start = 0;
  private current = 0;
  private line = 1;
  private tokenLine = 1;

  constructor(source: string) {
    this.source = source;
  }

  scanTokens(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.tokenLine = this.line;
      this.scanToken();
    }

    this.tokens.push({
      type: TokenType.EOF,
      value: "",
      line: this.line,
    });

    return this.tokens;
  }

  private scanToken(): void {
    const c = this.advance();

    switch (c) {
      case "+":
        this.addToken(TokenType.PLUS);
        break;

      case "-":
        this.addToken(TokenType.MINUS);
        break;

      case "*":
        this.addToken(TokenType.STAR);
        break;

      case "/":
        if (this.peek() === "/") {
          while (this.peek() !== "\n" && !this.isAtEnd()) {
            this.advance();
          }
        } else {
          this.addToken(TokenType.SLASH);
        }
        break;

      case "=":
        this.addToken(TokenType.EQUAL);
        break;

      case "(":
        this.addToken(TokenType.LEFT_PAREN);
        break;

      case ")":
        this.addToken(TokenType.RIGHT_PAREN);
        break;

      case " ":
      case "\r":
      case "\t":
        break;

      case "\n":
        this.addToken(TokenType.NEWLINE);
        this.line++;
        break;

      case '"':
        this.string();
        break;

      default:
        if (this.isDigit(c)) {
          this.number();
        } else if (this.isAlpha(c)) {
          this.identifier();
        } else {
          throw new Error(
            `[line ${this.line}] Unexpected character: ${c}`
          );
        }
    }
  }

  private identifier(): void {
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    const text = this.source.substring(this.start, this.current);

    switch (text) {
      case "ask":
        this.addToken(TokenType.ASK);
        break;

      case "say":
        this.addToken(TokenType.SAY);
        break;

      case "set":
        this.addToken(TokenType.SET);
        break;

      default:
        this.addToken(TokenType.IDENTIFIER);
        break;
    }
  }

  private number(): void {
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    if (this.peek() === "." && this.isDigit(this.peekNext())) {
      this.advance();
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    this.addToken(TokenType.NUMBER);
  }

  private string(): void {
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === "\\") {
        this.advance();
        if (!this.isAtEnd()) {
          this.advance();
        }
      } else if (this.peek() === "\n") {
        this.line++;
        this.advance();
      } else {
        this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new Error(
        `[line ${this.line}] Unterminated string.`
      );
    }

    this.advance();

    const rawValue = this.source.substring(
      this.start + 1,
      this.current - 1
    );
    const value = rawValue.replace(/\\([\\nrt"])/g, (_match, escaped: string) => {
      switch (escaped) {
        case "n": return "\n";
        case "r": return "\r";
        case "t": return "\t";
        default: return escaped;
      }
    });

    this.addToken(TokenType.STRING, value);
  }

  private advance(): string {
    return this.source[this.current++];
  }

  private peek(): string {
    if (this.isAtEnd()) {
      return "\0";
    }

    return this.source[this.current];
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) {
      return "\0";
    }

    return this.source[this.current + 1];
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private addToken(type: TokenType, value?: string): void {
    const text =
      value ?? this.source.substring(this.start, this.current);

    this.tokens.push({
      type,
      value: text,
      line: this.tokenLine,
    });
  }

  private isDigit(c: string): boolean {
    return c >= "0" && c <= "9";
  }

  private isAlpha(c: string): boolean {
    return (
      (c >= "a" && c <= "z") ||
      (c >= "A" && c <= "Z") ||
      c === "_"
    );
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }
}