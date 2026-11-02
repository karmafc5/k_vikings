// @ts-nocheck
import { TokenType } from "./token";
export class Lexer {
    source;
    tokens = [];
    start = 0;
    current = 0;
    line = 1;
    // Indentation levels.
    // 0 means the top level.
    indentStack = [0];
    // True when we are at the beginning of a line.
    atLineStart = true;
    constructor(source) {
        this.source = source;
    }
    scanTokens() {
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
            this.addToken(TokenType.DEDENT, "", this.line);
        }
        this.addToken(TokenType.EOF, "", this.line);
        return this.tokens;
    }
    scanToken() {
        const c = this.advance();
        // Ignore spaces and tabs inside a line.
        if (c === " " || c === "\t") {
            return;
        }
        // New line.
        if (c === "\n") {
            this.addToken(TokenType.NEWLINE, "\n", this.line);
            this.line++;
            this.atLineStart = true;
            return;
        }
        // Windows-style new line.
        if (c === "\r") {
            if (this.peek() === "\n") {
                this.advance();
            }
            this.addToken(TokenType.NEWLINE, "\n", this.line);
            this.line++;
            this.atLineStart = true;
            return;
        }
        // Comment.
        if (c === "#") {
            this.skipComment();
            return;
        }
        switch (c) {
            case "(":
                this.addToken(TokenType.LEFT_PAREN, "(", this.line);
                return;
            case ")":
                this.addToken(TokenType.RIGHT_PAREN, ")", this.line);
                return;
            case "[":
                this.addToken(TokenType.LEFT_BRACKET, "[", this.line);
                return;
            case "]":
                this.addToken(TokenType.RIGHT_BRACKET, "]", this.line);
                return;
            case "+":
                this.addToken(TokenType.PLUS, "+", this.line);
                return;
            case "-":
                this.addToken(TokenType.MINUS, "-", this.line);
                return;
            case "*":
                this.addToken(TokenType.STAR, "*", this.line);
                return;
            case "/":
                if (this.match("/")) {
                    this.skipComment();
                    return;
                }
                this.addToken(TokenType.SLASH, "/", this.line);
                return;
            case "=":
                if (this.match("=")) {
                    this.addToken(TokenType.EQUAL_EQUAL, "==", this.line);
                }
                else {
                    this.addToken(TokenType.EQUAL, "=", this.line);
                }
                return;
            case "!":
                if (this.match("=")) {
                    this.addToken(TokenType.NOT_EQUAL, "!=", this.line);
                }
                else {
                    this.error("Unexpected character: !");
                }
                return;
            case "<":
                if (this.match("=")) {
                    this.addToken(TokenType.LESS_EQUAL, "<=", this.line);
                }
                else {
                    this.addToken(TokenType.LESS, "<", this.line);
                }
                return;
            case ">":
                if (this.match("=")) {
                    this.addToken(TokenType.GREATER_EQUAL, ">=", this.line);
                }
                else {
                    this.addToken(TokenType.GREATER, ">", this.line);
                }
                return;
            case '"':
                this.string();
                return;
            case ",":
                this.addToken(TokenType.COMMA, ",", this.line);
                return;
            default:
                break;
        }
        // Number.
        if (this.isDigit(c)) {
            this.number();
            return;
        }
        // Identifier or keyword.
        if (this.isAlpha(c)) {
            this.identifier();
            return;
        }
        this.error(`Unexpected character: ${c}`);
    }
    handleIndentation() {
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
                // Treat one tab as four spaces.
                indentation += 4;
                this.advance();
                continue;
            }
            break;
        }
        /*
         * Blank line.
         *
         * Consume the newline so the lexer doesn't
         * get stuck on blank lines.
         */
        if (this.peek() === "\n") {
            this.advance();
            this.addToken(TokenType.NEWLINE, "\n", this.line);
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
            this.addToken(TokenType.NEWLINE, "\n", this.line);
            this.line++;
            this.atLineStart = true;
            return;
        }
        /*
         * Comment-only line.
         */
        if (this.peek() === "#") {
            this.skipComment();
            return;
        }
        const currentIndent = this.indentStack[this.indentStack.length - 1];
        /*
         * Increased indentation.
         */
        if (indentation > currentIndent) {
            this.indentStack.push(indentation);
            this.addToken(TokenType.INDENT, "", this.line);
            this.atLineStart = false;
            return;
        }
        /*
         * Decreased indentation.
         */
        if (indentation < currentIndent) {
            while (this.indentStack.length > 1 &&
                indentation <
                    this.indentStack[this.indentStack.length - 1]) {
                this.indentStack.pop();
                this.addToken(TokenType.DEDENT, "", this.line);
            }
            const newCurrentIndent = this.indentStack[this.indentStack.length - 1];
            if (indentation !== newCurrentIndent) {
                this.error("Invalid indentation.");
            }
        }
        this.atLineStart = false;
    }
    identifier() {
        while (this.isAlphaNumeric(this.peek())) {
            this.advance();
        }
        const text = this.source.substring(this.start, this.current);
        let type;
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
            // Boolean keywords.
            case "true":
                type = TokenType.TRUE;
                break;
            case "false":
                type = TokenType.FALSE;
                break;
            case "and":
                type = TokenType.AND;
                break;
            case "or":
                type = TokenType.OR;
                break;
            case "not":
                type = TokenType.NOT;
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
        this.addToken(type, text, this.line);
    }
    number() {
        while (this.isDigit(this.peek())) {
            this.advance();
        }
        /*
         * Decimal number.
         */
        if (this.peek() === "." &&
            this.isDigit(this.peekNext())) {
            this.advance();
            while (this.isDigit(this.peek())) {
                this.advance();
            }
        }
        const value = this.source.substring(this.start, this.current);
        this.addToken(TokenType.NUMBER, value, this.line);
    }
    string() {
        let value = "";
        while (!this.isAtEnd() &&
            this.peek() !== '"') {
            /*
             * Escape sequences.
             */
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
            /*
             * Allow newlines inside strings,
             * while keeping line numbers correct.
             */
            if (this.peek() === "\n") {
                this.line++;
            }
            value += this.advance();
        }
        /*
         * String wasn't closed.
         */
        if (this.isAtEnd()) {
            this.error("Unterminated string.");
            return;
        }
        // Consume closing quote.
        this.advance();
        this.addToken(TokenType.STRING, value, this.line);
    }
    skipComment() {
        while (this.peek() !== "\n" &&
            this.peek() !== "\r" &&
            !this.isAtEnd()) {
            this.advance();
        }
    }
    match(expected) {
        if (this.isAtEnd()) {
            return false;
        }
        if (this.source[this.current] !== expected) {
            return false;
        }
        this.current++;
        return true;
    }
    peek() {
        if (this.isAtEnd()) {
            return "\0";
        }
        return this.source[this.current];
    }
    peekNext() {
        if (this.current + 1 >= this.source.length) {
            return "\0";
        }
        return this.source[this.current + 1];
    }
    advance() {
        this.current++;
        return this.source[this.current - 1];
    }
    isAtEnd() {
        return this.current >= this.source.length;
    }
    isDigit(c) {
        return c >= "0" && c <= "9";
    }
    isAlpha(c) {
        return ((c >= "a" && c <= "z") ||
            (c >= "A" && c <= "Z") ||
            c === "_");
    }
    isAlphaNumeric(c) {
        return (this.isAlpha(c) ||
            this.isDigit(c));
    }
    addToken(type, value, line) {
        this.tokens.push({
            type,
            value,
            line,
        });
    }
    error(message) {
        throw new Error(`[line ${this.line}] Error: ${message}`);
    }
}
