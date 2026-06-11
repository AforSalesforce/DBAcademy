# DBAcademy

**The interactive database learning platform for students, schools, and enterprises.**

Master PostgreSQL, SQLite, and NoSQL with guided lessons, quizzes, and a professional SQL playground — all running 100% in your browser.

## Features

- **Multi-Engine Support** — PostgreSQL (PGlite), SQLite (WASM), and NoSQL, all running client-side
- **30+ Interactive Lessons** — Structured curriculum from basics to advanced topics
- **Quiz & Assessment System** — Test knowledge with immediate feedback and explanations
- **Gamified Progress** — XP, levels, streaks, achievements, and completion tracking
- **Professional SQL Editor** — Monaco editor with syntax highlighting and keyboard shortcuts
- **Schema Visualization** — ER diagrams and table inspection tools
- **Institution Admin Panel** — Student tracking, custom curricula, bulk enrollment
- **Pricing Tiers** — Free, Pro ($12/mo), and Institution ($8/student/mo)
- **Auth System** — Sign up/sign in with credential-based authentication
- **Production Security** — Security headers, input validation, OWASP compliance

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand (persisted locally + synced to Supabase for signed-in users)
- **Auth & Data**: Supabase (Auth, Postgres, RLS)
- **DB Engines**: PGlite, sql.js (WASM), custom NoSQL
- **Editor**: Monaco Editor
- **Icons**: Lucide React

## Getting Started

```bash
# Install dependencies (Supabase + Stripe packages are new — not yet in package.json)
npm install
npm install @supabase/supabase-js @supabase/ssr stripe

# Copy environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000).

### Supabase setup (required for accounts & sync)

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. In the SQL Editor, run the migrations in order: `supabase/migrations/001_init.sql`, `002_billing.sql`, `003_institutions.sql`.
3. Fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (Settings > API).
4. For local dev, consider disabling "Confirm email" (Authentication > Providers > Email) so signups get a session immediately.

The app still runs without Supabase configured — auth and sync are disabled and progress stays in localStorage.

### Stripe setup (required for payments)

1. In the [Stripe dashboard](https://dashboard.stripe.com), create two Products (Pro, Institution), each with a monthly and an annual recurring Price.
2. Copy the four Price IDs plus your secret key into `.env.local` (see `.env.example`).
3. Webhook: add an endpoint for `https://yourdomain.com/api/billing/webhook` listening to `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`, and copy its signing secret to `STRIPE_WEBHOOK_SECRET`.
   For local dev: `stripe listen --forward-to localhost:3000/api/billing/webhook`.

The webhook is the single source of truth for `profiles.plan` — users cannot change their own plan (enforced by column-level grants in `002_billing.sql`).

### Institutions (multi-tenant)

- A user on the Institution plan visits `/admin` and creates an organization (`create_institution` RPC) — they become its teacher/owner and get an 8-character invite code.
- Students enter that code in the "Join your class" card on `/dashboard` (`join_institution` RPC).
- The owner's `/admin` dashboard shows real member progress (lessons, quiz averages, streaks, XP) via RLS policies that grant owners read access to member profiles and progress.

### Optional: self-host the SQLite WASM binary

The SQLite engine currently loads `sql-wasm.wasm` from cdnjs. To self-host:

```bash
cp node_modules/sql.js/dist/sql-wasm.wasm public/
```

then change the `locateFile` URL in `src/lib/db/sqlite.ts` back to `/${file}`.

## SaaS Architecture

- **Auth**: Supabase email/password. `src/middleware.ts` refreshes sessions and protects `/dashboard` and `/admin`.
- **Profiles**: a `public.profiles` row (name, role, plan) is auto-created on signup by the `handle_new_user` trigger.
- **Progress sync**: `src/components/ProgressSync.tsx` hydrates the zustand store from `public.user_progress` on load and writes back debounced changes.
- **Plans / billing**: stubbed in `src/lib/plans.ts`; feature gating reads `profiles.plan` (`free`/`pro`/`institution`). A future Stripe webhook only needs to update that column. Free plan limits custom modules to 1.

### Cleanup TODO

The old NextAuth implementation is now unused and can be removed:

```bash
rm -rf src/app/api/auth src/lib/auth.ts
npm uninstall next-auth @auth/core bcryptjs @types/bcryptjs
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page (marketing)
│   ├── learn/page.tsx        # SQL playground & lessons
│   ├── dashboard/page.tsx    # User progress dashboard
│   ├── pricing/page.tsx      # Pricing plans
│   ├── admin/page.tsx        # Institution admin panel
│   ├── auth/                 # Sign in / Sign up
│   └── api/auth/             # NextAuth API routes
├── components/
│   ├── Quiz.tsx              # Quiz/assessment engine
│   ├── SqlEditor.tsx         # Monaco code editor
│   ├── LessonView.tsx        # Lesson renderer with quizzes
│   ├── Sidebar.tsx           # Curriculum navigation
│   ├── ResultsTable.tsx      # Query results display
│   ├── SchemaViewer.tsx      # Database schema inspector
│   ├── ERDiagram.tsx         # Entity-relationship diagrams
│   └── ErrorBoundary.tsx     # Production error handling
└── lib/
    ├── curriculum.ts         # All lesson/quiz content
    ├── progress-store.ts     # Zustand progress & achievements
    ├── auth.ts               # NextAuth configuration
    └── db/                   # Database engine implementations
```

## Deployment

Deploy to Vercel, Netlify, or any Node.js hosting:

```bash
npm run build
npm start
```

Set the following environment variables in production:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## License

Proprietary. All rights reserved.
