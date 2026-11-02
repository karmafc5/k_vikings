
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#define MAX_LINE 4096

static const char *cursor;
static int parse_error = 0;

/* =====================================================
   MEMORY AND CODE GENERATION HELPERS
   ===================================================== */

char *copy_text(const char *text) {
    char *result = malloc(strlen(text) + 1);
    if (!result) {
        fprintf(stderr, "Vico: Out of memory.\n");
        exit(1);
    }
    strcpy(result, text);
    return result;
}

char *make_binary_call(
    const char *function,
    const char *left,
    const char *right
) {
    size_t size = strlen(function) + strlen(left)
                + strlen(right) + 8;

    char *result = malloc(size);
    if (!result) exit(1);

    snprintf(result, size, "%s(%s, %s)", function, left, right);
    return result;
}

char *make_function_call(
    const char *function,
    char **arguments,
    size_t argument_count
) {
    size_t size = strlen(function) + 64;
    for (size_t i = 0; i < argument_count; i++) {
        size += strlen(arguments[i]) + 2;
    }

    char *result = malloc(size);
    if (!result) exit(1);

    if (argument_count == 0) {
        snprintf(result, size, "vico_call(\"%s\", 0, NULL)", function);
        return result;
    }

    int written = snprintf(
        result,
        size,
        "vico_call(\"%s\", %zu, (VicoValue[]){",
        function,
        argument_count
    );

    for (size_t i = 0; i < argument_count; i++) {
        written += snprintf(
            result + written,
            size - (size_t)written,
            "%s%s",
            i == 0 ? "" : ", ",
            arguments[i]
        );
    }

    snprintf(result + written, size - (size_t)written, "})");
    return result;
}

void skip_spaces(void) {
    while (*cursor && isspace((unsigned char)*cursor)) {
        cursor++;
    }
}

/* =====================================================
   EXPRESSION PARSER
   ===================================================== */

char *parse_comparison(void);
char *parse_and(void);
char *parse_or(void);
char *parse_expression(void);
char *parse_term(void);
char *parse_unary(void);
char *parse_primary(void);

char *parse_primary(void) {
    skip_spaces();

    if (*cursor == '\0') {
        parse_error = 1;
        return NULL;
    }

    if (*cursor == '[') {
        cursor++;
        skip_spaces();
        char *elements[64];
        size_t element_count = 0;

        while (*cursor != ']') {
            if (element_count >= sizeof(elements) / sizeof(elements[0])) {
                fprintf(stderr, "Vico: Too many list elements.\n");
                parse_error = 1;
                for (size_t i = 0; i < element_count; i++) free(elements[i]);
                return NULL;
            }
            char *element = parse_or();
            if (!element) {
                for (size_t i = 0; i < element_count; i++) free(elements[i]);
                return NULL;
            }
            elements[element_count++] = element;
            skip_spaces();
            if (*cursor == ',') {
                cursor++;
                skip_spaces();
                continue;
            }
            if (*cursor != ']') {
                fprintf(stderr, "Vico: Expected ',' or ']' in list.\n");
                parse_error = 1;
                for (size_t i = 0; i < element_count; i++) free(elements[i]);
                return NULL;
            }
            break;
        }

        cursor++;
        char *result = make_function_call("list", elements, element_count);
        for (size_t i = 0; i < element_count; i++) free(elements[i]);
        return result;
    }

    /* Parentheses */
    if (*cursor == '(') {
        cursor++;

        char *result = parse_or();
        skip_spaces();

        if (*cursor != ')') {
            fprintf(stderr, "Vico: Missing closing parenthesis.\n");
            parse_error = 1;
            free(result);
            return NULL;
        }

        cursor++;
        return result;
    }

    /* String */
    if (*cursor == '"') {
        cursor++;

        char value[2048];
        size_t length = 0;

        while (*cursor && *cursor != '"') {
            char ch = *cursor++;

            if (ch == '\\' && *cursor) {
                char escaped = *cursor++;

                if (escaped == 'n') ch = '\n';
                else if (escaped == 't') ch = '\t';
                else if (escaped == 'r') ch = '\r';
                else ch = escaped;
            }

            if (length + 1 >= sizeof(value)) {
                fprintf(stderr, "Vico: String is too long.\n");
                parse_error = 1;
                return NULL;
            }

            value[length++] = ch;
        }

        if (*cursor != '"') {
            fprintf(stderr, "Vico: Unterminated string.\n");
            parse_error = 1;
            return NULL;
        }

        cursor++;
        value[length] = '\0';

        char escaped[4096];
        size_t j = 0;

        for (size_t i = 0; i < length; i++) {
            if (value[i] == '\\' || value[i] == '"') {
                escaped[j++] = '\\';
                escaped[j++] = value[i];
            } else if (value[i] == '\n') {
                escaped[j++] = '\\';
                escaped[j++] = 'n';
            } else if (value[i] == '\r') {
                escaped[j++] = '\\';
                escaped[j++] = 'r';
            } else if (value[i] == '\t') {
                escaped[j++] = '\\';
                escaped[j++] = 't';
            } else {
                escaped[j++] = value[i];
            }
        }

        escaped[j] = '\0';

        char *result = malloc(j + 32);
        if (!result) exit(1);

        snprintf(result, j + 32, "vico_string(\"%s\")", escaped);
        return result;
    }

    /* Number */
    if (isdigit((unsigned char)*cursor) ||
        (*cursor == '.' && isdigit((unsigned char)cursor[1]))) {

        char *end;
        double number = strtod(cursor, &end);

        if (end == cursor) {
            parse_error = 1;
            return NULL;
        }

        cursor = end;

        char buffer[128];
        snprintf(buffer, sizeof(buffer), "vico_number(%.15g)", number);
        return copy_text(buffer);
    }

    /* Variable */
    if (isalpha((unsigned char)*cursor) || *cursor == '_') {
        char name[256];
        size_t length = 0;

        while (isalnum((unsigned char)*cursor) || *cursor == '_') {
            if (length + 1 >= sizeof(name)) {
                fprintf(stderr, "Vico: Variable name too long.\n");
                parse_error = 1;
                return NULL;
            }

            name[length++] = *cursor++;
        }

        name[length] = '\0';

        skip_spaces();
        if (*cursor == '(') {
            cursor++;
            skip_spaces();

            char *arguments[64];
            size_t argument_count = 0;

            while (*cursor != ')') {
                if (argument_count >= sizeof(arguments) / sizeof(arguments[0])) {
                    fprintf(stderr, "Vico: Too many function arguments.\n");
                    parse_error = 1;
                    for (size_t i = 0; i < argument_count; i++) free(arguments[i]);
                    return NULL;
                }

                char *argument = parse_or();
                if (!argument) {
                    for (size_t i = 0; i < argument_count; i++) free(arguments[i]);
                    return NULL;
                }
                arguments[argument_count++] = argument;
                skip_spaces();

                if (*cursor == ',') {
                    cursor++;
                    skip_spaces();
                    continue;
                }
                if (*cursor != ')') {
                    fprintf(stderr, "Vico: Expected ',' or ')' in function call.\n");
                    parse_error = 1;
                    for (size_t i = 0; i < argument_count; i++) free(arguments[i]);
                    return NULL;
                }
                break;
            }

            cursor++;
            char *result = make_function_call(name, arguments, argument_count);
            for (size_t i = 0; i < argument_count; i++) free(arguments[i]);
            return result;
        }

        if (strcmp(name, "true") == 0) return copy_text("vico_number(1)");
        if (strcmp(name, "false") == 0) return copy_text("vico_number(0)");

        char buffer[320];
        snprintf(buffer, sizeof(buffer), "vico_get(\"%s\")", name);
        return copy_text(buffer);
    }

    fprintf(stderr, "Vico: Unexpected character '%c'.\n", *cursor);
    parse_error = 1;
    return NULL;
}

