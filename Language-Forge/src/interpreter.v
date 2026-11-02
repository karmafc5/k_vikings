// @ts-nocheck
import * as readline from "readline";
class ReturnSignal {
    value;
    constructor(value) {
        this.value = value;
    }
}
export class Interpreter {
    variables = new Map();
    functions = new Map();
    async interpret(program) {
        // First collect all function declarations.
        // This allows a function to be called before or after
        // its declaration in the Vico program.
        for (const statement of program.statements) {
            if (statement.type === "FunctionStatement") {
                if (this.functions.has(statement.name)) {
                    throw new Error(`Function '${statement.name}' is already defined.`);
                }
                this.functions.set(statement.name, statement);
            }
        }
        // Execute normal top-level statements.
        for (const statement of program.statements) {
            if (statement.type === "FunctionStatement") {
                continue;
            }
            await this.execute(statement);
        }
    }
    async execute(statement) {
        switch (statement.type) {
            case "SetStatement":
                await this.executeSet(statement);
                break;
            case "SayStatement":
                await this.executeSay(statement);
                break;
            case "AskStatement":
                await this.executeAsk(statement);
                break;
            case "IfStatement":
                await this.executeIf(statement);
                break;
            case "WhileStatement":
                await this.executeWhile(statement);
                break;
            case "FunctionStatement":
                this.functions.set(statement.name, statement);
                break;
            case "ReturnStatement":
                await this.executeReturn(statement);
                break;
            case "ExpressionStatement":
                await this.evaluate(statement.expression);
                break;
        }
    }
    async executeSet(statement) {
        const value = await this.evaluate(statement.value);
        this.variables.set(statement.name, value);
    }
    async executeSay(statement) {
        const value = await this.evaluate(statement.expression);
        console.log(value);
    }
    async executeAsk(statement) {
        const question = statement.prompt ??
            `What is ${statement.name}? `;
        const answer = await this.getInput(question);
        const value = this.convertInput(answer);
        this.variables.set(statement.name, value);
    }
    async executeReturn(statement) {
        let value;
        if (statement.value) {
            value = await this.evaluate(statement.value);
        }
        throw new ReturnSignal(value);
    }
    getInput(question) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise((resolve) => {
            rl.question(question, (answer) => {
                rl.close();
                resolve(answer);
            });
        });
    }
    convertInput(input) {
        const value = input.trim();
        if (value.toLowerCase() === "true") {
            return true;
        }
        if (value.toLowerCase() === "false") {
            return false;
        }
        if (value !== "" &&
            !Number.isNaN(Number(value))) {
            return Number(value);
        }
        return value;
    }
    async executeIf(statement) {
        const condition = await this.evaluate(statement.condition);
        if (this.isTruthy(condition)) {
            for (const childStatement of statement.thenBranch) {
                await this.execute(childStatement);
            }
        }
        else if (statement.elseBranch) {
            for (const childStatement of statement.elseBranch) {
                await this.execute(childStatement);
            }
        }
    }
    async executeWhile(statement) {
        while (this.isTruthy(await this.evaluate(statement.condition))) {
            for (const childStatement of statement.body) {
                await this.execute(childStatement);
            }
        }
    }
    async evaluate(expression) {
        switch (expression.type) {
            case "LiteralExpression":
                return expression.value;
            case "VariableExpression":
                return this.getVariable(expression.name);
            case "BinaryExpression":
                return await this.evaluateBinary(expression);
            case "CallExpression":
                return await this.executeCall(expression);
            case "ListExpression":
                return await this.evaluateList(expression);
            case "IndexExpression":
                return await this.evaluateIndex(expression);
        }
    }
    async evaluateList(expression) {
        const values = [];
        for (const element of expression.elements) {
            values.push(await this.evaluate(element));
        }
        return values;
    }
    async evaluateIndex(expression) {
        const object = await this.evaluate(expression.object);
        const index = await this.evaluate(expression.index);
        if (!Array.isArray(object)) {
            throw new Error("Cannot index a non-list value.");
        }
        if (typeof index !== "number") {
            throw new Error("List index must be a number.");
        }
        if (!Number.isInteger(index)) {
            throw new Error("List index must be an integer.");
        }
        if (index < 0 || index >= object.length) {
            throw new Error(`List index ${index} is out of bounds.`);
        }
        return object[index];
    }
    async executeCall(expression) {
        const functionStatement = this.functions.get(expression.name);
        if (!functionStatement) {
            throw new Error(`Undefined function '${expression.name}'.`);
        }
        if (expression.arguments.length !==
            functionStatement.parameters.length) {
            throw new Error(`Function '${expression.name}' expects ${functionStatement.parameters.length} argument(s), but got ${expression.arguments.length}.`);
        }
        // Evaluate arguments BEFORE changing scope.
        const argumentValues = [];
        for (const argument of expression.arguments) {
            argumentValues.push(await this.evaluate(argument));
        }
        // Save current variables.
        const previousVariables = this.variables;
        // Create fresh local scope.
        this.variables =
            new Map();
        // Put arguments into local scope.
        for (let i = 0; i < functionStatement.parameters.length; i++) {
            const parameter = functionStatement.parameters[i];
            const value = argumentValues[i];
            this.variables.set(parameter, value);
        }
        try {
            for (const statement of functionStatement.body) {
                await this.execute(statement);
            }
            // Function without a return.
            return true;
        }
        catch (error) {
            if (error instanceof ReturnSignal) {
                return error.value ?? true;
            }
            throw error;
        }
        finally {
            // Restore previous scope.
            this.variables =
                previousVariables;
        }
    }
    getVariable(name) {
        if (!this.variables.has(name)) {
            throw new Error(`Undefined variable '${name}'.`);
        }
        return this.variables.get(name);
    }
    isTruthy(value) {
        if (typeof value === "boolean") {
            return value;
        }
        if (typeof value === "number") {
            return value !== 0;
        }
        if (typeof value === "string") {
            return value.length > 0;
        }
        // Lists are truthy when they contain elements.
        return value.length > 0;
    }
    async evaluateBinary(expression) {
        const left = await this.evaluate(expression.left);
        const right = await this.evaluate(expression.right);
        switch (expression.operator) {
            case "+":
                if (typeof left === "string" ||
                    typeof right === "string") {
                    return (String(left) +
                        String(right));
                }
                if (typeof left === "number" &&
                    typeof right === "number") {
                    return left + right;
                }
                throw new Error("Cannot add boolean or list values.");
            case "-":
                return (this.toNumber(left) -
                    this.toNumber(right));
            case "*":
                return (this.toNumber(left) *
                    this.toNumber(right));
            case "/":
                return (this.toNumber(left) /
                    this.toNumber(right));
            case "==":
                return this.valuesEqual(left, right);
            case "!=":
                return !this.valuesEqual(left, right);
            case "<":
                return this.compare(left, right, "<");
            case "<=":
                return this.compare(left, right, "<=");
            case ">":
                return this.compare(left, right, ">");
            case ">=":
                return this.compare(left, right, ">=");
            case "and":
                return (this.isTruthy(left) &&
                    this.isTruthy(right));
            case "or":
                return (this.isTruthy(left) ||
                    this.isTruthy(right));
            case "not":
                return !this.isTruthy(right);
            default:
                throw new Error(`Unknown operator '${expression.operator}'.`);
        }
    }
    valuesEqual(left, right) {
        if (Array.isArray(left) &&
            Array.isArray(right)) {
            if (left.length !== right.length) {
                return false;
            }
            for (let i = 0; i < left.length; i++) {
                if (!this.valuesEqual(left[i], right[i])) {
                    return false;
                }
            }
            return true;
        }
        if (Array.isArray(left) ||
            Array.isArray(right)) {
            return false;
        }
        return left === right;
    }
    toNumber(value) {
        if (typeof value === "number") {
            return value;
        }
        throw new Error(`Expected number but got ${typeof value}.`);
    }
    compare(left, right, operator) {
        if (typeof left !== "number" ||
            typeof right !== "number") {
            throw new Error(`Cannot use '${operator}' with non-number values.`);
        }
        switch (operator) {
            case "<":
                return left < right;
            case "<=":
                return left <= right;
            case ">":
                return left > right;
            case ">=":
                return left >= right;
            default:
                throw new Error(`Unknown comparison operator '${operator}'.`);
        }
    }
}
