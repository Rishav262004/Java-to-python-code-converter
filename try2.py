import re

# Dictionary to convert Java methods and keywords to Python equivalents.
keywords = {
    'System.out.println': 'print',
    'System.out.print': 'print',
    'System.out.printf': 'print',
    'true': 'True',
    'false': 'False',
    'null': 'None',
    ';': '',  # Remove semicolons
    'public class Main': '',  # Remove class declaration
    'public class Fibonacci': '',  # Remove specific class declaration
    'public static void main(String[] args)': '',  # Remove main method declaration
    'import java.util.Scanner': '',  # Remove import statement
}

# Function to handle Java input statements (Scanner) and convert to Python's input()
def convert_input(java_code):
    # Remove Scanner declarations
    java_code = re.sub(r'Scanner\s+(\w+)\s*=\s*new\s+Scanner\(.*?\);', '', java_code)
    # Handle nextInt(), nextDouble(), nextLine(), etc.
    patterns = [
        (r'(\w+)\s*=\s*(\w+)\.nextInt\(\);', r'\1 = int(input())'),
        (r'(\w+)\s*=\s*(\w+)\.nextDouble\(\);', r'\1 = float(input())'),
        (r'(\w+)\s*=\s*(\w+)\.nextLine\(\);', r'\1 = input()'),
        (r'(\w+)\s*=\s*(\w+)\.next\(\);', r'\1 = input()'),
    ]
    for pattern, replacement in patterns:
        java_code = re.sub(pattern, replacement, java_code)
    return java_code

# Function to convert for-loops from Java to Python
def convert_for_loop(java_code):
    # Pattern to match Java-style for-loops
    pattern = r'for\s*\(\s*(?:int|double|float|)\s*(\w+)\s*=\s*(.*?);\s*(.*?);\s*(.*?)\s*\)'
    def repl_for(match):
        var = match.group(1)
        init = match.group(2).strip()
        cond = match.group(3).strip()
        update = match.group(4).strip()
        # Handle condition
        cond_match = re.match(r'\s*\w+\s*([<>=!]+)\s*(.+)', cond)
        if not cond_match:
            return match.group(0)  # Return original if unable to parse
        comp_op = cond_match.group(1)
        cond_val = cond_match.group(2).strip()
        # Handle update
        increment = 1  # Default increment
        if '++' in update:
            increment = 1
        elif '--' in update:
            increment = -1
        else:
            update_match = re.match(r'\s*\w+\s*([\+\-]=)\s*(.+)', update)
            if update_match:
                op = update_match.group(1)
                val = update_match.group(2).strip()
                try:
                    val = int(val)
                except ValueError:
                    return match.group(0)
                increment = val if op == '+=' else -val
            else:
                return match.group(0)  # Return original if unable to parse
        # Determine range parameters
        start = init
        if comp_op == '<':
            end = cond_val
        elif comp_op == '<=':
            end = f"{cond_val} + 1"
        elif comp_op == '>':
            end = cond_val
            increment = -abs(increment)
        elif comp_op == '>=':
            end = f"{cond_val} - 1"
            increment = -abs(increment)
        else:
            return match.group(0)
        # Build range expression
        if increment == 1:
            range_expr = f"range({start}, {end})"
        else:
            range_expr = f"range({start}, {end}, {increment})"
        return f"for {var} in {range_expr}:"
    return re.sub(pattern, repl_for, java_code)

# Function to convert if-else and switch-case statements
def convert_conditionals(java_code):
    # Convert 'else if' to 'elif'
    java_code = re.sub(r'}?\s*else\s+if\s*\((.*?)\)\s*{', r'elif \1:', java_code)
    # Convert 'if' statements
    java_code = re.sub(r'if\s*\((.*?)\)\s*{', r'if \1:', java_code)
    # Convert 'else' statements
    java_code = re.sub(r'}?\s*else\s*{', r'else:', java_code)
    return java_code

# Function to replace Java-specific keywords with Python ones
def convert_keywords(java_code):
    for java_keyword, python_keyword in keywords.items():
        java_code = java_code.replace(java_keyword, python_keyword)
    # Remove Java data types and handle multiple variable declarations
    java_code = re.sub(r'\b(byte|short|int|long|double|float|String|boolean|char)\b\s+([^;]+);', lambda m: convert_variable_declaration(m.group(2)), java_code)
    return java_code

# Helper function to handle variable declarations
def convert_variable_declaration(declaration):
    # Split multiple declarations
    vars = [var.strip() for var in declaration.split(',')]
    assignments = []
    for var in vars:
        if '=' in var:
            assignments.append(var + '\n')
        else:
            assignments.append(f'{var} = None\n')  # Initialize without value
    return ''.join(assignments)