/* Unary minus */
char *parse_unary(void) {
    skip_spaces();

    if (strncmp(cursor, "not", 3) == 0 &&
        !isalnum((unsigned char)cursor[3]) && cursor[3] != '_') {
        cursor += 3;
        char *value = parse_unary();
        if (!value) return NULL;

        char *result = malloc(strlen(value) + 32);
        if (!result) exit(1);
        sprintf(result, "vico_not(%s)", value);
        free(value);
        return result;
    }

    if (*cursor == '-') {
        cursor++;

        char *value = parse_unary();
        if (!value) return NULL;

        char *result = malloc(strlen(value) + 32);
        if (!result) exit(1);

        sprintf(result, "vico_neg(%s)", value);
        free(value);
        return result;
    }

    return parse_primary();
}

/* Multiplication and division */
char *parse_term(void) {
    char *left = parse_unary();
    if (!left) return NULL;

    while (1) {
        skip_spaces();

        char operation = *cursor;

        if (operation != '*' && operation != '/') break;

        cursor++;

        char *right = parse_unary();

        if (!right) {
            free(left);
            return NULL;
        }

        char *result = make_binary_call(
            operation == '*' ? "vico_mul" : "vico_div",
            left,
            right
        );

        free(left);
        free(right);
        left = result;
    }

    return left;
}

/* Addition and subtraction */
char *parse_expression(void) {
    char *left = parse_term();
    if (!left) return NULL;

    while (1) {
        skip_spaces();

        char operation = *cursor;

        if (operation != '+' && operation != '-') break;

        cursor++;

        char *right = parse_term();

        if (!right) {
            free(left);
            return NULL;
        }

        char *result = make_binary_call(
            operation == '+' ? "vico_add" : "vico_sub",
            left,
            right
        );

        free(left);
        free(right);
        left = result;
    }

    return left;
}

/* Comparison operators */
char *parse_comparison(void) {
    char *left = parse_expression();
    if (!left) return NULL;

    skip_spaces();

    char operation[3] = "";

    if (strncmp(cursor, "==", 2) == 0) {
        strcpy(operation, "==");
        cursor += 2;
    }
    else if (strncmp(cursor, "!=", 2) == 0) {
        strcpy(operation, "!=");
        cursor += 2;
    }
    else if (strncmp(cursor, ">=", 2) == 0) {
        strcpy(operation, ">=");
        cursor += 2;
    }
    else if (strncmp(cursor, "<=", 2) == 0) {
        strcpy(operation, "<=");
        cursor += 2;
    }
    else if (*cursor == '>') {
        strcpy(operation, ">");
        cursor++;
    }
    else if (*cursor == '<') {
        strcpy(operation, "<");
        cursor++;
    }

    if (operation[0] == '\0') {
        return left;
    }

    char *right = parse_expression();

    if (!right) {
        free(left);
        return NULL;
    }

    const char *function = NULL;

    if (strcmp(operation, "==") == 0)
        function = "vico_eq";
    else if (strcmp(operation, "!=") == 0)
        function = "vico_ne";
    else if (strcmp(operation, ">") == 0)
        function = "vico_gt";
    else if (strcmp(operation, "<") == 0)
        function = "vico_lt";
    else if (strcmp(operation, ">=") == 0)
        function = "vico_ge";
    else if (strcmp(operation, "<=") == 0)
        function = "vico_le";

    char *result = make_binary_call(function, left, right);

    free(left);
    free(right);

    return result;
}

