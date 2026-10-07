export type RuntimeValue = number | string;

export type Instruction =
	| { op: "CONSTANT"; value: RuntimeValue; line: number }
	| { op: "LOAD"; name: string; line: number }
	| { op: "ASK"; name: string; line: number }
	| { op: "SET"; name: string; line: number }
	| { op: "SAY"; line: number }
	| { op: "NEGATE"; line: number }
	| { op: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE"; line: number };

export type Bytecode = Instruction[];