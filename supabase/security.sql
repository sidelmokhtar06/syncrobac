-- SyncroBac security hardening (safe to re-run). Paste into Supabase → SQL Editor → Run.
-- 1. Writes require an admin whose session passed two-factor (TOTP) — aal2.
--    A stolen password alone can no longer change content.
-- 2. Every content change is recorded in admin_audit (who, when, before/after).

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid())
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

create table if not exists admin_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid default auth.uid(),
  email text default (auth.jwt() ->> 'email'),
  table_name text not null,
  action text not null,
  row_old jsonb,
  row_new jsonb
);
alter table admin_audit enable row level security;
drop policy if exists "admins read audit" on admin_audit;
create policy "admins read audit" on admin_audit for select using (is_admin());
-- No insert/update/delete policy: only the trigger below (security definer) can write, nobody can erase.

create or replace function audit_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into admin_audit (table_name, action, row_old, row_new)
  values (tg_table_name, tg_op,
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['series', 'subjects', 'serie_subjects', 'chapters', 'resources', 'app_config', 'admins'] loop
    execute format('drop trigger if exists audit_%1$s on %1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on %1$I for each row execute function audit_change()', t);
  end loop;
end $$;