# Function to adjust print statements
def adjust_print_statements(java_code):
    # Handle 'print' and 'println'
    def replace_print(match):
        method = match.group(1)
        args = match.group(2).strip()
        # Check if it's 'System.out.print' (without 'ln') to set end parameter
        if method == 'print':
            return f'print({convert_string_concatenation(args)}, end=\'\')'
        else:
            return f'print({convert_string_concatenation(args)})'
    java_code = re.sub(r'System\.out\.(print(?:ln)?)\s*\((.*?)\);', replace_print, java_code)
    return java_code

def convert_string_concatenation(args):
    # Replace '+' with ',' for print statements to handle different data types
    # Handle cases like: "Value is " + x + " and y is " + y
    # We'll split on '+' and join with ', '
    parts = re.split(r'\s*\+\s*', args)
    return ', '.join(parts)

# Function to remove curly braces and handle indentation
def fix_indentation(java_code):
    lines = java_code.split('\n')
    indentation_level = 0
    indented_code = []
    indent_stack = []
    for line in lines:
        stripped_line = line.strip()
        # Skip empty lines
        if not stripped_line:
            indented_code.append('')
            continue
        # Decrease indentation if line starts with a closing brace or '}'
        if stripped_line.startswith('}') or stripped_line == '}':
            if indent_stack:
                indent_stack.pop()
                indentation_level = len(indent_stack)
            continue
        # Remove curly braces from the line
        stripped_line = stripped_line.replace('{', '').replace('}', '').strip()
        # Adjust indentation for 'elif' and 'else'
        if stripped_line.startswith(('elif', 'else:')):
            # Pop the last indentation level as 'elif' and 'else' are at the same level as 'if'
            if indent_stack:
                indent_stack.pop()
                indentation_level = len(indent_stack)
            indented_code.append('    ' * indentation_level + stripped_line)
            indentation_level += 1
            indent_stack.append(indentation_level)
        else:
            # Append the line with current indentation
            indented_code.append('    ' * indentation_level + stripped_line)
            # If line ends with ':', increase indentation
            if stripped_line.endswith(':'):
                indentation_level += 1
                indent_stack.append(indentation_level)
    return '\n'.join(indented_code)

# Function to handle variable names that shadow built-in functions
def avoid_builtin_shadowing(java_code):
    builtins = {'sum', 'min', 'max', 'list', 'dict', 'str', 'input', 'print', 'len'}
    # Find all variable names in assignments
    var_pattern = r'(\b[a-zA-Z_][a-zA-Z0-9_]*\b)\s*(?==)'
    variables = set(re.findall(var_pattern, java_code))
    # Find intersection with built-in names
    shadowed = builtins.intersection(variables)
    for var in shadowed:
        # Rename the variable by appending '_var'
        java_code = re.sub(r'\b{}\b'.format(var), var + '_var', java_code)
    return java_code

# Function to provide informative error messages (placeholder for actual error handling)
def provide_error_handling(java_code):
    # For this example, we'll assume our converter handles the code correctly
    # In practice, you might add try-except blocks and log errors
    return java_code

# Main function to convert Java code to Python
def java_to_python(java_code):
    # Step 1: Convert input handling
    python_code = convert_input(java_code)
    # Step 2: Convert for-loops
    python_code = convert_for_loop(python_code)
    # Step 3: Convert conditionals
    python_code = convert_conditionals(python_code)
    # Step 4: Adjust print statements
    python_code = adjust_print_statements(python_code)
    # Step 5: Replace keywords and syntax
    python_code = convert_keywords(python_code)
    # Step 6: Remove curly braces and handle indentation
    python_code = fix_indentation(python_code)
    # Step 7: Handle potential variable name conflicts
    python_code = avoid_builtin_shadowing(python_code)
    # Step 8: Provide error handling (if any)
    python_code = provide_error_handling(python_code)
    return python_code.strip()

# Example Java code input
java_code = """
import java.util.Scanner;

public class Fibonacci {
    public static void main(String[] args) {
        int n = 10, t1 = 0, t2 = 1;
        System.out.println("First " + n + " terms: ");

        for (int i = 1; i <= n; ++i) {
            System.out.print(t1 + " + ");
            int sum = t1 + t2;
            t1 = t2;
            t2 = sum;
        }
    }
}
"""

# Convert the Java code to Python
python_code = java_to_python(java_code)
print("Converted Python Code:\n")
print(python_code)
