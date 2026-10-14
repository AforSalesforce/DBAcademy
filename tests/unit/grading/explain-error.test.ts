import { describe, it, expect } from 'vitest';
import { explainError } from '@/features/learn/grading/explain-error';

const tables = [
  { name: 'person', columns: [{ name: 'name', type: 'text' }, { name: 'address_street_name', type: 'text' }] },
  { name: 'interview', columns: [{ name: 'transcript', type: 'text' }] },
];
const sql = (message: string, engine = 'sqlite') => explainError(message, { engine, tables });

describe('explainError', () => {
  it('suggests the column a typo was probably meant to be', () => {
    expect(sql('no such column: nme')).toMatch(/Did you mean "name"/);
    expect(sql('column "p.nmae" does not exist', 'postgres')).toMatch(/Did you mean "name"/);
    expect(sql('no such column: transcrpt')).toMatch(/"transcript"/);
  });

  it('spots text written in double quotes', () => {
    expect(sql('column "SQL City" does not exist', 'postgres')).toMatch(/single quotes: 'SQL City'/);
  });

  it('suggests a table name, or lists the tables', () => {
    expect(sql('no such table: persons')).toMatch(/Did you mean "person"/);
    expect(sql('relation "orders" does not exist', 'postgres')).toMatch(/Tables here: person, interview/);
  });

  it('explains common mistakes', () => {
    expect(sql('ambiguous column name: name')).toMatch(/p\.name/);
    expect(sql('misuse of aggregate: COUNT()')).toMatch(/HAVING/);
    expect(sql('incomplete input')).toMatch(/ended too early/);
    expect(sql('near "FROM": syntax error')).toMatch(/just before "FROM".*comma/);
    expect(sql('table pets already exists')).toMatch(/DROP TABLE IF EXISTS pets/);
    expect(sql('NOT NULL constraint failed: pets.name')).toMatch(/name is required/);
    expect(sql('column "city" must appear in the GROUP BY clause or be used in an aggregate function', 'postgres')).toMatch(/GROUP BY/);
  });

  it('helps with NoSQL method typos', () => {
    expect(explainError('db.users.fnd is not a function', { engine: 'nosql' })).toMatch(/Did you mean find\?/);
    expect(explainError('users is not defined', { engine: 'nosql' })).toMatch(/db\.users\.find/);
  });

  it('stays quiet when it has nothing useful to add', () => {
    expect(sql('disk I/O error')).toBeNull();
  });
});
