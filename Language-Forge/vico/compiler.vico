function contains(text, target)
	set index = 0
	while index < len(text)
		if char_at(text, index) == target
			return true
		set index = index + 1
	return false

function identifier_start(character)
	return contains("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_", character)

function identifier_part(character)
	return contains("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789", character)

function digit(character)
	return contains("0123456789", character)

function token(kind, value)
	return [kind, value]

function token_kind(tokens, position)
	return get(get(tokens, position), 0)

function token_value(tokens, position)
	return get(get(tokens, position), 1)

function keyword_kind(value)
	if value == "ask"
		return "ASK"
	if value == "say"
		return "SAY"
	if value == "set"
		return "SET"
	if value == "if"
		return "IF"
	if value == "else"
		return "ELSE"
	if value == "while"
		return "WHILE"
	if value == "function"
		return "FUNCTION"
	if value == "return"
		return "RETURN"
	if value == "true"
		return "TRUE"
	if value == "false"
		return "FALSE"
	if value == "and"
		return "AND"
	if value == "or"
		return "OR"
	if value == "not"
		return "NOT"
	return "IDENTIFIER"

function lex(source)
	set tokens = []
	set indentation_levels = [0]
	set source_length = len(source)
	set index = 0
	set at_line_start = true

	while index < source_length
		set character = char_at(source, index)

		if at_line_start
			set indentation = 0
			set scanning = true
			while index < source_length and scanning
				set character = char_at(source, index)
				if character == " "
					set indentation = indentation + 1
					set index = index + 1
				else
					if character == "\t"
						set indentation = indentation + 4
						set index = index + 1
					else
						set scanning = false

			if index < source_length
				set character = char_at(source, index)
				set is_comment = character == "#"
				if character == "/"
					if index + 1 < source_length
						if char_at(source, index + 1) == "/"
							set is_comment = true

				if is_comment
					set scanning = true
					while index < source_length and scanning
						if char_at(source, index) == "\n"
							set scanning = false
						else
							set index = index + 1
				else
					if character == "\n"
						set tokens = append(tokens, token("NEWLINE", "\n"))
						set index = index + 1
						set at_line_start = true
					else
						set previous_indent = get(indentation_levels, len(indentation_levels) - 1)
						if indentation > previous_indent
							set indentation_levels = append(indentation_levels, indentation)
							set tokens = append(tokens, token("INDENT", ""))
						else
							while indentation < previous_indent
								set indentation_levels = pop(indentation_levels)
								set tokens = append(tokens, token("DEDENT", ""))
								set previous_indent = get(indentation_levels, len(indentation_levels) - 1)
							if indentation != previous_indent
								set tokens = append(tokens, token("INVALID_INDENT", ""))
						set at_line_start = false

		else
			if character == "\n"
				set tokens = append(tokens, token("NEWLINE", "\n"))
				set index = index + 1
				set at_line_start = true
			else
				if character == " " or character == "\t" or character == "\r"
					set index = index + 1
				else
					if character == "#"
						set scanning = true
						while index < source_length and scanning
							if char_at(source, index) == "\n"
								set scanning = false
							else
								set index = index + 1
					else
						if character == "/"
							if index + 1 < source_length
								if char_at(source, index + 1) == "/"
									set scanning = true
									while index < source_length and scanning
										if char_at(source, index) == "\n"
											set scanning = false
										else
											set index = index + 1
								else
									set tokens = append(tokens, token("SLASH", "/"))
									set index = index + 1
							else
								set tokens = append(tokens, token("SLASH", "/"))
								set index = index + 1
						else
							if character == "\""
								set index = index + 1
								set value = ""
								set scanning = true
								while index < source_length and scanning
									set character = char_at(source, index)
									if character == "\""
										set index = index + 1
										set scanning = false
									else
										if character == "\\"
											if index + 1 < source_length
												set escaped = char_at(source, index + 1)
												if escaped == "n"
													set value = value + "\n"
												else
													if escaped == "r"
														set value = value + "\r"
													else
														if escaped == "t"
															set value = value + "\t"
														else
															set value = value + escaped
												set index = index + 2
											else
												set value = value + character
												set index = index + 1
										else
											set value = value + character
											set index = index + 1
								set tokens = append(tokens, token("STRING", value))
							else
								if digit(character)
									set start = index
									set has_decimal = false
									set scanning = true
									while index < source_length and scanning
										set character = char_at(source, index)
										if digit(character)
											set index = index + 1
										else
											if character == "." and not has_decimal
												set has_decimal = true
												set index = index + 1
											else
												set scanning = false
									set tokens = append(tokens, token("NUMBER", substring(source, start, index)))
								else
									if identifier_start(character)
										set start = index
										set scanning = true
										while index < source_length and scanning
											if identifier_part(char_at(source, index))
												set index = index + 1
											else
												set scanning = false
										set value = substring(source, start, index)
										set tokens = append(tokens, token(keyword_kind(value), value))
									else
										if character == "("
											set tokens = append(tokens, token("LEFT_PAREN", character))
										else
											if character == ")"
												set tokens = append(tokens, token("RIGHT_PAREN", character))
											else
												if character == "["
													set tokens = append(tokens, token("LEFT_BRACKET", character))
												else
													if character == "]"
														set tokens = append(tokens, token("RIGHT_BRACKET", character))
													else
														if character == ","
															set tokens = append(tokens, token("COMMA", character))
														else
															if character == "+"
																set tokens = append(tokens, token("PLUS", character))
															else
																if character == "-"
																	set tokens = append(tokens, token("MINUS", character))
																else
																	if character == "*"
																		set tokens = append(tokens, token("STAR", character))
																	else
																		if character == "="
																			if index + 1 < source_length
																				if char_at(source, index + 1) == "="
																					set tokens = append(tokens, token("EQUAL_EQUAL", "=="))
																					set index = index + 1
																				else
																					set tokens = append(tokens, token("EQUAL", character))
																			else
																				set tokens = append(tokens, token("EQUAL", character))
																		else
																			if character == "!"
																				if index + 1 < source_length
																					if char_at(source, index + 1) == "="
																						set tokens = append(tokens, token("NOT_EQUAL", "!="))
																						set index = index + 1
																					else
																						set tokens = append(tokens, token("NOT", character))
																				else
																					set tokens = append(tokens, token("NOT", character))
																			else
																				if character == "<" or character == ">"
																					set kind = "LESS"
																					if character == ">"
																						set kind = "GREATER"
																					if index + 1 < source_length
																						if char_at(source, index + 1) == "="
																							if character == "<"
																								set kind = "LESS_EQUAL"
																							else
																								set kind = "GREATER_EQUAL"
																							set index = index + 1
																					set value = character
																					if kind == "LESS_EQUAL"
																						set value = "<="
																					else
																						if kind == "GREATER_EQUAL"
																							set value = ">="
																					set tokens = append(tokens, token(kind, value))
																				else
																					set tokens = append(tokens, token("INVALID", character))
										set index = index + 1

	set tokens = append(tokens, token("NEWLINE", "\n"))
	while len(indentation_levels) > 1
		set indentation_levels = pop(indentation_levels)
		set tokens = append(tokens, token("DEDENT", ""))
	set tokens = append(tokens, token("EOF", ""))
	return tokens

