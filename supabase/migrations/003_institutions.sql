-- DBAcademy — multi-tenant institutions (schools / companies)

-- ============ institutions ============
create table if not exists public.institutions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users (id) on delete cascade,
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 8)),
  created_at  timestamptz not null default now()
);

alter table public.profiles
  add column if not exists institution_id uuid references public.institutions (id) on delete set null;

alter table public.institutions enable row level security;

-- Owners see and manage their institution
create policy "Owners manage own institution"
  on public.institutions for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Members can see the institution they belong to
create policy "Members read own institution"
  on public.institutions for select
  using (
    id = (select institution_id from public.profiles where id = auth.uid())
  );

-- ============ teacher visibility ============
-- Institution owners can read the profiles and progress of their members.
-- Uses a security-definer helper to avoid RLS recursion on profiles.
create or replace function public.owned_institution_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.institutions where owner_id = auth.uid();
$$;

create policy "Owners read member profiles"
  on public.profiles for select
  using (institution_id in (select public.owned_institution_ids()));

create policy "Owners read member progress"
  on public.user_progress for select
  using (
    user_id in (
      select id from public.profiles
      where institution_id in (select public.owned_institution_ids())
    )
  );

-- ============ RPCs ============
-- Create an institution (requires institution plan) and join it as owner.
create or replace function public.create_institution(institution_name text)
returns public.institutions
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_plan text;
  new_institution public.institutions;
begin
  select plan into caller_plan from public.profiles where id = auth.uid();

  if caller_plan is distinct from 'institution' then
    raise exception 'The Institution plan is required to create an organization.';
  end if;

  insert into public.institutions (name, owner_id)
  values (institution_name, auth.uid())
  returning * into new_institution;

  update public.profiles
  set institution_id = new_institution.id, role = 'teacher'
  where id = auth.uid();

  return new_institution;
end;
$$;

-- Join an institution with an invite code.
create or replace function public.join_institution(code text)
returns public.institutions
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.institutions;
begin
  select * into target
  from public.institutions
  where invite_code = upper(trim(code));

  if target.id is null then
    raise exception 'Invalid invite code.';
  end if;

  update public.profiles
  set institution_id = target.id
  where id = auth.uid();

  return target;
end;
$$;
