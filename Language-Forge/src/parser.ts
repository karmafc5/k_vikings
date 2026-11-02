// @ts-nocheck
import { TokenType } from "./token";
export class Parser {
    tokens;
    current = 0;
    constructor(tokens) {
        this.tokens = tokens;
    }
    parse() {
        const statements = [];
        this.skipNewlines();
        while (!this.isAtEnd()) {
            if (this.check(TokenType.DEDENT)) {
                this.advance();
                continue;
            }
            statements.push(this.statement());
            this.skipNewlines();
        }
        return {
            statements,
        };
    }
    statement() {
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
        return this.expressionStatement();
    }
    setStatement() {
        const line = this.previous().line;
        const name = this.consume(TokenType.IDENTIFIER, "Expected variable name after 'set'.");
        this.consume(TokenType.EQUAL, "Expected '=' after variable name.");
        const value = this.expression();
        this.consumeLineEnd();
        return {
            type: "SetStatement",
            line,
            name: name.value,
            value,
        };
    }
    sayStatement() {
        const line = this.previous().line;
        const expression = this.expression();
        this.consumeLineEnd();
        return {
            type: "SayStatement",
            line,
            expression,
        };
    }
    askStatement() {
        const line = this.previous().line;
        const name = this.consume(TokenType.IDENTIFIER, "Expected variable name after 'ask'.");
        let prompt;
        if (this.check(TokenType.STRING)) {
            prompt = this.advance().value;
        }
        this.consumeLineEnd();
        return {
            type: "AskStatement",
            line,
            name: name.value,
            prompt,
        };
    }
    ifStatement() {
        const line = this.previous().line;
        const condition = this.expression();
        const thenBranch = this.parseBlock("Expected indented block after 'if'.");
        let elseBranch;
        this.skipNewlines();
        if (this.match(TokenType.ELSE)) {
            elseBranch = this.parseBlock("Expected indented block after 'else'.");
        }
        return {
            type: "IfStatement",
            line,
            condition,
            thenBranch,
            elseBranch,
        };
    }
    whileStatement() {
        const line = this.previous().line;
        const condition = this.expression();
        const body = this.parseBlock("Expected indented block after 'while'.");
        return {
            type: "WhileStatement",
            line,
            condition,
            body,
        };
    }
    functionStatement() {
        const line = this.previous().line;
        const name = this.consume(TokenType.IDENTIFIER, "Expected function name after 'function'.");
        this.consume(TokenType.LEFT_PAREN, "Expected '(' after function name.");
        const parameters = [];
        if (!this.check(TokenType.RIGHT_PAREN)) {
            do {
                const parameter = this.consume(TokenType.IDENTIFIER, "Expected parameter name.");
                parameters.push(parameter.value);
            } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RIGHT_PAREN, "Expected ')' after parameters.");
        const body = this.parseBlock("Expected indented block after function declaration.");
        return {
            type: "FunctionStatement",
            line,
            name: name.value,
            parameters,
            body,
        };
    }
    returnStatement() {
        const line = this.previous().line;
        let value;
        if (!this.check(TokenType.NEWLINE) &&
            !this.check(TokenType.DEDENT) &&
            !this.check(TokenType.EOF)) {
            value = this.expression();
        }
        this.consumeLineEnd();
        return {
            type: "ReturnStatement",
            line,
            value,
        };
    }
    expressionStatement() {
        const line = this.peek().line;
        const expression = this.expression();
        this.consumeLineEnd();
        return {
            type: "ExpressionStatement",
            line,
            expression,
        };
    }
    parseBlock(errorMessage) {
        this.consume(TokenType.NEWLINE, "Expected new line before indented block.");
        this.consume(TokenType.INDENT, errorMessage);
        const statements = [];
        this.skipNewlines();
        while (!this.check(TokenType.DEDENT) &&
            !this.isAtEnd()) {
            statements.push(this.statement());
            this.skipNewlines();
        }
        this.consume(TokenType.DEDENT, "Expected end of indented block.");
        return statements;
    }
    // ============================================================
    // EXPRESSIONS
    // ============================================================
    expression() {
        return this.or();
    }
    or() {
        let expression = this.and();
        while (this.match(TokenType.OR)) {
            const operator = this.previous().value;
            const line = this.previous().line;
            const right = this.and();
            expression = {
                type: "BinaryExpression",
                line,
                left: expression,
                operator,
                right,
            };
        }
        return expression;
    }
    and() {
        let expression = this.equality();
        while (this.match(TokenType.AND)) {
            const operator = this.previous().value;
            const line = this.previous().line;
            const right = this.equality();
            expression = {
                type: "BinaryExpression",
                line,
                left: expression,
                operator,
                right,
            };
        }
        return expression;
    }
    equality() {
        let expression = this.comparison();
        while (this.match(TokenType.EQUAL_EQUAL, TokenType.NOT_EQUAL)) {
            const operator = this.previous().value;
            const line = this.previous().line;
            const right = this.comparison();
            expression = {
                type: "BinaryExpression",
                line,
                left: expression,
                operator,
                right,
            };
        }
        return expression;
    }
    comparison() {
        let expression = this.term();
        while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
            const operator = this.previous().value;
            const line = this.previous().line;
            const right = this.term();
            expression = {
                type: "BinaryExpression",
                line,
                left: expression,
                operator,
                right,
            };
        }
        return expression;
    }
    term() {
        let expression = this.factor();
        while (this.match(TokenType.PLUS, TokenType.MINUS)) {
            const operator = this.previous().value;
            const line = this.previous().line;
            const right = this.factor();
            expression = {
                type: "BinaryExpression",
                line,
                left: expression,
                operator,
                right,
            };
        }
        return expression;
    }
    factor() {
        let expression = this.unary();
        while (this.match(TokenType.STAR, TokenType.SLASH)) {
            const operator = this.previous().value;
            const line = this.previous().line;
            const right = this.unary();
            expression = {
                type: "BinaryExpression",
                line,
                left: expression,
                operator,
                right,
            };
        }
        return expression;
    }
    unary() {
        if (this.match(TokenType.NOT)) {
            const line = this.previous().line;
            const right = this.unary();
            return {
                type: "BinaryExpression",
                line,
                left: {
                    type: "LiteralExpression",
                    line,
                    value: true,
                },
                operator: "not",
                right,
            };
        }
        if (this.match(TokenType.MINUS)) {
            const line = this.previous().line;
            const right = this.unary();
            return {
                type: "BinaryExpression",
                line,
                left: {
                    type: "LiteralExpression",
                    line,
                    value: 0,
                },
                operator: "-",
                right,
            };
        }
        return this.postfix();
    }
    // ============================================================
    // POSTFIX EXPRESSIONS
    //
    // Handles:
    //
    //     fruits[0]
    //     fruits[1 + 1]
    //     getFruit()[0]
    //     matrix[0][1]
    //
    // and function calls:
    //
    //     greet()
    //     add(10, 20)
    // ============================================================
    postfix() {
        let expression = this.primary();
        while (true) {
            // List indexing
            if (this.match(TokenType.LEFT_BRACKET)) {
                const line = this.previous().line;
                const index = this.expression();
                this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after index.");
                expression = {
                    type: "IndexExpression",
                    line,
                    object: expression,
                    index,
                };
                continue;
            }
            break;
        }
        return expression;
    }
    // ============================================================
    // PRIMARY EXPRESSIONS
    // ============================================================
    primary() {
        if (this.match(TokenType.FALSE)) {
            return {
                type: "LiteralExpression",
                line: this.previous().line,
                value: false,
            };
        }
        if (this.match(TokenType.TRUE)) {
            return {
                type: "LiteralExpression",
                line: this.previous().line,
                value: true,
            };
        }
        if (this.match(TokenType.NUMBER)) {
            return {
                type: "LiteralExpression",
                line: this.previous().line,
                value: Number(this.previous().value),
            };
        }
        if (this.match(TokenType.STRING)) {
            return {
                type: "LiteralExpression",
                line: this.previous().line,
                value: this.previous().value,
            };
        }
        // ----------------------------------------------------------
        // List literal
        //
        // Example:
        // [10, 20, 30]
        //
        // Also supports expressions:
        // [1 + 2, 3 * 4, 10]
        // ----------------------------------------------------------
        if (this.match(TokenType.LEFT_BRACKET)) {
            const line = this.previous().line;
            const elements = [];
            if (!this.check(TokenType.RIGHT_BRACKET)) {
                do {
                    elements.push(this.expression());
                } while (this.match(TokenType.COMMA));
            }
            this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after list.");
            return {
                type: "ListExpression",
                line,
                elements,
            };
        }
        // ----------------------------------------------------------
        // Identifier
        //
        // Can be:
        //
        //     variable
        //     function()
        //     function(10, 20)
        //
        // Indexing is handled afterwards by postfix().
        // ----------------------------------------------------------
        if (this.match(TokenType.IDENTIFIER)) {
            const name = this.previous().value;
            const line = this.previous().line;
            if (this.match(TokenType.LEFT_PAREN)) {
                const argumentsList = [];
                if (!this.check(TokenType.RIGHT_PAREN)) {
                    do {
                        argumentsList.push(this.expression());
                    } while (this.match(TokenType.COMMA));
                }
                this.consume(TokenType.RIGHT_PAREN, "Expected ')' after arguments.");
                return {
                    type: "CallExpression",
                    line,
                    name,
                    arguments: argumentsList,
                };
            }
            return {
                type: "VariableExpression",
                line,
                name,
            };
        }
        // ----------------------------------------------------------
        // Parenthesized expression
        // ----------------------------------------------------------
        if (this.match(TokenType.LEFT_PAREN)) {
            const expression = this.expression();
            this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression.");
            return expression;
        }
        throw this.error(this.peek(), "Expected expression.");
    }
    // ============================================================
    // TOKEN HELPERS
    // ============================================================
    match(...types) {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }
    check(type) {
        if (this.isAtEnd()) {
            return type === TokenType.EOF;
        }
        return this.peek().type === type;
    }
    consume(type, message) {
        if (this.check(type)) {
            return this.advance();
        }
        throw this.error(this.peek(), message);
    }
    consumeLineEnd() {
        if (this.check(TokenType.NEWLINE)) {
            this.advance();
            return;
        }
        if (this.check(TokenType.EOF)) {
            return;
        }
        if (this.check(TokenType.DEDENT)) {
            return;
        }
        throw this.error(this.peek(), "Expected end of line.");
    }
    skipNewlines() {
        while (this.check(TokenType.NEWLINE)) {
            this.advance();
        }
    }
    advance() {
        if (!this.isAtEnd()) {
            this.current++;
        }
        return this.previous();
    }
    peek() {
        return this.tokens[this.current];
    }
    previous() {
        return this.tokens[this.current - 1];
    }
    isAtEnd() {
        return this.peek().type === TokenType.EOF;
    }
    error(token, message) {
        return new Error(`[line ${token.line}] Error: ${message}`);
    }
}
