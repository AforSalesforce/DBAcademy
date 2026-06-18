'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CURRICULUM } from '@/features/learn/curriculum/curriculum';

export interface LessonProgress {
  lessonId: string;
  moduleId: string;
  completed: boolean;
  quizScore?: number;
  queriesRun: number;
  timeSpent: number; // seconds
  lastAccessed: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface UserProgress {
  lessonsCompleted: number;
  totalLessons: number;
  quizzesPassed: number;
  queriesExecuted: number;
  streak: number;
  lastActiveDate: string;
  xp: number;
  level: number;
  lessonProgress: Record<string, LessonProgress>;
  achievements: Achievement[];
}

interface ProgressStore {
  progress: UserProgress;
  markLessonComplete: (lessonId: string, moduleId: string) => void;
  recordQuizScore: (lessonId: string, score: number) => void;
  incrementQueries: () => void;
  addXP: (amount: number) => void;
  updateStreak: () => void;
  getLevel: () => number;
  /** Replace the whole progress object (used by server sync hydration). */
  setProgress: (progress: UserProgress) => void;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-query', title: 'First Query', description: 'Run your first SQL query', icon: '🎯' },
  { id: 'ten-queries', title: 'Query Master', description: 'Run 10 queries', icon: '⚡' },
  { id: 'hundred-queries', title: 'SQL Wizard', description: 'Run 100 queries', icon: '🧙' },
  { id: 'first-lesson', title: 'Student', description: 'Complete your first lesson', icon: '📖' },
  { id: 'five-lessons', title: 'Scholar', description: 'Complete 5 lessons', icon: '🎓' },
  { id: 'perfect-quiz', title: 'Perfect Score', description: 'Get 100% on a quiz', icon: '💯' },
  { id: 'streak-3', title: 'On Fire', description: '3-day learning streak', icon: '🔥' },
  { id: 'streak-7', title: 'Dedicated', description: '7-day learning streak', icon: '⭐' },
  { id: 'streak-30', title: 'Unstoppable', description: '30-day learning streak', icon: '🏆' },
  { id: 'level-5', title: 'Rising Star', description: 'Reach level 5', icon: '🌟' },
  { id: 'level-10', title: 'Expert', description: 'Reach level 10', icon: '💎' },
];

const XP_PER_LEVEL = 100;

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      progress: {
        lessonsCompleted: 0,
        totalLessons: CURRICULUM.reduce((n, m) => n + m.lessons.length, 0),
        quizzesPassed: 0,
        queriesExecuted: 0,
        streak: 0,
        lastActiveDate: '',
        xp: 0,
        level: 1,
        lessonProgress: {},
        achievements: [],
      },

      markLessonComplete: (lessonId: string, moduleId: string) => {
        set((state) => {
          const existing = state.progress.lessonProgress[lessonId];
          if (existing?.completed) return state;

          const newProgress = {
            ...state.progress,
            lessonsCompleted: state.progress.lessonsCompleted + 1,
            lessonProgress: {
              ...state.progress.lessonProgress,
              [lessonId]: {
                ...(existing || { queriesRun: 0, timeSpent: 0 }),
                lessonId,
                moduleId,
                completed: true,
                lastAccessed: new Date().toISOString(),
              },
            },
          };

          // Check achievements
          const achievements = [...state.progress.achievements];
          if (newProgress.lessonsCompleted === 1) {
            const a = ACHIEVEMENTS.find(a => a.id === 'first-lesson')!;
            if (!achievements.find(x => x.id === a.id)) {
              achievements.push({ ...a, unlockedAt: new Date().toISOString() });
            }
          }
          if (newProgress.lessonsCompleted >= 5) {
            const a = ACHIEVEMENTS.find(a => a.id === 'five-lessons')!;
            if (!achievements.find(x => x.id === a.id)) {
              achievements.push({ ...a, unlockedAt: new Date().toISOString() });
            }
          }

          return { progress: { ...newProgress, achievements } };
        });
        get().addXP(25);
      },

