import { SITE_NAME, SITE_URL } from '@/lib/site';
import { ENGINE_LABEL, LEARNING_PATH, PathStep } from './path';

/**
 * The text shown under each lesson in search results. Hand-written: say what
 * the lesson teaches in the words people search for, in ≤ 160 characters.
 * tests/unit/curriculum/seo.test.ts checks every lesson has a unique one.
 */
export const LESSON_DESCRIPTIONS: Record<string, string> = {
  '1-1': 'Start the SQL murder mystery: filter crime scene reports with WHERE to find the murder in SQL City. A free, interactive SQL lesson in your browser.',
  '1-2': 'Find the witnesses in the SQL murder mystery with ORDER BY, LIMIT and LIKE. A free interactive SQL exercise with instant feedback, in your browser.',
  '1-3': "Read the witnesses' statements by joining two tables with SQL JOIN. Part 3 of the free, interactive SQL murder mystery you solve in your browser.",
  '1-4': 'Combine every clue with multi-table JOINs and LIKE to catch the killer. The finale of the free interactive SQL murder mystery. Can you solve it?',
  'sql-fun-1': 'Learn the SQL SELECT statement: pick exactly the columns you need instead of SELECT *. A free interactive lesson with a graded challenge.',
  'sql-fun-2': 'Filter rows with SQL WHERE, comparison operators, IN, LIKE and BETWEEN. A free interactive SQL lesson with a graded exercise in your browser.',
  'sql-fun-3': 'Sort results with SQL ORDER BY (ASC and DESC) and take the top rows with LIMIT and OFFSET. A free interactive exercise with instant feedback.',
  'sql-fun-4': 'Count, sum and average data with SQL aggregate functions and GROUP BY. A free interactive SQL lesson with a graded challenge in your browser.',
  'join-1': 'Learn SQL INNER JOIN: combine rows from two tables where they match. A free interactive exercise on a real dataset, with instant feedback.',
  'join-2': 'Learn SQL LEFT JOIN and find rows with no match using IS NULL. A free interactive SQL exercise on a real dataset, graded in your browser.',
  'join-3': 'Write SQL subqueries: put one query inside another with WHERE … IN (…). A free interactive SQL lesson with a graded challenge in your browser.',
  'schema-1': 'Create tables with SQL CREATE TABLE, PRIMARY KEY, NOT NULL and DEFAULT, then insert rows. A free interactive lesson, checked automatically.',
  'schema-2': 'Link tables with SQL FOREIGN KEY constraints and enforce referential integrity. A free interactive schema design lesson, checked automatically.',
  'pg-1-1': 'Get started with PostgreSQL: run your first queries on a real Postgres database in your browser, no install. A free interactive lesson.',
  'pg-1-2': 'Learn PostgreSQL data types (SERIAL, TEXT, TIMESTAMP, JSONB and more), then build a table with them. A free interactive Postgres lesson.',
  'pg-1-3': 'Use PostgreSQL string functions UPPER, LOWER, LENGTH, CONCAT and TRIM. A free interactive Postgres exercise with instant feedback.',
  'pg-2-1': 'Learn PostgreSQL window functions: ROW_NUMBER, RANK, LAG and running totals with OVER(). A free interactive exercise on a real Postgres database.',
  'pg-2-2': 'Write readable queries with PostgreSQL CTEs (the WITH clause). A free interactive Postgres lesson with a graded challenge in your browser.',
  'mongo-1-1': 'Query a document database: find documents in a collection with MongoDB-style filters. A free interactive NoSQL lesson in your browser.',
  'mongo-1-2': 'Insert JSON documents with insertOne and insertMany in a MongoDB-style database. A free interactive NoSQL lesson with a graded challenge.',
  'mongo-1-3': 'Filter documents with NoSQL query operators $gt, $gte, $lt and $ne. A free interactive MongoDB-style exercise with instant feedback.',
  'mongo-2-1': 'Embedding vs. references: learn how to model data in a document database. A free interactive NoSQL lesson with a graded challenge.',
};

export function lessonDescription(step: PathStep): string {
  return LESSON_DESCRIPTIONS[step.lesson.id]
    ?? `Learn ${step.lesson.title} in ${ENGINE_LABEL[step.module.engine]}: a free interactive lesson with a graded challenge in your browser.`;
}

/** The lesson's markdown without its leading "# Title" (the page renders its own heading). */
export function lessonBody(step: PathStep): string {
  return step.lesson.content.trim().replace(/^#\s+.*\n+/, '');
}

export const lessonUrl = (step: PathStep) => `${SITE_URL}/lessons/${step.slug}`;
export const COURSE_URL = `${SITE_URL}/lessons`;
export const COURSE_NAME = 'Learn SQL, PostgreSQL and NoSQL by doing';

const provider = { '@type': 'Organization', name: SITE_NAME, url: SITE_URL };

/** schema.org data for a lesson page: the lesson, and where it sits in the site. */
export function lessonJsonLd(step: PathStep) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: step.lesson.title,
      description: lessonDescription(step),
      url: lessonUrl(step),
      learningResourceType: 'Lesson',
      educationalLevel: 'Beginner',
      inLanguage: 'en',
      isAccessibleForFree: true,
      teaches: step.lesson.title,
      isPartOf: { '@type': 'Course', name: COURSE_NAME, url: COURSE_URL },
      provider,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Lessons', item: COURSE_URL },
        { '@type': 'ListItem', position: 2, name: step.lesson.title, item: lessonUrl(step) },
      ],
    },
  ];
}

/** schema.org data for the lessons index: the free course and its lessons. */
export function courseJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: COURSE_NAME,
    description: `${LEARNING_PATH.length} free interactive lessons: SQL basics through a murder mystery, joins, schema design, PostgreSQL window functions and CTEs, and document databases.`,
    url: COURSE_URL,
    provider,
    isAccessibleForFree: true,
    inLanguage: 'en',
    educationalLevel: 'Beginner',
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD', category: 'Free' },
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online', courseWorkload: 'PT6H' },
    hasPart: LEARNING_PATH.map(step => ({ '@type': 'LearningResource', name: step.lesson.title, url: lessonUrl(step) })),
  };
}
