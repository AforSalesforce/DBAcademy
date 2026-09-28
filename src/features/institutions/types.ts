import type { UserProgress } from '@/stores/progress-store';

export interface Institution {
  id: string;
  name: string;
  invite_code: string;
}

export interface MemberRow {
  id: string;
  name: string | null;
  email: string | null;
  lessonsCompleted: number;
  quizAverage: number | null;
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
