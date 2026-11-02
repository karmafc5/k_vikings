
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

void skip_spaces(void) {
    while (*cursor && isspace((unsigned char)*cursor)) {
        cursor++;
    }
}

/* =====================================================
   EXPRESSION PARSER
   ===================================================== */

char *parse_comparison(void);
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

    /* Parentheses */
    if (*cursor == '(') {
        cursor++;

        char *result = parse_comparison();
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

/* Compile and validate a complete expression */
char *compile_expression(const char *source) {
    cursor = source;
    parse_error = 0;

    char *result = parse_comparison();

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
"typedef struct {\n"
"    int is_string;\n"
"    double number;\n"
"    char *string;\n"
"} VicoValue;\n"
"\n"
"typedef struct {\n"
"    char name[256];\n"
"    VicoValue value;\n"
"} VicoVariable;\n"
"\n"
"VicoVariable variables[1000];\n"
"int variable_count = 0;\n"
"\n"
"VicoValue vico_number(double n) {\n"
"    VicoValue v = {0, n, NULL};\n"
"    return v;\n"
"}\n"
"\n"
"VicoValue vico_string(const char *s) {\n"
"    VicoValue v;\n"
"    v.is_string = 1;\n"
"    v.number = 0;\n"
"    v.string = malloc(strlen(s) + 1);\n"
"    if (!v.string) {\n"
"        fprintf(stderr, \"Vico: Out of memory.\\n\");\n"
"        exit(1);\n"
"    }\n"
"    strcpy(v.string, s);\n"
"    return v;\n"
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
"    for (int i = 0; i < variable_count; i++) {\n"
"        if (strcmp(variables[i].name, name) == 0) {\n"
"            variables[i].value = value;\n"
"            return;\n"
"        }\n"
"    }\n"
"    if (variable_count >= 1000) {\n"
"        fprintf(stderr, \"Vico: Too many variables.\\n\");\n"
"        exit(1);\n"
"    }\n"
"    strcpy(variables[variable_count].name, name);\n"
"    variables[variable_count++].value = value;\n"
"}\n"
"\n"
"VicoValue vico_get(const char *name) {\n"
"    for (int i = 0; i < variable_count; i++) {\n"
"        if (strcmp(variables[i].name, name) == 0)\n"
"            return variables[i].value;\n"
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

    write_runtime(output);
    fprintf(output, "\nint main(void) {\n");

    char line[MAX_LINE];
    int line_number = 0;
    int failed = 0;

    while (fgets(line, sizeof(line), input)) {
        line_number++;

        char *source = trim(line);

        if (*source == '\0' || *source == '#' || strncmp(source, "//", 2) == 0)
            continue;

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

            fprintf(output, "    vico_print(%s);\n", compiled);
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

            fprintf(output, "    vico_set(\"%s\", vico_input(%s));\n",
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

            fprintf(output, "    vico_set(\"%s\", %s);\n",
                    name, compiled);

            free(compiled);
            continue;
        }

        fprintf(stderr, "Line %d: Unknown statement: %s\n",
                line_number, source);
        failed = 1;
        break;
    }

    fprintf(output, "    return 0;\n}\n");

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