int match_operator_word(const char *word) {
    skip_spaces();
    size_t length = strlen(word);
    if (strncmp(cursor, word, length) != 0 ||
        isalnum((unsigned char)cursor[length]) || cursor[length] == '_') {
        return 0;
    }
    cursor += length;
    return 1;
}

char *parse_and(void) {
    char *left = parse_comparison();
    if (!left) return NULL;

    while (match_operator_word("and")) {
        char *right = parse_comparison();
        if (!right) {
            free(left);
            return NULL;
        }
        char *result = make_binary_call("vico_and", left, right);
        free(left);
        free(right);
        left = result;
    }
    return left;
}

char *parse_or(void) {
    char *left = parse_and();
    if (!left) return NULL;

    while (match_operator_word("or")) {
        char *right = parse_and();
        if (!right) {
            free(left);
            return NULL;
        }
        char *result = make_binary_call("vico_or", left, right);
        free(left);
        free(right);
        left = result;
    }
    return left;
}

/* Compile and validate a complete expression */
char *compile_expression(const char *source) {
    cursor = source;
    parse_error = 0;

    char *result = parse_or();

    if (!result || parse_error) {
        free(result);
        return NULL;
    }

    skip_spaces();

    if (*cursor != '\0') {
        fprintf(stderr, "Vico: Unexpected text near '%s'.\n", cursor);
        free(result);
        return NULL;
    }

    return result;
}

/* =====================================================
   GENERATED C RUNTIME
   ===================================================== */

