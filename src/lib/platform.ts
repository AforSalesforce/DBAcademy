/** True on macOS and iOS, where shortcuts use ⌘ instead of Ctrl. Client-only. */
export function isMacLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

/** How to write the "command" modifier in shortcut hints on this platform. */
export function modKeyLabel(): string {
  return isMacLike() ? '⌘' : 'Ctrl+';
}