function parse_primary(tokens, position)
	set kind = token_kind(tokens, position)
	set value = token_value(tokens, position)
	set expression = ["boolean", false]
	set next_position = position + 1

	if kind == "NUMBER"
		set expression = ["number", to_number(value)]
	else
		if kind == "STRING"
			set expression = ["string", value]
		else
			if kind == "TRUE"
				set expression = ["boolean", true]
			else
				if kind == "FALSE"
					set expression = ["boolean", false]
				else
					if kind == "IDENTIFIER"
						if token_kind(tokens, next_position) == "LEFT_PAREN"
							set arguments = []
							set next_position = next_position + 1
							if token_kind(tokens, next_position) != "RIGHT_PAREN"
								set parsed = parse_or(tokens, next_position)
								set arguments = append(arguments, get(parsed, 0))
								set next_position = get(parsed, 1)
								while token_kind(tokens, next_position) == "COMMA"
									set parsed = parse_or(tokens, next_position + 1)
									set arguments = append(arguments, get(parsed, 0))
									set next_position = get(parsed, 1)
							set next_position = next_position + 1
							set expression = ["call", value, arguments]
						else
							set expression = ["variable", value]
					else
						if kind == "LEFT_PAREN"
							set parsed = parse_or(tokens, next_position)
							set expression = get(parsed, 0)
							set next_position = get(parsed, 1) + 1
						else
							if kind == "LEFT_BRACKET"
								set elements = []
								if token_kind(tokens, next_position) != "RIGHT_BRACKET"
									set parsed = parse_or(tokens, next_position)
									set elements = append(elements, get(parsed, 0))
									set next_position = get(parsed, 1)
									while token_kind(tokens, next_position) == "COMMA"
										set parsed = parse_or(tokens, next_position + 1)
										set elements = append(elements, get(parsed, 0))
										set next_position = get(parsed, 1)
								set expression = ["list", elements]
								set next_position = next_position + 1

	while token_kind(tokens, next_position) == "LEFT_BRACKET"
		set parsed = parse_or(tokens, next_position + 1)
		set expression = ["index", expression, get(parsed, 0)]
		set next_position = get(parsed, 1) + 1
	return [expression, next_position]

