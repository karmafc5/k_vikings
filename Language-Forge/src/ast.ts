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
  name: string;
  value: Expression;
}

export interface SayStatement {
  type: "SayStatement";
  expression: Expression;
}

export interface AskStatement {
  type: "AskStatement";
  name: string;
}

export interface IfStatement {
  type: "IfStatement";
  condition: Expression;
  thenBranch: Statement[];
  elseBranch?: Statement[];
}

export interface WhileStatement {
  type: "WhileStatement";
  condition: Expression;
  body: Statement[];
}

export type Expression =
  | LiteralExpression
  | VariableExpression
  | BinaryExpression;

export interface LiteralExpression {
  type: "LiteralExpression";
  value: string | number;
}

export interface VariableExpression {
  type: "VariableExpression";
  name: string;
}

export interface BinaryExpression {
  type: "BinaryExpression";
  left: Expression;
  operator: string;
  right: Expression;
}