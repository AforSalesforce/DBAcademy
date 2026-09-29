/**
 * The graded task for each built-in SQL/NoSQL lesson.
 *
 * A learner's attempt is checked by running it — and the reference
 * `solution` — on a clean copy of the sample database, then comparing the
 * results (see src/features/learn/grading). So an answer is right if it
 * returns the right data, however it's written.
 *
 * Rules every challenge must follow (enforced by
 * tests/unit/curriculum/lessons.test.ts):
 * - `solution` passes; `starter` runs but does not pass.
 * - At least two hints, from a gentle nudge to nearly the answer.
 * - Scripts that create tables start with DROP TABLE IF EXISTS, so they can
 *   be re-run in the learner's own playground without "already exists".
 */
export interface Challenge {
  /** The task, in one or two sentences. Say exactly what to return. */
  prompt: string;
  /** Loaded into the editor the first time the lesson opens. */
  starter: string;
  /** Reference answer; its result on a fresh database is the expected one. */
  solution: string;
  /** Revealed one at a time. */
  hints: string[];
  /**
   * Run after the attempt (and after the solution) and compare this query's
   * result instead. For tasks that create or change data.
   */
  check?: string;
  /** Row order is part of the answer (sorting tasks). */
  orderMatters?: boolean;
  /**
   * The learner may return any of the solution's columns (matched by name),
   * e.g. `SELECT name` instead of `SELECT *` when the task is "find the row".
   */
  allowColumnSubset?: boolean;
}

