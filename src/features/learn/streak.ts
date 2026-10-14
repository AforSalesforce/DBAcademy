/**
 * Streak rules, kept free of React/zustand so both the progress store and
 * server code (the institution dashboard) can use them.
 */

/** The learner's local calendar day as YYYY-MM-DD (not UTC, so late-evening work counts for today). */
export function localDay(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d - 1));
}

/** The streak as it stands today: it's broken (0) once a whole day passes without learning. */
export function currentStreak(progress: { streak: number; lastActiveDate: string }, today: string = localDay()): number {
  const last = progress.lastActiveDate;
  return last === today || last === previousDay(today) ? progress.streak : 0;
}
