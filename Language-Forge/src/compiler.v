// @ts-nocheck
export class Compiler {
    compile(program) {
        const instructions = [];
        for (const statement of program.statements) {
            this.compileStatement(statement, instructions);
        }
        return instructions;
    }
    compileStatement(statement, instructions) {
        switch (statement.type) {
            case "AskStatement":
                instructions.push({
                    op: "ASK",
                    line: statement.line ?? 1,
                    name: statement.name,
                });
                break;
            case "SayStatement":
                this.compileExpression(statement.expression, instructions);
                instructions.push({
                    op: "SAY",
                    line: statement.line ?? statement.expression.line ?? 1,
                });
                break;
            case "SetStatement":
                this.compileExpression(statement.value, instructions);
                instructions.push({
                    op: "SET",
                    line: statement.line ?? 1,
                    name: statement.name,
                });
                break;
            case "IfStatement":
                this.compileExpression(statement.condition, instructions);
                instructions.push({
                    op: "IF_START",
                    line: statement.line ?? 1,
                });
                for (const child of statement.thenBranch) {
                    this.compileStatement(child, instructions);
                }
                if (statement.elseBranch) {
                    instructions.push({
                        op: "ELSE",
                        line: statement.line ?? 1,
                    });
                    for (const child of statement.elseBranch) {
                        this.compileStatement(child, instructions);
                    }
                }
                instructions.push({
                    op: "IF_END",
                    line: statement.line ?? 1,
                });
                break;
            case "WhileStatement":
                instructions.push({
                    op: "WHILE_START",
                    line: statement.line ?? 1,
                });
                this.compileExpression(statement.condition, instructions);
                for (const child of statement.body) {
                    this.compileStatement(child, instructions);
                }
                instructions.push({
                    op: "WHILE_END",
                    line: statement.line ?? 1,
                });
                break;
            case "FunctionStatement":
                this.compileFunction(statement, instructions);
                break;
            case "ReturnStatement":
                if (statement.value) {
                    this.compileExpression(statement.value, instructions);
                }
                instructions.push({
                    op: "RETURN",
                    line: statement.line ?? 1,
                });
                break;
            case "ExpressionStatement":
                this.compileExpression(statement.expression, instructions);
                instructions.push({
                    op: "POP",
                    line: statement.line ?? 1,
                });
                break;
        }
    }
    compileFunction(statement, instructions) {
        instructions.push({
            op: "FUNCTION_START",
            line: statement.line ?? 1,
            name: statement.name,
        });
        for (const parameter of statement.parameters) {
            instructions.push({
                op: "PARAMETER",
                line: statement.line ?? 1,
                name: parameter,
            });
        }
        for (const child of statement.body) {
            this.compileStatement(child, instructions);
        }
        instructions.push({
            op: "FUNCTION_END",
            line: statement.line ?? 1,
            name: statement.name,
        });
    }
    compileExpression(expression, instructions) {
        switch (expression.type) {
            case "LiteralExpression":
                instructions.push({
                    op: "CONSTANT",
                    line: expression.line ?? 1,
                    value: expression.value,
                });
                break;
            case "VariableExpression":
                instructions.push({
                    op: "LOAD",
                    line: expression.line ?? 1,
                    name: expression.name,
                });
                break;
            case "BinaryExpression":
                this.compileExpression(expression.left, instructions);
                this.compileExpression(expression.right, instructions);
                instructions.push({
                    op: this.binaryOpcode(expression.operator),
                    line: expression.line ?? 1,
                });
                break;
            case "CallExpression":
                for (const argument of expression.arguments) {
                    this.compileExpression(argument, instructions);
                }
                instructions.push({
                    op: "CALL",
                    line: expression.line ?? 1,
                    name: expression.name,
                    value: expression.arguments.length,
                });
                break;
        }
    }
    binaryOpcode(operator) {
        switch (operator) {
            case "+":
                return "ADD";
            case "-":
                return "SUBTRACT";
            case "*":
                return "MULTIPLY";
            case "/":
                return "DIVIDE";
            case "==":
                return "EQUAL";
            case "!=":
                return "NOT_EQUAL";
            case "<":
                return "LESS";
            case "<=":
                return "LESS_EQUAL";
            case ">":
                return "GREATER";
            case ">=":
                return "GREATER_EQUAL";
            case "and":
                return "AND";
            case "or":
                return "OR";
            case "not":
                return "NOT";
            default:
                throw new Error(`Unknown operator '${operator}'.`);
        }
    }
}
