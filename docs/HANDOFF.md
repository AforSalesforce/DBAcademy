# DBAcademy — Developer Handoff

This is the onboarding doc for whoever picks up the next phase of work. It
covers what's actually built and running today, not the original aspirational
plan (see [implementation.md](../implementation.md) for that — it's a vision
doc from before the build started, and several of its stack choices were
later changed: NextAuth → Supabase Auth, no Prisma, no Storybook/Jest).

For visual design rules (colors, typography, component patterns), see
[DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). This doc is about code and infra.

## 1. What this app is

A browser-based database + programming learning platform. Three things a
student does here:

1. **`/learn`** — SQL/NoSQL playground: pick an engine (SQLite, PostgreSQL,
   or a NoSQL-ish document store), run queries against a sample dataset,
   work through lessons with embedded quizzes.
2. **`/code`** — code playground: JavaScript and Python run **entirely in
   the browser** (Web Worker / Pyodide); Java, C, C++, Go run **server-side**
   via Judge0.
3. **`/dashboard`, `/admin`, `/pricing`** — progress tracking, gamification
   (XP/streaks/achievements), institution (multi-tenant school/company)
   management, and Stripe billing.

Almost everything runs client-side. There is no traditional backend database
holding application data for anonymous/free users — SQLite and the NoSQL
engine run as WASM/in-memory in the browser tab; PostgreSQL runs via
[PGlite](https://pglite.dev/) (Postgres compiled to WASM), also in the
browser. Supabase is used for **accounts and cross-device sync only** — the
app works perfectly without it configured (see §4).

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16, App Router | `next dev --webpack` / `next build --webpack` — **always pass `--webpack`**. Turbopack (Next's default) conflicts with this repo's webpack config (Monaco/Pyodide worker loading). Already wired into `package.json` scripts; don't run bare `next dev`. |
| Language | TypeScript, strict mode | |
| Styling | Tailwind CSS | Most newer pages use inline `style={{...}}` with hardcoded hex colors instead of Tailwind tokens — this is acknowledged debt, see §9. |
| State (client) | Zustand | One store per domain in `src/stores/`. No Redux, no Context-based state managers. |
| Auth + sync DB | Supabase (Postgres + Auth + RLS) | **Server-side only** — the browser never talks to Supabase; see §6. Optional: `isSupabaseConfigured()` gates every server call site. |
| Client-side SQL engines | `sql.js` (SQLite, WASM), `@electric-sql/pglite` (Postgres, WASM) | |
| Client-side NoSQL engine | hand-rolled in-memory store + [`mingo`](https://github.com/kofrasa/mingo) for MongoDB-style query operators | |
| Code editor | Monaco (`@monaco-editor/react`) | |
| JS sandbox | Web Worker running an `AsyncFunction` with a faked `console` | No npm packages available inside it — it's pure JS only |
| Python sandbox | [Pyodide](https://pyodide.org/) in a Web Worker (`public/workers/pyodide-worker.js`) | |
| Java/C/C++/Go execution | [Judge0](https://judge0.com/) (self-hosted or RapidAPI), called from `src/app/api/code/execute/route.ts` | Was Piston until mid-2026; Piston's public API went whitelist-only |
| Billing | Stripe (Checkout + Billing Portal + webhook) | |
| Diagramming | Mermaid (ER diagrams) | |
| Icons | Lucide React | |
| Testing | Vitest | Brand new as of this refactor — only a handful of pure-function tests exist so far, see §8 |
| Deploy | Vercel | Project `dba-cademy`, linked via `.vercel/project.json` |

## 3. Repo layout

```
src/
├── app/                          Next.js routes (pages + API routes). Keep these thin —
│   ├── page.tsx                  business logic belongs in features/ or stores/, not here.
│   ├── learn/page.tsx             The SQL/NoSQL playground page (composition root for src/features/learn)
│   ├── code/page.tsx               The code playground page (composition root for src/features/code-playground)
│   ├── dashboard/page.tsx
│   ├── admin/page.tsx              Institution (multi-tenant) management — gated by ownership + RLS, not a "role" flag
│   ├── pricing/page.tsx
│   ├── auth/{signin,signup}/       Supabase email/password forms
│   └── api/
│       ├── code/execute/route.ts   Server-side Judge0 proxy (Java/C/C++/Go only)
│       └── billing/{checkout,portal,webhook}/route.ts
│
├── features/                     Vertical slices — UI + domain logic for one part of the product
│   ├── learn/
│   │   ├── components/            Sidebar, LessonView, SqlEditor, SchemaViewer, ERDiagram, SchemaDesigner, NotesDrawer, etc.
│   │   ├── curriculum/curriculum.ts   All SQL/NoSQL lesson + quiz content (one big data file)
│   │   └── hooks/useDatabaseWorkspace.ts   DB engine lifecycle, query exec, seeding, snapshotting — the "brain" behind /learn
│   ├── code-playground/
│   │   ├── components/CodeOutput.tsx
│   │   ├── curriculum/             JS/Python/compiled-language lesson content
│   │   └── engines/                js-engine.ts, python-engine.ts (client-side), server-engine.ts (calls the Judge0 API route)
│   └── billing/
│       ├── plans.ts                Plan limits table (free/pro/institution) + `canCreateX()` gate functions
│       └── stripe.ts                Stripe client + price-ID <-> plan mapping
│
├── db-engines/                   The actual SQL/NoSQL execution engines (no React, no UI)
│   ├── types.ts                   Shared `DatabaseEngine` / `CodeEngine` interfaces — read this first
│   ├── sqlite.ts, postgres.ts, nosql.ts
│
├── stores/                        Zustand stores — one per domain entity
│   ├── project-store.ts            "Projects" = saved playground instances (one DB per project)
│   ├── saved-queries-store.ts, notes-store.ts, run-history-store.ts, code-history-store.ts
│   ├── progress-store.ts           XP/streaks/achievements — persisted via zustand's `persist` middleware (localStorage), NOT synced to Supabase
│   ├── schema-designer.ts          Visual schema designer state + DDL generation
│   └── sync/supabase-sync.ts       Shared helpers (`pullRemote`/`pushUpsert`/`pushDelete`/`mergeById`) — see §5
│
├── lib/
│   ├── supabase/{config,server,admin}.ts   Server-only Supabase access — see §4/§6. There is deliberately no browser client
│   ├── persistence/local-db.ts     IndexedDB wrapper (the local half of the sync story)
│   └── use-profile.ts              `useProfile()` hook — fetches the signed-in user's `profiles` row
│
├── components/                   Only things with NO feature-specific knowledge live here
│   (ErrorBoundary, ModeToggle, SiteFooter, ThemeProvider, ProgressSync)
│
└── middleware.ts                  Refreshes the Supabase session cookie; redirects signed-out users away from /dashboard and /admin

supabase/migrations/              Hand-written SQL migrations, run manually in the Supabase SQL editor (no migration tool wired up)
tests/unit/                       Vitest — currently just plans.ts, schema-designer.ts DDL gen, and the sync merge helper
```

**Why this shape:** until mid-2026 everything lived flat in `src/lib/` and
`src/components/`. It worked at small scale but made it hard to tell what
belonged to which feature. The `features/<name>/{components,hooks,curriculum,engines}`
convention is the pattern to follow for anything new — don't add another flat
file to `src/lib/`.

## 4. Configuration

Copy `.env.example` → `.env.local`. Three independent systems, each optional
except Supabase (needed for accounts):

### `ACCOUNTS_ENABLED` — master switch (off by default)
Accounts, cloud sync, payments, institutions and server-side code execution
(Java/C/C++/Go) all sit behind `ACCOUNTS_ENABLED=true` (`src/lib/features.ts`).
**Unset, the site is a browser-only learning tool**, which is how production
runs today:
- Server: `getSupabaseConfig()` returns null (so auth, sync, profile and the
  code runner all act unconfigured), `createAdminClient()` throws, billing
  routes 404, and middleware redirects `/auth/*`, `/pricing`, `/admin` home.
- UI: `<FeaturesProvider>` (root layout) exposes `useFeatures().accounts`;
  sign-in/pricing links, the billing button, server-language tabs and
  plan-limit "Upgrade" prompts are hidden, and plan limits aren't enforced.
- The server is the enforcement point; the UI only mirrors it. When adding an
  account or payment feature, gate it on the server first.
- Static pages read the flag at build time, so changing it on Vercel needs a
  redeploy (which env changes need anyway).

### Supabase (accounts, sync, billing-plan storage)
- Get `SUPABASE_URL` / `SUPABASE_ANON_KEY` from Settings → API Keys in the
  Supabase dashboard. They have **no `NEXT_PUBLIC_` prefix on purpose**: all
  Supabase access is server-side, so these must never be inlined into the
  browser bundle. Don't add the prefix back.
- Apply migrations with the Supabase CLI: `supabase link --project-ref <ref>`
  once, then `supabase db push`. (Needs a network that allows outbound
  Postgres to `*.pooler.supabase.com` — some corporate VPNs block it.)
- `SUPABASE_SERVICE_ROLE_KEY` is server-only, used by `src/lib/supabase/admin.ts`
  to bypass RLS (Stripe webhook, checkout). **Never** import `admin.ts` from
  a client component.
- The whole app degrades gracefully without these set: `isSupabaseConfigured()`
  is checked on the server before every Supabase call, the API routes answer
  401/503, and the client falls back to localStorage/IndexedDB-only. Useful for local dev without setting up a project.

### Stripe (billing)
- Create two Products (Pro, Institution) each with monthly + annual Prices.
- Fill the four `STRIPE_PRICE_*` env vars and `STRIPE_SECRET_KEY`.
- The webhook (`STRIPE_WEBHOOK_SECRET`) is the **only** writer of
  `profiles.plan` — there's a DB-level grant in `002_billing.sql` that
  prevents users from updating their own plan column directly. For local
  testing: `stripe listen --forward-to localhost:3000/api/billing/webhook`.

### Judge0 (server-side code execution: Java, C, C++, Go)
- `JUDGE0_API_URL` — defaults to the public RapidAPI CE host if unset.
- `JUDGE0_API_KEY` — your RapidAPI key (omit entirely if self-hosting Judge0).
- `ALLOW_ANONYMOUS_CODE_EXEC=true` lets you run it locally without Supabase.
  It is ignored when `NODE_ENV=production`; there, the route fails closed
  (503) if auth isn't configured.
- Quota (20 runs/min, 100/day free, 1000/day paid) is enforced in Postgres by
  the `consume_code_execution()` RPC from migration 005, so it holds across
  serverless instances.
- JavaScript and Python **never** hit this route — they run client-side.

## 5. The "local-first, sync if signed in" pattern

Most user data (notes, saved queries, projects, run history, schema designs)
follows the same shape, implemented once in `src/stores/sync/supabase-sync.ts`:

1. Every mutation writes to **IndexedDB first** (`src/lib/persistence/local-db.ts`),
   then updates Zustand state — so the UI never waits on a network round-trip.
2. The same mutation is pushed **best-effort** to `/api/sync/<table>`
   (`pushUpsert`/`pushDelete` — failures are swallowed; the local copy is
   always authoritative). That route only accepts an allowlist of tables,
   forces `owner_id` to the signed-in user, and runs under their RLS session.
3. On hydrate, local + remote are merged by `mergeById()` — last-write-wins
   on `updatedAt`, local wins ties.

If you add a new synced entity, don't hand-roll this — import
`mergeById`/`pullRemote`/`pushUpsert`/`pushDelete` from `supabase-sync.ts`
and follow the shape in `src/stores/saved-queries-store.ts` (the simplest
example).

**Exception:** `progress-store.ts` (XP, streaks, achievements) uses zustand's
`persist` middleware straight to localStorage and is *not* part of this sync
system yet — `ProgressSync.tsx` does a separate, simpler hydrate/save through
`/api/progress` (backed by `public.user_progress`). If progress sync needs to become bidirectional,
that's next-phase work.

## 6. Auth & authorization model

- **The browser never talks to Supabase.** Every Supabase call runs on the
  server with the user's session cookie (so RLS applies as that user):
  auth via server actions in `src/features/auth/actions.ts`, institution
  operations in `src/features/institutions/actions.ts`, and data via
  `/api/me`, `/api/progress`, `/api/sync/[table]`. There is no browser
  Supabase client — don't add one; add a route or server action instead.
  `server-only` imports in `lib/supabase/{server,admin}.ts` make the build
  fail if client code imports them.
- **Session cookies are `httpOnly`** (`hardenCookie()` in
  `lib/supabase/config.ts`): no browser code reads them, so injected script
  can't steal a session.
- **Sign in/up/out**: Supabase email/password via those server actions.
  Sign-up confirmation emails link to `/auth/callback`, which exchanges the
  PKCE code for a session. There is no NextAuth, no custom JWT.
- **Session refresh**: `src/middleware.ts` runs on every request to
  `/dashboard/*`, `/admin/*`, `/auth/*`; it refreshes the Supabase session
  cookie and redirects signed-out users away from protected routes.
- **`profiles.role`** (`student`/`teacher`/`admin`) exists in the schema but
  is **not currently used for authorization anywhere** — it's informational.
  Don't assume changing it grants any access.
- **`/admin` access** is *not* a role check. It's an **ownership** check:
  the page queries `institutions` filtered by `owner_id = auth.uid()`, and
  the `create_institution` Postgres RPC independently re-verifies
  `profiles.plan = 'institution'` server-side (`security definer`). RLS
  policies ("Owners manage own institution", "Owners read member profiles")
  are the actual security boundary — the page-level UI gate is just UX.
  If you need real role-based admin (e.g. a true platform-staff panel),
  that doesn't exist yet and would need to be built from scratch.

## 7. Database engines — the `DatabaseEngine` / `CodeEngine` contracts

Everything pluggable (SQLite, Postgres, NoSQL / JS, Python, compiled
languages) implements one of two interfaces in `src/db-engines/types.ts`:

```ts
interface DatabaseEngine {
  type: EngineType;
  init(): Promise<void>;
  execute(query: string): Promise<QueryResult>;
  getSchema(): Promise<TableDefinition[]>;
  serialize(): Promise<Uint8Array>;   // for IndexedDB snapshots
  restore(data: Uint8Array): Promise<void>;
}

interface CodeEngine {
  type: EngineType;
  init(): Promise<void>;
  execute(code: string, stdin?: string): Promise<CodeResult>;
}
```

If you add a new database or language, implement one of these and wire it
into `useDatabaseWorkspace.ts` (DB engines) or `src/app/code/page.tsx`'s
`LANGUAGES` array (code engines) — don't special-case a new engine type
through the rest of the codebase.

## 7a. Lessons, sample data and grading

**Sample data** for SQLite and PostgreSQL lives in one place,
`src/db-engines/seed/mystery.ts` (the "SQL City" murder mystery, plus a
`users` table for Postgres). It is versioned by `SEED_VERSION`: saved
databases created before a bump get missing tables created and *empty*
tables filled on next open; tables that hold rows are never touched. Bump the
version whenever you change seed rows. NoSQL seed data is in
`src/db-engines/nosql.ts`.

**Lessons** are prose in `src/features/learn/curriculum/curriculum.ts`;
each built-in lesson's graded task is in `curriculum/challenges.ts`
(`prompt`, `starter`, `solution`, `hints`, and optional `check`,
`orderMatters`, `allowColumnSubset` — see the comments there). Passing the
challenge is what completes a lesson; XP drops by 5 per hint (min 10) and to
5 once the solution is revealed.

**Grading** (`src/features/learn/grading/`) never touches the learner's own
database: `sandbox.ts` runs both the attempt and the reference solution on
clean sample data (a fresh SQLite copy, a fresh NoSQL store, or one shared
in-memory PGlite inside a transaction that is always rolled back), and
`compare.ts` compares the results — ignoring column names/order and, unless
`orderMatters`, row order. `explain-error.ts` turns engine errors into
beginner hints ("did you mean…").

**The learning path** is `CURRICULUM` order (SQLite → PostgreSQL → NoSQL),
exposed by `curriculum/path.ts`: `nextIncompleteStep`, `stepAfter` (used by
"Next lesson", crossing engines), `moduleProgress`. `/learn?lesson=<id>`
opens a lesson directly (the dashboard's Continue uses it). Module numbers
come from path order, so titles carry no "Module N:" prefix.

**Streak and progress:** the streak advances only when a lesson is completed
or a quiz is passed (`recordLearningDay` in `progress-store.ts`), on the
learner's local calendar day; read it through `currentStreak()`, which
returns 0 once a day has been missed. Path progress counts built-in lessons
only (`completedPathLessons`), not code-playground or custom lessons.

**Adding or editing a lesson:** `tests/unit/curriculum/lessons.test.ts`
fails unless the solution passes, the starter doesn't, and there are at
least two hints. Add likely alternative answers to its `ACCEPTED` list and
likely mistakes to `REJECTED`, so the grader's leniency is pinned down.

## 8. Testing

Vitest, configured in `vitest.config.ts`, `npm test` runs it. **This is new**
— there was no test infrastructure before mid-2026. Coverage today is
deliberately narrow: pure functions only (`src/features/billing/plans.ts`,
DDL generation in `src/stores/schema-designer.ts`, the sync merge helper).

Route tests (`tests/unit/api/`) cover the Judge0 proxy and the Stripe
webhook. `tests/unit/db/migrations.test.ts` applies every migration to PGlite
with a stubbed Supabase `auth` schema and asserts the security-relevant SQL
behavior; add a case there whenever a migration changes RLS, grants, or a
`security definer` function. No component tests, no E2E yet.

Good next additions, roughly in priority order:
1. RLS policy tests for every table in `migrations.test.ts` (cross-user reads/writes must fail).
2. `src/db-engines/nosql.ts`'s query proxy (the `mingo`-backed `db.x.find()`
   eval layer) — it's hand-rolled and has no coverage at all.
3. A Playwright smoke test: signup → run a query → test-mode checkout → plan upgraded.

## 9. Known tech debt (read before your first PR)

- **Inline styles, not Tailwind tokens.** The biggest pages (`learn/page.tsx`,
  `code/page.tsx`, `dashboard/page.tsx`) hardcode hex colors in `style={{}}`
  instead of using Tailwind classes from the design system. Don't copy this
  pattern in new code — use Tailwind + the tokens in `DESIGN_SYSTEM.md`.
- **No tests for the NoSQL eval layer.** See §8. (The Judge0 route, the Stripe
  webhook, and the SQL migrations are now covered — see `tests/unit/api/` and
  `tests/unit/db/migrations.test.ts`, which runs every migration against
  PGlite with a stubbed `auth` schema.)
- **`profiles.role` is vestigial.** It's stored and surfaced but never
  checked. If a future feature needs real RBAC, build it deliberately —
  don't assume the column already gates anything.
- **README.md project structure section may drift** as the codebase
  evolves — this document and the actual `src/` tree are the source of
  truth; if they disagree, trust the tree.

## 10. Build, run, deploy

```bash
npm install
cp .env.example .env.local        # fill in what you need, see §4
npm run dev                        # http://localhost:3000 — always uses --webpack, see §2
npm run build && npm start         # production build, locally
npm test                           # vitest run
npm run lint
```

**Deploy**: Vercel, project `dba-cademy` (already linked via `.vercel/project.json`).
Pushing to `main` on GitHub is the expected trigger; to deploy manually:

```bash
vercel --prod
```

Live URL: https://dba-cademy.vercel.app. Set the same env vars from §4 in
the Vercel project's dashboard (Settings → Environment Variables) — they
are **not** read from `.env.local` in production.