void write_runtime(FILE *output) {
    fputs(
"#include <stdio.h>\n"
"#include <stdlib.h>\n"
"#include <string.h>\n"
"\n"
"typedef struct VicoList VicoList;\n"
"typedef struct { int is_string; int is_list; double number; char *string; VicoList *list; } VicoValue;\n"
"struct VicoList { VicoValue *values; size_t length; };\n"
"\n"
"typedef struct {\n"
"    char name[256];\n"
"    VicoValue value;\n"
"} VicoVariable;\n"
"\n"
"typedef VicoValue (*VicoFunction)(size_t, VicoValue *);\n"
"typedef struct { char name[256]; VicoFunction function; } VicoFunctionEntry;\n"
"typedef struct { VicoVariable variables[1000]; size_t count; } VicoScope;\n"
"VicoScope scopes[128];\n"
"size_t scope_depth = 0;\n"
"VicoFunctionEntry functions[1000];\n"
"size_t function_count = 0;\n"
"VicoValue command_arguments;\n"
"\n"
"VicoValue vico_number(double n) {\n"
"    VicoValue v = {0, 0, n, NULL, NULL};\n"
"    return v;\n"
"}\n"
"\n"
"void vico_scope_enter(void) {\n"
"    if (scope_depth + 1 >= sizeof(scopes) / sizeof(scopes[0])) {\n"
"        fprintf(stderr, \"Vico: Maximum call depth exceeded.\\n\");\n"
"        exit(1);\n"
"    }\n"
"    scope_depth++;\n"
"    scopes[scope_depth].count = 0;\n"
"}\n"
"void vico_scope_leave(void) {\n"
"    if (scope_depth == 0) {\n"
"        fprintf(stderr, \"Vico: Invalid scope exit.\\n\");\n"
"        exit(1);\n"
"    }\n"
"    scope_depth--;\n"
"}\n"
"VicoValue vico_scope_return(VicoValue value) {\n"
"    vico_scope_leave();\n"
"    return value;\n"
"}\n"
"void vico_register_function(const char *name, VicoFunction function) {\n"
"    if (function_count >= sizeof(functions) / sizeof(functions[0])) {\n"
"        fprintf(stderr, \"Vico: Too many functions.\\n\");\n"
"        exit(1);\n"
"    }\n"
"    snprintf(functions[function_count].name, sizeof(functions[function_count].name), \"%s\", name);\n"
"    functions[function_count++].function = function;\n"
"}\n"
"\n"
"int vico_truthy(VicoValue value) {\n"
"    if (value.is_list) return value.list->length != 0;\n"
"    return value.is_string ? value.string[0] != '\\0' : value.number != 0;\n"
"}\n"
"\n"
"VicoValue vico_string(const char *s) {\n"
"    VicoValue v;\n"
"    v.is_string = 1;\n"
"    v.is_list = 0;\n"
"    v.number = 0;\n"
"    v.list = NULL;\n"
"    v.string = malloc(strlen(s) + 1);\n"
"    if (!v.string) {\n"
"        fprintf(stderr, \"Vico: Out of memory.\\n\");\n"
"        exit(1);\n"
"    }\n"
"    strcpy(v.string, s);\n"
"    return v;\n"
"}\n"
"\n"
"VicoValue vico_list(size_t count, VicoValue *values) {\n"
"    VicoValue v = {0, 1, 0, NULL, NULL};\n"
"    v.list = malloc(sizeof(VicoList));\n"
"    if (!v.list) exit(1);\n"
"    v.list->length = count;\n"
"    v.list->values = count ? malloc(count * sizeof(VicoValue)) : NULL;\n"
"    if (count && !v.list->values) exit(1);\n"
"    if (count) memcpy(v.list->values, values, count * sizeof(VicoValue));\n"
"    return v;\n"
"}\n"
"\n"
"VicoValue vico_call(const char *name, size_t count, VicoValue *args) {\n"
"    if (strcmp(name, \"len\") == 0 && count == 1) {\n"
"        if (args[0].is_list) return vico_number((double)args[0].list->length);\n"
"        if (!args[0].is_string) {\n"
"            fprintf(stderr, \"Vico: len expects a string or list.\\n\");\n"
"            exit(1);\n"
"        }\n"
"        return vico_number((double)strlen(args[0].string));\n"
"    }\n"
"    if (strcmp(name, \"list\") == 0) return vico_list(count, args);\n"
"    if (strcmp(name, \"argv\") == 0 && count == 0) return command_arguments;\n"
"    if (strcmp(name, \"pop\") == 0 && count == 1 && args[0].is_list) {\n"
"        size_t length = args[0].list->length;\n"
"        if (length == 0) { fprintf(stderr, \"Vico: Cannot pop an empty list.\\n\"); exit(1); }\n"
"        return vico_list(length - 1, args[0].list->values);\n"
"    }\n"
"    if (strcmp(name, \"get\") == 0 && count == 2) {\n"
"        if (!args[0].is_list || args[1].is_string || args[1].number < 0 ||\n"
"            args[1].number >= (double)args[0].list->length ||\n"
"            args[1].number != (double)(long)args[1].number) {\n"
"            fprintf(stderr, \"Vico: Invalid list index.\\n\");\n"
"            exit(1);\n"
"        }\n"
"        return args[0].list->values[(size_t)args[1].number];\n"
"    }\n"
"    if (strcmp(name, \"append\") == 0 && count == 2 && args[0].is_list) {\n"
"        size_t length = args[0].list->length;\n"
"        VicoValue *values = malloc((length + 1) * sizeof(VicoValue));\n"
"        if (!values) exit(1);\n"
"        if (length) memcpy(values, args[0].list->values, length * sizeof(VicoValue));\n"
"        values[length] = args[1];\n"
"        VicoValue result = vico_list(length + 1, values);\n"
"        free(values);\n"
"        return result;\n"
"    }\n"
"    if (strcmp(name, \"char_at\") == 0 && count == 2) {\n"
"        if (!args[0].is_string || args[1].is_string || args[1].number < 0 ||\n"
"            args[1].number >= (double)strlen(args[0].string)) {\n"
"            fprintf(stderr, \"Vico: char_at index is out of bounds.\\n\");\n"
"            exit(1);\n"
"        }\n"
"        char character[2] = {args[0].string[(size_t)args[1].number], '\\0'};\n"
"        return vico_string(character);\n"
"    }\n"
"    if (strcmp(name, \"substring\") == 0 && count == 3) {\n"
"        if (!args[0].is_string || args[1].is_string || args[2].is_string) {\n"
"            fprintf(stderr, \"Vico: substring expects a string and numeric indexes.\\n\");\n"
"            exit(1);\n"
"        }\n"
"        size_t length = strlen(args[0].string);\n"
"        long start = (long)args[1].number;\n"
"        long end = (long)args[2].number;\n"
"        if (start < 0 || end < start || (size_t)end > length) {\n"
"            fprintf(stderr, \"Vico: substring indexes are out of bounds.\\n\");\n"
"            exit(1);\n"
"        }\n"
"        size_t result_length = (size_t)(end - start);\n"
"        char *result = malloc(result_length + 1);\n"
"        if (!result) exit(1);\n"
"        memcpy(result, args[0].string + start, result_length);\n"
"        result[result_length] = '\\0';\n"
"        VicoValue value = vico_string(result);\n"
"        free(result);\n"
"        return value;\n"
"    }\n"
"    if (strcmp(name, \"read_file\") == 0 && count == 1 && args[0].is_string) {\n"
"        FILE *file = fopen(args[0].string, \"rb\");\n"
"        if (!file) { perror(\"Vico: Cannot read file\"); exit(1); }\n"
"        if (fseek(file, 0, SEEK_END) != 0) { fclose(file); exit(1); }\n"
"        long file_size = ftell(file);\n"
"        if (file_size < 0 || fseek(file, 0, SEEK_SET) != 0) { fclose(file); exit(1); }\n"
"        char *contents = malloc((size_t)file_size + 1);\n"
"        if (!contents) { fclose(file); exit(1); }\n"
"        size_t bytes_read = fread(contents, 1, (size_t)file_size, file);\n"
"        fclose(file);\n"
"        contents[bytes_read] = '\\0';\n"
"        VicoValue value = vico_string(contents);\n"
"        free(contents);\n"
"        return value;\n"
"    }\n"
"    if (strcmp(name, \"write_file\") == 0 && count == 2 &&\n"
"        args[0].is_string && args[1].is_string) {\n"
"        FILE *file = fopen(args[0].string, \"wb\");\n"
"        if (!file) { perror(\"Vico: Cannot write file\"); return vico_number(0); }\n"
"        size_t length = strlen(args[1].string);\n"
"        size_t written = fwrite(args[1].string, 1, length, file);\n"
"        int close_error = fclose(file);\n"
"        return vico_number(written == length && close_error == 0);\n"
"    }\n"
"    if (strcmp(name, \"to_number\") == 0 && count == 1 && args[0].is_string) {\n"
"        char *end;\n"
"        double number = strtod(args[0].string, &end);\n"
"        if (end == args[0].string || *end != '\\0') {\n"
"            fprintf(stderr, \"Vico: to_number received invalid input.\\n\");\n"
"            exit(1);\n"
"        }\n"
"        return vico_number(number);\n"
"    }\n"
"    if (strcmp(name, \"to_string\") == 0 && count == 1) {\n"
"        if (args[0].is_string) return args[0];\n"
"        if (args[0].is_list) { fprintf(stderr, \"Vico: Cannot convert a list to string.\\n\"); exit(1); }\n"
"        char text[128];\n"
"        snprintf(text, sizeof(text), \"%.15g\", args[0].number);\n"
"        return vico_string(text);\n"
"    }\n"
"    for (size_t i = 0; i < function_count; i++) {\n"
"        if (strcmp(name, functions[i].name) == 0)\n"
"            return functions[i].function(count, args);\n"
"    }\n"
"    fprintf(stderr, \"Vico: Unknown function '%s' or invalid arguments.\\n\", name);\n"
"    exit(1);\n"
"}\n"
"\n"
"VicoValue vico_input(VicoValue prompt) {\n"
"    char number[128];\n"
"    char input[4096];\n"
"    const char *text = prompt.is_string ? prompt.string : number;\n"
"    if (!prompt.is_string) snprintf(number, sizeof(number), \"%.15g\", prompt.number);\n"
"    fputs(text, stdout);\n"
"    fflush(stdout);\n"
"    if (!fgets(input, sizeof(input), stdin)) input[0] = '\\0';\n"
"    input[strcspn(input, \"\\r\\n\")] = '\\0';\n"
"    return vico_string(input);\n"
"}\n"
"\n"
"void vico_set(const char *name, VicoValue value) {\n"
"    VicoScope *scope = &scopes[scope_depth];\n"
"    for (size_t i = 0; i < scope->count; i++) {\n"
"        if (strcmp(scope->variables[i].name, name) == 0) {\n"
"            scope->variables[i].value = value;\n"
"            return;\n"
"        }\n"
"    }\n"
"    if (scope->count >= sizeof(scope->variables) / sizeof(scope->variables[0])) {\n"
"        fprintf(stderr, \"Vico: Too many variables.\\n\");\n"
"        exit(1);\n"
"    }\n"
"    snprintf(scope->variables[scope->count].name, sizeof(scope->variables[scope->count].name), \"%s\", name);\n"
"    scope->variables[scope->count++].value = value;\n"
"}\n"
"\n"
"VicoValue vico_get(const char *name) {\n"
"    for (size_t depth = scope_depth + 1; depth > 0; depth--) {\n"
"        VicoScope *scope = &scopes[depth - 1];\n"
"        for (size_t i = 0; i < scope->count; i++) {\n"
"            if (strcmp(scope->variables[i].name, name) == 0)\n"
"                return scope->variables[i].value;\n"
"        }\n"
"    }\n"
"    fprintf(stderr, \"Vico: Unknown variable '%s'.\\n\", name);\n"
"    exit(1);\n"
"}\n"
"\n"
"VicoValue vico_add(VicoValue a, VicoValue b) {\n"
"    if (!a.is_string && !b.is_string)\n"
"        return vico_number(a.number + b.number);\n"
"    char x[128], y[128];\n"
"    const char *left = a.is_string ? a.string : x;\n"
"    const char *right = b.is_string ? b.string : y;\n"
"    if (!a.is_string) snprintf(x, sizeof(x), \"%.15g\", a.number);\n"
"    if (!b.is_string) snprintf(y, sizeof(y), \"%.15g\", b.number);\n"
"    size_t size = strlen(left) + strlen(right) + 1;\n"
"    char *joined = malloc(size);\n"
"    if (!joined) exit(1);\n"
"    snprintf(joined, size, \"%s%s\", left, right);\n"
"    return vico_string(joined);\n"
"}\n"
"\n"
"VicoValue vico_sub(VicoValue a, VicoValue b) {\n"
"    return vico_number(a.number - b.number);\n"
"}\n"
"VicoValue vico_mul(VicoValue a, VicoValue b) {\n"
"    return vico_number(a.number * b.number);\n"
"}\n"
"VicoValue vico_div(VicoValue a, VicoValue b) {\n"
"    if (b.number == 0) {\n"
"        fprintf(stderr, \"Vico: Division by zero.\\n\");\n"
"        exit(1);\n"
"    }\n"
"    return vico_number(a.number / b.number);\n"
"}\n"
"VicoValue vico_neg(VicoValue a) {\n"
"    return vico_number(-a.number);\n"
"}\n"
"VicoValue vico_not(VicoValue a) {\n"
"    return vico_number(!vico_truthy(a));\n"
"}\n"
"VicoValue vico_and(VicoValue a, VicoValue b) {\n"
"    return vico_number(vico_truthy(a) && vico_truthy(b));\n"
"}\n"
"VicoValue vico_or(VicoValue a, VicoValue b) {\n"
"    return vico_number(vico_truthy(a) || vico_truthy(b));\n"
"}\n"
"\n"
"VicoValue vico_eq(VicoValue a, VicoValue b) {\n"
"    int equal;\n"
"    if (a.is_string && b.is_string)\n"
"        equal = strcmp(a.string, b.string) == 0;\n"
"    else if (!a.is_string && !b.is_string)\n"
"        equal = a.number == b.number;\n"
"    else equal = 0;\n"
"    return vico_number(equal);\n"
"}\n"
"VicoValue vico_ne(VicoValue a, VicoValue b) {\n"
"    return vico_number(!vico_eq(a, b).number);\n"
"}\n"
"VicoValue vico_gt(VicoValue a, VicoValue b) {\n"
"    return vico_number(a.number > b.number);\n"
"}\n"
"VicoValue vico_lt(VicoValue a, VicoValue b) {\n"
"    return vico_number(a.number < b.number);\n"
"}\n"
"VicoValue vico_ge(VicoValue a, VicoValue b) {\n"
"    return vico_number(a.number >= b.number);\n"
"}\n"
"VicoValue vico_le(VicoValue a, VicoValue b) {\n"
"    return vico_number(a.number <= b.number);\n"
"}\n"
"\n"
"void vico_print(VicoValue v) {\n"
"    if (v.is_string) printf(\"%s\\n\", v.string);\n"
"    else printf(\"%.15g\\n\", v.number);\n"
"}\n"
"\n",
        output
    );
}

