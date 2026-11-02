# Language Forge

Language Forge contains a native C compiler for Vico. It translates `.vico` source files into C, then the generated program can be compiled and run with the system C compiler.

## Build and Run

Build the native compiler and run the hello example:

```sh
make compiler
make run
```

Choose a program with `make run FILE=examples/name.vico` or `make run FILE=examples/calculator.vico`. `ask` reads a line from standard input. To compile a source file to generated C without running it:

```sh
build/vico-compiler examples/hello.vico -o build/hello.c
```

The compiler currently supports `say`, `ask`, and `set` statements, variables, numeric and string literals, arithmetic, and comparisons. The TypeScript interpreter and its broader language tests remain in the repository while native support is expanded.

## Syntax

```vico
ask name
set greeting = "Hello, " + name
say greeting
```

`ask` reads a line into a variable, `set` assigns an expression, and `say` prints an expression. Expressions support numbers, strings, variables, parentheses, unary minus, and `+`, `-`, `*`, `/`, and comparisons; `+` concatenates when either operand is a string. `//` starts a line comment.

## Development

Run `npm test` and `npm run typecheck` for the retained TypeScript regression suite. `npm run build` builds the native C compiler.