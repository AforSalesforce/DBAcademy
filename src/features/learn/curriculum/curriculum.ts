import { QuizQuestion } from '@/features/learn/components/Quiz';
import { EngineType } from '@/db-engines/types';

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
    engine: EngineType;
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
- Dates in this database are stored as integers in \`YYYYMMDD\` form, so Jan 15, 2018 is \`20180115\`.

Read the murder report's **description** carefully. It tells you where to look next.
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

The crime scene report mentions two witnesses.

## Your Task
1. The first witness lives in the **highest-numbered house on Northwestern Dr**. Sort by \`address_number\` descending: the first row is your witness.
2. The second witness is named **Annabel** and lives on **Franklin Ave**. Try it yourself:

\`\`\`sql
SELECT * FROM person
WHERE name LIKE 'Annabel%'
AND address_street_name = 'Franklin Ave';
\`\`\`

Why filter on the street too? Run it without that line and see who else turns up.

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

You have two witnesses. Time to read what they told the police.

## Your Task
Read both witnesses' interview transcripts. Use a JOIN to connect the \`person\` and \`interview\` tables. Note every clue they give you; you'll need them all in the next lesson.

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
JOIN interview i ON p.id = i.person_id
WHERE p.name IN ('Morris Kettle', 'Annabel Voss');`,
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
            },
            {
                id: '1-4',
                title: 'Catch the Killer',
                content: `
# Catch the Killer

The witnesses gave you four clues:

1. The killer is a **gold** member of the Get Fit Now Gym.
2. Their membership number starts with **"G7"**.
3. The killer is a **man**.
4. His car's plate contains **"K9"**.

The query in the editor already joins gym members, people and driver's licenses, and applies the first two clues. **Three suspects** are left.

## Your Task
Add two more conditions to the \`WHERE\` clause for clues 3 and 4, until only **one** person is left.

### Hints
- Gender is in \`drivers_license.gender\`.
- Use \`LIKE '%K9%'\` to match text anywhere in the plate.

## Make your accusation
When you have a name, check it (replace the name):

\`\`\`sql
SELECT verdict FROM solution
WHERE code = hex(upper('Your Suspect'));
\`\`\`

A verdict means you cracked the case. **No rows** means you have the wrong person, so go back over the clues.
                `,
                defaultQuery: `SELECT p.name, g.id AS member_id, d.gender, d.plate_number, d.car_make
FROM get_fit_now_member g
JOIN person p ON p.id = g.person_id
JOIN drivers_license d ON d.id = p.license_id
WHERE g.membership_status = 'gold'
  AND g.id LIKE 'G7%';`,
                quiz: [
                    {
                        id: 'q1-4-1',
                        question: 'Which pattern matches a plate with "K9" anywhere in it?',
                        options: ["LIKE 'K9%'", "LIKE '%K9'", "LIKE '%K9%'", "= 'K9'"],
                        correctIndex: 2,
                        explanation: "% matches any run of characters, so '%K9%' allows anything before and after K9."
                    },
                    {
                        id: 'q1-4-2',
                        question: 'You join three tables. How many ON conditions do you need?',
                        options: ['One', 'Two', 'Three', 'None'],
                        correctIndex: 1,
                        explanation: 'Each JOIN adds one table and needs its own ON condition: three tables, two joins.'
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

INSERT INTO students (name, email, grade) VALUES
    ('Ada Lovelace', 'ada@example.com', 92),
    ('Alan Turing', 'alan@example.com', 88);

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
CREATE TABLE child_table (
    id INTEGER PRIMARY KEY,
    parent_id INTEGER,
    FOREIGN KEY (parent_id) REFERENCES parent_table(id)
);
\`\`\`

## Practice
Create a \`case_notes\` table whose \`person_id\` must point at a row in \`person\`, add a note, then join it back to see who the note is about.
                `,
                defaultQuery: `CREATE TABLE IF NOT EXISTS case_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    FOREIGN KEY (person_id) REFERENCES person(id)
);

INSERT INTO case_notes (person_id, note) VALUES (32, 'Refused to answer questions.');

SELECT p.name, n.note
FROM case_notes n
JOIN person p ON p.id = n.person_id;`
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
This database comes with a \`users\` table. Run the query to see the first 10 users.
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
Create a table that uses several of these types, add two rows, and read them back.
                `,
                defaultQuery: `CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO inventory (name, price, metadata) VALUES 
('Widget', 9.99, '{"color": "blue"}'),
('Gadget', 24.99, '{"color": "red"}');

SELECT * FROM inventory;`
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
Show each user's name in upper case next to its length. Then try swapping in \`LOWER\` or \`CONCAT(name, ' <', email, '>')\`.
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
Use a CTE to work out each user's name length, then keep only the long names (more than 15 characters).
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
db.collection.find({})              // Find all
db.collection.find({ key: val })    // Find with filter
db.collection.insertOne({ ... })    // Insert a document
\`\`\`

## Your Task
Find all users with role "admin".
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

## One document
\`\`\`javascript
db.collection.insertOne({ name: "Alice", age: 30 })
\`\`\`

## Several at once
\`\`\`javascript
db.collection.insertMany([{ name: "Bo" }, { name: "Cy" }])
\`\`\`

## Key Concepts
- No fixed schema required
- Each document gets a unique \`_id\` (returned as \`insertedId\`)
- Fields can be any JSON type

## Practice
Insert a new moderator. Then run \`db.users.find({ role: "moderator" })\` to check it's there.
                `,
                defaultQuery: `db.users.insertOne({ 
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
Insert a customer with an embedded address and order list, then query it with \`db.customers.find({ "address.city": "Springfield" })\`.
                `,
                defaultQuery: `db.customers.insertOne({
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