      recordQuizScore: (lessonId: string, score: number) => {
        set((state) => {
          const existing = state.progress.lessonProgress[lessonId];
          const newProgress = {
            ...state.progress,
            quizzesPassed: score >= 70 ? state.progress.quizzesPassed + 1 : state.progress.quizzesPassed,
            lessonProgress: {
              ...state.progress.lessonProgress,
              [lessonId]: {
                ...(existing || { lessonId, moduleId: '', completed: false, queriesRun: 0, timeSpent: 0, lastAccessed: new Date().toISOString() }),
                quizScore: score,
              },
            },
          };

          const achievements = [...state.progress.achievements];
          if (score === 100) {
            const a = ACHIEVEMENTS.find(a => a.id === 'perfect-quiz')!;
            if (!achievements.find(x => x.id === a.id)) {
              achievements.push({ ...a, unlockedAt: new Date().toISOString() });
            }
          }

          return { progress: { ...newProgress, achievements } };
        });
        get().addXP(score >= 70 ? 50 : 10);
      },

      incrementQueries: () => {
        set((state) => {
          const newCount = state.progress.queriesExecuted + 1;
          const achievements = [...state.progress.achievements];

          if (newCount === 1) {
            const a = ACHIEVEMENTS.find(a => a.id === 'first-query')!;
            if (!achievements.find(x => x.id === a.id)) {
              achievements.push({ ...a, unlockedAt: new Date().toISOString() });
            }
          }
          if (newCount === 10) {
            const a = ACHIEVEMENTS.find(a => a.id === 'ten-queries')!;
            if (!achievements.find(x => x.id === a.id)) {
              achievements.push({ ...a, unlockedAt: new Date().toISOString() });
            }
          }
          if (newCount === 100) {
            const a = ACHIEVEMENTS.find(a => a.id === 'hundred-queries')!;
            if (!achievements.find(x => x.id === a.id)) {
              achievements.push({ ...a, unlockedAt: new Date().toISOString() });
            }
          }

          return { progress: { ...state.progress, queriesExecuted: newCount, achievements } };
        });
        get().addXP(2);
      },

      addXP: (amount: number) => {
        set((state) => {
          const newXP = state.progress.xp + amount;
          const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
          const achievements = [...state.progress.achievements];

          if (newLevel >= 5) {
            const a = ACHIEVEMENTS.find(a => a.id === 'level-5')!;
            if (!achievements.find(x => x.id === a.id)) {
              achievements.push({ ...a, unlockedAt: new Date().toISOString() });
            }
          }
          if (newLevel >= 10) {
            const a = ACHIEVEMENTS.find(a => a.id === 'level-10')!;
            if (!achievements.find(x => x.id === a.id)) {
              achievements.push({ ...a, unlockedAt: new Date().toISOString() });
            }
          }

          return { progress: { ...state.progress, xp: newXP, level: newLevel, achievements } };
        });
      },

      updateStreak: () => {
        set((state) => {
          const today = new Date().toISOString().split('T')[0];
          const lastDate = state.progress.lastActiveDate;

          if (lastDate === today) return state;

          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          const newStreak = lastDate === yesterday ? state.progress.streak + 1 : 1;

          const achievements = [...state.progress.achievements];
          if (newStreak >= 3) {
            const a = ACHIEVEMENTS.find(a => a.id === 'streak-3')!;
            if (!achievements.find(x => x.id === a.id)) {
              achievements.push({ ...a, unlockedAt: new Date().toISOString() });
            }
          }
          if (newStreak >= 7) {
            const a = ACHIEVEMENTS.find(a => a.id === 'streak-7')!;
            if (!achievements.find(x => x.id === a.id)) {
              achievements.push({ ...a, unlockedAt: new Date().toISOString() });
            }
          }
          if (newStreak >= 30) {
            const a = ACHIEVEMENTS.find(a => a.id === 'streak-30')!;
            if (!achievements.find(x => x.id === a.id)) {
              achievements.push({ ...a, unlockedAt: new Date().toISOString() });
            }
          }

          return { progress: { ...state.progress, streak: newStreak, lastActiveDate: today, achievements } };
        });
      },

      getLevel: () => {
        return get().progress.level;
      },

      setProgress: (progress: UserProgress) => {
        set({ progress });
      },
    }),
    {
      name: 'dbacademy-progress',
    }
  )
);
