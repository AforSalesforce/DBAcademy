import { describe, it, expect } from 'vitest';
import {
  PLAN_LIMITS,
  canCreateCustomModule,
  canCreateProject,
  canSaveQuery,
  canCreateSchemaDesign,
} from '@/features/billing/plans';

describe('plans', () => {
  it('free plan allows up to its module/project/query/design limits', () => {
    expect(canCreateCustomModule('free', 0)).toBe(true);
    expect(canCreateCustomModule('free', 1)).toBe(false);

    expect(canCreateProject('free', 1)).toBe(true);
    expect(canCreateProject('free', 2)).toBe(false);

    expect(canSaveQuery('free', 9)).toBe(true);
    expect(canSaveQuery('free', 10)).toBe(false);

    expect(canCreateSchemaDesign('free', 0)).toBe(true);
    expect(canCreateSchemaDesign('free', 1)).toBe(false);
  });

  it('pro and institution plans are unlimited', () => {
    for (const plan of ['pro', 'institution'] as const) {
      expect(canCreateCustomModule(plan, 1000)).toBe(true);
      expect(canCreateProject(plan, 1000)).toBe(true);
      expect(canSaveQuery(plan, 1000)).toBe(true);
      expect(canCreateSchemaDesign(plan, 1000)).toBe(true);
    }
  });

  it('every plan defines the same limit shape', () => {
    const keys = Object.keys(PLAN_LIMITS.free);
    for (const plan of Object.values(PLAN_LIMITS)) {
      expect(Object.keys(plan).sort()).toEqual(keys.sort());
    }
  });
});
