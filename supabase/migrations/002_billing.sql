-- DBAcademy — Stripe billing support

alter table public.profiles
  add column if not exists stripe_customer_id text unique;

-- Users must not be able to change their own plan/role/stripe_customer_id —
-- those are managed by the Stripe webhook via the service-role key (which
-- bypasses RLS and column grants). Use column-level grants: authenticated
-- users may only update harmless columns.
revoke update on table public.profiles from authenticated;
grant update (name, institution) on table public.profiles to authenticated;
