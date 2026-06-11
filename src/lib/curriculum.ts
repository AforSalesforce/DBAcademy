import { QuizQuestion } from '@/components/Quiz';

export interface LessonContentType {
    id: string;
    title: string;
    content: string;
    defaultQuery?: string;
    quiz?: QuizQuestion[];
}

export interface ModuleType {
    id: string;
    title: string;
    engine: 'postgres' | 'sqlite' | 'nosql';
    lessons: LessonContentType[];
}

export const CURRICULUM: ModuleType[] = [
    // ===== SQLITE MODULES =====
    {
        id: 'sqlite-1',
        title: 'Module 1: The Murder Mystery',
        engine: 'sqlite',
        lessons: [
            {
                id: '1-1',
                title: 'The Crime Scene',
                content: `
# The Crime Scene

A crime has been committed in **SQL City**. You are the detective assigned to the case.
You have access to the city's police department database.

## Your Mission
Retrieve the crime scene report for the murder that happened on **Jan 15, 2018** in **SQL City**.

### Hints
- Use the \`crime_scene_report\` table.
- Filter by \`city\` and \`date\`.
- Remember that SQL dates are typically formatted as integers in this database.
                `,
                defaultQuery: `SELECT * FROM crime_scene_report 
WHERE city = 'SQL City' 
AND date = 20180115;`,
                quiz: [
                    {
                        id: 'q1-1-1',
                        question: 'Which SQL clause is used to filter rows?',
                        options: ['SELECT', 'FROM', 'WHERE', 'ORDER BY'],
                        correctIndex: 2,
                        explanation: 'The WHERE clause filters rows based on a condition.'
                    },
                    {
                        id: 'q1-1-2',
                        question: 'What does SELECT * mean?',
                        options: ['Select the first column', 'Select all columns', 'Select no columns', 'Select unique values'],
                        correctIndex: 1,
                        explanation: 'The asterisk (*) is a wildcard that means "all columns".'
                    }
                ]
            },
            {
                id: '1-2',
                title: 'Finding Witnesses',
                content: `
# Finding Witnesses

Based on the crime scene report, you need to find witnesses. The report mentions witnesses who live on specific streets.

## Your Task
Find all people who live on **Northwestern Dr** — sort them by address number (descending) to find who lives closest to the scene.

### Schema Reminder
- \`person\` table has: id, name, license_id, address_number, address_street_name, ssn
                `,
                defaultQuery: `SELECT * FROM person 
WHERE address_street_name = 'Northwestern Dr'
ORDER BY address_number DESC;`
            },
            {
                id: '1-3',
                title: 'Interviewing Suspects',
                content: `
# Interview Transcripts

Now that you've identified potential witnesses, check their interview transcripts.

## Your Task
Look up the interview transcripts for the people you found. Use a JOIN to connect \`person\` and \`interview\` tables.

### Joins Syntax
\`\`\`sql
SELECT p.name, i.transcript
FROM person p
JOIN interview i ON p.id = i.person_id
WHERE p.name = 'Witness Name';
\`\`\`
                `,
                defaultQuery: `SELECT p.name, i.transcript
FROM person p
JOIN interview i ON p.id = i.person_id;`,
                quiz: [
                    {
                        id: 'q1-3-1',
                        question: 'What does JOIN do in SQL?',
                        options: ['Deletes rows from two tables', 'Combines rows from two tables based on a condition', 'Creates a new table', 'Sorts results'],
                        correctIndex: 1,
                        explanation: 'JOIN combines rows from two or more tables based on a related column between them.'
                    },
                    {
                        id: 'q1-3-2',
                        question: 'What is the purpose of the ON clause in a JOIN?',
                        options: ['To filter results after joining', 'To specify which columns to display', 'To define the join condition', 'To sort the results'],
                        correctIndex: 2,
                        explanation: 'The ON clause specifies the condition that determines how the tables are related.'
                    }
                ]
            }
        ]
    },
    {
        id: 'sqlite-2',
        title: 'Module 2: SQL Fundamentals',
        engine: 'sqlite',
        lessons: [
            {
                id: 'sql-fun-1',
                title: 'SELECT Basics',
                content: `
# SELECT Statement Basics

The SELECT statement is the most fundamental SQL command. It retrieves data from tables.

## Syntax
\`\`\`sql
SELECT column1, column2 FROM table_name;
SELECT * FROM table_name;  -- All columns
\`\`\`

## Practice
Try selecting specific columns from the \`person\` table.
                `,
                defaultQuery: `SELECT name, address_street_name FROM person LIMIT 10;`,
                quiz: [
                    {
                        id: 'q-sf-1',
                        question: 'Which keyword limits the number of results returned?',
                        options: ['MAX', 'TOP', 'LIMIT', 'FIRST'],
                        correctIndex: 2,
                        explanation: 'LIMIT restricts the number of rows returned in SQLite and PostgreSQL.'
                    }
                ]
            },
            {
                id: 'sql-fun-2',
                title: 'Filtering with WHERE',
                content: `
# Filtering Data with WHERE

The WHERE clause lets you specify conditions to filter rows.

## Comparison Operators
| Operator | Meaning |
|----------|---------|
| = | Equal to |
| != or <> | Not equal to |
| > | Greater than |
| < | Less than |
| BETWEEN | Between a range |
| LIKE | Pattern matching |
| IN | Match any in a list |

## Practice
Find all crime scene reports of type 'murder'.
                `,
                defaultQuery: `SELECT * FROM crime_scene_report WHERE type = 'murder';`,
                quiz: [
                    {
                        id: 'q-sf-2a',
                        question: 'Which operator is used for pattern matching in SQL?',
                        options: ['MATCH', 'REGEX', 'LIKE', 'PATTERN'],
                        correctIndex: 2,
                        explanation: 'LIKE is used with wildcards (% and _) for pattern matching.'
                    },
                    {
                        id: 'q-sf-2b',
                        question: 'What does the IN operator do?',
                        options: ['Checks if a value is inside a string', 'Matches any value in a list', 'Inserts data', 'Checks for NULL'],
                        correctIndex: 1,
                        explanation: 'IN allows you to specify multiple values in a WHERE clause.'
                    }
                ]
            },
            {
                id: 'sql-fun-3',
                title: 'Sorting & Limiting',
                content: `
# ORDER BY and LIMIT

## Sorting Results
\`\`\`sql
SELECT * FROM table ORDER BY column ASC;   -- Ascending (default)
SELECT * FROM table ORDER BY column DESC;  -- Descending
\`\`\`

## Limiting Results
\`\`\`sql
SELECT * FROM table LIMIT 10;         -- First 10 rows
SELECT * FROM table LIMIT 10 OFFSET 5; -- Skip 5, then 10
\`\`\`

## Practice
Get the 5 most recent crime reports.
                `,
                defaultQuery: `SELECT * FROM crime_scene_report ORDER BY date DESC LIMIT 5;`
            },
            {
                id: 'sql-fun-4',
                title: 'Aggregate Functions',
                content: `
# Aggregate Functions

Aggregate functions compute a single result from a set of values.

| Function | Description |
|----------|-------------|
| COUNT() | Number of rows |
| SUM() | Total of numeric column |
| AVG() | Average value |
| MIN() | Minimum value |
| MAX() | Maximum value |

## GROUP BY
\`\`\`sql
SELECT city, COUNT(*) as total
FROM crime_scene_report GROUP BY city;
\`\`\`

## Practice
Count crime reports by type.
                `,
                defaultQuery: `SELECT type, COUNT(*) as count 
FROM crime_scene_report 
GROUP BY type;`,
                quiz: [
                    {
                        id: 'q-sf-4a',
                        question: 'Which function returns the number of rows?',
                        options: ['SUM()', 'COUNT()', 'TOTAL()', 'NUM()'],
                        correctIndex: 1,
                        explanation: 'COUNT() returns the number of rows that match the criteria.'
                    },
                    {
                        id: 'q-sf-4b',
                        question: 'What clause is used with aggregate functions to group results?',
                        options: ['SORT BY', 'COLLECT', 'GROUP BY', 'CLUSTER'],
                        correctIndex: 2,
                        explanation: 'GROUP BY groups rows with the same values so aggregates can be applied per group.'
                    }
                ]
            }
        ]
    },
    {
        id: 'sqlite-3',
        title: 'Module 3: Joins & Relationships',
        engine: 'sqlite',
        lessons: [
            {
                id: 'join-1',
                title: 'INNER JOIN',
                content: `
# INNER JOIN

An INNER JOIN returns only rows where there is a match in **both** tables.

## Syntax
\`\`\`sql
SELECT a.col1, b.col2
FROM table_a a
INNER JOIN table_b b ON a.id = b.a_id;
\`\`\`

## Practice
Join persons with their driver's licenses.
                `,
                defaultQuery: `SELECT p.name, d.car_make, d.car_model
FROM person p
INNER JOIN drivers_license d ON p.license_id = d.id;`,
                quiz: [
                    {
                        id: 'q-join-1',
                        question: 'What does INNER JOIN return?',
                        options: ['All rows from both tables', 'Only matching rows from both tables', 'All rows from the left table', 'All rows from the right table'],
                        correctIndex: 1,
                        explanation: 'INNER JOIN returns only rows where the join condition is true in both tables.'
                    }
                ]
            },
            {
                id: 'join-2',
                title: 'LEFT JOIN',
                content: `
# LEFT JOIN

A LEFT JOIN returns **all rows from the left table** and matching rows from the right table. Non-matching right rows are NULL.

## Syntax
\`\`\`sql
SELECT a.col1, b.col2
FROM table_a a
LEFT JOIN table_b b ON a.id = b.a_id;
\`\`\`

## Practice
Find all people, including those without a driver's license.
                `,
                defaultQuery: `SELECT p.name, d.car_make
FROM person p
LEFT JOIN drivers_license d ON p.license_id = d.id;`
            },
            {
                id: 'join-3',
                title: 'Subqueries',
                content: `
# Subqueries

A query nested inside another query.

## Syntax
\`\`\`sql
SELECT name FROM person
WHERE id IN (
    SELECT person_id FROM get_fit_now_member
    WHERE membership_status = 'gold'
);
\`\`\`

## Practice
Find gold members of the gym.
                `,
                defaultQuery: `SELECT p.name, g.membership_status
FROM person p
JOIN get_fit_now_member g ON p.id = g.person_id
WHERE g.membership_status = 'gold';`,
                quiz: [
                    {
                        id: 'q-join-3',
                        question: 'What is a subquery?',
                        options: ['A query that runs on a sub-table', 'A query nested inside another query', 'A query that only returns one row', 'A query without a WHERE clause'],
                        correctIndex: 1,
                        explanation: 'A subquery is a SELECT statement embedded within another SQL statement.'
                    }
                ]
            }
        ]
    },
    {
        id: 'sqlite-4',
        title: 'Module 4: Schema Design',
        engine: 'sqlite',
        lessons: [
            {
                id: 'schema-1',
                title: 'CREATE TABLE',
                content: `
# Creating Tables

## Syntax
\`\`\`sql
CREATE TABLE table_name (
    column1 datatype constraints,
    column2 datatype constraints
);
\`\`\`

## Common Constraints
- PRIMARY KEY — unique identifier
- NOT NULL — cannot be empty
- UNIQUE — no duplicates
- DEFAULT — fallback value

## Practice
Create a students table.
                `,
                defaultQuery: `CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    grade INTEGER DEFAULT 0,
    enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP
);

SELECT * FROM students;`,
                quiz: [
                    {
                        id: 'q-schema-1a',
                        question: 'What does PRIMARY KEY do?',
                        options: ['Makes a column optional', 'Uniquely identifies each row', 'Allows duplicate values', 'Sets a default value'],
                        correctIndex: 1,
                        explanation: 'PRIMARY KEY uniquely identifies each record in a table.'
                    },
                    {
                        id: 'q-schema-1b',
                        question: 'What does NOT NULL constraint mean?',
                        options: ['The column can be empty', 'The column must always have a value', 'The column is hidden', 'The column auto-increments'],
                        correctIndex: 1,
                        explanation: 'NOT NULL ensures a column cannot have a NULL (empty) value.'
                    }
                ]
            },
            {
                id: 'schema-2',
                title: 'Foreign Keys',
                content: `
# Foreign Keys

Foreign keys create relationships between tables, enforcing referential integrity.

## Syntax
\`\`\`sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
\`\`\`

## Practice
Create an orders table with a foreign key.
                `,
                defaultQuery: `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product TEXT NOT NULL,
    amount REAL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);`
            }
        ]
    },

    // ===== POSTGRESQL MODULES =====
    {
        id: 'postgres-1',
        title: 'Module 1: PostgreSQL Basics',
        engine: 'postgres',
        lessons: [
            {
                id: 'pg-1-1',
                title: 'Intro to PostgreSQL',
                content: `
# Introduction to PostgreSQL

PostgreSQL is the world's most advanced open-source relational database.

## Key Features
- ACID compliant
- Rich data types (JSON, arrays, UUID)
- Full-text search
- Extensible with custom functions

## Your First Query
Use the **Seed Data** button first, then query the data!
                `,
                defaultQuery: `SELECT * FROM users LIMIT 10;`,
                quiz: [
                    {
                        id: 'q-pg-1',
                        question: 'What does ACID stand for in databases?',
                        options: ['Automatic, Consistent, Isolated, Durable', 'Atomicity, Consistency, Isolation, Durability', 'Always Correct Input Data', 'Advanced Concurrent Integration Design'],
                        correctIndex: 1,
                        explanation: 'ACID: Atomicity, Consistency, Isolation, Durability — guarantees reliable transactions.'
                    }
                ]
            },
            {
                id: 'pg-1-2',
                title: 'Data Types',
                content: `
# PostgreSQL Data Types

| Type | Description |
|------|-------------|
| INTEGER | Whole numbers |
| SERIAL | Auto-incrementing |
| TEXT | Variable-length string |
| BOOLEAN | true/false |
| TIMESTAMP | Date + time |
| JSONB | Binary JSON |
| UUID | Unique ID |
| DECIMAL(p,s) | Exact numeric |

## Practice
Create a table using various types.
                `,
                defaultQuery: `CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO products (name, price, metadata) VALUES 
('Widget', 9.99, '{"color": "blue"}'),
('Gadget', 24.99, '{"color": "red"}');

SELECT * FROM products;`
            },
            {
                id: 'pg-1-3',
                title: 'String Functions',
                content: `
# String Functions

| Function | Description |
|----------|-------------|
| UPPER(s) | Uppercase |
| LOWER(s) | Lowercase |
| LENGTH(s) | String length |
| CONCAT(a,b) | Concatenate |
| TRIM(s) | Remove whitespace |

## Practice
                `,
                defaultQuery: `SELECT 
    name,
    UPPER(name) as upper_name,
    LENGTH(name) as name_length
FROM users LIMIT 10;`
            }
        ]
    },
    {
        id: 'postgres-2',
        title: 'Module 2: Advanced PostgreSQL',
        engine: 'postgres',
        lessons: [
            {
                id: 'pg-2-1',
                title: 'Window Functions',
                content: `
# Window Functions

Window functions perform calculations across rows without collapsing results.

## Common Functions
- ROW_NUMBER() — unique sequential number
- RANK() — rank with gaps
- DENSE_RANK() — rank without gaps
- LAG() / LEAD() — previous/next values
- SUM() OVER() — running total

## Practice
Rank users by creation date.
                `,
                defaultQuery: `SELECT 
    name, email, created_at,
    ROW_NUMBER() OVER (ORDER BY created_at) as join_order
FROM users;`,
                quiz: [
                    {
                        id: 'q-pg-2-1',
                        question: 'What makes window functions different from GROUP BY?',
                        options: ['They are faster', 'They don\'t collapse rows', 'They only work with numbers', 'They require an index'],
                        correctIndex: 1,
                        explanation: 'Window functions compute values across rows without reducing the result set.'
                    }
                ]
            },
            {
                id: 'pg-2-2',
                title: 'CTEs (WITH clause)',
                content: `
# Common Table Expressions

CTEs make complex queries readable by naming intermediate results.

## Syntax
\`\`\`sql
WITH cte_name AS (
    SELECT ...
)
SELECT * FROM cte_name;
\`\`\`

## Practice
                `,
                defaultQuery: `WITH name_lengths AS (
    SELECT name, LENGTH(name) as name_len
    FROM users
)
SELECT * FROM name_lengths
WHERE name_len > 15
ORDER BY name_len DESC;`
            }
        ]
    },

    // ===== NOSQL MODULES =====
    {
        id: 'nosql-1',
        title: 'Module 1: NoSQL Basics',
        engine: 'nosql',
        lessons: [
            {
                id: 'mongo-1-1',
                title: 'Finding Documents',
                content: `
# Finding Documents in NoSQL

Data is stored as **documents** (JSON objects) in **collections**.

## Basic Operations
\`\`\`javascript
db.collection.find({})           // Find all
db.collection.find({ key: val }) // Find with filter
db.collection.insert({ ... })    // Insert document
\`\`\`

## Your Task
Seed data first, then find all users with role "admin".
                `,
                defaultQuery: `db.users.find({ role: "admin" })`,
                quiz: [
                    {
                        id: 'q-nosql-1',
                        question: 'In NoSQL, what is a "document"?',
                        options: ['A text file', 'A JSON-like object in a collection', 'A table row', 'A database schema'],
                        correctIndex: 1,
                        explanation: 'A document is a JSON-like object that stores data as key-value pairs.'
                    }
                ]
            },
            {
                id: 'mongo-1-2',
                title: 'Inserting Documents',
                content: `
# Inserting Documents

## Single Insert
\`\`\`javascript
db.collection.insert({ name: "Alice", age: 30 })
\`\`\`

## Key Concepts
- No fixed schema required
- Each document gets a unique \`_id\`
- Fields can be any JSON type

## Practice
                `,
                defaultQuery: `db.users.insert({ 
    name: "Jane Smith", 
    email: "jane@example.com", 
    role: "moderator", 
    age: 28, 
    isActive: true 
})`
            },
            {
                id: 'mongo-1-3',
                title: 'Query Operators',
                content: `
# Query Operators

| Operator | Meaning |
|----------|---------|
| $gt | Greater than |
| $gte | Greater or equal |
| $lt | Less than |
| $ne | Not equal |

## Practice
Find active users over age 25.
                `,
                defaultQuery: `db.users.find({ age: { $gt: 25 }, isActive: true })`,
                quiz: [
                    {
                        id: 'q-nosql-3',
                        question: 'How do you express "greater than 25" in NoSQL?',
                        options: ['{ age: > 25 }', '{ age: { $gt: 25 } }', '{ age: "gt(25)" }', 'WHERE age > 25'],
                        correctIndex: 1,
                        explanation: 'NoSQL uses operator objects like { $gt: 25 } for comparisons.'
                    }
                ]
            }
        ]
    },
    {
        id: 'nosql-2',
        title: 'Module 2: Data Modeling',
        engine: 'nosql',
        lessons: [
            {
                id: 'mongo-2-1',
                title: 'Embedding vs. References',
                content: `
# Data Modeling in NoSQL

## Embedding (Denormalization)
Store related data in one document:
\`\`\`javascript
{ name: "Alice", orders: [{ product: "Widget" }] }
\`\`\`

## References (Normalization)
Store IDs pointing to other collections:
\`\`\`javascript
{ _id: "u1", name: "Alice" }
{ user_id: "u1", product: "Widget" }
\`\`\`

## When to Embed
- Data accessed together
- One-to-few relationships

## When to Reference
- Large sub-documents
- Many-to-many relationships

## Practice
                `,
                defaultQuery: `db.customers.insert({
    name: "Alice Johnson",
    email: "alice@example.com",
    address: {
        street: "123 Main St",
        city: "Springfield"
    },
    recentOrders: [
        { product: "Widget Pro", price: 29.99 },
        { product: "Gadget X", price: 49.99 }
    ]
})`
            }
        ]
    }
];

export function getLessonById(moduleId: string, lessonId: string): LessonContentType | undefined {
    const module = CURRICULUM.find(m => m.id === moduleId);
    return module?.lessons.find(l => l.id === lessonId);
}

export function getAllLessonsCount(): number {
    return CURRICULUM.reduce((total, mod) => total + mod.lessons.length, 0);
}

export function getModuleProgress(moduleId: string, completedLessonIds: Set<string>): number {
    const module = CURRICULUM.find(m => m.id === moduleId);
    if (!module) return 0;
    const completed = module.lessons.filter(l => completedLessonIds.has(l.id)).length;
    return Math.round((completed / module.lessons.length) * 100);
}
