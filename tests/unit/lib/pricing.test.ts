import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PLAN_LIMITS } from '@/features/billing/plans';
import { PRICING_PLANS, PRICING_FAQS } from '@/features/billing/pricing';
import { TOTAL_PATH_LESSONS } from '@/features/learn/curriculum/path';

const allCopy = [
  ...PRICING_PLANS.flatMap(p => [p.description, ...p.features]),
  ...PRICING_FAQS.flatMap(f => [f.q, f.a]),
].join('\n');
const plan = (id: string) => PRICING_PLANS.find(p => p.id === id)!;

describe('pricing page tells the truth', () => {
  it('uses the daily code-run quota the database actually enforces', () => {
    const sql = readFileSync(path.resolve(__dirname, '../../../supabase/migrations/005_security_hardening.sql'), 'utf8');
    const m = sql.match(/per_day := case when caller_plan in \('pro', 'institution'\) then (\d+) else (\d+) end/);
    expect(m, 'quota expression not found in migration 005').not.toBeNull();
    const [, paid, free] = m!;
    expect(PLAN_LIMITS.pro.dailyServerRuns).toBe(Number(paid));
    expect(PLAN_LIMITS.institution.dailyServerRuns).toBe(Number(paid));
    expect(PLAN_LIMITS.free.dailyServerRuns).toBe(Number(free));
  });

  it('states the Free limits the app enforces', () => {
    const features = plan('free').features.join('\n');
    expect(features).toContain(`${PLAN_LIMITS.free.maxProjects} projects`);
    expect(features).toContain(`${PLAN_LIMITS.free.maxSavedQueries} saved queries`);
    expect(features).toContain(`${PLAN_LIMITS.free.maxCustomModules} custom module`);
    expect(features).toContain(`${PLAN_LIMITS.free.dailyServerRuns} runs a day`);
  });

  it('includes every lesson and engine on Free (nothing gates them)', () => {
    const features = plan('free').features.join('\n');
    expect(features).toContain(`All ${TOTAL_PATH_LESSONS} lessons`);
    expect(features).toMatch(/SQLite, PostgreSQL and NoSQL/);
  });

  it.each([
    /certificate/i, /\bSCORM\b/, /\bSSO\b|\bSAML\b/, /offline/i, /coming soon/i,
    /account manager/i, /no credit card required/i, /priority support/i, /bulk discount/i,
  ])('does not promise anything unbuilt: %s', pattern => {
    expect(allCopy).not.toMatch(pattern);
  });
});
