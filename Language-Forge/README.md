# Language Forge

Language Forge contains a TypeScript interpreter and a self-hosted Vico compiler. The compiler source is `src/main.v`; `bootstrap/vico.c` provides the initial native compiler used to build it. The self-hosted compiler translates `.vico` programs into C.

## Build and run

Run the TypeScript interpreter:

```sh
npm start
```

Build the native compiler and verify that it recompiles its own source to identical output:

```sh
npm run build
```

Compile a Vico program to C with the native compiler:

```sh
npm run compiler -- examples/hello.vico build/hello.c
```

Build and run an example directly with `make run FILE=examples/hello.vico`. Other examples cover calculations, functions, control flow, lists, and input in `examples/`.

## Syntax

```vico
ask name
set greeting = "Hello, " + name
say greeting
```

The compiler supports `say`, `ask`, `set`, `if`/`else`, `while`, functions, returns, lists, arithmetic, comparisons, and logical operators. Built-ins include `read_file`, `write_file`, `char_at`, `substring`, `len`, `get`, and `append`.

## Development

Run `npm test` for TypeScript unit tests or `npm run test-native` for native compiler coverage. `npm run typecheck` checks the TypeScript files. `npm run self-host` verifies the compiler fixed point.
