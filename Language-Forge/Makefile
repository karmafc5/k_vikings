CC ?= cc
CFLAGS ?= -std=c11 -Wall -Wextra -Werror -O2
BUILD_DIR ?= build
COMPILER = $(BUILD_DIR)/vico-compiler
FILE ?= examples/hello.vico

.PHONY: all compiler self-host run test-native

all: self-host

compiler: $(COMPILER)

$(COMPILER): bootstrap/vico.c
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $< -o $@

self-host: compiler
	$(COMPILER) --runtime "$(BUILD_DIR)/vico_runtime.h"
	$(COMPILER) src/main.v -o "$(BUILD_DIR)/compiler.bootstrap.c"
	$(CC) $(CFLAGS) "$(BUILD_DIR)/compiler.bootstrap.c" -o "$(BUILD_DIR)/vico-compiler-bootstrap"
	"$(BUILD_DIR)/vico-compiler-bootstrap" src/main.v "$(BUILD_DIR)/compiler.self.c"
	$(CC) $(CFLAGS) -I "$(BUILD_DIR)" "$(BUILD_DIR)/compiler.self.c" -o "$(BUILD_DIR)/vico-compiler-selfhost"
	"$(BUILD_DIR)/vico-compiler-selfhost" src/main.v "$(BUILD_DIR)/compiler.twice.c"
	cmp "$(BUILD_DIR)/compiler.self.c" "$(BUILD_DIR)/compiler.twice.c"
	@printf 'Vico self-host check passed.\n'

run: self-host
	"$(BUILD_DIR)/vico-compiler-selfhost" "$(FILE)" "$(BUILD_DIR)/program.c"
	$(CC) $(CFLAGS) -I "$(BUILD_DIR)" "$(BUILD_DIR)/program.c" -o "$(BUILD_DIR)/program"
	$(BUILD_DIR)/program

test-native: self-host
	"$(BUILD_DIR)/vico-compiler-selfhost" examples/hello.vico "$(BUILD_DIR)/hello.c"
	$(CC) $(CFLAGS) -I "$(BUILD_DIR)" "$(BUILD_DIR)/hello.c" -o "$(BUILD_DIR)/hello"
	test "$$($(BUILD_DIR)/hello)" = "Hello, world!"
	"$(BUILD_DIR)/vico-compiler-selfhost" examples/calculator.vico "$(BUILD_DIR)/calculator.c"
	$(CC) $(CFLAGS) -I "$(BUILD_DIR)" "$(BUILD_DIR)/calculator.c" -o "$(BUILD_DIR)/calculator"
	test "$$($(BUILD_DIR)/calculator)" = "Total: 20"
	"$(BUILD_DIR)/vico-compiler-selfhost" examples/functions.vico "$(BUILD_DIR)/functions.c"
	$(CC) $(CFLAGS) -I "$(BUILD_DIR)" "$(BUILD_DIR)/functions.c" -o "$(BUILD_DIR)/functions"
	test "$$($(BUILD_DIR)/functions)" = "Sum of squares: 25"
	"$(BUILD_DIR)/vico-compiler-selfhost" examples/control-flow.vico "$(BUILD_DIR)/control-flow.c"
	$(CC) $(CFLAGS) -I "$(BUILD_DIR)" "$(BUILD_DIR)/control-flow.c" -o "$(BUILD_DIR)/control-flow"
	test "$$($(BUILD_DIR)/control-flow)" = "$$(printf 'Loop total: 18\nCondition passed')"
	"$(BUILD_DIR)/vico-compiler-selfhost" examples/lists.vico "$(BUILD_DIR)/lists.c"
	$(CC) $(CFLAGS) -I "$(BUILD_DIR)" "$(BUILD_DIR)/lists.c" -o "$(BUILD_DIR)/lists"
	test "$$($(BUILD_DIR)/lists)" = "$$(printf 'Length: 3\nSecond: 4\nLast: 8')"
	"$(BUILD_DIR)/vico-compiler-selfhost" examples/name.vico "$(BUILD_DIR)/name.c"
	$(CC) $(CFLAGS) -I "$(BUILD_DIR)" "$(BUILD_DIR)/name.c" -o "$(BUILD_DIR)/name"
	test "$$(printf 'Ada\n' | $(BUILD_DIR)/name)" = "name: My name is Ada"
	"$(BUILD_DIR)/vico-compiler-selfhost" tests/lexer.test.v "$(BUILD_DIR)/lexer-test.c"
	$(CC) $(CFLAGS) -I "$(BUILD_DIR)" "$(BUILD_DIR)/lexer-test.c" -o "$(BUILD_DIR)/lexer-test"
	test "$$($(BUILD_DIR)/lexer-test)" = "Lexer and number token regression passed"
	"$(BUILD_DIR)/vico-compiler-selfhost" tests/parser.test.v "$(BUILD_DIR)/parser-test.c"
	$(CC) $(CFLAGS) -I "$(BUILD_DIR)" "$(BUILD_DIR)/parser-test.c" -o "$(BUILD_DIR)/parser-test"
	test "$$($(BUILD_DIR)/parser-test)" = "10"
	"$(BUILD_DIR)/vico-compiler-selfhost" tests/compiler.test.v "$(BUILD_DIR)/compiler-test.c"
	$(CC) $(CFLAGS) -I "$(BUILD_DIR)" "$(BUILD_DIR)/compiler-test.c" -o "$(BUILD_DIR)/compiler-test"
	test "$$($(BUILD_DIR)/compiler-test)" = "7"
	"$(BUILD_DIR)/vico-compiler-selfhost" tests/selfhost.vico "$(BUILD_DIR)/selfhost-test.c"
	$(CC) $(CFLAGS) -I "$(BUILD_DIR)" "$(BUILD_DIR)/selfhost-test.c" -o "$(BUILD_DIR)/selfhost-test"
	test "$$($(BUILD_DIR)/selfhost-test)" = "$$(printf 'logic\n1\ntwo\n120')"
