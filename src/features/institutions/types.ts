import type { UserProgress } from '@/stores/progress-store';
import { completedPathLessons } from '@/features/learn/curriculum/path';
import { currentStreak } from '@/features/learn/streak';

export interface Institution {
  id: string;
  name: string;
  invite_code: string;
}

export interface MemberRow {
  id: string;
  name: string | null;
  email: string | null;
  /** Built-in path lessons completed (out of TOTAL_PATH_LESSONS). */
  lessonsCompleted: number;
  quizAverage: number | null;
  /** Streak as it stands today (0 once broken). */
  streak: number;
  xp: number;
  level: number;
  lastActiveDate: string;
}

export function quizAverageFrom(progress?: UserProgress): number | null {
  if (!progress?.lessonProgress) return null;
  const scores = Object.values(progress.lessonProgress)
    .map(lp => lp.quizScore)
    .filter((s): s is number => typeof s === 'number');
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/** Path lessons completed; code-playground and custom lessons don't count. */
export function pathLessonsFrom(progress?: UserProgress): number {
  return completedPathLessons(id => Boolean(progress?.lessonProgress?.[id]?.completed));
}

/** The member's streak today, not the last value they saved. */
export function streakFrom(progress?: UserProgress): number {
  return progress ? currentStreak(progress) : 0;
}
