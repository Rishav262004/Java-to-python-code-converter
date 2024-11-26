// converter.js

// JavaScript code to convert Java code to Python code

// Keywords mapping
const keywords = {
    'System.out.println': 'print',
    'System.out.print': 'print',
    'System.out.printf': 'print',
    'true': 'True',
    'false': 'False',
    'null': 'None',
    ';': '', // Remove semicolons
    'import java.util.Scanner': '', // Remove import statement
};

// Function to remove class and method declarations
function removeClassAndMethodDeclarations(javaCode) {
    // Remove class declarations
    javaCode = javaCode.replace(/public\s+class\s+\w+\s*{?/g, '');
    // Remove main method declarations
    javaCode = javaCode.replace(/public\s+static\s+void\s+\w+\s*\(.*?\)\s*{?/g, '');
    return javaCode;
}

// Function to handle Java input statements (Scanner) and convert to Python's input()
function convertInput(javaCode) {
    // Remove Scanner declarations
    javaCode = javaCode.replace(/Scanner\s+(\w+)\s*=\s*new\s+Scanner\(.*?\);/g, '');
    // Handle nextInt(), nextDouble(), nextLine(), etc.
    const patterns = [
        [ /(\w+)\s*=\s*(\w+)\.nextInt\(\);/g, '$1 = int(input())' ],
        [ /(\w+)\s*=\s*(\w+)\.nextDouble\(\);/g, '$1 = float(input())' ],
        [ /(\w+)\s*=\s*(\w+)\.nextLine\(\);/g, '$1 = input()' ],
        [ /(\w+)\s*=\s*(\w+)\.next\(\);/g, '$1 = input()' ],
    ];
    patterns.forEach(([pattern, replacement]) => {
        javaCode = javaCode.replace(pattern, replacement);
    });
    return javaCode;
}

// Function to convert Java array declarations to Python lists
function convertArrays(javaCode) {
    // Handle array declarations like: int[] numbers = {1, 2, 3};
    const arrayPattern = /\b(?:int|double|float|String|boolean|char)\s*\[\s*\]\s*(\w+)\s*=\s*{([^}]+)};/g;
    javaCode = javaCode.replace(arrayPattern, (match, arrayName, arrayElements) => {
        // Convert the elements to a Python list
        const elements = arrayElements.trim().split(/\s*,\s*/).join(', ');
        return `${arrayName} = [${elements}]`;
    });
    return javaCode;
}

// Function to replace 'array.length' with 'len(array)'
function convertArrayLength(javaCode) {
    const lengthPattern = /(\w+)\.length/g;
    javaCode = javaCode.replace(lengthPattern, (match, arrayName) => {
        return `len(${arrayName})`;
    });
    return javaCode;
}

// Function to convert for-loops from Java to Python
function convertForLoop(javaCode) {
    const pattern = /for\s*\(\s*(?:int|double|float|long|)\s*(\w+)\s*=\s*(.*?);\s*(.*?);\s*(.*?)\s*\)/g;
    javaCode = javaCode.replace(pattern, (match, varName, init, cond, update) => {
        // Process condition
        const condMatch = cond.match(/\s*\w+\s*([<>=!]+)\s*(.+)/);
        if (!condMatch) return match; // Return original if unable to parse
        const compOp = condMatch[1];
        const condVal = condMatch[2].trim();

        // Process update
        let increment = 1; // Default increment
        if (update.includes('++')) {
            increment = 1;
        } else if (update.includes('--')) {
            increment = -1;
        } else {
            const updateMatch = update.match(/\s*\w+\s*([\+\-]=)\s*(.+)/);
            if (updateMatch) {
                const op = updateMatch[1];
                let val = updateMatch[2].trim();
                val = parseInt(val);
                if (isNaN(val)) return match;
                increment = op === '+=' ? val : -val;
            } else {
                return match; // Return original if unable to parse
            }
        }

        // Determine range parameters
        let start = init.trim();
        let end;
        if (compOp === '<') {
            end = condVal;
        } else if (compOp === '<=') {
            end = `${condVal} + 1`;
        } else if (compOp === '>') {
            end = condVal;
            increment = -Math.abs(increment);
        } else if (compOp === '>=') {
            end = `${condVal} - 1`;
            increment = -Math.abs(increment);
        } else {
            return match;
        }

        // Build range expression
        let rangeExpr;
        if (increment === 1) {
            rangeExpr = `range(${start}, ${end})`;
        } else {
            rangeExpr = `range(${start}, ${end}, ${increment})`;
        }

        return `for ${varName} in ${rangeExpr}:`;
    });
    return javaCode;
}

// Function to convert conditionals
function convertConditionals(javaCode) {
    // Convert 'else if' to 'elif'
    javaCode = javaCode.replace(/}?\s*else\s+if\s*\((.*?)\)\s*{/g, 'elif $1:');
    // Convert 'if' statements
    javaCode = javaCode.replace(/if\s*\((.*?)\)\s*{/g, 'if $1:');
    // Convert 'else' statements
    javaCode = javaCode.replace(/}?\s*else\s*{/g, 'else:');
    return javaCode;
}

// Function to adjust print statements
function adjustPrintStatements(javaCode) {
    const pattern = /System\.out\.(print(?:ln)?)\s*\((.*?)\);/g;
    javaCode = javaCode.replace(pattern, (match, method, args) => {
        args = args.trim();
        const argsConverted = convertStringConcatenation(args);
        if (method === 'print') {
            return `print(${argsConverted}, end='')`;
        } else {
            return `print(${argsConverted})`;
        }
    });
    return javaCode;
}

function convertStringConcatenation(args) {
    // Replace '+' with ',' for print statements
    const parts = args.split(/\s*\+\s*/);
    return parts.join(', ');
}

// Function to replace Java-specific keywords with Python ones
function convertKeywords(javaCode) {
    // Remove Java data types and handle multiple variable declarations first
    javaCode = javaCode.replace(/\b(byte|short|int|long|double|float|String|boolean|char)\b\s+([^;\n]+);?/g, (match, dataType, declaration) => {
        return convertVariableDeclaration(declaration);
    });

    // Now replace Java-specific keywords with Python ones
    for (const [javaKeyword, pythonKeyword] of Object.entries(keywords)) {
        javaCode = javaCode.split(javaKeyword).join(pythonKeyword);
    }
    return javaCode;
}

// Helper function to handle variable declarations
function convertVariableDeclaration(declaration) {
    const vars = declaration.split(',');
    let assignments = '';
    vars.forEach(varItem => {
        varItem = varItem.trim();
        if (varItem.includes('=')) {
            assignments += varItem + '\n';
        } else {
            assignments += `${varItem} = None\n`;
        }
    });
    return assignments;
}

// Function to remove curly braces and handle indentation
function fixIndentation(javaCode) {
    const lines = javaCode.split('\n');
    let indentationLevel = 0;
    const indentedCode = [];
    const indentStack = [];
    lines.forEach(line => {
        let strippedLine = line.trim();
        if (!strippedLine) {
            indentedCode.push('');
            return;
        }
        if (strippedLine.startsWith('}') || strippedLine === '}') {
            if (indentStack.length > 0) {
                indentStack.pop();
                indentationLevel = indentStack.length;
            }
            return;
        }
        strippedLine = strippedLine.replace(/{|}/g, '').trim();
        if (strippedLine.startsWith('elif') || strippedLine.startsWith('else:')) {
            if (indentStack.length > 0) {
                indentStack.pop();
                indentationLevel = indentStack.length;
            }
            indentedCode.push('    '.repeat(indentationLevel) + strippedLine);
            indentationLevel += 1;
            indentStack.push(indentationLevel);
        } else {
            indentedCode.push('    '.repeat(indentationLevel) + strippedLine);
            if (strippedLine.endsWith(':')) {
                indentationLevel += 1;
                indentStack.push(indentationLevel);
            }
        }
    });
    return indentedCode.join('\n');
}

// Function to handle variable names that shadow built-in functions
function avoidBuiltinShadowing(javaCode) {
    const builtins = new Set(['sum', 'min', 'max', 'list', 'dict', 'str', 'input', 'print', 'len']);
    const varPattern = /(\b[a-zA-Z_][a-zA-Z0-9_]*\b)\s*(?==)/g;
    const variables = new Set();
    let match;
    while ((match = varPattern.exec(javaCode)) !== null) {
        variables.add(match[1]);
    }
    const shadowed = [...variables].filter(varName => builtins.has(varName));
    shadowed.forEach(varName => {
        const regex = new RegExp(`\\b${varName}\\b`, 'g');
        javaCode = javaCode.replace(regex, `${varName}_var`);
    });
    return javaCode;
}

// Main function to convert Java code to Python code
function javaToPython(javaCode) {
    // Step 1: Remove class and method declarations
    let pythonCode = removeClassAndMethodDeclarations(javaCode);
    // Step 2: Convert array declarations
    pythonCode = convertArrays(pythonCode);
    // Step 3: Convert input handling
    pythonCode = convertInput(pythonCode);
    // Step 4: Replace 'array.length' with 'len(array)'
    pythonCode = convertArrayLength(pythonCode);
    // Step 5: Convert for-loops
    pythonCode = convertForLoop(pythonCode);
    // Step 6: Convert conditionals
    pythonCode = convertConditionals(pythonCode);
    // Step 7: Adjust print statements
    pythonCode = adjustPrintStatements(pythonCode);
    // Step 8: Replace keywords and syntax
    pythonCode = convertKeywords(pythonCode);
    // Step 9: Remove curly braces and handle indentation
    pythonCode = fixIndentation(pythonCode);
    // Step 10: Handle variable name conflicts
    pythonCode = avoidBuiltinShadowing(pythonCode);
    return pythonCode.trim();
}

// Event listener for the Convert button
document.getElementById('convert-button').addEventListener('click', function() {
    const javaCode = document.getElementById('java-code').value;
    const pythonCode = javaToPython(javaCode);
    document.getElementById('python-code').value = pythonCode;
});