/* =====================================================
   SOURCE FILE COMPILER
   ===================================================== */

char *trim(char *text) {
    while (isspace((unsigned char)*text)) text++;

    char *end = text + strlen(text);

    while (end > text && isspace((unsigned char)end[-1]))
        end--;

    *end = '\0';
    return text;
}

int valid_identifier(const char *name) {
    if (!name || !*name) return 0;

    if (!isalpha((unsigned char)*name) && *name != '_')
        return 0;

    for (int i = 1; name[i]; i++) {
        if (!isalnum((unsigned char)name[i]) && name[i] != '_')
            return 0;
    }

    return 1;
}

enum {
    BLOCK_IF,
    BLOCK_ELSE,
    BLOCK_WHILE
};

typedef struct {
    int indentation;
    int body_indentation;
    int type;
} CompilerBlock;

typedef struct {
    char name[256];
    char parameters[64][256];
    size_t parameter_count;
} FunctionInfo;

int parse_function_header(char *source, FunctionInfo *function) {
    char *header = trim(source + 8);
    char *open = strchr(header, '(');
    char *close = strrchr(header, ')');
    if (!open || !close || close < open || *trim(close + 1) != '\0') return 0;

    *open = '\0';
    char *name = trim(header);
    if (!valid_identifier(name) || strlen(name) >= sizeof(function->name)) return 0;
    strcpy(function->name, name);
    function->parameter_count = 0;

    *close = '\0';
    char *parameters = trim(open + 1);
    if (*parameters == '\0') return 1;

    while (*parameters) {
        char *comma = strchr(parameters, ',');
        if (comma) *comma = '\0';
        char *parameter = trim(parameters);
        if (!valid_identifier(parameter) ||
            strlen(parameter) >= sizeof(function->parameters[0]) ||
            function->parameter_count >= sizeof(function->parameters) / sizeof(function->parameters[0])) {
            return 0;
        }
        strcpy(function->parameters[function->parameter_count++], parameter);
        if (!comma) break;
        parameters = comma + 1;
        if (*trim(parameters) == '\0') return 0;
    }
    return 1;
}

