'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CURRICULUM } from '@/features/learn/curriculum/curriculum';
import { localDay, previousDay } from '@/features/learn/streak';

// Pure helpers live in features/learn/streak.ts so server code can use them too.
export { localDay, currentStreak } from '@/features/learn/streak';

export interface LessonProgress {
  lessonId: string;
  moduleId: string;
  completed: boolean;
  quizScore?: number;
  /** Hints revealed for the lesson's challenge. */
  hintsUsed?: number;
  /** The challenge's solution was revealed. */
  solutionShown?: boolean;
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
  /** The last query that counted, normalised: running it again doesn't count twice. */
  lastQueryKey?: string;
  /** Query XP already earned on `queryXpDay` (capped per day). */
  queryXpToday?: number;
  queryXpDay?: string;
}

interface ProgressStore {
  progress: UserProgress;
  markLessonComplete: (lessonId: string, moduleId: string) => void;
  /** Complete a lesson by passing its challenge; returns the XP awarded (0 if already complete). */
  completeChallenge: (lessonId: string, moduleId: string) => number;
  /** Note that a hint (or the solution) was revealed; it lowers the challenge's XP. */
  recordHelp: (lessonId: string, help: { hintsUsed?: number; solutionShown?: boolean }) => void;
  recordQuizScore: (lessonId: string, score: number) => void;
  /** Count a successful run. The same query run again in a row earns nothing; query XP is capped per day. */
  incrementQueries: (queryText?: string) => void;
  addXP: (amount: number) => void;
  /** Count today toward the streak. Called when the learner completes a lesson or passes a quiz. */
  recordLearningDay: () => void;
  getLevel: () => number;
  /** Replace the whole progress object (used by server sync hydration). */
  setProgress: (progress: UserProgress) => void;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-query', title: 'First Query', description: 'Run your first SQL query', icon: '🎯' },
  { id: 'ten-queries', title: 'Query Master', description: 'Run 10 different queries', icon: '⚡' },
  { id: 'hundred-queries', title: 'SQL Wizard', description: 'Run 100 different queries', icon: '🧙' },
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
/** XP for running a new query, and the most a day's querying can earn (so Run can't be farmed). */
export const QUERY_XP = 2;
export const DAILY_QUERY_XP_CAP = 40;

const normaliseQuery = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();


const LESSON_XP = 25;

/** XP for passing a challenge: 25, minus 5 per hint (at least 10), or 5 after seeing the solution. */
export function challengeXp(hintsUsed = 0, solutionShown = false): number {
  if (solutionShown) return 5;
  return Math.max(10, LESSON_XP - 5 * hintsUsed);
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => {
      /** Mark a lesson complete and pay `xp` once. Returns the XP paid (0 if already complete). */
      const completeLesson = (lessonId: string, moduleId: string, xp: number): number => {
        if (get().progress.lessonProgress[lessonId]?.completed) return 0;
        set((state) => {
          const existing = state.progress.lessonProgress[lessonId];

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
        get().addXP(xp);
        get().recordLearningDay();
        return xp;
      };

      return {
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
          completeLesson(lessonId, moduleId, LESSON_XP);
        },

        completeChallenge: (lessonId: string, moduleId: string) => {
          const lp = get().progress.lessonProgress[lessonId];
          return completeLesson(lessonId, moduleId, challengeXp(lp?.hintsUsed, lp?.solutionShown));
        },

        recordHelp: (lessonId, help) => {
          set((state) => {
            const existing = state.progress.lessonProgress[lessonId];
            return {
              progress: {
                ...state.progress,
                lessonProgress: {
                  ...state.progress.lessonProgress,
                  [lessonId]: {
                    ...(existing || { lessonId, moduleId: '', completed: false, queriesRun: 0, timeSpent: 0, lastAccessed: new Date().toISOString() }),
                    hintsUsed: Math.max(existing?.hintsUsed ?? 0, help.hintsUsed ?? 0),
                    solutionShown: Boolean(existing?.solutionShown || help.solutionShown),
                  },
                },
              },
            };
          });
        },

        recordQuizScore: (lessonId: string, score: number) => {
          // Retakes keep the best score, and passing pays XP only the first time.
          const previous = get().progress.lessonProgress[lessonId]?.quizScore;
          const firstPass = score >= 70 && (previous === undefined || previous < 70);
          set((state) => {
            const existing = state.progress.lessonProgress[lessonId];
            const newProgress = {
              ...state.progress,
              quizzesPassed: firstPass ? state.progress.quizzesPassed + 1 : state.progress.quizzesPassed,
              lessonProgress: {
                ...state.progress.lessonProgress,
                [lessonId]: {
                  ...(existing || { lessonId, moduleId: '', completed: false, queriesRun: 0, timeSpent: 0, lastAccessed: new Date().toISOString() }),
                  quizScore: Math.max(score, previous ?? 0),
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
          if (firstPass) get().addXP(50);
        if (score >= 70) get().recordLearningDay();
        },

        incrementQueries: (queryText?: string) => {
          const key = queryText === undefined ? undefined : normaliseQuery(queryText);
          if (key !== undefined && key === get().progress.lastQueryKey) return; // pressing Run again isn't progress
          const today = localDay();
          const p = get().progress;
          const xpSoFar = p.queryXpDay === today ? (p.queryXpToday ?? 0) : 0;
          const earnsXp = xpSoFar < DAILY_QUERY_XP_CAP;
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

            return {
              progress: {
                ...state.progress,
                queriesExecuted: newCount,
                achievements,
                lastQueryKey: key,
                queryXpDay: today,
                queryXpToday: xpSoFar + (earnsXp ? QUERY_XP : 0),
              },
            };
          });
          if (earnsXp) get().addXP(QUERY_XP);
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

        recordLearningDay: () => {
          set((state) => {
            const today = localDay();
            const lastDate = state.progress.lastActiveDate;

            if (lastDate === today) return state;

            const newStreak = lastDate === previousDay(today) ? state.progress.streak + 1 : 1;

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
      };
    },
    {
      name: 'dbacademy-progress',
    }
  )
);