function parse_unary(tokens, position)
	set kind = token_kind(tokens, position)
	if kind == "MINUS" or kind == "NOT"
		set parsed = parse_unary(tokens, position + 1)
		set operation = "-"
		if kind == "NOT"
			set operation = "not"
		return [["unary", operation, get(parsed, 0)], get(parsed, 1)]
	return parse_primary(tokens, position)

function parse_factor(tokens, position)
	set parsed = parse_unary(tokens, position)
	set left = get(parsed, 0)
	set position = get(parsed, 1)
	while token_kind(tokens, position) == "STAR" or token_kind(tokens, position) == "SLASH"
		set operation = token_value(tokens, position)
		set parsed = parse_unary(tokens, position + 1)
		set left = ["binary", left, operation, get(parsed, 0)]
		set position = get(parsed, 1)
	return [left, position]

function parse_term(tokens, position)
	set parsed = parse_factor(tokens, position)
	set left = get(parsed, 0)
	set position = get(parsed, 1)
	while token_kind(tokens, position) == "PLUS" or token_kind(tokens, position) == "MINUS"
		set operation = token_value(tokens, position)
		set parsed = parse_factor(tokens, position + 1)
		set left = ["binary", left, operation, get(parsed, 0)]
		set position = get(parsed, 1)
	return [left, position]

function parse_comparison(tokens, position)
	set parsed = parse_term(tokens, position)
	set left = get(parsed, 0)
	set position = get(parsed, 1)
	while token_kind(tokens, position) == "LESS" or token_kind(tokens, position) == "LESS_EQUAL" or token_kind(tokens, position) == "GREATER" or token_kind(tokens, position) == "GREATER_EQUAL"
		set operation = token_value(tokens, position)
		set parsed = parse_term(tokens, position + 1)
		set left = ["binary", left, operation, get(parsed, 0)]
		set position = get(parsed, 1)
	return [left, position]

function parse_equality(tokens, position)
	set parsed = parse_comparison(tokens, position)
	set left = get(parsed, 0)
	set position = get(parsed, 1)
	while token_kind(tokens, position) == "EQUAL_EQUAL" or token_kind(tokens, position) == "NOT_EQUAL"
		set operation = token_value(tokens, position)
		set parsed = parse_comparison(tokens, position + 1)
		set left = ["binary", left, operation, get(parsed, 0)]
		set position = get(parsed, 1)
	return [left, position]

