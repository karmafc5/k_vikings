import * as readline from "readline";

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Interpreter } from "./interpreter";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let lines: string[] = [];
let running = false;

function runProgram(sourceLines: string[]): void {
  if (sourceLines.length === 0) {
    console.log("No program entered.");
    return;
  }

  try {
    const source = sourceLines.join("\n");

    // 1. Lexical analysis
    const lexer = new Lexer(source);
    const tokens = lexer.scanTokens();

    // 2. Parsing
    const parser = new Parser(tokens);
    const program = parser.parse();

    // 3. Interpretation
    const interpreter = new Interpreter();

    interpreter
      .interpret(program)
      .then(() => {
        console.log("");
        console.log("Program finished.");
        console.log("");
        rl.setPrompt("Vico> ");
        rl.prompt();
      })
      .catch((error) => {
        console.log("");

        if (error instanceof Error) {
          console.error(error.message);
        } else {
          console.error(error);
        }

        console.log("");
        rl.setPrompt("Vico> ");
        rl.prompt();
      });
  } catch (error) {
    console.log("");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    console.log("");
    rl.setPrompt("Vico> ");
    rl.prompt();
  }
}

console.log("=================================");
console.log("          VICO LANGUAGE");
console.log("=================================");
console.log("");
console.log("Enter your Vico program.");
console.log("Use RUN to execute the program.");
console.log("Use EXIT to quit.");
console.log("");
console.log("You can paste a complete multiline program.");
console.log("");

rl.setPrompt("Vico> ");
rl.prompt();

rl.on("line", (line) => {
  const command = line.trim().toUpperCase();

  // EXIT
  if (command === "EXIT" && lines.length === 0) {
    rl.close();
    return;
  }

  // RUN
  if (command === "RUN") {
    const program = [...lines];

    lines = [];

    runProgram(program);
    return;
  }

  // EXIT while a program is being entered
  if (command === "EXIT" && lines.length > 0) {
    lines = [];

    console.log("Program discarded.");
    console.log("");

    rl.setPrompt("Vico> ");
    rl.prompt();

    return;
  }

  // Store the line exactly as entered.
  // This preserves indentation.
  lines.push(line);

  // Show continuation prompt
  rl.setPrompt("...> ");
  rl.prompt();
});

rl.on("close", () => {
  console.log("");
  console.log("Goodbye!");
});