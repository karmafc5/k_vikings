import type { Bytecode, Instruction, RuntimeValue } from "./bytecode";

export interface VirtualMachineIO {
	input(prompt: string): string | Promise<string>;
	output(value: string): void;
}

export class VirtualMachine {
	private readonly variables = new Map<string, RuntimeValue>();
	private readonly stack: RuntimeValue[] = [];

	constructor(private readonly io: VirtualMachineIO) {}

	async run(bytecode: Bytecode): Promise<void> {
		this.variables.clear();
		this.stack.length = 0;

		for (const instruction of bytecode) {
			await this.execute(instruction);
		}
	}

	private async execute(instruction: Instruction): Promise<void> {
		switch (instruction.op) {
			case "CONSTANT":
				this.stack.push(instruction.value);
				return;
			case "LOAD": {
				const value = this.variables.get(instruction.name);
				if (value === undefined) {
					throw this.runtimeError(instruction, `Unknown variable '${instruction.name}'.`);
				}
				this.stack.push(value);
				return;
			}
			case "ASK":
				this.variables.set(instruction.name, await this.io.input(`${instruction.name}: `));
				return;
			case "SET":
				this.variables.set(instruction.name, this.pop(instruction));
				return;
			case "SAY":
				this.io.output(String(this.pop(instruction)));
				return;
			case "NEGATE":
				this.stack.push(-this.requireNumber(this.pop(instruction), instruction));
				return;
			case "ADD": {
				const right = this.pop(instruction);
				const left = this.pop(instruction);
				if (typeof left === "string" || typeof right === "string") {
					this.stack.push(String(left) + String(right));
				} else {
					this.stack.push(left + right);
				}
				return;
			}
			case "SUBTRACT":
				this.applyNumeric(instruction, (left, right) => left - right);
				return;
			case "MULTIPLY":
				this.applyNumeric(instruction, (left, right) => left * right);
				return;
			case "DIVIDE": {
				const right = this.requireNumber(this.pop(instruction), instruction);
				const left = this.requireNumber(this.pop(instruction), instruction);
				if (right === 0) {
					throw this.runtimeError(instruction, "Division by zero.");
				}
				this.stack.push(left / right);
				return;
			}
		}
	}

	private applyNumeric(
		instruction: Instruction,
		operation: (left: number, right: number) => number,
	): void {
		const right = this.requireNumber(this.pop(instruction), instruction);
		const left = this.requireNumber(this.pop(instruction), instruction);
		this.stack.push(operation(left, right));
	}

	private pop(instruction: Instruction): RuntimeValue {
		const value = this.stack.pop();
		if (value === undefined) {
			throw this.runtimeError(instruction, "Bytecode stack underflow.");
		}
		return value;
	}

	private requireNumber(value: RuntimeValue, instruction: Instruction): number {
		if (typeof value !== "number") {
			throw this.runtimeError(instruction, "Expected a number.");
		}
		return value;
	}

	private runtimeError(instruction: Instruction, message: string): Error {
		return new Error(`[line ${instruction.line}] ${message}`);
	}
}