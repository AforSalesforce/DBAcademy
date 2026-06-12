import type { ModuleType, LessonContentType } from './curriculum';

// Curriculum for server-executed compiled languages (Java, C, C++, Go).
// Code examples shown are in C — the user switches the language selector
// to run the same concept in Java, Go, or C++.

export const COMPILED_CURRICULUM: ModuleType[] = [
  {
    id: 'comp-1',
    title: 'Module 1: Language Foundations',
    engine: 'c',
    lessons: [
      {
        id: 'comp-1-1',
        title: 'Hello, World!',
        content: `
# Hello, World!

Every language starts here. The code in the editor matches your selected language above.

| Language | Output statement |
|----------|-----------------|
| C        | \`printf("Hello\\n");\` |
| C++      | \`cout << "Hello" << endl;\` |
| Java     | \`System.out.println("Hello");\` |
| Go       | \`fmt.Println("Hello")\` |

## Note on Server Execution
C, C++, Java, and Go run on the **server** via a sandboxed executor. The first run may be slightly slower as the container warms up.

Set \`PISTON_URL\` in your \`.env.local\` to point to your Piston instance. See [self-hosting guide](https://github.com/engineer-man/piston).
        `,
        defaultQuery: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    printf("I am running compiled C code!\\n");
    return 0;
}`,
      },
      {
        id: 'comp-1-2',
        title: 'Variables & Types',
        content: `
# Variables & Types

Compiled languages require **explicit type declarations** — the compiler checks types before running.

\`\`\`c
int    count = 10;
float  price = 9.99f;
char   letter = 'A';
char*  name = "Alice";    // C string (pointer to chars)
\`\`\`

## Why Types Matter
Static typing catches bugs at compile time, not at runtime. Mismatched types are a compiler error, not a crash.

## Your Task
Declare variables for an item name, quantity, and price. Calculate and print the total cost.
        `,
        defaultQuery: `#include <stdio.h>

int main() {
    int    quantity = 5;
    float  price    = 12.99f;
    char   item[]   = "Widget";

    float total = quantity * price;
    printf("Item: %s\\n", item);
    printf("Qty:  %d\\n", quantity);
    printf("Price: $%.2f\\n", price);
    printf("Total: $%.2f\\n", total);

    // Integer arithmetic
    int a = 7, b = 3;
    printf("\\n%d / %d = %d (integer division)\\n", a, b, a / b);
    printf("%d %% %d = %d (remainder)\\n", a, b, a % b);
    return 0;
}`,
      },
      {
        id: 'comp-1-3',
        title: 'Functions',
        content: `
# Functions in Compiled Languages

Functions must be **declared before use** (or forward-declared). Parameters and return types are explicit.

\`\`\`c
// Function declaration (prototype)
int add(int a, int b);

// Function definition
int add(int a, int b) {
    return a + b;
}
\`\`\`

## Stack vs Heap
Local variables live on the **stack** (fast, auto-freed). Dynamic memory (\`malloc\` / \`new\`) lives on the **heap** (manual management or garbage collected in Java/Go).

## Your Task
Write a function that calculates the factorial of n iteratively, and another that computes the nth Fibonacci number.
        `,
        defaultQuery: `#include <stdio.h>

long long factorial(int n) {
    long long result = 1;
    for (int i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

long long fibonacci(int n) {
    if (n <= 1) return n;
    long long a = 0, b = 1;
    for (int i = 2; i <= n; i++) {
        long long c = a + b;
        a = b;
        b = c;
    }
    return b;
}

int main() {
    printf("Factorials:\\n");
    for (int i = 0; i <= 10; i++) {
        printf("  %d! = %lld\\n", i, factorial(i));
    }

    printf("\\nFibonacci:\\n");
    for (int i = 0; i <= 10; i++) {
        printf("  fib(%d) = %lld\\n", i, fibonacci(i));
    }
    return 0;
}`,
      },
      {
        id: 'comp-1-4',
        title: 'Arrays & Loops',
        content: `
# Arrays & Loops

In C/C++, arrays are fixed-size blocks of contiguous memory. Loops iterate over them by index.

\`\`\`c
int nums[5] = {10, 20, 30, 40, 50};

// Classic for loop
for (int i = 0; i < 5; i++) {
    printf("%d\\n", nums[i]);
}
\`\`\`

## Array Bounds
C does **not** check array bounds. Writing past the end is undefined behaviour — a common source of bugs and security vulnerabilities.

## Your Task
Implement bubble sort on the array below. Print the array before and after sorting.
        `,
        defaultQuery: `#include <stdio.h>

void print_array(int arr[], int n) {
    printf("[");
    for (int i = 0; i < n; i++) {
        printf("%d%s", arr[i], i < n - 1 ? ", " : "");
    }
    printf("]\\n");
}

void bubble_sort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j]   = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

int main() {
    int data[] = {64, 34, 25, 12, 22, 11, 90};
    int n = sizeof(data) / sizeof(data[0]);

    printf("Before: ");
    print_array(data, n);

    bubble_sort(data, n);

    printf("After:  ");
    print_array(data, n);
    return 0;
}`,
      },
    ],
  },
];

export function getCompiledLessonById(moduleId: string, lessonId: string): LessonContentType | undefined {
  return COMPILED_CURRICULUM
    .find(m => m.id === moduleId)
    ?.lessons.find(l => l.id === lessonId);
}
