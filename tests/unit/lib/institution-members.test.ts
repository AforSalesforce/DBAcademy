import { describe, it, expect } from 'vitest';
import { pathLessonsFrom, streakFrom, quizAverageFrom } from '@/features/institutions/types';
import { localDay } from '@/features/learn/streak';
import type { UserProgress } from '@/stores/progress-store';

const progress = (over: Partial<UserProgress>): UserProgress => ({
  lessonsCompleted: 0, totalLessons: 22, quizzesPassed: 0, queriesExecuted: 0,
  streak: 0, lastActiveDate: '', xp: 0, level: 1, lessonProgress: {}, achievements: [], ...over,
});
const done = (...ids: string[]) =>
  Object.fromEntries(ids.map(id => [id, { lessonId: id, moduleId: '', completed: true, queriesRun: 0, timeSpent: 0, lastAccessed: '' }]));

describe('institution member summaries', () => {
  it('counts only path lessons, so a student can never show more than 22', () => {
    const p = progress({ lessonsCompleted: 5, lessonProgress: done('1-1', '1-2', 'js-1-1', 'py-1-1', 'custom-1') });
    expect(pathLessonsFrom(p)).toBe(2);
    expect(pathLessonsFrom(undefined)).toBe(0);
  });

  it("shows a student's streak as it stands today", () => {
    expect(streakFrom(progress({ streak: 6, lastActiveDate: localDay() }))).toBe(6);
    expect(streakFrom(progress({ streak: 6, lastActiveDate: '2020-01-01' }))).toBe(0);
    expect(streakFrom(undefined)).toBe(0);
  });

  it('averages quiz scores that exist', () => {
    const p = progress({ lessonProgress: { a: { ...done('a').a, quizScore: 100 }, b: { ...done('b').b, quizScore: 50 }, c: done('c').c } });
    expect(quizAverageFrom(p)).toBe(75);
  });
});
