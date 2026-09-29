import { describe, it, expect, beforeEach } from 'vitest';
import { useProgressStore } from '@/stores/progress-store';

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
