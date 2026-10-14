export type Plan = 'free' | 'pro' | 'institution';

export interface PlanLimits {
  label: string;
  maxCustomModules: number;
  /** User-created projects (not counting the 3 default playgrounds). */
  maxProjects: number;
  /** Unlimited saved queries = Infinity. */
  maxSavedQueries: number;
  /** Ring-buffer for all plans (local only). */
  maxRunHistory: number;
  /** Number of schema designs (Phase A). */
  maxSchemaDesigns: number;
  /** Cloud snapshots for project DB state. */
  cloudSnapshots: boolean;
  /** Phase B canvas schema editor. */
  canvasSchemaEditor: boolean;
  /**
   * Server-run code (Java, C, C++, Go) per day. Enforced in Postgres by
   * consume_code_execution() in supabase/migrations/005_security_hardening.sql;
   * a test keeps this number in step with the SQL.
   */
  dailyServerRuns: number;
}

/**
 * Billing is stubbed for now — the `plan` column on profiles drives feature
 * gating. When Stripe is added, a webhook just needs to update that column.
 */
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    label: 'Free',
    maxCustomModules: 1,
    maxProjects: 2,
    maxSavedQueries: 10,
    maxRunHistory: 200,
    maxSchemaDesigns: 1,
    cloudSnapshots: false,
    canvasSchemaEditor: false,
    dailyServerRuns: 100,
  },
  pro: {
    label: 'Pro',
    maxCustomModules: Infinity,
    maxProjects: Infinity,
    maxSavedQueries: Infinity,
    maxRunHistory: 200,
    maxSchemaDesigns: Infinity,
    cloudSnapshots: true,
    canvasSchemaEditor: true,
    dailyServerRuns: 1000,
  },
  institution: {
    label: 'Institution',
    maxCustomModules: Infinity,
    maxProjects: Infinity,
    maxSavedQueries: Infinity,
    maxRunHistory: 200,
    maxSchemaDesigns: Infinity,
    cloudSnapshots: true,
    canvasSchemaEditor: true,
    dailyServerRuns: 1000,
  },
};

export function canCreateCustomModule(plan: Plan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxCustomModules;
}

export function canCreateProject(plan: Plan, currentUserProjectCount: number): boolean {
  return currentUserProjectCount < PLAN_LIMITS[plan].maxProjects;
}

export function canSaveQuery(plan: Plan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxSavedQueries;
}

export function canCreateSchemaDesign(plan: Plan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxSchemaDesigns;
}
