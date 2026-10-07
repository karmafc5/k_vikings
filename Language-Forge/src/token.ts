export enum TokenType {
  // Keywords
  ASK,
  SAY,
  SET,

  // Values
  IDENTIFIER,
  NUMBER,
  STRING,

  // Operators
  PLUS,
  MINUS,
  STAR,
  SLASH,
  EQUAL,
  LEFT_PAREN,
  RIGHT_PAREN,

  // Other
  NEWLINE,
  EOF
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
}