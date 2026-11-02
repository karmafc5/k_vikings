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
	$(COMPILER) vico/compiler.vico -o "$(BUILD_DIR)/compiler.bootstrap.c"
	$(CC) $(CFLAGS) "$(BUILD_DIR)/compiler.bootstrap.c" -o "$(BUILD_DIR)/vico-compiler-bootstrap"
	"$(BUILD_DIR)/vico-compiler-bootstrap" vico/compiler.vico "$(BUILD_DIR)/compiler.self.c"
	$(CC) $(CFLAGS) -I "$(BUILD_DIR)" "$(BUILD_DIR)/compiler.self.c" -o "$(BUILD_DIR)/vico-compiler-selfhost"
	"$(BUILD_DIR)/vico-compiler-selfhost" vico/compiler.vico "$(BUILD_DIR)/compiler.twice.c"
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
	"$(BUILD_DIR)/vico-compiler-selfhost" examples/name.vico "$(BUILD_DIR)/name.c"
	$(CC) $(CFLAGS) -I "$(BUILD_DIR)" "$(BUILD_DIR)/name.c" -o "$(BUILD_DIR)/name"
	test "$$(printf 'Ada\n' | $(BUILD_DIR)/name)" = "name: My name is Ada"
	"$(BUILD_DIR)/vico-compiler-selfhost" tests/selfhost.vico "$(BUILD_DIR)/selfhost-test.c"
	$(CC) $(CFLAGS) -I "$(BUILD_DIR)" "$(BUILD_DIR)/selfhost-test.c" -o "$(BUILD_DIR)/selfhost-test"
	test "$$($(BUILD_DIR)/selfhost-test)" = "$$(printf 'logic\n1\ntwo\n120')"