void copy_stream(FILE *source, FILE *destination) {
    rewind(source);
    int character;
    while ((character = fgetc(source)) != EOF) fputc(character, destination);
}

int compile_file(const char *input_name, const char *requested_output) {
    FILE *input = fopen(input_name, "r");

    if (!input) {
        perror("Vico: Cannot open source file");
        return 1;
    }

    char output_name[512];
    if (requested_output) {
        if (snprintf(output_name, sizeof(output_name), "%s", requested_output) >= (int)sizeof(output_name)) {
            fprintf(stderr, "Vico: Output path is too long.\n");
            fclose(input);
            return 1;
        }
    } else {
        snprintf(output_name, sizeof(output_name), "%s", input_name);
        char *extension = strrchr(output_name, '.');

        if (extension && strcmp(extension, ".vico") == 0)
            strcpy(extension, ".c");
        else
            strcat(output_name, ".c");
    }

    FILE *output = fopen(output_name, "w");

    if (!output) {
        perror("Vico: Cannot create output file");
        fclose(input);
        return 1;
    }

    FILE *main_code = tmpfile();
    FILE *function_code = tmpfile();
    if (!main_code || !function_code) {
        perror("Vico: Cannot create compiler buffers");
        if (main_code) fclose(main_code);
        if (function_code) fclose(function_code);
        fclose(input);
        fclose(output);
        remove(output_name);
        return 1;
    }

    write_runtime(output);
    FILE *active_output = main_code;
    FunctionInfo functions[128];
    size_t function_count = 0;
    int in_function = 0;
    int function_body_indentation = -1;

    char line[MAX_LINE];
    int line_number = 0;
    int failed = 0;
    CompilerBlock blocks[128];
    size_t block_count = 0;

    while (fgets(line, sizeof(line), input)) {
        line_number++;

        int indentation = 0;
        char *leading = line;
        while (*leading == ' ' || *leading == '\t') {
            indentation += *leading == '\t' ? 4 : 1;
            leading++;
        }
        char *source = trim(line);

        if (*source == '\0' || *source == '#' || strncmp(source, "//", 2) == 0)
            continue;

        if (in_function && indentation == 0) {
            while (block_count > 0) {
                if (blocks[block_count - 1].body_indentation < 0) {
                    fprintf(stderr, "Line %d: Expected an indented block.\n", line_number);
                    failed = 1;
                    break;
                }
                fprintf(active_output, "    }\n");
                block_count--;
            }
            if (failed) break;
            if (function_body_indentation < 0) {
                fprintf(stderr, "Line %d: Function body cannot be empty.\n", line_number);
                failed = 1;
                break;
            }
            fprintf(active_output, "    return vico_scope_return(vico_number(1));\n}\n");
            active_output = main_code;
            in_function = 0;
            function_body_indentation = -1;
        }

        if (strncmp(source, "function ", 9) == 0) {
            if (indentation != 0 || block_count != 0 || in_function ||
                function_count >= sizeof(functions) / sizeof(functions[0])) {
                fprintf(stderr, "Line %d: Invalid function declaration position.\n", line_number);
                failed = 1;
                break;
            }
            FunctionInfo function;
            if (!parse_function_header(source, &function)) {
                fprintf(stderr, "Line %d: Invalid function declaration.\n", line_number);
                failed = 1;
                break;
            }
            for (size_t i = 0; i < function_count; i++) {
                if (strcmp(functions[i].name, function.name) == 0) {
                    fprintf(stderr, "Line %d: Function '%s' is already defined.\n",
                            line_number, function.name);
                    failed = 1;
                    break;
                }
            }
            if (failed) break;
            functions[function_count++] = function;
            active_output = function_code;
            in_function = 1;
            function_body_indentation = -1;
            fprintf(active_output, "static VicoValue vico_fn_%s(size_t argc, VicoValue *args) {\n",
                    function.name);
            fprintf(active_output,
                    "    if (argc != %zu) { fprintf(stderr, \"Vico: Wrong argument count for %s.\\n\"); exit(1); }\n",
                    function.parameter_count, function.name);
            fprintf(active_output, "    vico_scope_enter();\n");
            for (size_t i = 0; i < function.parameter_count; i++) {
                fprintf(active_output, "    vico_set(\"%s\", args[%zu]);\n",
                        function.parameters[i], i);
            }
            continue;
        }

        int is_else = strncmp(source, "else", 4) == 0 &&
            (source[4] == '\0' || isspace((unsigned char)source[4]) || source[4] == ':');
        int handled_else = 0;

        while (block_count > 0 && blocks[block_count - 1].indentation >= indentation) {
            CompilerBlock *block = &blocks[block_count - 1];
            if (is_else && block->indentation == indentation && block->type == BLOCK_IF) {
                if (block->body_indentation < 0) {
                    fprintf(stderr, "Line %d: Expected an indented block after 'if'.\n", line_number);
                    failed = 1;
                    break;
                }
                fprintf(active_output, "    } else {\n");
                block->type = BLOCK_ELSE;
                block->body_indentation = -1;
                handled_else = 1;
                break;
            }
            if (block->body_indentation < 0) {
                fprintf(stderr, "Line %d: Expected an indented block.\n", line_number);
                failed = 1;
                break;
            }
            fprintf(active_output, "    }\n");
            block_count--;
        }

        if (failed) break;
        if (handled_else) continue;
        if (is_else) {
            fprintf(stderr, "Line %d: 'else' without a matching 'if'.\n", line_number);
            failed = 1;
            break;
        }

        if (block_count == 0) {
            if (in_function && function_body_indentation < 0) {
                if (indentation == 0) {
                    fprintf(stderr, "Line %d: Expected an indented function body.\n", line_number);
                    failed = 1;
                    break;
                }
                function_body_indentation = indentation;
            } else if (in_function && indentation != function_body_indentation) {
                fprintf(stderr, "Line %d: Inconsistent function indentation.\n", line_number);
                failed = 1;
                break;
            } else if (!in_function && indentation != 0) {
                fprintf(stderr, "Line %d: Unexpected indentation.\n", line_number);
                failed = 1;
                break;
            }
        } else {
            CompilerBlock *parent = &blocks[block_count - 1];
            if (parent->body_indentation < 0) {
                if (indentation <= parent->indentation) {
                    fprintf(stderr, "Line %d: Expected an indented block.\n", line_number);
                    failed = 1;
                    break;
                }
                parent->body_indentation = indentation;
            } else if (indentation > parent->indentation &&
                       indentation != parent->body_indentation) {
                fprintf(stderr, "Line %d: Inconsistent indentation.\n", line_number);
                failed = 1;
                break;
            }
        }

        if ((strncmp(source, "if", 2) == 0 && isspace((unsigned char)source[2])) ||
            (strncmp(source, "while", 5) == 0 && isspace((unsigned char)source[5]))) {
            int is_while = source[0] == 'w';
            char *condition = trim(source + (is_while ? 5 : 2));
            size_t condition_length = strlen(condition);
            if (condition_length > 0 && condition[condition_length - 1] == ':') {
                condition[condition_length - 1] = '\0';
                condition = trim(condition);
            }
            char *compiled = compile_expression(condition);
            if (!compiled) {
                fprintf(stderr, "Line %d: Invalid condition expression.\n", line_number);
                failed = 1;
                break;
            }
            if (block_count >= sizeof(blocks) / sizeof(blocks[0])) {
                fprintf(stderr, "Line %d: Maximum block nesting exceeded.\n", line_number);
                free(compiled);
                failed = 1;
                break;
            }
            fprintf(active_output, "    %s (vico_truthy(%s)) {\n",
                    is_while ? "while" : "if", compiled);
            free(compiled);
            blocks[block_count++] = (CompilerBlock){indentation, -1,
                is_while ? BLOCK_WHILE : BLOCK_IF};
            continue;
        }

        if (strncmp(source, "return", 6) == 0 &&
            (source[6] == '\0' || isspace((unsigned char)source[6]))) {
            if (!in_function) {
                fprintf(stderr, "Line %d: 'return' is only valid inside a function.\n", line_number);
                failed = 1;
                break;
            }
            char *expression = trim(source + 6);
            char *compiled = *expression ? compile_expression(expression) : copy_text("vico_number(1)");
            if (!compiled) {
                fprintf(stderr, "Line %d: Invalid return expression.\n", line_number);
                failed = 1;
                break;
            }
            fprintf(active_output, "    return vico_scope_return(%s);\n", compiled);
            free(compiled);
            continue;
        }

        /* SAY */
        if (strncmp(source, "say", 3) == 0 &&
            isspace((unsigned char)source[3])) {

            char *expression = trim(source + 3);
            char *compiled = compile_expression(expression);

            if (!compiled) {
                fprintf(stderr, "Line %d: Invalid expression.\n",
                        line_number);
                failed = 1;
                break;
            }

            fprintf(active_output, "    vico_print(%s);\n", compiled);
            free(compiled);
            continue;
        }

        /* ASK */
        if (strncmp(source, "ask", 3) == 0 &&
            isspace((unsigned char)source[3])) {

            char *declaration = trim(source + 3);
            char *separator = declaration;
            while (*separator && !isspace((unsigned char)*separator)) separator++;

            char *prompt = NULL;
            if (*separator) {
                *separator++ = '\0';
                prompt = trim(separator);
            }

            if (!valid_identifier(declaration)) {
                fprintf(stderr, "Line %d: Invalid variable name.\n", line_number);
                failed = 1;
                break;
            }

            char default_prompt[320];
            char *compiled_prompt = NULL;
            if (!prompt || !*prompt) {
                snprintf(default_prompt, sizeof(default_prompt), "\"%s: \"", declaration);
                prompt = default_prompt;
            }

            compiled_prompt = compile_expression(prompt);
            if (!compiled_prompt) {
                fprintf(stderr, "Line %d: Invalid prompt expression.\n", line_number);
                failed = 1;
                break;
            }

            fprintf(active_output, "    vico_set(\"%s\", vico_input(%s));\n",
                    declaration, compiled_prompt);
            free(compiled_prompt);
            continue;
        }

        /* SET */
        if (strncmp(source, "set", 3) == 0 &&
            isspace((unsigned char)source[3])) {

            char *declaration = trim(source + 3);
            char *equals = strchr(declaration, '=');

            if (!equals) {
                fprintf(stderr, "Line %d: Expected '='.\n",
                        line_number);
                failed = 1;
                break;
            }

            *equals = '\0';

            char *name = trim(declaration);
            char *expression = trim(equals + 1);

            if (!valid_identifier(name)) {
                fprintf(stderr, "Line %d: Invalid variable name.\n",
                        line_number);
                failed = 1;
                break;
            }

            char *compiled = compile_expression(expression);

            if (!compiled) {
                fprintf(stderr, "Line %d: Invalid expression.\n",
                        line_number);
                failed = 1;
                break;
            }

            fprintf(active_output, "    vico_set(\"%s\", %s);\n",
                    name, compiled);

            free(compiled);
            continue;
        }

        fprintf(stderr, "Line %d: Unknown statement: %s\n",
                line_number, source);
        failed = 1;
        break;
    }

    while (!failed && block_count > 0) {
        if (blocks[block_count - 1].body_indentation < 0) {
            fprintf(stderr, "Line %d: Expected an indented block.\n", line_number);
            failed = 1;
            break;
        }
        fprintf(active_output, "    }\n");
        block_count--;
    }

    if (!failed && in_function) {
        if (function_body_indentation < 0) {
            fprintf(stderr, "Line %d: Function body cannot be empty.\n", line_number);
            failed = 1;
        } else {
            fprintf(active_output, "    return vico_scope_return(vico_number(1));\n}\n");
            in_function = 0;
        }
    }

    if (!failed) {
        copy_stream(function_code, output);
        fprintf(output, "\nint main(int argc, char **argv) {\n");
        fprintf(output, "    VicoValue *arguments = argc ? malloc((size_t)argc * sizeof(VicoValue)) : NULL;\n");
        fprintf(output, "    if (argc && !arguments) return 1;\n");
        fprintf(output, "    for (int i = 0; i < argc; i++) arguments[i] = vico_string(argv[i]);\n");
        fprintf(output, "    command_arguments = vico_list((size_t)argc, arguments);\n");
        fprintf(output, "    free(arguments);\n");
        for (size_t i = 0; i < function_count; i++) {
            fprintf(output, "    vico_register_function(\"%s\", vico_fn_%s);\n",
                    functions[i].name, functions[i].name);
        }
        copy_stream(main_code, output);
        fprintf(output, "    return 0;\n}\n");
    }

    fclose(main_code);
    fclose(function_code);
    fclose(input);
    fclose(output);

    if (failed) {
        remove(output_name);
        fprintf(stderr, "Compilation failed.\n");
        return 1;
    }

    printf("Vico compilation successful!\n");
    printf("Generated: %s\n", output_name);

    return 0;
}

/* =====================================================
   MAIN
   ===================================================== */

int main(int argc, char *argv[]) {
    if (argc == 3 && strcmp(argv[1], "--runtime") == 0) {
        FILE *runtime = fopen(argv[2], "w");
        if (!runtime) {
            perror("Vico: Cannot create runtime header");
            return 1;
        }
        write_runtime(runtime);
        fclose(runtime);
        return 0;
    }

    if (argc == 2) {
        return compile_file(argv[1], NULL);
    }

    if (argc == 4 && strcmp(argv[2], "-o") == 0) {
        return compile_file(argv[1], argv[3]);
    }

    if (argc != 2) {
        fprintf(stderr, "VICO COMPILER\n");
        fprintf(stderr, "Usage: ./vico-compiler <source.vico> [-o output.c]\n");
        return 1;
    }
    return 1;
}

