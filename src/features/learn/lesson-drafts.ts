/**
 * What the learner last had in the editor for each lesson, so opening a
 * lesson again brings back their attempt instead of overwriting it.
 * Browser-only convenience; failures (private mode, full storage) are ignored.
 */

const key = (lessonId: string) => `dbacademy:draft:${lessonId}`;

export function loadDraft(lessonId: string): string | null {
  try { return localStorage.getItem(key(lessonId)); } catch { return null; }
}

export function saveDraft(lessonId: string, text: string): void {
  try { localStorage.setItem(key(lessonId), text); } catch { /* ignore */ }
}