export const CHALLENGES: Record<string, Challenge> = {
  // ── SQLite · Module 1: The Murder Mystery ────────────────────────────────
  '1-1': {
    prompt: 'Find the crime scene report for the murder in SQL City on Jan 15, 2018. Your result should be exactly one row.',
    starter: `-- Add a WHERE clause that narrows this down to one row.
SELECT * FROM crime_scene_report;`,
    solution: `SELECT * FROM crime_scene_report
WHERE city = 'SQL City' AND date = 20180115 AND type = 'murder';`,
    hints: [
      'You need three conditions: the city, the date, and the type of crime.',
      "Join conditions with AND. Text goes in single quotes: city = 'SQL City'.",
      "Dates are whole numbers here, so no quotes: date = 20180115. The type is 'murder'.",
    ],
    allowColumnSubset: true,
  },
  '1-2': {
    prompt: 'Find the first witness: the person living in the highest-numbered house on Northwestern Dr. Return just that one person.',
    starter: `SELECT * FROM person
WHERE address_street_name = 'Northwestern Dr';`,
    solution: `SELECT * FROM person
WHERE address_street_name = 'Northwestern Dr'
ORDER BY address_number DESC
LIMIT 1;`,
    hints: [
      'Sort the residents so the highest house number comes first.',
      'ORDER BY address_number DESC puts the biggest number on top.',
      'Add LIMIT 1 at the end to keep only the first row.',
    ],
    allowColumnSubset: true,
  },
  '1-3': {
    prompt: "Show the name and interview transcript of both witnesses, Morris Kettle and Annabel Voss: two rows, two columns.",
    starter: `SELECT p.name, i.transcript
FROM person p
JOIN interview i ON p.id = i.person_id;`,
    solution: `SELECT p.name, i.transcript
FROM person p
JOIN interview i ON p.id = i.person_id
WHERE p.name IN ('Morris Kettle', 'Annabel Voss');`,
    hints: [
      'The JOIN is already right. It returns every interview; add a WHERE clause to keep only the two witnesses.',
      "IN matches any value in a list: WHERE p.name IN ('…', '…').",
    ],
  },
  '1-4': {
    prompt: 'Add clues 3 and 4 to the query until only the killer is left: one row.',
    starter: `SELECT p.name, g.id AS member_id, d.gender, d.plate_number, d.car_make
FROM get_fit_now_member g
JOIN person p ON p.id = g.person_id
JOIN drivers_license d ON d.id = p.license_id
WHERE g.membership_status = 'gold'
  AND g.id LIKE 'G7%';`,
    solution: `SELECT p.name, g.id AS member_id, d.gender, d.plate_number, d.car_make
FROM get_fit_now_member g
JOIN person p ON p.id = g.person_id
JOIN drivers_license d ON d.id = p.license_id
WHERE g.membership_status = 'gold'
  AND g.id LIKE 'G7%'
  AND d.gender = 'male'
  AND d.plate_number LIKE '%K9%';`,
    hints: [
      'Each clue becomes one more condition, added with AND.',
      "Clue 3, the killer is a man: AND d.gender = 'male'.",
      "Clue 4, 'K9' anywhere in the plate: AND d.plate_number LIKE '%K9%'.",
    ],
    allowColumnSubset: true,
  },

  // ── SQLite · Module 2: SQL Fundamentals ──────────────────────────────────
  'sql-fun-1': {
    prompt: "List every person's name and street: two columns, all 20 people.",
    starter: 'SELECT * FROM person;',
    solution: 'SELECT name, address_street_name FROM person;',
    hints: [
      'Replace * with just the columns you want.',
      'Separate column names with commas: SELECT name, address_street_name …',
    ],
  },
  'sql-fun-2': {
    prompt: 'Find every crime report from Chicago or Boston.',
    starter: 'SELECT * FROM crime_scene_report;',
    solution: "SELECT * FROM crime_scene_report WHERE city IN ('Chicago', 'Boston');",
    hints: [
      'You want rows whose city is one of two values.',
      "Use IN with a list: WHERE city IN ('Chicago', 'Boston'). Two conditions joined by OR also work.",
    ],
    allowColumnSubset: true,
  },
  'sql-fun-3': {
    prompt: 'Show the 3 most recent crime reports, newest first.',
    starter: 'SELECT * FROM crime_scene_report;',
    solution: `SELECT * FROM crime_scene_report
ORDER BY date DESC
LIMIT 3;`,
    hints: [
      'Sort by date so the newest reports come first.',
      'ORDER BY date DESC, then LIMIT 3.',
    ],
    orderMatters: true,
    allowColumnSubset: true,
  },
  'sql-fun-4': {
    prompt: 'Count the crime reports in each city. Return two columns: the city and its number of reports.',
    starter: 'SELECT city FROM crime_scene_report;',
    solution: `SELECT city, COUNT(*) AS reports
FROM crime_scene_report
GROUP BY city;`,
    hints: [
      'GROUP BY city collapses the rows into one row per city.',
      'COUNT(*) counts the rows in each group: SELECT city, COUNT(*) … GROUP BY city.',
    ],
  },

  // ── SQLite · Module 3: Joins & Relationships ─────────────────────────────
  'join-1': {
    prompt: "List each person's name next to the make of car they drive. Leave out people without a licence.",
    starter: `SELECT p.name
FROM person p;`,
    solution: `SELECT p.name, d.car_make
FROM person p
INNER JOIN drivers_license d ON p.license_id = d.id;`,
    hints: [
      'Car details live in drivers_license. JOIN it to person.',
      'The link between the tables is person.license_id = drivers_license.id.',
      'JOIN drivers_license d ON p.license_id = d.id, then add d.car_make to the SELECT list.',
    ],
  },
  'join-2': {
    prompt: "Find the people who don't have a driver's licence. Return just their names.",
    starter: `SELECT p.name, d.car_make
FROM person p
LEFT JOIN drivers_license d ON p.license_id = d.id;`,
    solution: `SELECT p.name
FROM person p
LEFT JOIN drivers_license d ON p.license_id = d.id
WHERE d.id IS NULL;`,
    hints: [
      'In a LEFT JOIN, a person with no licence gets NULL in every drivers_license column.',
      'Keep only those rows: WHERE d.id IS NULL. (= NULL never matches; use IS NULL.)',
      'Then SELECT only p.name.',
    ],
  },
  'join-3': {
    prompt: 'Using a subquery, list the names of people who have a gold gym membership.',
    starter: `SELECT name FROM person
WHERE id IN (
  SELECT person_id FROM get_fit_now_member
);`,
    solution: `SELECT name FROM person
WHERE id IN (
  SELECT person_id FROM get_fit_now_member
  WHERE membership_status = 'gold'
);`,
    hints: [
      'The inner query currently returns every member. Only gold members should count.',
      "Add WHERE membership_status = 'gold' inside the parentheses.",
    ],
  },

  // ── SQLite · Module 4: Schema Design ─────────────────────────────────────
  'schema-1': {
    prompt: 'Create a table called pets with three columns, in this order: id (integer primary key), name (text, NOT NULL) and species (text). Then add a dog named Rex and a cat named Tom.',
    starter: `DROP TABLE IF EXISTS pets;

CREATE TABLE pets (
  id INTEGER PRIMARY KEY
  -- add the name and species columns
);

-- then INSERT the two pets`,
    solution: `DROP TABLE IF EXISTS pets;

CREATE TABLE pets (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT
);

INSERT INTO pets (name, species) VALUES ('Rex', 'dog'), ('Tom', 'cat');`,
    check: `SELECT
  (SELECT group_concat(name || ' ' || CASE WHEN pk THEN 'primary key' WHEN "notnull" THEN 'required' ELSE 'optional' END, ', ')
     FROM pragma_table_info('pets')) AS columns,
  (SELECT group_concat(lower(name) || ' the ' || lower(species), ', ')
     FROM (SELECT name, species FROM pets ORDER BY lower(name))) AS pets;`,
    hints: [
      'Each column is a name, a type and optional constraints, separated by commas.',
      'name TEXT NOT NULL, species TEXT',
      "INSERT INTO pets (name, species) VALUES ('Rex', 'dog'), ('Tom', 'cat');",
    ],
  },
  'schema-2': {
    prompt: "Create a table sightings with id (integer primary key), person_id (integer, NOT NULL, a foreign key to person.id) and place (text). Record that person 32 was seen at 'Get Fit Now Gym'.",
    starter: `DROP TABLE IF EXISTS sightings;

CREATE TABLE sightings (
  id INTEGER PRIMARY KEY,
  person_id INTEGER NOT NULL,
  place TEXT
  -- add the foreign key here
);

-- then INSERT the sighting`,
    solution: `DROP TABLE IF EXISTS sightings;

CREATE TABLE sightings (
  id INTEGER PRIMARY KEY,
  person_id INTEGER NOT NULL,
  place TEXT,
  FOREIGN KEY (person_id) REFERENCES person(id)
);

INSERT INTO sightings (person_id, place) VALUES (32, 'Get Fit Now Gym');`,
    check: `SELECT
  (SELECT group_concat("from" || ' -> ' || "table" || '.' || coalesce("to", 'id'), ', ')
     FROM pragma_foreign_key_list('sightings')) AS foreign_keys,
  (SELECT group_concat(p.name || ' at ' || s.place, ', ')
     FROM sightings s JOIN person p ON p.id = s.person_id) AS sightings;`,
    hints: [
      'A foreign key is its own line in CREATE TABLE, after the columns.',
      'FOREIGN KEY (person_id) REFERENCES person(id)',
      "INSERT INTO sightings (person_id, place) VALUES (32, 'Get Fit Now Gym');",
    ],
  },

  // ── PostgreSQL ───────────────────────────────────────────────────────────
  'pg-1-1': {
    prompt: 'Show the name and email of the first 5 users by id.',
    starter: 'SELECT * FROM users LIMIT 10;',
    solution: `SELECT name, email FROM users
ORDER BY id
LIMIT 5;`,
    hints: [
      'Pick just the name and email columns.',
      '"First by id" means ORDER BY id, then LIMIT 5.',
    ],
    orderMatters: true,
  },
  'pg-1-2': {
    prompt: 'Create a table events with id (SERIAL primary key), title (TEXT, NOT NULL), starts_at (TIMESTAMP) and details (JSONB). Add one event titled Launch, starting 2025-01-01 09:00, with details {"room": "A"}.',
    starter: `DROP TABLE IF EXISTS events;

CREATE TABLE events (
  id SERIAL PRIMARY KEY
  -- add title, starts_at and details
);

-- then INSERT the Launch event`,
    solution: `DROP TABLE IF EXISTS events;

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  starts_at TIMESTAMP,
  details JSONB
);

INSERT INTO events (title, starts_at, details)
VALUES ('Launch', '2025-01-01 09:00', '{"room": "A"}');`,
    check: `SELECT
  (SELECT string_agg(column_name || ' ' || data_type || CASE WHEN is_nullable = 'NO' THEN ' required' ELSE '' END, ', ' ORDER BY ordinal_position)
     FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events') AS columns,
  (SELECT string_agg(title || ' at ' || starts_at::text || ' in room ' || coalesce(details->>'room', '?'), ', ')
     FROM events) AS events;`,
    hints: [
      'List the columns separated by commas, each with its type: title TEXT NOT NULL, …',
      'starts_at TIMESTAMP, details JSONB',
      "Text, timestamps and JSON are all written in single quotes: VALUES ('Launch', '2025-01-01 09:00', '{\"room\": \"A\"}')",
    ],
  },
  'pg-1-3': {
    prompt: "For every user, show their name in upper case and the number of characters in their name: two columns.",
    starter: 'SELECT name FROM users;',
    solution: 'SELECT UPPER(name), LENGTH(name) FROM users;',
    hints: [
      'Functions wrap a column: UPPER(name).',
      'LENGTH(name) counts the characters. SELECT both, separated by a comma.',
    ],
  },
  'pg-2-1': {
    prompt: 'Number the users in the order they joined: return each name with a join_order column, where 1 is the earliest sign-up.',
    starter: `SELECT name, created_at
FROM users
ORDER BY created_at;`,
    solution: `SELECT name, ROW_NUMBER() OVER (ORDER BY created_at) AS join_order
FROM users;`,
    hints: [
      'ROW_NUMBER() hands out 1, 2, 3, … across the rows.',
      'The OVER (…) part says in which order to count: OVER (ORDER BY created_at).',
    ],
  },
  'pg-2-2': {
    prompt: 'Using a CTE, return the names (only the name column) of users whose name is longer than 15 characters.',
    starter: `WITH name_lengths AS (
  SELECT name, LENGTH(name) AS len FROM users
)
SELECT * FROM name_lengths;`,
    solution: `WITH name_lengths AS (
  SELECT name, LENGTH(name) AS len FROM users
)
SELECT name FROM name_lengths
WHERE len > 15;`,
    hints: [
      'The CTE already works out each length. Filter in the outer query.',
      'SELECT name FROM name_lengths WHERE len > 15;',
    ],
  },

  // ── NoSQL ────────────────────────────────────────────────────────────────
  'mongo-1-1': {
    prompt: 'Find every user whose role is "admin".',
    starter: 'db.users.find({})',
    solution: 'db.users.find({ role: "admin" })',
    hints: [
      'The object you pass to find() is the filter. {} matches everything.',
      'db.users.find({ role: "admin" })',
    ],
  },
  'mongo-1-2': {
    prompt: 'Insert a user named Rosa Diaz with role "moderator", age 33 and isActive: true.',
    starter: `db.users.insertOne({
  name: "Rosa Diaz"
  // add role, age and isActive
})`,
    solution: `db.users.insertOne({
  name: "Rosa Diaz",
  role: "moderator",
  age: 33,
  isActive: true
})`,
    check: 'db.users.count({ name: "Rosa Diaz", role: "moderator", age: 33, isActive: true })',
    hints: [
      'Add the missing fields to the document, separated by commas.',
      'role: "moderator", age: 33, isActive: true (numbers and true need no quotes).',
    ],
  },
  'mongo-1-3': {
    prompt: 'Find the active users who are 30 or older.',
    starter: 'db.users.find({ isActive: true })',
    solution: 'db.users.find({ age: { $gte: 30 }, isActive: true })',
    hints: [
      '$gte means "greater than or equal to".',
      'Put both conditions in one filter: { age: { $gte: 30 }, isActive: true }',
    ],
  },
  'mongo-2-1': {
    prompt: 'Insert a customer named Sam Lee whose address is an embedded document with city "Springfield".',
    starter: `db.customers.insertOne({
  name: "Sam Lee",
  city: "Springfield" // move this into an embedded address object
})`,
    solution: `db.customers.insertOne({
  name: "Sam Lee",
  address: { city: "Springfield" }
})`,
    check: 'db.customers.count({ name: "Sam Lee", "address.city": "Springfield" })',
    hints: [
      'An embedded document is an object inside the document: address: { … }.',
      'address: { city: "Springfield" } (you can add a street too).',
    ],
  },
};
