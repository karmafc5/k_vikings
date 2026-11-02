// @ts-nocheck
export var TokenType;
(function (TokenType) {
    // Keywords
    TokenType["ASK"] = "ASK";
    TokenType["SAY"] = "SAY";
    TokenType["SET"] = "SET";
    TokenType["IF"] = "IF";
    TokenType["ELSE"] = "ELSE";
    TokenType["WHILE"] = "WHILE";
    TokenType["TRUE"] = "TRUE";
    TokenType["FALSE"] = "FALSE";
    TokenType["AND"] = "AND";
    TokenType["OR"] = "OR";
    TokenType["NOT"] = "NOT";
    TokenType["FUNCTION"] = "FUNCTION";
    TokenType["RETURN"] = "RETURN";
    TokenType["INDENT"] = "INDENT";
    TokenType["DEDENT"] = "DEDENT";
    // Values
    TokenType["IDENTIFIER"] = "IDENTIFIER";
    TokenType["NUMBER"] = "NUMBER";
    TokenType["STRING"] = "STRING";
    // Operators
    TokenType["PLUS"] = "PLUS";
    TokenType["MINUS"] = "MINUS";
    TokenType["STAR"] = "STAR";
    TokenType["SLASH"] = "SLASH";
    TokenType["EQUAL"] = "EQUAL";
    TokenType["NOT_EQUAL"] = "NOT_EQUAL";
    TokenType["EQUAL_EQUAL"] = "EQUAL_EQUAL";
    TokenType["LESS"] = "LESS";
    TokenType["LESS_EQUAL"] = "LESS_EQUAL";
    TokenType["GREATER"] = "GREATER";
    TokenType["GREATER_EQUAL"] = "GREATER_EQUAL";
    TokenType["LEFT_PAREN"] = "LEFT_PAREN";
    TokenType["RIGHT_PAREN"] = "RIGHT_PAREN";
    TokenType["LEFT_BRACKET"] = "LEFT_BRACKET";
    TokenType["RIGHT_BRACKET"] = "RIGHT_BRACKET";
    TokenType["COMMA"] = "COMMA";
    // Other
    TokenType["NEWLINE"] = "NEWLINE";
    TokenType["EOF"] = "EOF";
})(TokenType || (TokenType = {}));
