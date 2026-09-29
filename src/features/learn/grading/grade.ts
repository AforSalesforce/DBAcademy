import type { QueryResult } from '@/db-engines/types';
import type { Challenge } from '@/features/learn/curriculum/challenges';
import { compareResults, Verdict } from './compare';
import { runInSandbox, GradedEngine, CheckFailed } from './sandbox';

export type FailReason =
  | Exclude<Verdict, { kind: 'match' }>
  /** The attempt ran, but what it built can't be checked yet. */
  | { kind: 'check-failed'; message: string };

export type Grade =
  | { status: 'pass'; note?: 'column-order' }
  | { status: 'fail'; verdict: FailReason }
  | { status: 'error'; message: string };

/** Expected results, computed once per lesson from the reference solution. */
const expectedCache = new Map<string, Promise<QueryResult>>();

function expectedFor(engine: GradedEngine, lessonId: string, challenge: Challenge): Promise<QueryResult> {
  const key = `${engine}:${lessonId}`;
  let expected = expectedCache.get(key);
  if (!expected) {
    expected = runInSandbox(engine, challenge.solution, challenge.check);
    expectedCache.set(key, expected);
    expected.catch(() => expectedCache.delete(key));
  }
  return expected;
}

/** Check a learner's attempt by comparing it with the solution on clean data. */
export async function gradeAttempt(engine: GradedEngine, lessonId: string, challenge: Challenge, attempt: string): Promise<Grade> {
  if (!attempt.trim()) return { status: 'error', message: 'The editor is empty. Write a query first.' };

  const expected = await expectedFor(engine, lessonId, challenge);
  let actual: QueryResult;
  try {
    actual = await runInSandbox(engine, attempt, challenge.check);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (e instanceof CheckFailed) return { status: 'fail', verdict: { kind: 'check-failed', message } };
    return { status: 'error', message };
  }

  const verdict = compareResults(expected, actual, {
    orderMatters: challenge.orderMatters,
    allowColumnSubset: challenge.allowColumnSubset,
    documents: engine === 'nosql',
  });
  return verdict.kind === 'match' ? { status: 'pass', note: verdict.note } : { status: 'fail', verdict };
}

/** Plain-language feedback for a failed attempt. */
export function describeVerdict(verdict: FailReason, hasCheck: boolean): { title: string; detail?: string } {
  switch (verdict.kind) {
    case 'check-failed':
      return {
        title: 'Your script ran, but it doesn\'t do everything the task asks yet.',
        detail: `Checking what it built gave: "${verdict.message}". Compare your table and column names with the task.`,
      };
    case 'no-columns':
      return { title: 'Your query didn\'t return any data.', detail: 'It ran, but it only changed things. This task needs a query that returns rows, like a SELECT.' };
    case 'column-count':
      return {
        title: `Your result has ${verdict.actual} column${verdict.actual === 1 ? '' : 's'}; the answer has ${verdict.expected}.`,
        detail: hasCheck ? undefined : `Expected columns: ${verdict.expectedColumns.join(', ')}.`,
      };
    case 'unknown-column':
      return { title: `The column "${verdict.column}" isn't part of the answer.`, detail: `Choose from: ${verdict.expectedColumns.join(', ')}.` };
    case 'row-count':
      return {
        title: `You returned ${verdict.actual} row${verdict.actual === 1 ? '' : 's'}; the answer has ${verdict.expected}.`,
        detail: verdict.actual > verdict.expected ? 'Your filter lets too much through.' : verdict.actual === 0 ? 'Nothing matched. Check spelling and quotes in your conditions.' : 'Your filter is too strict.',
      };
    case 'order':
      return { title: 'Right rows, wrong order.', detail: 'Check your ORDER BY: which column, and ASC or DESC?' };
    case 'values':
      return {
        title: hasCheck ? 'Not quite. The table or data you created doesn\'t match the task.' : 'Right shape, but some values are different.',
      };
  }
}
