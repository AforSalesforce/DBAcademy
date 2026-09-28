import { describe, it, expect } from 'vitest';
import { safeNextPath } from '@/lib/safe-redirect';

describe('safeNextPath', () => {
  it('allows same-site paths', () => {
    expect(safeNextPath('/dashboard')).toBe('/dashboard');
    expect(safeNextPath('/admin?tab=students')).toBe('/admin?tab=students');
  });

  it('falls back for missing values', () => {
    expect(safeNextPath(null)).toBe('/dashboard');
    expect(safeNextPath('')).toBe('/dashboard');
    expect(safeNextPath(undefined, '/learn')).toBe('/learn');
  });

  it('blocks open redirects to other sites', () => {
    for (const evil of ['https://evil.com', '//evil.com', '/\\evil.com', 'evil.com', 'javascript:alert(1)']) {
      expect(safeNextPath(evil)).toBe('/dashboard');
    }
  });
});
