import type { ModuleType, LessonContentType } from '@/features/learn/curriculum/curriculum';

export const PYTHON_CURRICULUM: ModuleType[] = [
  {
    id: 'py-1',
    title: 'Module 1: Python Foundations',
    engine: 'python',
    lessons: [
      {
        id: 'py-1-1',
        title: 'Hello, World!',
        content: `
# Hello, World!

Python uses \`print()\` to display output. It's clean, readable, and beginner-friendly.

\`\`\`python
print("Hello, World!")
\`\`\`

## Your Task
Run the starter code, then print your own name and a fun fact about yourself.

### Key Concepts
- \`print(value)\` — outputs a value followed by a newline
- Strings use \`"double"\` or \`'single'\` quotes
- No semicolons or braces needed — indentation defines structure
        `,
        defaultQuery: `# Your first Python program
print("Hello, World!")

# Print different types
print(42)
print(3.14)
print(True)

# Your turn!
print("My name is ...")`,
      },
      {
        id: 'py-1-2',
        title: 'Variables & Types',
        content: `
# Variables & Types

Python is dynamically typed — variables infer their type from the assigned value.

\`\`\`python
name  = "Alice"    # str
age   = 30         # int
score = 98.5       # float
active = True      # bool
\`\`\`

## Useful Built-ins
- \`type(x)\` — returns the type of x
- \`int(x)\`, \`str(x)\`, \`float(x)\` — type conversions
- f-strings: \`f"Name: {name}"\` — inline expressions in strings

## Your Task
Declare variables for your name, age, and height. Print them using f-strings and check their types.
        `,
        defaultQuery: `name   = "Alice"
age    = 30
height = 5.6

# f-string formatting
print(f"Name: {name}, Age: {age}, Height: {height}ft")

# Type checking
print(type(name))
print(type(age))
print(type(height))

# Type conversion
age_str = str(age)
print(f"Age as string: '{age_str}'")
print(f"Pi as int: {int(3.99)}")  # truncates, doesn't round`,
      },
      {
        id: 'py-1-3',
        title: 'Control Flow',
        content: `
# Control Flow

Python uses \`if/elif/else\` for conditionals and \`for/while\` for loops. Indentation (4 spaces) is **required**.

\`\`\`python
for i in range(5):
    if i % 2 == 0:
        print(f"{i} is even")
    else:
        print(f"{i} is odd")
\`\`\`

## Key Features
- \`range(n)\` — generates 0, 1, …, n-1
- \`range(start, stop, step)\` — fine-grained control
- \`break\` / \`continue\` — exit or skip iterations
- \`in\` operator — check membership: \`"a" in "cat"\`

## Your Task
Write a loop that prints a multiplication table for the number 7 (7×1 through 7×10).
        `,
        defaultQuery: `# Multiplication table for 7
for i in range(1, 11):
    print(f"7 × {i} = {7 * i}")

# Conditionals example
scores = [45, 72, 88, 55, 93, 61]
for score in scores:
    if score >= 90:
        grade = "A"
    elif score >= 70:
        grade = "B"
    elif score >= 60:
        grade = "C"
    else:
        grade = "F"
    print(f"Score {score}: Grade {grade}")`,
      },
      {
        id: 'py-1-4',
        title: 'Functions',
        content: `
# Functions

Python functions are defined with \`def\`. They support default parameters, keyword arguments, and can return multiple values.

\`\`\`python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("Alice"))           # Hello, Alice!
print(greet("Bob", "Hi"))       # Hi, Bob!
\`\`\`

## Your Task
Write a function \`describe_number(n)\` that:
1. Returns whether n is positive, negative, or zero
2. Returns whether n is even or odd
3. Returns the absolute value

Print a description for several numbers.
        `,
        defaultQuery: `def describe_number(n):
    sign = "positive" if n > 0 else ("negative" if n < 0 else "zero")
    parity = "even" if n % 2 == 0 else "odd"
    return f"{n} is {sign} and {parity} (abs: {abs(n)})"

for n in [-7, 0, 4, -12, 99]:
    print(describe_number(n))

# Multiple return values
def min_max(nums):
    return min(nums), max(nums)

lo, hi = min_max([3, 1, 4, 1, 5, 9, 2, 6])
print(f"Min: {lo}, Max: {hi}")`,
      },
    ],
  },
  {
    id: 'py-2',
    title: 'Module 2: Data Structures',
    engine: 'python',
    lessons: [
      {
        id: 'py-2-1',
        title: 'Lists & Tuples',
        content: `
# Lists & Tuples

**Lists** (\`[]\`) are mutable ordered sequences. **Tuples** (\`()\`) are immutable.

\`\`\`python
fruits = ["apple", "banana", "cherry"]
fruits.append("date")       # add to end
fruits.insert(1, "blueberry")  # add at index
fruits.pop()                # remove last
\`\`\`

## Slicing
\`\`\`python
nums = [0, 1, 2, 3, 4, 5]
nums[1:4]    # [1, 2, 3]
nums[::-1]   # reversed: [5, 4, 3, 2, 1, 0]
\`\`\`

## Your Task
Given the list of prices below, find: total, average, min, max, and the sorted list.
        `,
        defaultQuery: `prices = [9.99, 24.99, 5.49, 14.99, 3.99, 19.99, 8.99]

total   = sum(prices)
average = total / len(prices)
lo, hi  = min(prices), max(prices)
sorted_prices = sorted(prices)

print(f"Items: {len(prices)}")
print(f"Total: \${total:.2f}")
print(f"Average: \${average:.2f}")
print(f"Min: \${lo:.2f}, Max: \${hi:.2f}")
print(f"Sorted: {sorted_prices}")

# Tuple — immutable record
point = (3, 4)
x, y = point  # unpacking
distance = (x**2 + y**2) ** 0.5
print(f"Distance from origin: {distance:.2f}")`,
      },
      {
        id: 'py-2-2',
        title: 'Dictionaries & Sets',
        content: `
# Dictionaries & Sets

**Dicts** (\`{}\`) map keys to values. **Sets** store unique unordered items.

\`\`\`python
person = {"name": "Alice", "age": 30}
person["email"] = "alice@example.com"  # add key
person.get("phone", "N/A")             # safe access
\`\`\`

## Common Patterns
- \`dict.keys()\`, \`dict.values()\`, \`dict.items()\`
- \`{k: v for k, v in ...}\` — dict comprehension
- Sets: \`a | b\` (union), \`a & b\` (intersection), \`a - b\` (difference)

## Your Task
Count word frequencies in the sample text and find the top 5 most common words.
        `,
        defaultQuery: `text = """
to be or not to be that is the question
whether tis nobler in the mind to suffer
the slings and arrows of outrageous fortune
""".strip().lower().split()

# Count word frequencies
freq = {}
for word in text:
    freq[word] = freq.get(word, 0) + 1

# Sort by frequency
top5 = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:5]
print("Top 5 words:")
for word, count in top5:
    print(f"  '{word}': {count}")

# Set operations
set_a = {"apple", "banana", "cherry", "date"}
set_b = {"banana", "date", "elderberry", "fig"}
print(f"\\nUnion: {set_a | set_b}")
print(f"Intersection: {set_a & set_b}")
print(f"A only: {set_a - set_b}")`,
      },
      {
        id: 'py-2-3',
        title: 'List Comprehensions',
        content: `
# List Comprehensions

Python's most powerful one-liner. Transform lists without explicit loops.

\`\`\`python
# Traditional
squares = []
for n in range(10):
    squares.append(n ** 2)

# Comprehension
squares = [n ** 2 for n in range(10)]

# With filter
evens = [n for n in range(20) if n % 2 == 0]
\`\`\`

## Dict & Set Comprehensions
\`\`\`python
lengths = {word: len(word) for word in ["cat", "elephant", "dog"]}
unique_chars = {c for c in "hello world"}
\`\`\`

## Your Task
Use comprehensions to process the student grade data below.
        `,
        defaultQuery: `students = [
    {"name": "Alice",   "scores": [88, 92, 79, 95, 91]},
    {"name": "Bob",     "scores": [72, 68, 85, 77, 80]},
    {"name": "Charlie", "scores": [95, 98, 92, 97, 96]},
    {"name": "Diana",   "scores": [80, 75, 88, 82, 79]},
    {"name": "Eve",     "scores": [65, 70, 72, 68, 74]},
]

# Average score per student (dict comprehension)
averages = {s["name"]: sum(s["scores"]) / len(s["scores"]) for s in students}

# Students with average >= 85 (filtered list comprehension)
honor_roll = [name for name, avg in averages.items() if avg >= 85]

# Leaderboard (sorted)
ranked = sorted(averages.items(), key=lambda x: x[1], reverse=True)

print("Averages:", {k: round(v, 1) for k, v in averages.items()})
print("Honor roll:", honor_roll)
print("\\nRankings:")
for i, (name, avg) in enumerate(ranked, 1):
    print(f"  {i}. {name}: {avg:.1f}")`,
      },
      {
        id: 'py-2-4',
        title: 'FizzBuzz & Problem Solving',
        content: `
# FizzBuzz & Problem Solving

Classic coding challenge — a rite of passage.

Print numbers 1–30, but:
- **Fizz** for multiples of 3
- **Buzz** for multiples of 5
- **FizzBuzz** for multiples of both

## Pythonic Style
Python rewards concise, readable code. Two solutions are shown — a classic and a Pythonic one-liner.

## Bonus Challenge
After solving FizzBuzz, implement a function that checks if a number is prime, then print all primes up to 50.
        `,
        defaultQuery: `# Classic FizzBuzz
for i in range(1, 31):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)

# Pythonic one-liner
results = ["FizzBuzz" if i % 15 == 0 else "Fizz" if i % 3 == 0 else "Buzz" if i % 5 == 0 else i for i in range(1, 31)]
print("\\nOne-liner:", results[:10], "...")

# Bonus: primes up to 50
def is_prime(n):
    if n < 2: return False
    return all(n % i != 0 for i in range(2, int(n**0.5) + 1))

primes = [n for n in range(2, 51) if is_prime(n)]
print(f"\\nPrimes up to 50: {primes}")`,
      },
    ],
  },
];

export function getPythonLessonById(moduleId: string, lessonId: string): LessonContentType | undefined {
  return PYTHON_CURRICULUM
    .find(m => m.id === moduleId)
    ?.lessons.find(l => l.id === lessonId);
}