function parse_and(tokens, position)
	set parsed = parse_equality(tokens, position)
	set left = get(parsed, 0)
	set position = get(parsed, 1)
	while token_kind(tokens, position) == "AND"
		set parsed = parse_equality(tokens, position + 1)
		set left = ["binary", left, "and", get(parsed, 0)]
		set position = get(parsed, 1)
	return [left, position]

function parse_or(tokens, position)
	set parsed = parse_and(tokens, position)
	set left = get(parsed, 0)
	set position = get(parsed, 1)
	while token_kind(tokens, position) == "OR"
		set parsed = parse_and(tokens, position + 1)
		set left = ["binary", left, "or", get(parsed, 0)]
		set position = get(parsed, 1)
	return [left, position]

function parse_block(tokens, position)
	set statements = []
	if token_kind(tokens, position) == "INDENT"
		set position = position + 1
	while token_kind(tokens, position) != "DEDENT" and token_kind(tokens, position) != "EOF"
		if token_kind(tokens, position) == "NEWLINE"
			set position = position + 1
		else
			set parsed = parse_statement(tokens, position)
			set statements = append(statements, get(parsed, 0))
			set position = get(parsed, 1)
	if token_kind(tokens, position) == "DEDENT"
		set position = position + 1
	return [statements, position]

function parse_statement(tokens, position)
	set kind = token_kind(tokens, position)
	set statement = ["expression", ["boolean", false]]
	set next_position = position + 1

	if kind == "SET"
		set name = token_value(tokens, next_position)
		set parsed = parse_or(tokens, next_position + 2)
		set statement = ["set", name, get(parsed, 0)]
		set next_position = get(parsed, 1) + 1
	else
		if kind == "SAY"
			set parsed = parse_or(tokens, next_position)
			set statement = ["say", get(parsed, 0)]
			set next_position = get(parsed, 1) + 1
		else
			if kind == "ASK"
				set name = token_value(tokens, next_position)
				set next_position = next_position + 1
				set prompt = name + ": "
				if token_kind(tokens, next_position) == "STRING"
					set prompt = token_value(tokens, next_position)
					set next_position = next_position + 1
				set statement = ["ask", name, prompt]
				set next_position = next_position + 1
			else
				if kind == "RETURN"
					if token_kind(tokens, next_position) == "NEWLINE"
						set statement = ["return", ["boolean", true]]
					else
						set parsed = parse_or(tokens, next_position)
						set statement = ["return", get(parsed, 0)]
						set next_position = get(parsed, 1)
					set next_position = next_position + 1
				else
					if kind == "IF" or kind == "WHILE"
						set parsed = parse_or(tokens, next_position)
						set condition = get(parsed, 0)
						set next_position = get(parsed, 1) + 2
						set parsed = parse_block(tokens, next_position)
						set body = get(parsed, 0)
						set next_position = get(parsed, 1)
						if kind == "IF"
							set alternate = []
							if token_kind(tokens, next_position) == "ELSE"
								set parsed = parse_block(tokens, next_position + 2)
								set alternate = get(parsed, 0)
								set next_position = get(parsed, 1)
							set statement = ["if", condition, body, alternate]
						else
							set statement = ["while", condition, body]
					else
						if kind == "FUNCTION"
							set name = token_value(tokens, next_position)
							set parameters = []
							set next_position = next_position + 2
							if token_kind(tokens, next_position) != "RIGHT_PAREN"
								set parameters = append(parameters, token_value(tokens, next_position))
								set next_position = next_position + 1
								while token_kind(tokens, next_position) == "COMMA"
									set parameters = append(parameters, token_value(tokens, next_position + 1))
									set next_position = next_position + 2
							set next_position = next_position + 2
							set parsed = parse_block(tokens, next_position)
							set statement = ["function", name, parameters, get(parsed, 0)]
							set next_position = get(parsed, 1)
						else
							set parsed = parse_or(tokens, position)
							set statement = ["expression", get(parsed, 0)]
							set next_position = get(parsed, 1) + 1
	return [statement, next_position]

