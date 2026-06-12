import type { ModuleType, LessonContentType } from './curriculum';

export const CODE_CURRICULUM: ModuleType[] = [
  {
    id: 'js-1',
    title: 'Module 1: JavaScript Foundations',
    engine: 'javascript',
    lessons: [
      {
        id: 'js-1-1',
        title: 'Hello, World!',
        content: `
# Hello, World!

Every programming journey starts here. In JavaScript, \`console.log()\` prints output to the terminal.

\`\`\`js
console.log("Hello, World!");
\`\`\`

## Your Task
Run the starter code, then modify it to print your own message.

### Key Concepts
- \`console.log(value)\` — prints any value
- Strings use \`"double"\` or \`'single'\` quotes
- Each statement ends with a semicolon (optional but conventional)
        `,
        defaultQuery: `// Print a greeting
console.log("Hello, World!");

// Try printing different things
console.log(42);
console.log(true);
console.log("Your turn — print something!");`,
      },
      {
        id: 'js-1-2',
        title: 'Variables & Types',
        content: `
# Variables & Types

JavaScript has six primitive types: **string**, **number**, **boolean**, **null**, **undefined**, and **bigint**.

Use \`let\` for values that change, \`const\` for constants.

\`\`\`js
const name = "Alice";   // string
let age  = 30;          // number
let active = true;      // boolean
\`\`\`

## Your Task
1. Declare a variable for your name, age, and whether you like JavaScript
2. Log them all using a template literal:
   \`console.log(\`Name: \${name}\`)\`

### Key Concepts
- \`typeof x\` — returns the type as a string
- Template literals use backticks and \`\${expression}\` for interpolation
- \`const\` cannot be reassigned; \`let\` can
        `,
        defaultQuery: `const name = "Alice";
let age = 30;
let likesJS = true;

console.log(\`Name: \${name}\`);
console.log(\`Age: \${age}\`);
console.log(\`Likes JS: \${likesJS}\`);
console.log(\`Type of age: \${typeof age}\`);

// Try changing the values and re-running`,
      },
      {
        id: 'js-1-3',
        title: 'Functions',
        content: `
# Functions

Functions are reusable blocks of code. JavaScript has three main ways to define them.

\`\`\`js
// Declaration
function greet(name) { return \`Hello, \${name}!\`; }

// Arrow function (modern, concise)
const square = (n) => n * n;

// Multi-line arrow
const describe = (x) => {
  const sq = x * x;
  return \`\${x} squared is \${sq}\`;
};
\`\`\`

## Your Task
Write a function \`celsiusToFahrenheit(c)\` that converts Celsius to Fahrenheit.
Formula: \`F = C × 9/5 + 32\`

Test it with 0°C (should be 32°F), 100°C (should be 212°F), and 37°C (body temp).
        `,
        defaultQuery: `// Conversion function
function celsiusToFahrenheit(c) {
  return c * 9 / 5 + 32;
}

console.log(celsiusToFahrenheit(0));    // 32
console.log(celsiusToFahrenheit(100));  // 212
console.log(celsiusToFahrenheit(37));   // 98.6

// Bonus: rewrite as an arrow function
const c2f = (c) => c * 9 / 5 + 32;
console.log(c2f(20));`,
      },
      {
        id: 'js-1-4',
        title: 'Arrays & Loops',
        content: `
# Arrays & Loops

Arrays hold ordered lists. JavaScript's built-in array methods let you transform data without manual loops.

\`\`\`js
const nums = [1, 2, 3, 4, 5];

nums.map(n => n * 2)        // [2, 4, 6, 8, 10]
nums.filter(n => n > 2)     // [3, 4, 5]
nums.reduce((sum, n) => sum + n, 0)  // 15
\`\`\`

## Your Task
Given the array of temperatures in Celsius below:
1. Convert all to Fahrenheit using \`.map()\`
2. Filter to only values above 37°C (fever threshold)
3. Find the average temperature using \`.reduce()\`
        `,
        defaultQuery: `const temps = [36.2, 37.8, 38.5, 35.9, 39.1, 36.8, 40.2];

// 1. Convert to Fahrenheit
const fahrenheit = temps.map(c => c * 9 / 5 + 32);
console.log("Fahrenheit:", fahrenheit);

// 2. Filter fevers (> 37°C)
const fevers = temps.filter(t => t > 37);
console.log("Fevers:", fevers);

// 3. Average temperature
const avg = temps.reduce((sum, t) => sum + t, 0) / temps.length;
console.log("Average:", avg.toFixed(2) + "°C");`,
      },
    ],
  },
  {
    id: 'js-2',
    title: 'Module 2: Problem Solving',
    engine: 'javascript',
    lessons: [
      {
        id: 'js-2-1',
        title: 'FizzBuzz',
        content: `
# FizzBuzz

The classic interview problem. Print numbers 1–30, but:
- **Fizz** for multiples of 3
- **Buzz** for multiples of 5
- **FizzBuzz** for multiples of both

### Key Concepts
- \`%\` is the modulo operator — returns the remainder
- \`n % 3 === 0\` means n is divisible by 3
- Check the combined case (\`FizzBuzz\`) **first**, otherwise you'll miss it

### Expected Output
\`\`\`
1, 2, Fizz, 4, Buzz, Fizz, 7, 8, Fizz, Buzz, 11, Fizz, 13, 14, FizzBuzz...
\`\`\`
        `,
        defaultQuery: `for (let i = 1; i <= 30; i++) {
  if (i % 15 === 0) {
    console.log("FizzBuzz");
  } else if (i % 3 === 0) {
    console.log("Fizz");
  } else if (i % 5 === 0) {
    console.log("Buzz");
  } else {
    console.log(i);
  }
}`,
      },
      {
        id: 'js-2-2',
        title: 'Fibonacci Sequence',
        content: `
# Fibonacci Sequence

Each number is the sum of the two before it: 0, 1, 1, 2, 3, 5, 8, 13…

## Two Approaches

**Iterative** — uses a loop. Fast, handles large n.

**Recursive** — calls itself. Elegant, but slow for large n (exponential time without memoization).

## Your Task
1. Run the iterative version and observe the output
2. Uncomment the recursive version and compare
3. Try calling \`fibRecursive(40)\` — notice how slow it gets

### Think About It
Why is the naive recursive version so slow? What's being recalculated over and over?
        `,
        defaultQuery: `// Iterative — O(n) time, O(1) space
function fibIterative(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

for (let i = 0; i <= 10; i++) {
  console.log(\`fib(\${i}) = \${fibIterative(i)}\`);
}

// Recursive — elegant but exponential time
function fibRecursive(n) {
  if (n <= 1) return n;
  return fibRecursive(n - 1) + fibRecursive(n - 2);
}

console.log("\\nRecursive fib(10):", fibRecursive(10));
// Try fibRecursive(40) — much slower!`,
      },
      {
        id: 'js-2-3',
        title: 'Array Algorithms',
        content: `
# Array Algorithms

Practice the core transformations you'll use constantly as a developer.

## Challenges

**1. Find the two numbers that sum to a target** (two-sum)
Given \`[2, 7, 11, 15]\` and target \`9\`, return \`[0, 1]\` (indices).

**2. Flatten a nested array**
Turn \`[[1, 2], [3, 4], [5]]\` into \`[1, 2, 3, 4, 5]\`.

**3. Count occurrences**
Count how many times each word appears in a sentence.

Each has multiple solutions — try to find the most readable one.
        `,
        defaultQuery: `// 1. Two Sum
function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) return [seen.get(complement), i];
    seen.set(nums[i], i);
  }
  return null;
}
console.log("Two Sum:", twoSum([2, 7, 11, 15], 9)); // [0, 1]

// 2. Flatten nested array
const nested = [[1, 2], [3, 4], [5]];
const flat = nested.flat(); // or: nested.reduce((acc, arr) => [...acc, ...arr], [])
console.log("Flattened:", flat);

// 3. Count word occurrences
const words = "the quick brown fox jumps over the lazy dog the".split(" ");
const counts = words.reduce((acc, word) => {
  acc[word] = (acc[word] || 0) + 1;
  return acc;
}, {});
console.log("Word counts:", counts);`,
      },
      {
        id: 'js-2-4',
        title: 'Objects & Destructuring',
        content: `
# Objects & Destructuring

Objects are the backbone of JavaScript. Destructuring is modern syntax that makes working with them clean.

\`\`\`js
const { name, age } = person;           // object destructuring
const [first, ...rest] = array;         // array destructuring
const { a: renamed } = obj;            // renaming while destructuring
const { x = 10 } = obj;               // default values
\`\`\`

## Your Task
Given the array of users below:
1. Destructure each user to extract \`name\` and \`scores\`
2. Calculate each user's average score
3. Find the top scorer
4. Sort users by average score descending
        `,
        defaultQuery: `const users = [
  { id: 1, name: "Alice",   scores: [88, 92, 79, 95] },
  { id: 2, name: "Bob",     scores: [72, 68, 85, 90] },
  { id: 3, name: "Charlie", scores: [95, 98, 92, 97] },
  { id: 4, name: "Diana",   scores: [80, 75, 88, 82] },
];

// Add average score to each user
const withAvg = users.map(({ name, scores, ...rest }) => ({
  ...rest,
  name,
  scores,
  average: scores.reduce((sum, s) => sum + s, 0) / scores.length,
}));

// Sort descending by average
const ranked = withAvg.sort((a, b) => b.average - a.average);

// Print leaderboard
console.log("=== Leaderboard ===");
ranked.forEach(({ name, average }, i) => {
  console.log(\`\${i + 1}. \${name} — \${average.toFixed(1)}\`);
});`,
      },
    ],
  },
];

export function getCodeLessonById(moduleId: string, lessonId: string): LessonContentType | undefined {
  return CODE_CURRICULUM
    .find(m => m.id === moduleId)
    ?.lessons.find(l => l.id === lessonId);
}
