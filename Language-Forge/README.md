# Language Forge

Language Forge contains a self-hosted Vico compiler. Its source is `src/main.v`; `bootstrap/vico.c` provides the initial native compiler used to build it. The self-hosted compiler translates `.vico` programs into C. The `.v` files under `src/` and `bootstrap/` retain the former TypeScript source and are not part of the native compiler build.

## Build and run

Build the compiler from its C bootstrap and verify that it recompiles itself to identical output:

```sh
npm run build
```

Build and run the hello example:

```sh
npm start
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

Run `npm test` for native compiler coverage. `npm run self-host` verifies the compiler fixed point. `npm run compiler -- examples/hello.vico build/hello.c` compiles a program to C.
