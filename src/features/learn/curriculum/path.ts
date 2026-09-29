import { CURRICULUM, LessonContentType, ModuleType } from './curriculum';

/**
 * The single guided path through the curriculum: SQLite first (starting with
 * the murder mystery), then PostgreSQL, then NoSQL — in CURRICULUM order.
 * Everything that asks "what's next?" goes through here.
 */

export interface PathStep {
  lesson: LessonContentType;
  module: ModuleType;
  /** 1-based position of the module in the path. */
  moduleNumber: number;
}

export const LEARNING_PATH: PathStep[] = CURRICULUM.flatMap((module, i) =>
  module.lessons.map(lesson => ({ lesson, module, moduleNumber: i + 1 })),
);

export const TOTAL_PATH_LESSONS = LEARNING_PATH.length;

export type IsComplete = (lessonId: string) => boolean;

/** Where the path lesson with this id sits, if it's a built-in lesson. */
export function findStep(lessonId: string): PathStep | null {
  return LEARNING_PATH.find(s => s.lesson.id === lessonId) ?? null;
}

/** The lesson after `lessonId` in the path (crossing engines), if any. */
export function stepAfter(lessonId: string): PathStep | null {
  const i = LEARNING_PATH.findIndex(s => s.lesson.id === lessonId);
  return i >= 0 && i < LEARNING_PATH.length - 1 ? LEARNING_PATH[i + 1] : null;
}

/** The first lesson not yet completed, or null when the path is finished. */
export function nextIncompleteStep(isComplete: IsComplete): PathStep | null {
  return LEARNING_PATH.find(s => !isComplete(s.lesson.id)) ?? null;
}

/** Built-in lessons completed; ignores code-playground and custom lessons. */
export function completedPathLessons(isComplete: IsComplete): number {
  return LEARNING_PATH.filter(s => isComplete(s.lesson.id)).length;
}

export interface ModuleProgress {
  module: ModuleType;
  moduleNumber: number;
  done: number;
  total: number;
  /** First incomplete lesson in the module (or its first lesson when all done). */
  resumeLesson: LessonContentType;
}

export function moduleProgress(isComplete: IsComplete): ModuleProgress[] {
  return CURRICULUM.map((module, i) => {
    const done = module.lessons.filter(l => isComplete(l.id)).length;
    return {
      module,
      moduleNumber: i + 1,
      done,
      total: module.lessons.length,
      resumeLesson: module.lessons.find(l => !isComplete(l.id)) ?? module.lessons[0],
    };
  });
}

export const ENGINE_LABEL: Record<string, string> = {
  sqlite: 'SQLite',
  postgres: 'PostgreSQL',
  nosql: 'NoSQL',
};
