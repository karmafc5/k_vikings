CC ?= cc
CFLAGS ?= -std=c11 -Wall -Wextra -Werror -O2
BUILD_DIR ?= build
COMPILER = $(BUILD_DIR)/vico-compiler
FILE ?= examples/hello.vico

.PHONY: all compiler run

all: compiler

compiler: $(COMPILER)

$(COMPILER): bootstrap/vico.c
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $< -o $@

run: compiler
	$(COMPILER) "$(FILE)" -o "$(BUILD_DIR)/program.c"
	$(CC) $(CFLAGS) "$(BUILD_DIR)/program.c" -o "$(BUILD_DIR)/program"
	$(BUILD_DIR)/program