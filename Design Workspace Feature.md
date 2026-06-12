# Design: Workspace Features

Covers five features: projects, saved queries, query running/history, notes, and a visual schema designer. They share one organizing concept — the **project** — so it is designed first and everything else hangs off it.

Fits the existing stack: Next.js App Router, client-side DB engines (PGlite / sql.js / Mingo), Supabase (auth, Postgres, RLS), zustand. Local-first: everything works signed-out via IndexedDB; signing in adds cloud sync, the same pattern `ProgressSync` already uses.

---

## 1. Projects

A project is a self-contained workspace: one engine, its database state, plus the queries, notes, and schema designs that belong to it. Today the app has exactly one implicit, ephemeral workspace per engine — switching engines or reloading wipes everything.

### Data model

```sql
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  engine      text not null check (engine in ('postgres','sqlite','nosql')),
  -- pointer to the latest database snapshot in Supabase Storage (nullable)
  snapshot_path text,
  snapshot_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.projects enable row level security;
create policy "Users manage own projects" on public.projects
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
```

### Database state persistence (the hard part)

Per engine, snapshot/restore works differently:

| Engine   | Snapshot                                  | Restore                          |
|----------|-------------------------------------------|----------------------------------|
| sqlite   | `db.export()` → `Uint8Array`               | `new SQL.Database(bytes)`        |
| postgres | PGlite `dumpDataDir()` → blob; or use built-in `idb://dbacademy-<projectId>` persistence | `new PGlite('idb://…')` / `loadDataDir` |
| nosql    | `JSON.stringify(store)`                    | `JSON.parse`                     |

Two tiers:

- **Local (always on):** snapshots saved to IndexedDB keyed by project id, debounced after mutating queries (reuse the existing `CREATE|DROP|ALTER|INSERT|UPDATE|DELETE` detection). Survives reloads, free, offline.
- **Cloud (signed-in, manual + periodic):** snapshot uploaded to a private Supabase Storage bucket `project-snapshots/<user_id>/<project_id>.bin` (Storage RLS: path must start with `auth.uid()`). The `projects.snapshot_path/snapshot_at` columns point at it. Cap size (e.g. 20 MB) and show a "snapshot too large" warning rather than failing silently.

Add to the `DatabaseEngine` interface:

```ts
interface DatabaseEngine {
  // existing: type, init, execute, getSchema
  serialize(): Promise<Uint8Array>;
  restore(data: Uint8Array): Promise<void>;
}
```

### State & UI

New zustand store `project-store.ts`: `projects[]`, `activeProjectId`, CRUD actions, local-first with sync (same merge rule as ProgressSync: newest `updated_at` wins).

UI: a project switcher dropdown in the `/learn` header (replaces the bare engine dropdown — the engine becomes a property of the project). "Default Playground" projects are auto-created per engine so existing behavior is unchanged for new users. The curriculum/lesson flow stays bound to the default playgrounds; user projects are for free work.

Plan gating (extends `plans.ts`): free = 2 projects, no cloud snapshots; pro/institution = unlimited + cloud snapshots.

---

## 2. Saved queries

### Data model

```sql
create table public.saved_queries (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title      text not null,
  body       text not null,
  engine     text not null check (engine in ('postgres','sqlite','nosql')),
  favorite   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saved_queries enable row level security;
create policy "Users manage own queries" on public.saved_queries
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
```

`project_id` is nullable: queries can be global ("my snippets") or project-scoped. Local-first mirror in IndexedDB for signed-out users.

### UI

- **Save:** a Save button + `Cmd/Ctrl+S` in the editor toolbar. First save prompts for a title; later saves update in place (title shown as a small breadcrumb above the editor with a dirty-state dot).
- **Library:** a fourth sidebar tab, **Queries**, alongside Learn / Tables / Graph. Sections: Favorites, This project, All. Row actions: load into editor, run immediately, rename, delete, favorite.
- Saving is one `upsert`; no API routes needed (RLS does authorization).

Plan gating: free = 10 saved queries, pro = unlimited.

---

## 3. Running queries (history & re-run)

Execution already exists (`runQuery` in `/learn`). This feature adds *memory* around it.

### Run history — local only, by design

Every execution generates a history entry; writing each one to Supabase would be chatty and low-value. Keep a **ring buffer of the last 200 runs in IndexedDB** per user:

```ts
interface QueryRun {
  id: string;
  projectId: string;
  engine: 'postgres' | 'sqlite' | 'nosql';
  body: string;
  status: 'ok' | 'error';
  errorMessage?: string;
  rowCount: number;
  durationMs: number;
  ranAt: string; // ISO
}
```

Capture in a thin wrapper around `db.execute()` (also the natural place for the existing `incrementQueries()` call — one execution path instead of the current two, `runQuery` and `executeDirect`, with `executeDirect` flagged `source: 'view'` and excluded from history).

### UI

