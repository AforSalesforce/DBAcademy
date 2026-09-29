import { describe, it, expect } from 'vitest';
import { compareResults, normalizeValue } from '@/features/learn/grading/compare';

const result = (columns: string[], rows: unknown[][]) => ({
  columns,
  rows: rows.map(r => Object.fromEntries(columns.map((c, i) => [c, r[i]]))),
});

const expected = result(['city', 'reports'], [['SQL City', 6], ['Boston', 2], ['Chicago', 2]]);

describe('compareResults', () => {
  it('ignores column names (aliases) and row order by default', () => {
    const actual = result(['town', 'n'], [['Chicago', 2], ['SQL City', 6], ['Boston', 2]]);
    expect(compareResults(expected, actual)).toEqual({ kind: 'match' });
  });

  it('accepts the columns in a different order', () => {
    const actual = result(['n', 'city'], [[2, 'Boston'], [6, 'SQL City'], [2, 'Chicago']]);
    expect(compareResults(expected, actual)).toEqual({ kind: 'match', note: 'column-order' });
  });

  it('reports the wrong number of columns', () => {
    const actual = result(['city'], [['SQL City'], ['Boston'], ['Chicago']]);
    expect(compareResults(expected, actual)).toMatchObject({ kind: 'column-count', expected: 2, actual: 1 });
  });

  it('reports the wrong number of rows', () => {
    const actual = result(['city', 'reports'], [['SQL City', 6]]);
    expect(compareResults(expected, actual)).toEqual({ kind: 'row-count', expected: 3, actual: 1 });
  });

  it('lists missing and extra rows when values differ', () => {
    const actual = result(['city', 'reports'], [['SQL City', 6], ['Boston', 2], ['Chicago', 3]]);
    expect(compareResults(expected, actual)).toEqual({
      kind: 'values',
      columns: ['city', 'reports'],
      missing: [['Chicago', '2']],
      extra: [['Chicago', '3']],
    });
  });

  it('counts duplicate rows', () => {
    const exp = result(['x'], [[1], [1], [2]]);
    const act = result(['x'], [[1], [2], [2]]);
    expect(compareResults(exp, act)).toMatchObject({ kind: 'values', missing: [['1']], extra: [['2']] });
  });

  it('flags right rows in the wrong order when order matters', () => {
    const actual = result(['city', 'reports'], [['Boston', 2], ['SQL City', 6], ['Chicago', 2]]);
    expect(compareResults(expected, actual, { orderMatters: true })).toEqual({ kind: 'order' });
    expect(compareResults(expected, expected, { orderMatters: true })).toEqual({ kind: 'match' });
  });

  it('with allowColumnSubset, matches the columns picked by name', () => {
    const actual = result(['CITY'], [['Chicago'], ['SQL City'], ['Boston']]);
    expect(compareResults(expected, actual, { allowColumnSubset: true })).toEqual({ kind: 'match' });
    const unknown = result(['population'], [[1], [2], [3]]);
    expect(compareResults(expected, unknown, { allowColumnSubset: true })).toMatchObject({ kind: 'unknown-column', column: 'population' });
  });

  it('says so when a statement returned no data at all', () => {
    expect(compareResults(expected, { columns: [], rows: [] })).toEqual({ kind: 'no-columns' });
  });

  it('compares documents whole, ignoring _id and key order', () => {
    const exp = { columns: [], rows: [{ _id: 'u1', name: 'A', tags: ['x'] }] };
    const act = { columns: [], rows: [{ tags: ['x'], name: 'A', _id: 'random' }] };
    expect(compareResults(exp, act, { documents: true })).toEqual({ kind: 'match' });
    const wrong = { columns: [], rows: [{ name: 'B', tags: ['x'] }] };
    expect(compareResults(exp, wrong, { documents: true })).toMatchObject({ kind: 'values' });
  });
});

describe('normalizeValue', () => {
  it('treats equal numbers the same regardless of representation', () => {
    expect(normalizeValue(6)).toBe(normalizeValue(6.0));
    expect(normalizeValue(BigInt(6))).toBe(normalizeValue(6));
    expect(normalizeValue(0.1 + 0.2)).toBe(normalizeValue(0.3));
  });

  it('keeps NULL distinct from the text "null"', () => {
    expect(normalizeValue(null)).toBeNull();
    expect(normalizeValue('null')).toBe('null');
  });
});
