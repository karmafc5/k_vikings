export interface Program {
  statements: Statement[];
}

export type Statement =
  | SetStatement
  | SayStatement
  | AskStatement
  | IfStatement
  | WhileStatement;

export interface SetStatement {
  type: "SetStatement";
  kind: "set";
  line: number;
  name: string;
  value: Expression;
  expression: Expression;
}

export interface SayStatement {
  type: "SayStatement";
  kind: "say";
  line: number;
  expression: Expression;
}

export interface AskStatement {
  type: "AskStatement";
  kind: "ask";
  line: number;
  name: string;
  prompt?: string;
}

export interface IfStatement {
  type: "IfStatement";
  kind: "if";
  line: number;
  condition: Expression;
  thenBranch: Statement[];
  elseBranch?: Statement[];
}

export interface WhileStatement {
  type: "WhileStatement";
  kind: "while";
  line: number;
  condition: Expression;
  body: Statement[];
}

export type Expression =
  | LiteralExpression
  | VariableExpression
  | BinaryExpression;

export interface LiteralExpression {
  type: "LiteralExpression";
  kind: "literal";
  line: number;
  value: string | number | boolean;
}

export interface VariableExpression {
  type: "VariableExpression";
  kind: "variable";
  line: number;
  name: string;
}

export interface BinaryExpression {
  type: "BinaryExpression";
  kind: "binary";
  line: number;
  left: Expression;
  operator: string;
  right: Expression;
}