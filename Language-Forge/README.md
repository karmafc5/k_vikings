# Language Forge

Language Forge has a self-hosted Vico compiler in `vico/compiler.vico` and a small C bootstrap compiler in `bootstrap/vico.c`. The Vico compiler translates `.vico` source files into C.

## Build and Run

Build the bootstrap compiler, compile the Vico compiler with it, then compile that output with itself and verify both outputs match:

```sh
make self-host
```

Run the hello example with the self-hosted compiler:

```sh
make run
```

Choose a program with `make run FILE=examples/name.vico` or `make run FILE=examples/calculator.vico`. `ask` reads a line from standard input. To compile a source file to generated C without running it:

```sh
build/vico-compiler-selfhost examples/hello.vico build/hello.c
```

The compiler supports `say`, `ask`, `set`, `if`/`else`, `while`, functions, returns, lists, arithmetic, comparisons, and logical operators. Built-ins include `read_file`, `write_file`, `char_at`, `substring`, `len`, `get`, and `append`.

## Syntax

```vico
ask name
set greeting = "Hello, " + name
say greeting
```

`ask` reads a line into a variable, `set` assigns an expression, and `say` prints an expression. Expressions support numbers, strings, variables, parentheses, unary minus, and `+`, `-`, `*`, `/`, and comparisons; `+` concatenates when either operand is a string. `//` starts a line comment.

## Development

Run `make test-native` or `npm test` to check the self-hosted compiler against the examples and language-feature regression. `make self-host` or `npm run build` verifies the fixed point.