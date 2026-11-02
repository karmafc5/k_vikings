// @ts-nocheck
export class VirtualMachine {
    io;
    variables = new Map();
    stack = [];
    constructor(io) {
        this.io = io;
    }
    async run(bytecode) {
        this.variables.clear();
        this.stack.length = 0;
        for (const instruction of bytecode) {
            await this.execute(instruction);
        }
    }
    async execute(instruction) {
        switch (instruction.op) {
            case "CONSTANT":
                if (instruction.value === undefined) {
                    throw this.runtimeError(instruction, "Missing constant value.");
                }
                this.stack.push(instruction.value);
                return;
            case "LOAD": {
                const name = instruction.name;
                if (name === undefined) {
                    throw this.runtimeError(instruction, "Missing variable name.");
                }
                const value = this.variables.get(name);
                if (value === undefined) {
                    throw this.runtimeError(instruction, `Unknown variable '${name}'.`);
                }
                this.stack.push(value);
                return;
            }
            case "ASK": {
                const name = instruction.name;
                if (name === undefined) {
                    throw this.runtimeError(instruction, "Missing variable name.");
                }
                this.variables.set(name, await this.io.input(`${name}: `));
                return;
            }
            case "SET":
                if (instruction.name === undefined) {
                    throw this.runtimeError(instruction, "Missing variable name.");
                }
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
                }
                else if (typeof left === "number" && typeof right === "number") {
                    this.stack.push(left + right);
                }
                else {
                    throw this.runtimeError(instruction, "Cannot add boolean values.");
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
    applyNumeric(instruction, operation) {
        const right = this.requireNumber(this.pop(instruction), instruction);
        const left = this.requireNumber(this.pop(instruction), instruction);
        this.stack.push(operation(left, right));
    }
    pop(instruction) {
        const value = this.stack.pop();
        if (value === undefined) {
            throw this.runtimeError(instruction, "Bytecode stack underflow.");
        }
        return value;
    }
    requireNumber(value, instruction) {
        if (typeof value !== "number") {
            throw this.runtimeError(instruction, "Expected a number.");
        }
        return value;
    }
    runtimeError(instruction, message) {
        return new Error(`[line ${instruction.line}] ${message}`);
    }
}