function parse_program(tokens, position)
	set statements = []
	while token_kind(tokens, position) != "EOF"
		if token_kind(tokens, position) == "NEWLINE"
			set position = position + 1
		else
			set parsed = parse_statement(tokens, position)
			set statements = append(statements, get(parsed, 0))
			set position = get(parsed, 1)
	return [statements, position]

function escape_c(text)
	set escaped = ""
	set index = 0
	while index < len(text)
		set character = char_at(text, index)
		if character == "\\"
			set escaped = escaped + "\\\\"
		else
			if character == "\""
				set escaped = escaped + "\\\""
			else
				if character == "\n"
					set escaped = escaped + "\\n"
				else
					if character == "\r"
						set escaped = escaped + "\\r"
					else
						if character == "\t"
							set escaped = escaped + "\\t"
						else
							set escaped = escaped + character
		set index = index + 1
	return escaped

function spaces(count)
	set result = ""
	set index = 0
	while index < count
		set result = result + "    "
		set index = index + 1
	return result

function emit_arguments(arguments)
	set result = ""
	set index = 0
	while index < len(arguments)
		if index > 0
			set result = result + ", "
		set result = result + emit_expression(get(arguments, index))
		set index = index + 1
	return result

function emit_expression(expression)
	set kind = get(expression, 0)
	if kind == "number"
		return "vico_number(" + to_string(get(expression, 1)) + ")"
	if kind == "string"
		return "vico_string(\"" + escape_c(get(expression, 1)) + "\")"
	if kind == "boolean"
		if get(expression, 1)
			return "vico_number(1)"
		return "vico_number(0)"
	if kind == "variable"
		return "vico_get(\"" + get(expression, 1) + "\")"
	if kind == "list"
		set values = get(expression, 1)
		if len(values) == 0
			return "vico_list(0, NULL)"
		return "vico_list(" + to_string(len(values)) + ", (VicoValue[]){" + emit_arguments(values) + "})"
	if kind == "index"
		return "vico_call(\"get\", 2, (VicoValue[]){" + emit_expression(get(expression, 1)) + ", " + emit_expression(get(expression, 2)) + "})"
	if kind == "call"
		set arguments = get(expression, 2)
		if len(arguments) == 0
			return "vico_call(\"" + get(expression, 1) + "\", 0, NULL)"
		return "vico_call(\"" + get(expression, 1) + "\", " + to_string(len(arguments)) + ", (VicoValue[]){" + emit_arguments(arguments) + "})"
	if kind == "unary"
		set operation = get(expression, 1)
		set name = "vico_neg"
		if operation == "not"
			set name = "vico_not"
		return name + "(" + emit_expression(get(expression, 2)) + ")"
	if kind == "binary"
		set operation = get(expression, 2)
		set c_function = "vico_add"
		if operation == "-"
			set c_function = "vico_sub"
		if operation == "*"
			set c_function = "vico_mul"
		if operation == "/"
			set c_function = "vico_div"
		if operation == "=="
			set c_function = "vico_eq"
		if operation == "!="
			set c_function = "vico_ne"
		if operation == "<"
			set c_function = "vico_lt"
		if operation == "<="
			set c_function = "vico_le"
		if operation == ">"
			set c_function = "vico_gt"
		if operation == ">="
			set c_function = "vico_ge"
		if operation == "and"
			set c_function = "vico_and"
		if operation == "or"
			set c_function = "vico_or"
		return c_function + "(" + emit_expression(get(expression, 1)) + ", " + emit_expression(get(expression, 3)) + ")"
	return "vico_number(0)"

