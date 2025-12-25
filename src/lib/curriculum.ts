
export interface LessonContentType {
    id: string;
    title: string;
    content: string; // Markdown supported
    defaultQuery?: string;
}

export interface ModuleType {
    id: string;
    title: string;
    engine: 'postgres' | 'sqlite' | 'nosql';
    lessons: LessonContentType[];
}

export const CURRICULUM: ModuleType[] = [
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
- Remember that SQL dates are typically formatted as 'YYYY-MM-DD'.
                `,
                defaultQuery: `SELECT * FROM crime_scene_report 
WHERE city = 'SQL City' 
AND date = '20180115'; -- Date format might be integer or string depending on schema`
            }
        ]
    },
    {
        id: 'postgres-1',
        title: 'Module 1: Postgres Basics',
        engine: 'postgres',
        lessons: [
            {
                id: 'pg-1-1',
                title: 'Intro to SQL',
                content: `
# Introduction to PostgreSQL

PostgreSQL is a powerful, open source object-relational database system.
In this lesson, we will explore basic SELECT statements.

## Task
Select all columns from the \`users\` table.
                `,
                defaultQuery: `SELECT * FROM users LIMIT 10;`
            }
        ]
    },
    {
        id: 'nosql-1',
        title: 'Module 1: Mongo Collections',
        engine: 'nosql',
        lessons: [
            {
                id: 'mongo-1-1',
                title: 'Finding Documents',
                content: `
# Finding Documents in NoSQL

In MongoDB (and our NoSQL engine), we use \`find()\` to retrieve documents.

## Your Task
Find all users who have the role of **'admin'**.

\`\`\`javascript
db.users.find({ role: "admin" })
\`\`\`
                `,
                defaultQuery: `// Find users with 'admin' role
db.users.find({ role: "admin" })`
            }
        ]
    }
];

export function getLessonById(moduleId: string, lessonId: string): LessonContentType | undefined {
    const module = CURRICULUM.find(m => m.id === moduleId);
    return module?.lessons.find(l => l.id === lessonId);
}
