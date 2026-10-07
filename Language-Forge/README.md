# Language Forge

Language Forge is a small interpreter for Vico. Its lexer, parser, bytecode compiler, and virtual machine are implemented in TypeScript.

## Run

Install dependencies and run an example:

```sh
npm install
npm start -- examples/hello.vico
npm start -- examples/name.vico
npm run bootstrap -- examples/hello.vico
```

The name example prompts for input. Run the calculator with `npm start -- examples/calculator.vico`.
The bootstrap command compiles a Vico file to JSON bytecode using the TypeScript compiler.

## Syntax

```vico
ask name
set greeting = "Hello, " + name
say greeting
```

`ask` reads a line into a variable, `set` assigns an expression, and `say` prints an expression. Expressions support numbers, strings, variables, parentheses, unary minus, and `+`, `-`, `*`, `/`; `+` concatenates when either operand is a string. `//` starts a line comment.

## Development

Run `npm test`, `npm run typecheck`, and `npm run build` to test, check, and compile the project.

The TypeScript bootstrap compiler lives in `bootstrap/compiler.ts`. `vico/compiler.vico` records the self-hosting compiler draft; the current Vico language does not yet have functions, collections, control flow, or file access needed to implement the compiler in Vico.