function emit_statement(statement, depth)
	set kind = get(statement, 0)
	set indentation = spaces(depth)
	if kind == "set"
		return indentation + "vico_set(\"" + get(statement, 1) + "\", " + emit_expression(get(statement, 2)) + ");\n"
	if kind == "say"
		return indentation + "vico_print(" + emit_expression(get(statement, 1)) + ");\n"
	if kind == "ask"
		return indentation + "vico_set(\"" + get(statement, 1) + "\", vico_input(vico_string(\"" + escape_c(get(statement, 2)) + "\")));\n"
	if kind == "return"
		return indentation + "return vico_scope_return(" + emit_expression(get(statement, 1)) + ");\n"
	if kind == "expression"
		return indentation + "(void)" + emit_expression(get(statement, 1)) + ";\n"
	if kind == "if"
		set result = indentation + "if (vico_truthy(" + emit_expression(get(statement, 1)) + ")) {\n"
		set result = result + emit_block(get(statement, 2), depth + 1)
		if len(get(statement, 3)) > 0
			set result = result + indentation + "} else {\n"
			set result = result + emit_block(get(statement, 3), depth + 1)
		return result + indentation + "}\n"
	if kind == "while"
		set result = indentation + "while (vico_truthy(" + emit_expression(get(statement, 1)) + ")) {\n"
		set result = result + emit_block(get(statement, 2), depth + 1)
		return result + indentation + "}\n"
	return ""

function emit_block(statements, depth)
	set result = ""
	set index = 0
	while index < len(statements)
		set statement = get(statements, index)
		if get(statement, 0) != "function"
			set result = result + emit_statement(statement, depth)
		set index = index + 1
	return result

function emit_function(statement)
	set name = get(statement, 1)
	set parameters = get(statement, 2)
	set result = "static VicoValue vico_fn_" + name + "(size_t argc, VicoValue *args) {\n"
	set result = result + "    if (argc != " + to_string(len(parameters)) + ") { fprintf(stderr, \"Vico: Wrong argument count for " + name + ".\\n\"); exit(1); }\n"
	set result = result + "    vico_scope_enter();\n"
	set index = 0
	while index < len(parameters)
		set result = result + "    vico_set(\"" + get(parameters, index) + "\", args[" + to_string(index) + "]);\n"
		set index = index + 1
	set result = result + emit_block(get(statement, 3), 1)
	return result + "    return vico_scope_return(vico_number(1));\n}\n"

function compile_program(statements)
	set functions = []
	set main_statements = []
	set index = 0
	while index < len(statements)
		set statement = get(statements, index)
		if get(statement, 0) == "function"
			set functions = append(functions, statement)
		else
			set main_statements = append(main_statements, statement)
		set index = index + 1

	set output = "#include \"vico_runtime.h\"\n"
	set index = 0
	while index < len(functions)
		set output = output + emit_function(get(functions, index)) + "\n"
		set index = index + 1
	set output = output + "int main(int argc, char **argv) {\n"
	set output = output + "    VicoValue *arguments = argc ? malloc((size_t)argc * sizeof(VicoValue)) : NULL;\n"
	set output = output + "    if (argc && !arguments) return 1;\n"
	set output = output + "    for (int i = 0; i < argc; i++) arguments[i] = vico_string(argv[i]);\n"
	set output = output + "    command_arguments = vico_list((size_t)argc, arguments);\n"
	set output = output + "    free(arguments);\n"
	set index = 0
	while index < len(functions)
		set name = get(get(functions, index), 1)
		set output = output + "    vico_register_function(\"" + name + "\", vico_fn_" + name + ");\n"
		set index = index + 1
	set output = output + emit_block(main_statements, 1)
	return output + "    return 0;\n}\n"

function compile_file(source_path, output_path)
	set source = read_file(source_path)
	set tokens = lex(source)
	set parsed = parse_program(tokens, 0)
	set output = compile_program(get(parsed, 0))
	return write_file(output_path, output)

set arguments = argv()
if len(arguments) < 3
	say "Usage: vico-compiler <source.vico> <output.c>"
else
	if compile_file(get(arguments, 1), get(arguments, 2))
		say "Vico compilation successful."
	else
		say "Vico compilation failed."