import { PLAN_LIMITS } from './plans';
import { TOTAL_PATH_LESSONS } from '@/features/learn/curriculum/path';

/**
 * What the pricing page promises. Every line must describe something that is
 * built and, for limits, enforced: numbers come from PLAN_LIMITS so the page
 * can't drift from what the app actually does (tests/unit/lib/pricing.test.ts).
 * Don't list features that don't exist yet, even as "coming soon".
 */

export interface PricingPlan {
  id: 'free' | 'pro' | 'institution';
  name: string;
  price: { monthly: number; annual: number };
  priceNote?: string;
  description: string;
  popular?: boolean;
  features: string[];
  cta: string;
  href: string;
}

const free = PLAN_LIMITS.free;
const pro = PLAN_LIMITS.pro;
const count = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: { monthly: 0, annual: 0 },
    description: 'The whole course, free',
    features: [
      `All ${TOTAL_PATH_LESSONS} lessons, graded challenges and quizzes`,
      'SQLite, PostgreSQL and NoSQL engines in your browser',
      'Progress, streaks and achievements',
      'Sync across devices when signed in',
      `Up to ${plural(free.maxProjects, 'project')} and ${plural(free.maxSavedQueries, 'saved query', 'saved queries')}`,
      `${plural(free.maxCustomModules, 'custom module')} of your own lessons`,
      `Java, C, C++ and Go: ${count(free.dailyServerRuns)} runs a day`,
    ],
    cta: 'Start free',
    href: '/learn',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 12, annual: 8 },
    description: 'For learners who build their own practice',
    popular: true,
    features: [
      'Everything in Free',
      'Unlimited projects',
      'Unlimited saved queries',
      'Unlimited custom modules',
      `Java, C, C++ and Go: ${count(pro.dailyServerRuns)} runs a day`,
      '14-day free trial',
    ],
    cta: 'Start 14-day trial',
    href: '/auth/signup?plan=pro',
  },
  {
    id: 'institution',
    name: 'Institution',
    price: { monthly: 8, annual: 6 },
    priceNote: 'per student / month',
    description: 'For teachers, schools and teams',
    features: [
      'Everything in Pro, for every student',
      'Teacher dashboard with each student’s progress',
      'Lessons completed, quiz scores and streaks per student',
      'One invite code to enrol a whole class',
    ],
    cta: 'Get Institution plan',
    href: '#contact',
  },
];

export const PRICING_FAQS: { q: string; a: string }[] = [
  {
    q: 'Do I need to install anything?',
    a: 'No. DBAcademy runs in your browser: PostgreSQL, SQLite and the NoSQL engine all run locally, with nothing to set up.',
  },
  {
    q: 'What does Pro add?',
    a: `The whole course is free. Pro removes the Free limits (${plural(free.maxProjects, 'project')}, ${free.maxSavedQueries} saved queries, ${plural(free.maxCustomModules, 'custom module')}) and raises server-run code from ${count(free.dailyServerRuns)} to ${count(pro.dailyServerRuns)} runs a day.`,
  },
  {
    q: 'How does the Pro trial work?',
    a: 'Pro starts with a 14-day free trial. Checkout asks for a card; cancel before the trial ends and you won’t be charged.',
  },
  {
    q: 'Can I use this for my class or company?',
    a: 'Yes. With the Institution plan you get a teacher dashboard showing each student’s lessons, quiz scores and streaks, and students join with a single invite code.',
  },
  {
    q: 'How is progress saved?',
    a: 'In your browser as you go, and synced to your account when you’re signed in.',
  },
];
