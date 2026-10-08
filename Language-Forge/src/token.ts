export enum TokenType {
  // Keywords
  ASK = "ASK",
  SAY = "SAY",
  SET = "SET",
  IF = "IF",
  ELSE = "ELSE",
  WHILE = "WHILE",
  FUNCTION = "FUNCTION",
  RETURN = "RETURN",
  INDENT = "INDENT",
  DEDENT = "DEDENT",

  // Values
  IDENTIFIER = "IDENTIFIER",
  NUMBER = "NUMBER",
  STRING = "STRING",

  // Operators
  PLUS = "PLUS",
  MINUS = "MINUS",
  STAR = "STAR",
  SLASH = "SLASH",
  EQUAL = "EQUAL",
  NOT_EQUAL = "NOT_EQUAL",
  EQUAL_EQUAL = "EQUAL_EQUAL",
  LESS = "LESS",
  LESS_EQUAL = "LESS_EQUAL",
  GREATER = "GREATER",
  GREATER_EQUAL = "GREATER_EQUAL",
  LEFT_PAREN = "LEFT_PAREN",
  RIGHT_PAREN = "RIGHT_PAREN",

  // Other
  NEWLINE = "NEWLINE",
  EOF = "EOF",
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
}