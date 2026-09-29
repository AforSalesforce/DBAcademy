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
