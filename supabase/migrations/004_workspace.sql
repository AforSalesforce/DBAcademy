-- Migration 004: Workspace features
-- Projects, saved queries, notes, schema designs.
-- Run history is local-only (IndexedDB) — no table needed.

-- ── Projects ──────────────────────────────────────────────────────────────────

create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  description   text,
  engine        text not null check (engine in ('postgres', 'sqlite', 'nosql')),
  -- pointer to the latest database snapshot in Supabase Storage (nullable)
  snapshot_path text,
  snapshot_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users manage own projects"
  on public.projects
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ── Saved queries ─────────────────────────────────────────────────────────────

create table if not exists public.saved_queries (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title      text not null,
  body       text not null,
  engine     text not null check (engine in ('postgres', 'sqlite', 'nosql')),
  favorite   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saved_queries enable row level security;

create policy "Users manage own queries"
  on public.saved_queries
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ── Notes ─────────────────────────────────────────────────────────────────────

create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  -- at most one anchor; all null = global note
  project_id uuid references public.projects(id) on delete cascade,
  lesson_id  text,
  query_id   uuid references public.saved_queries(id) on delete set null,
  title      text not null default '',
  content_md text not null default '',
  pinned     boolean not null default false,
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "Users manage own notes"
  on public.notes
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ── Schema designs ────────────────────────────────────────────────────────────

create table if not exists public.schema_designs (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  name       text not null,
  design     jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.schema_designs enable row level security;

create policy "Users manage own schema designs"
  on public.schema_designs
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ── Storage bucket for project snapshots (manual step) ───────────────────────
-- Run this separately in the Supabase dashboard or via the CLI:
--
--   supabase storage create project-snapshots --public=false
--
-- Then add an RLS policy on the bucket so each user can only access
-- their own path (storage.foldername(name)[1] = auth.uid()::text).
