import { describe, it, expect, beforeEach } from 'vitest';
import { useProgressStore, currentStreak, localDay } from '@/stores/progress-store';

const initial = useProgressStore.getState().progress;
const state = () => useProgressStore.getState();

describe('progress rewards', () => {
  beforeEach(() => {
    useProgressStore.setState({ progress: { ...initial, lessonProgress: {}, achievements: [] } });
  });

  it('pays lesson XP once, however often "complete" is clicked', () => {
    state().markLessonComplete('1-1', 'sqlite-1');
    state().markLessonComplete('1-1', 'sqlite-1');
    state().markLessonComplete('1-1', 'sqlite-1');
    expect(state().progress.xp).toBe(25);
    expect(state().progress.lessonsCompleted).toBe(1);
  });

  it('pays quiz XP on the first pass only and keeps the best score', () => {
    state().recordQuizScore('1-1', 50);
    expect(state().progress.xp).toBe(0);
    state().recordQuizScore('1-1', 100);
    state().recordQuizScore('1-1', 100);
    state().recordQuizScore('1-1', 80);
    expect(state().progress.xp).toBe(50);
    expect(state().progress.quizzesPassed).toBe(1);
    expect(state().progress.lessonProgress['1-1'].quizScore).toBe(100);
  });
});

describe('challenge rewards', () => {
  beforeEach(() => {
    useProgressStore.setState({ progress: { ...initial, lessonProgress: {}, achievements: [] } });
  });

  it('pays full XP for a challenge solved without help, once', () => {
    expect(state().completeChallenge('1-1', 'sqlite-1')).toBe(25);
    expect(state().completeChallenge('1-1', 'sqlite-1')).toBe(0);
    expect(state().progress.xp).toBe(25);
  });

  it('takes 5 XP per hint, never below 10', () => {
    state().recordHelp('1-2', { hintsUsed: 2 });
    expect(state().completeChallenge('1-2', 'sqlite-1')).toBe(15);
    state().recordHelp('1-3', { hintsUsed: 3 });
    state().recordHelp('1-3', { hintsUsed: 1 }); // re-reading earlier hints doesn't refund
    expect(state().completeChallenge('1-3', 'sqlite-1')).toBe(10);
  });

  it('pays 5 XP after the solution was revealed', () => {
    state().recordHelp('1-4', { solutionShown: true });
    expect(state().completeChallenge('1-4', 'sqlite-1')).toBe(5);
  });
});

describe('streak', () => {
  beforeEach(() => {
    useProgressStore.setState({ progress: { ...initial, lessonProgress: {}, achievements: [], streak: 0, lastActiveDate: '' } });
  });

  it('is not started by just visiting', () => {
    expect(currentStreak(state().progress)).toBe(0);
  });

  it('starts when a lesson is completed and counts a day once', () => {
    state().completeChallenge('1-1', 'sqlite-1');
    state().completeChallenge('1-2', 'sqlite-1');
    expect(state().progress.streak).toBe(1);
    expect(state().progress.lastActiveDate).toBe(localDay());
  });

  it('starts when a quiz is passed, not when failed', () => {
    state().recordQuizScore('1-1', 50);
    expect(currentStreak(state().progress)).toBe(0);
    state().recordQuizScore('1-1', 100);
    expect(currentStreak(state().progress)).toBe(1);
  });

  it('extends from yesterday and reads 0 once a day is missed', () => {
    expect(currentStreak({ streak: 4, lastActiveDate: '2026-03-10' }, '2026-03-10')).toBe(4);
    expect(currentStreak({ streak: 4, lastActiveDate: '2026-03-09' }, '2026-03-10')).toBe(4);
    expect(currentStreak({ streak: 4, lastActiveDate: '2026-03-08' }, '2026-03-10')).toBe(0);
    // Month and year boundaries use the calendar, not string tricks.
    expect(currentStreak({ streak: 2, lastActiveDate: '2026-02-28' }, '2026-03-01')).toBe(2);
    expect(currentStreak({ streak: 2, lastActiveDate: '2025-12-31' }, '2026-01-01')).toBe(2);
  });

  it('uses the local calendar day', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
