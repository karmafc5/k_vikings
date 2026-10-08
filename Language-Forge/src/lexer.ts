import { Token, TokenType } from "./token";

export class Lexer {
  private source: string;
  private tokens: Token[] = [];

  private start = 0;
  private current = 0;
  private line = 1;

  // Indentation levels.
  // 0 means the top level.
  private indentStack: number[] = [0];

  // True when we are at the beginning of a line.
  private atLineStart = true;

  constructor(source: string) {
    this.source = source;
  }

  scanTokens(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;

      /*
       * At the beginning of every line, determine
       * whether we need INDENT or DEDENT.
       */
      if (this.atLineStart) {
        this.handleIndentation();

        if (this.isAtEnd()) {
          break;
        }

        /*
         * handleIndentation can consume a blank line.
         * If we're still at the beginning of a line,
         * start the loop again.
         */
        if (this.atLineStart) {
          continue;
        }
      }

      this.start = this.current;
      this.scanToken();
    }

    /*
     * Close any blocks still open when the file ends.
     */
    while (this.indentStack.length > 1) {
      this.indentStack.pop();

      this.addToken(
        TokenType.DEDENT,
        "",
        this.line
      );
    }

    this.addToken(
      TokenType.EOF,
      "",
      this.line
    );

    return this.tokens;
  }

  // ==================================================
  // MAIN SCANNER
  // ==================================================

  private scanToken(): void {
    const c = this.advance();

    // Ignore spaces and tabs inside statements.
    if (c === " " || c === "\t") {
      return;
    }

    // ------------------------------------------------
    // NEWLINE
    // ------------------------------------------------

    if (c === "\n") {
      this.addToken(
        TokenType.NEWLINE,
        "\n",
        this.line
      );

      this.line++;
      this.atLineStart = true;

      return;
    }

    // Windows CRLF
    if (c === "\r") {
      if (this.peek() === "\n") {
        this.advance();
      }

      this.addToken(
        TokenType.NEWLINE,
        "\n",
        this.line
      );

      this.line++;
      this.atLineStart = true;

      return;
    }

    // ------------------------------------------------
    // COMMENTS
    // ------------------------------------------------

    if (c === "#") {
      this.skipComment();
      return;
    }

    // ------------------------------------------------
    // SINGLE CHARACTER TOKENS
    // ------------------------------------------------

    switch (c) {
      case "(":
        this.addToken(
          TokenType.LEFT_PAREN,
          "(",
          this.line
        );
        return;

      case ")":
        this.addToken(
          TokenType.RIGHT_PAREN,
          ")",
          this.line
        );
        return;

      case "+":
        this.addToken(
          TokenType.PLUS,
          "+",
          this.line
        );
        return;

      case "-":
        this.addToken(
          TokenType.MINUS,
          "-",
          this.line
        );
        return;

      case "*":
        this.addToken(
          TokenType.STAR,
          "*",
          this.line
        );
        return;

      case "/":
        this.addToken(
          TokenType.SLASH,
          "/",
          this.line
        );
        return;

      // ------------------------------------------------
      // EQUAL / EQUAL_EQUAL
      // ------------------------------------------------

      case "=":
        if (this.match("=")) {
          this.addToken(
            TokenType.EQUAL_EQUAL,
            "==",
            this.line
          );
        } else {
          this.addToken(
            TokenType.EQUAL,
            "=",
            this.line
          );
        }
        return;

      // ------------------------------------------------
      // NOT_EQUAL
      // ------------------------------------------------

      case "!":
        if (this.match("=")) {
          this.addToken(
            TokenType.NOT_EQUAL,
            "!=",
            this.line
          );
        } else {
          this.error(
            "Unexpected character: !"
          );
        }
        return;

      // ------------------------------------------------
      // LESS / LESS_EQUAL
      // ------------------------------------------------

      case "<":
        if (this.match("=")) {
          this.addToken(
            TokenType.LESS_EQUAL,
            "<=",
            this.line
          );
        } else {
          this.addToken(
            TokenType.LESS,
            "<",
            this.line
          );
        }
        return;

      // ------------------------------------------------
      // GREATER / GREATER_EQUAL
      // ------------------------------------------------

      case ">":
        if (this.match("=")) {
          this.addToken(
            TokenType.GREATER_EQUAL,
            ">=",
            this.line
          );
        } else {
          this.addToken(
            TokenType.GREATER,
            ">",
            this.line
          );
        }
        return;

      // ------------------------------------------------
      // STRING
      // ------------------------------------------------

      case '"':
        this.string();
        return;

      default:
        break;
    }

    // ------------------------------------------------
    // NUMBER
    // ------------------------------------------------

    if (this.isDigit(c)) {
      this.number();
      return;
    }

    // ------------------------------------------------
    // IDENTIFIER / KEYWORD
    // ------------------------------------------------

    if (this.isAlpha(c)) {
      this.identifier();
      return;
    }

    this.error(
      `Unexpected character: ${c}`
    );
  }

  // ==================================================
  // INDENTATION
  // ==================================================

  private handleIndentation(): void {
    let indentation = 0;

    /*
     * Count spaces and tabs at the beginning
     * of the line.
     */
    while (!this.isAtEnd()) {
      const c = this.peek();

      if (c === " ") {
        indentation++;
        this.advance();
        continue;
      }

      if (c === "\t") {
        // One tab = four spaces.
        indentation += 4;
        this.advance();
        continue;
      }

      break;
    }

    /*
     * -----------------------------------------------
     * BLANK LINE
     * -----------------------------------------------
     *
     * This is the important fix.
     *
     * If we find a blank line, consume the newline
     * here so the lexer doesn't get stuck forever.
     */

    if (this.peek() === "\n") {
      this.advance();

      this.addToken(
        TokenType.NEWLINE,
        "\n",
        this.line
      );

      this.line++;

      this.atLineStart = true;

      return;
    }

    /*
     * Windows blank line.
     */
    if (this.peek() === "\r") {
      this.advance();

      if (this.peek() === "\n") {
        this.advance();
      }

      this.addToken(
        TokenType.NEWLINE,
        "\n",
        this.line
      );

      this.line++;

      this.atLineStart = true;

      return;
    }

    /*
     * Comment-only line.
     */
    if (this.peek() === "#") {
      this.skipComment();

      /*
       * The next scan will process the newline.
       */
      return;
    }

    const currentIndent =
      this.indentStack[
        this.indentStack.length - 1
      ];

    // ------------------------------------------------
    // INCREASE INDENTATION
    // ------------------------------------------------

    if (indentation > currentIndent) {
      this.indentStack.push(indentation);

      this.addToken(
        TokenType.INDENT,
        "",
        this.line
      );

      this.atLineStart = false;

      return;
    }

    // ------------------------------------------------
    // DECREASE INDENTATION
    // ------------------------------------------------

    if (indentation < currentIndent) {
      while (
        this.indentStack.length > 1 &&
        indentation <
          this.indentStack[
            this.indentStack.length - 1
          ]
      ) {
        this.indentStack.pop();

        this.addToken(
          TokenType.DEDENT,
          "",
          this.line
        );
      }

      const newCurrentIndent =
        this.indentStack[
          this.indentStack.length - 1
        ];

      if (
        indentation !== newCurrentIndent
      ) {
        this.error(
          "Invalid indentation."
        );
      }
    }

    this.atLineStart = false;
  }

  // ==================================================
  // IDENTIFIERS
  // ==================================================

  private identifier(): void {
    while (
      this.isAlphaNumeric(this.peek())
    ) {
      this.advance();
    }

    const text = this.source.substring(
      this.start,
      this.current
    );

    let type: TokenType;

    switch (text) {
      case "set":
        type = TokenType.SET;
        break;

      case "say":
        type = TokenType.SAY;
        break;

      case "ask":
        type = TokenType.ASK;
        break;

      case "if":
        type = TokenType.IF;
        break;

      case "else":
        type = TokenType.ELSE;
        break;

      case "while":
        type = TokenType.WHILE;
        break;

      case "function":
        type = TokenType.FUNCTION;
        break;

      case "return":
        type = TokenType.RETURN;
        break;

      default:
        type = TokenType.IDENTIFIER;
        break;
    }

    this.addToken(
      type,
      text,
      this.line
    );
  }

  // ==================================================
  // NUMBERS
  // ==================================================

  private number(): void {
    while (
      this.isDigit(this.peek())
    ) {
      this.advance();
    }

    // Decimal numbers.
    if (
      this.peek() === "." &&
      this.isDigit(this.peekNext())
    ) {
      this.advance();

      while (
        this.isDigit(this.peek())
      ) {
        this.advance();
      }
    }

    const value = this.source.substring(
      this.start,
      this.current
    );

    this.addToken(
      TokenType.NUMBER,
      value,
      this.line
    );
  }

  // ==================================================
  // STRINGS
  // ==================================================

  private string(): void {
    let value = "";

    while (
      !this.isAtEnd() &&
      this.peek() !== '"'
    ) {
      // Escape sequence.
      if (this.peek() === "\\") {
        this.advance();

        if (this.isAtEnd()) {
          break;
        }

        const escaped = this.advance();

        switch (escaped) {
          case "n":
            value += "\n";
            break;

          case "t":
            value += "\t";
            break;

          case "\\":
            value += "\\";
            break;

          case '"':
            value += '"';
            break;

          default:
            value += escaped;
            break;
        }

        continue;
      }

      if (this.peek() === "\n") {
        this.line++;
      }

      value += this.advance();
    }

    if (this.isAtEnd()) {
      this.error(
        "Unterminated string."
      );
      return;
    }

    // Closing quote.
    this.advance();

    this.addToken(
      TokenType.STRING,
      value,
      this.line
    );
  }

  // ==================================================
  // COMMENTS
  // ==================================================

  private skipComment(): void {
    while (
      this.peek() !== "\n" &&
      this.peek() !== "\r" &&
      !this.isAtEnd()
    ) {
      this.advance();
    }
  }

  // ==================================================
  // HELPERS
  // ==================================================

  private match(
    expected: string
  ): boolean {
    if (this.isAtEnd()) {
      return false;
    }

    if (
      this.source[this.current] !== expected
    ) {
      return false;
    }

    this.current++;

    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) {
      return "\0";
    }

    return this.source[this.current];
  }

  private peekNext(): string {
    if (
      this.current + 1 >=
      this.source.length
    ) {
      return "\0";
    }

    return this.source[
      this.current + 1
    ];
  }

  private advance(): string {
    this.current++;

    return this.source[
      this.current - 1
    ];
  }

  private isAtEnd(): boolean {
    return (
      this.current >=
      this.source.length
    );
  }

  private isDigit(
    c: string
  ): boolean {
    return (
      c >= "0" &&
      c <= "9"
    );
  }

  private isAlpha(
    c: string
  ): boolean {
    return (
      (c >= "a" && c <= "z") ||
      (c >= "A" && c <= "Z") ||
      c === "_"
    );
  }

  private isAlphaNumeric(
    c: string
  ): boolean {
    return (
      this.isAlpha(c) ||
      this.isDigit(c)
    );
  }

  private addToken(
    type: TokenType,
    value: string,
    line: number
  ): void {
    this.tokens.push({
      type,
      value,
      line,
    });
  }

  private error(
    message: string
  ): void {
    throw new Error(
      `[line ${this.line}] Error: ${message}`
    );
  }
}