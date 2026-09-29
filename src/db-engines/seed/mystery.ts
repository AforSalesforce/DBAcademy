/**
 * Sample data shared by the SQLite and PostgreSQL engines.
 *
 * The "SQL City" murder mystery that Module 1 is built around. Inspired by
 * the SQL Murder Mystery from Northwestern University Knight Lab
 * (https://github.com/NUKnightLab/sql-mysteries, MIT) — the story, people and
 * rows here are original and much smaller, so every lesson query returns rows.
 *
 * The solution, for maintainers: Victor Hale. The clue chain is
 * crime_scene_report → witnesses on Northwestern Dr / Franklin Ave → their
 * interviews → gold Get Fit Now members whose id starts with "G7" → the man
 * among them whose plate contains "K9". Carla Mendes and Jeremy Blake are
 * the near-misses (wrong gender / wrong plate).
 *
 * All SQL here must run unchanged on both SQLite and PostgreSQL.
 */

/** Bump when seed rows change, so saved databases pick up the new data. */
export const SEED_VERSION = 2;

export interface SeedTable {
  name: string;
  create: string;
  insert: string;
}

type Value = string | number | null;

function sqlValue(v: Value): string {
  if (v === null) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${v.replace(/'/g, "''")}'`;
}

function insertRows(table: string, rows: Value[][]): string {
  return `INSERT INTO ${table} VALUES\n${rows.map(r => `  (${r.map(sqlValue).join(', ')})`).join(',\n')};`;
}

const DRIVERS_LICENSES: Value[][] = [
  // id, age, height, eye_color, hair_color, gender, plate_number, car_make, car_model
  [110, 67, 172, 'blue', 'grey', 'male', 'MK4919', 'Buick', 'LeSabre'],
  [111, 34, 165, 'brown', 'black', 'female', 'LNO311', 'Subaru', 'Outback'],
  [112, 52, 180, 'green', 'brown', 'male', 'GH1587', 'Ford', 'F-150'],
  [114, 29, 178, 'blue', 'blonde', 'male', 'DV0062', 'Volkswagen', 'Golf'],
  [120, 31, 168, 'hazel', 'red', 'female', 'AV103F', 'Mini', 'Cooper'],
  [122, 45, 160, 'brown', 'brown', 'female', 'AP4150', 'Kia', 'Soul'],
  [123, 58, 163, 'brown', 'grey', 'female', 'RD12HR', 'Chevrolet', 'Malibu'],
  [124, 39, 188, 'brown', 'black', 'male', 'SA900K', 'Tesla', 'Model 3'],
  [125, 26, 170, 'blue', 'blonde', 'female', 'HL77ES', 'Volvo', 'XC40'],
  [126, 48, 183, 'grey', 'white', 'male', 'MB2044', 'Cadillac', 'Escalade'],
  [127, 33, 158, 'brown', 'black', 'female', 'YT318E', 'Toyota', 'Prius'],
  [130, 36, 182, 'green', 'brown', 'male', 'H7K2Q9', 'Toyota', 'Camry'],
  [131, 42, 167, 'brown', 'black', 'female', 'K9L553', 'Honda', 'Civic'],
  [132, 41, 185, 'brown', 'black', 'male', 'K9P114', 'Toyota', 'Corolla'],
  [133, 27, 162, 'brown', 'black', 'female', 'NP640M', 'Hyundai', 'Elantra'],
  [134, 50, 176, 'brown', 'black', 'male', 'OH221E', 'Toyota', 'Tacoma'],
  [140, 61, 175, 'blue', 'white', 'male', 'FG1333', 'Ford', 'Focus'],
];

const PEOPLE: Value[][] = [
  // id, name, license_id, address_number, address_street_name, ssn
  [10, 'Morris Kettle', 110, 4919, 'Northwestern Dr', '318-44-1920'],
  [11, 'Lena Ortiz', 111, 3120, 'Northwestern Dr', '402-17-5531'],
  [12, 'Grant Holloway', 112, 1587, 'Northwestern Dr', '219-80-4467'],
  [13, 'Priya Raman', null, 740, 'Northwestern Dr', '550-23-9081'],
  [14, 'Dmitri Volkov', 114, 62, 'Northwestern Dr', '611-09-3374'],
  [20, 'Annabel Voss', 120, 103, 'Franklin Ave', '127-56-8802'],
  [21, 'Theo Marchetti', null, 88, 'Franklin Ave', '733-41-2269'],
  [22, 'Annabelle Price', 122, 415, 'Maple Ave', '845-12-6630'],
  [23, 'Rosa Delgado', 123, 12, 'Harbor Rd', '366-72-1148'],
  [24, 'Samuel Achebe', 124, 900, 'Kingsway', '290-38-7715'],
  [25, 'Hannah Lindqvist', 125, 77, 'Elm St', '472-65-0293'],
  [26, 'Marcus Bell', 126, 2044, 'Sunset Blvd', '508-91-3346'],
  [27, 'Yuki Tanaka', 127, 318, 'Elm St', '681-24-5507'],
  [30, 'Jeremy Blake', 130, 56, 'Harbor Rd', '154-83-9920'],
  [31, 'Carla Mendes', 131, 1290, 'Kingsway', '237-60-4481'],
  [32, 'Victor Hale', 132, 7, 'Sunset Blvd', '919-02-6613'],
  [33, 'Nina Park', 133, 640, 'Maple Ave', '305-47-8854'],
  [34, 'Omar Haddad', 134, 221, 'Elm St', '762-18-0376'],
  [40, 'Felix Grant', 140, 1333, 'Harbor Rd', '428-95-6142'],
  [41, 'Olivia Chen', null, 58, 'Kingsway', '619-33-7208'],
];

const CRIME_SCENE_REPORTS: Value[][] = [
  // date, type, description, city
  [20180115, 'murder', 'Victim found in the alley behind Rosie\'s Diner at 11pm. Two witnesses saw the killer: the first lives in the highest-numbered house on Northwestern Dr, the second is named Annabel and lives on Franklin Ave.', 'SQL City'],
  [20180115, 'theft', 'A box of donuts was stolen from the police break room.', 'SQL City'],
  [20180110, 'assault', 'Two men argued outside the Get Fit Now Gym. One left with a bruised ego.', 'SQL City'],
  [20180102, 'arson', 'A dumpster fire behind Rosie\'s Diner. No injuries.', 'SQL City'],
  [20171224, 'theft', 'Someone took every candy cane from the town Christmas tree.', 'SQL City'],
  [20180125, 'bribery', 'A city inspector accepted a suspicious gift basket.', 'SQL City'],
  [20180115, 'murder', 'Man found in the river. Police suspect foul play.', 'Chicago'],
  [20180203, 'robbery', 'Corner store held up at closing time.', 'Chicago'],
  [20180215, 'murder', 'Body found in a parked car near the harbor.', 'New York'],
  [20180301, 'theft', 'Bicycle stolen outside the public library.', 'New York'],
  [20180120, 'fraud', 'Fake lottery tickets sold on Main St.', 'Boston'],
  [20171130, 'assault', 'Bar fight at the Rusty Anchor.', 'Boston'],
];

const INTERVIEWS: Value[][] = [
  // person_id, transcript
  [10, 'I heard a gunshot and ran to my window. A man sprinted to a grey Toyota. He was carrying a gold Get Fit Now Gym bag, and the membership number on it started with "G7". I only caught part of the plate: it had "K9" in it.'],
  [20, 'I recognised him. He is a gold member at my gym, Get Fit Now. I see him there most mornings.'],
  [14, 'I was asleep. I did not see anything.'],
  [30, 'I was at the cinema all night. Ask anyone.'],
  [31, 'Nobody borrowed my car. I was at home with my sister.'],
  [32, 'I have nothing to say without my lawyer.'],
];

const GYM_MEMBERS: Value[][] = [
  // id, person_id, name, membership_start_date, membership_status
  ['G7K21', 30, 'Jeremy Blake', 20161103, 'gold'],
  ['G7M04', 31, 'Carla Mendes', 20170215, 'gold'],
  ['G7R88', 32, 'Victor Hale', 20160620, 'gold'],
  ['G3Q19', 34, 'Omar Haddad', 20150901, 'gold'],
  ['S2A10', 33, 'Nina Park', 20170801, 'silver'],
  ['S2C77', 12, 'Grant Holloway', 20171005, 'silver'],
  ['R1B55', 11, 'Lena Ortiz', 20180101, 'regular'],
  ['R4T02', 20, 'Annabel Voss', 20160310, 'regular'],
];

/**
 * The accusation check. `code` is hex(upper(name)) of the killer, so
 * browsing the table doesn't give the answer away. Check with:
 *   SELECT verdict FROM solution WHERE code = hex(upper('Some Name'));
 */
const SOLUTION: Value[][] = [
  ['564943544F522048414C45', 'Case closed! Victor Hale is the killer. Great detective work.'],
];

/** Tables in insert order (referenced tables first). */
export const MYSTERY_TABLES: SeedTable[] = [
  {
    name: 'drivers_license',
    create: `CREATE TABLE IF NOT EXISTS drivers_license (
  id integer PRIMARY KEY,
  age integer,
  height integer,
  eye_color text,
  hair_color text,
  gender text,
  plate_number text,
  car_make text,
  car_model text
);`,
    insert: insertRows('drivers_license', DRIVERS_LICENSES),
  },
  {
    name: 'person',
    create: `CREATE TABLE IF NOT EXISTS person (
  id integer PRIMARY KEY,
  name text,
  license_id integer,
  address_number integer,
  address_street_name text,
  ssn text,
  FOREIGN KEY (license_id) REFERENCES drivers_license(id)
);`,
    insert: insertRows('person', PEOPLE),
  },
  {
    name: 'crime_scene_report',
    create: `CREATE TABLE IF NOT EXISTS crime_scene_report (
  date integer,
  type text,
  description text,
  city text
);`,
    insert: insertRows('crime_scene_report', CRIME_SCENE_REPORTS),
  },
  {
    name: 'interview',
    create: `CREATE TABLE IF NOT EXISTS interview (
  person_id integer,
  transcript text,
  FOREIGN KEY (person_id) REFERENCES person(id)
);`,
    insert: insertRows('interview', INTERVIEWS),
  },
  {
    name: 'get_fit_now_member',
    create: `CREATE TABLE IF NOT EXISTS get_fit_now_member (
  id text PRIMARY KEY,
  person_id integer,
  name text,
  membership_start_date integer,
  membership_status text,
  FOREIGN KEY (person_id) REFERENCES person(id)
);`,
    insert: insertRows('get_fit_now_member', GYM_MEMBERS),
  },
  {
    name: 'solution',
    create: `CREATE TABLE IF NOT EXISTS solution (
  code text PRIMARY KEY,
  verdict text
);`,
    insert: insertRows('solution', SOLUTION),
  },
];

const USER_NAMES = [
  'Ada Okonkwo', 'Benjamin Hartley-Moore', 'Chloe Nakamura', 'Diego Alvarez',
  'Evangeline Castellano', 'Farah Siddiqui', 'Gabriel Lindenberg', 'Hiro Tanabe',
  'Isabella Montgomery', 'Jonas Petersen', 'Kavya Ramachandran', 'Liam O\'Sullivan',
  'Mei Lin', 'Nikolai Rostropovich', 'Olu Adeyemi', 'Penelope Whitfield',
  'Quentin Beaumont', 'Rania Haddad', 'Sven Eriksson', 'Tomasz Wiśniewski',
  'Uma Krishnan', 'Valentina Ricci', 'William Ashworth', 'Ximena Gutierrez',
  'Yusuf Demir', 'Zoe Clarke', 'Aurelio Fontana', 'Beatrice Kowalczyk',
  'Cyrus Farahani', 'Dagny Solberg',
];
const JOBS = ['Data Analyst', 'Backend Engineer', 'Product Manager', 'Designer', 'DBA', 'Data Scientist'];

function slug(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
}

/**
 * A `users` table for the PostgreSQL lessons. Same columns the "Seed" button
 * creates, so the two stay compatible.
 */
export const USERS_TABLE: SeedTable = {
  name: 'users',
  create: `CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT,
  job TEXT,
  created_at TEXT
);`,
  insert: `INSERT INTO users (name, email, job, created_at) VALUES\n${USER_NAMES.map((name, i) => {
    const created = new Date(Date.UTC(2024, 0, 3) + i * 9 * 86_400_000 + (i % 7) * 3_600_000).toISOString();
    return `  (${[name, `${slug(name)}@example.com`, JOBS[i % JOBS.length], created].map(sqlValue).join(', ')})`;
  }).join(',\n')};`,
};

/**
 * Rows from the pre-v2 seed (three near-empty crime reports). Removed on
 * upgrade so the real story data can take their place.
 */
export const LEGACY_CLEANUP = `DELETE FROM crime_scene_report WHERE description IN ('Security footage shows a man walking oddly.', 'A donut was stolen.', 'Another one.');`;

export interface SeedTarget {
  exec(sql: string): Promise<void>;
  rowCount(table: string): Promise<number>;
}

/**
 * Create any missing sample tables and fill the ones that are empty.
 * Tables that already hold rows are left alone, so a learner's edits survive.
 *
 * Each step is best-effort: a learner may have reshaped one of these tables
 * (different columns), and a failed seed step must never cost them the rest
 * of their saved database.
 */
export async function applySeed(target: SeedTarget, tables: SeedTable[]): Promise<void> {
  const attempt = async (step: () => Promise<unknown>) => {
    try { await step(); } catch { /* keep the learner's version of this table */ }
  };
  for (const t of tables) await attempt(() => target.exec(t.create));
  await attempt(() => target.exec(LEGACY_CLEANUP));
  for (const t of tables) {
    await attempt(async () => {
      if ((await target.rowCount(t.name)) === 0) await target.exec(t.insert);
    });
  }
}