- **History panel:** tab inside the Results area ("Results | History"). Rows show a truncated query, status dot, row count, duration, relative time. Click = load into editor; replay icon = run immediately.
- **Promote:** a "save" icon on a history row converts it to a saved query (the bridge between features 2 and 3).
- Duration comes from `performance.now()` around `execute()` — also enables a small "⏱ 12 ms · 50 rows" caption in Results, a cheap teaching win for index/JOIN lessons.

---

## 4. Special notes

Lesson notes exist (localStorage, keyed `lesson_note_<id>`). This generalizes them into first-class, searchable, attachable notes.

### Data model

```sql
create table public.notes (
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
create policy "Users manage own notes" on public.notes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
```

### UI

- **Notes drawer:** a slide-over panel toggled from the header (and `Cmd/Ctrl+Shift+N`), available on every page. Markdown editing via the same textarea + ReactMarkdown pattern `LessonView` already uses. Autosave debounced 1 s.
- **Anchored notes:** the drawer filters to context — open from a lesson and it shows that lesson's notes; from a saved query, that query's notes. Pinned notes float to the top.
- **Migration:** on first load, existing `lesson_note_*` localStorage entries are imported as lesson-anchored notes, then the old keys are removed.
- Search: client-side substring over title/content/tags is enough at this scale; Postgres FTS later if needed.

---

## 5. Schema designer

A visual editor that designs schemas as data and turns them into real DDL — the inverse of the existing read-only `ERDiagram`.

### Schema-as-JSON model

```ts
interface SchemaDesign {
  id: string;
  name: string;
  engine: 'postgres' | 'sqlite';        // nosql excluded (schemaless)
  tables: DesignTable[];
}
interface DesignTable {
  name: string;
  position: { x: number; y: number };    // canvas layout
  columns: {
    name: string;
    type: string;                        // dialect-neutral: 'int','text','decimal(10,2)','timestamp','bool'
    pk?: boolean; nullable?: boolean; unique?: boolean; default?: string;
  }[];
  foreignKeys: { column: string; refTable: string; refColumn: string }[];
}
```

```sql
create table public.schema_designs (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  name       text not null,
  design     jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- RLS identical to notes/saved_queries
```

### Three operations

1. **Design → DDL.** A pure function `generateDDL(design, dialect)` maps neutral types per dialect (`int` → `INTEGER`/`SERIAL` when pk, `timestamp` → `TIMESTAMP`/`TEXT`, …), emits `CREATE TABLE`s topologically sorted by FK dependencies. Output opens in the SQL editor for review — *the user always sees and runs the SQL*, which is the pedagogical point.
2. **Apply.** "Apply to project" runs the generated DDL against the active project's engine (with a destructive-change confirm if tables already exist).
3. **Introspect (reverse).** "Import from database" builds a `SchemaDesign` from `engine.getSchema()` — already returns columns + FKs — so users can visualize and evolve an existing database.

### UI — two phases

- **Phase A (form-based, ships first):** a "Design" sub-tab next to the existing Graph tab. Left: table list + column grid editor (name, type dropdown, PK/null/unique checkboxes, FK picker). Right: live read-only diagram preview reusing `ERDiagram`/mermaid. This is 80 % of the value with no new dependencies.
- **Phase B (canvas):** drag-and-drop tables with `@xyflow/react` (react-flow), drawing FK edges by dragging between columns. `position` in the JSON model already reserves layout. Pro-plan feature.

---

## Cross-cutting decisions

**Sync architecture.** One pattern for all four synced entities (projects, saved_queries, notes, schema_designs): local-first IndexedDB via a small `lib/local-db.ts` wrapper (or `idb-keyval`), background sync to Supabase when signed in, last-write-wins on `updated_at`. A generic `useSyncedCollection<T>(table)` hook implements load/merge/debounced-push once, instead of four bespoke syncs. `ProgressSync` can later be refactored onto it.

**No new API routes.** All four tables are user-owned with simple RLS — the browser Supabase client handles CRUD directly. Server routes stay reserved for privileged work (billing webhook pattern).

**Plan gating summary** (extends `plans.ts`):

| Feature          | Free            | Pro / Institution |
|------------------|-----------------|-------------------|
| Projects         | 2, local only   | Unlimited + cloud snapshots |
| Saved queries    | 10              | Unlimited         |
| Run history      | 200 (local)     | 200 (local)       |
| Notes            | Unlimited       | Unlimited         |
| Schema designs   | 1, form editor  | Unlimited + canvas editor |

**Migration file:** all DDL above ships as `supabase/migrations/004_workspace.sql`.

**Suggested build order** (each step is independently shippable):

1. `DatabaseEngine.serialize/restore` + IndexedDB local persistence (unlocks everything)
2. Projects store + switcher UI
3. Saved queries (tab + save flow)
4. Run history (execute wrapper + Results tab)
5. Notes drawer + lesson-note migration
6. Schema designer Phase A; Phase B later

Steps 1–4 are roughly a week of focused work; 5 and 6A another week; 6B is its own project.