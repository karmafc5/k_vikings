export interface Program {
  statements: Statement[];
}

export type Statement =
  | SetStatement
  | SayStatement
  | AskStatement
  | IfStatement
  | WhileStatement
  | FunctionStatement
  | ReturnStatement
  | ExpressionStatement;

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
  prompt?: string;
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

export interface FunctionStatement {
  type: "FunctionStatement";
  name: string;
  parameters: string[];
  body: Statement[];
}

export interface ReturnStatement {
  type: "ReturnStatement";
  value?: Expression;
}

export interface ExpressionStatement {
  type: "ExpressionStatement";
  expression: Expression;
}

export type Expression =
  | LiteralExpression
  | VariableExpression
  | BinaryExpression
  | CallExpression;

export interface LiteralExpression {
  type: "LiteralExpression";
  value: string | number | boolean;
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

export interface CallExpression {
  type: "CallExpression";
  name: string;
  arguments: Expression[];
}