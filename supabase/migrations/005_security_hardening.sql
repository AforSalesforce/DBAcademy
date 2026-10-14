-- Migration 005: Phase 0 security hardening
--
-- 1. handle_new_user no longer trusts client-supplied metadata for `plan` or
--    `role`. Previously `supabase.auth.signUp({ options: { data: { plan:
--    'institution' } } })` (or just visiting /auth/signup?plan=institution)
--    granted a paid plan for free. Plan is now always 'free' at signup; the
--    Stripe webhook is the only thing that can raise it.
-- 2. Server-side, cross-instance rate limiting + daily quota for Judge0 code
--    execution (replaces the per-instance in-memory Map in the API route).

-- ============ 1. signup trigger ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    -- 'teacher' is a self-declared, informational label (it grants nothing).
    -- 'admin' can never be self-assigned.
    case when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher' else 'student' end,
    'free'
  );
  return new;
end;
$$;

-- AUDIT (run manually, review before acting): accounts on a paid plan that
-- never went through Stripe checkout were almost certainly self-granted via
-- the bug above.
--
--   select id, email, plan, role, created_at
--   from public.profiles
--   where (plan <> 'free' and stripe_customer_id is null)
--      or role = 'admin';
--
-- To revoke after review:
--   update public.profiles set plan = 'free'
--   where plan <> 'free' and stripe_customer_id is null;
--   update public.profiles set role = 'student' where role = 'admin';

-- ============ 2. code execution quota ============
create table if not exists public.code_executions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists code_executions_user_created_idx
  on public.code_executions (user_id, created_at desc);

-- RLS on with no policies: clients can't read or write this table directly.
-- Only the security-definer function below touches it.
alter table public.code_executions enable row level security;
revoke all on table public.code_executions from anon, authenticated;

-- Atomically checks the caller's limits and, if allowed, records one execution.
-- Returns 'ok', 'minute_limit', 'daily_limit', or 'unauthenticated'.
create or replace function public.consume_code_execution()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid          uuid := auth.uid();
  caller_plan  text;
  per_minute   int := 20;
  per_day      int;
  minute_count int;
  day_count    int;
begin
  if uid is null then
    return 'unauthenticated';
  end if;

  -- Serialize concurrent calls for the same user so the count-then-insert
  -- below can't be raced past the limit.
  perform pg_advisory_xact_lock(hashtext('code_exec:' || uid::text));

  select plan into caller_plan from public.profiles where id = uid;
  per_day := case when caller_plan in ('pro', 'institution') then 1000 else 100 end;

  -- Keep the table small: nothing older than the daily window is ever needed.
  delete from public.code_executions
  where user_id = uid and created_at < now() - interval '1 day';

  select
    count(*) filter (where created_at > now() - interval '1 minute'),
    count(*)
  into minute_count, day_count
  from public.code_executions
  where user_id = uid;

  if minute_count >= per_minute then
    return 'minute_limit';
  end if;
  if day_count >= per_day then
    return 'daily_limit';
  end if;

  insert into public.code_executions (user_id) values (uid);
  return 'ok';
end;
$$;

revoke all on function public.consume_code_execution() from public, anon;
grant execute on function public.consume_code_execution() to authenticated;
