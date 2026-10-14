import { describe, it, expect } from 'vitest';
import {
  LEARNING_PATH, TOTAL_PATH_LESSONS, stepAfter, nextIncompleteStep, completedPathLessons, moduleProgress, findStep,
} from '@/features/learn/curriculum/path';

const done = (...ids: string[]) => (id: string) => ids.includes(id);

describe('learning path', () => {
  it('starts with the murder mystery and runs SQLite → PostgreSQL → NoSQL', () => {
    expect(LEARNING_PATH[0].lesson.title).toBe('The Crime Scene');
    const engines = [...new Set(LEARNING_PATH.map(s => s.module.engine))];
    expect(engines).toEqual(['sqlite', 'postgres', 'nosql']);
    expect(TOTAL_PATH_LESSONS).toBe(22);
  });

  it('numbers modules across the whole path', () => {
    expect(findStep('pg-1-1')).toMatchObject({ moduleNumber: 5 });
    expect(findStep('mongo-1-1')).toMatchObject({ moduleNumber: 7 });
    expect(findStep('not-a-lesson')).toBeNull();
  });

  it('continues across engines after the last lesson of one', () => {
    expect(stepAfter('schema-2')?.lesson.id).toBe('pg-1-1');
    expect(stepAfter(LEARNING_PATH[TOTAL_PATH_LESSONS - 1].lesson.id)).toBeNull();
  });

  it('finds the first incomplete lesson, skipping ahead past gaps', () => {
    expect(nextIncompleteStep(done())?.lesson.id).toBe('1-1');
    expect(nextIncompleteStep(done('1-1', '1-2'))?.lesson.id).toBe('1-3');
    expect(nextIncompleteStep(done('1-2'))?.lesson.id).toBe('1-1');
    expect(nextIncompleteStep(() => true)).toBeNull();
  });

  it('counts only built-in lessons as path progress', () => {
    expect(completedPathLessons(done('1-1', 'js-1-1', 'custom-123'))).toBe(1);
  });

  it('reports per-module progress and where to resume', () => {
    const mystery = moduleProgress(done('1-1', '1-2'))[0];
    expect(mystery).toMatchObject({ moduleNumber: 1, done: 2, total: 4 });
    expect(mystery.resumeLesson.id).toBe('1-3');
  });
});
