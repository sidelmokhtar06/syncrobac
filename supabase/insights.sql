-- SyncroBac insights: student feedback, crash reports, anonymous usage stats (safe to re-run).
-- Paste into Supabase → SQL Editor → Run (after setup.sql and security.sql).
-- Anyone can send (students don't need an account); only the admin (with two-factor) can read.

-- ── Feedback ────────────────────────────────────────────────────────────
create table if not exists feedback (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid default auth.uid(),               -- set only when the student is signed in
  kind text not null check (kind in ('idea', 'bug', 'content', 'other')),
  message text not null check (length(message) between 3 and 2000),
  contact text check (length(contact) <= 120),   -- optional, if the student wants an answer
  context jsonb check (pg_column_size(context) < 2048), -- app version, série, language, page
  done boolean not null default false
);
alter table feedback enable row level security;
drop policy if exists "anyone sends" on feedback;
create policy "anyone sends" on feedback for insert to anon, authenticated
  with check (not done and (user_id is null or user_id = auth.uid()));
drop policy if exists "admin reads" on feedback;
create policy "admin reads" on feedback for select using (is_admin());
drop policy if exists "admin updates" on feedback;
create policy "admin updates" on feedback for update using (is_admin()) with check (is_admin());
drop policy if exists "admin deletes" on feedback;
create policy "admin deletes" on feedback for delete using (is_admin());

-- ── Crash reports ───────────────────────────────────────────────────────
create table if not exists client_errors (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  message text not null check (length(message) <= 500),
  stack text check (length(stack) <= 4000),
  page text check (length(page) <= 200),
  app_version text check (length(app_version) <= 40),
  user_agent text check (length(user_agent) <= 300)
);
create index if not exists client_errors_at on client_errors (at desc);
alter table client_errors enable row level security;
drop policy if exists "anyone reports" on client_errors;
create policy "anyone reports" on client_errors for insert to anon, authenticated with check (true);
drop policy if exists "admin reads" on client_errors;
create policy "admin reads" on client_errors for select using (is_admin());
drop policy if exists "admin deletes" on client_errors;
create policy "admin deletes" on client_errors for delete using (is_admin());

-- Flood guard: a buggy or malicious client can't fill the database.
create or replace function insights_flood_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare recent int; cap int := case tg_table_name when 'feedback' then 300 else 1000 end;
begin
  execute format('select count(*) from %I where at > now() - interval ''1 hour''', tg_table_name) into recent;
  if recent >= cap then raise exception 'too many reports, try later' using errcode = 'P0001'; end if;
  return new;
end $$;
drop trigger if exists flood_guard on feedback;
create trigger flood_guard before insert on feedback for each row execute function insights_flood_guard();
drop trigger if exists flood_guard on client_errors;
create trigger flood_guard before insert on client_errors for each row execute function insights_flood_guard();

-- ── Anonymous usage ─────────────────────────────────────────────────────
-- One row per device per day. The device id is random, made on the phone, and linked to nothing
-- (no account, no name, no IP). Enough to count active students and see which features are used.
create table if not exists usage_days (
  device uuid not null,
  day date not null,
  serie text check (length(serie) <= 10),
  lang text check (lang in ('fr', 'ar')),
  features text[] not null default '{}' check (cardinality(features) <= 40),
  primary key (device, day)
);
create index if not exists usage_days_day on usage_days (day);
alter table usage_days enable row level security; -- no policies: only the functions below touch it

create or replace function track_day(p_device uuid, p_day date, p_serie text, p_lang text, p_features text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_day not between current_date - 2 and current_date + 1 then return; end if; -- ignore wrong phone clocks
  insert into usage_days (device, day, serie, lang, features)
  values (p_device, p_day, left(p_serie, 10), case when p_lang in ('fr', 'ar') then p_lang end,
          (select coalesce(array_agg(distinct left(f, 30)), '{}') from unnest(p_features[1:40]) f))
  on conflict (device, day) do update set
    serie = excluded.serie, lang = excluded.lang,
    features = (select coalesce(array_agg(distinct f), '{}') from unnest(usage_days.features || excluded.features) f)
    where cardinality(usage_days.features) < 40;
  if random() < 0.001 then delete from usage_days where day < current_date - 400; end if; -- keep it small
end $$;
revoke all on function track_day(uuid, date, text, text, text[]) from public;
grant execute on function track_day(uuid, date, text, text, text[]) to anon, authenticated;

-- Admin dashboards (aggregates only; raw rows stay private even to the admin UI).
create or replace function usage_daily(p_days int default 30)
returns table (day date, active int, new_devices int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return query
    with firsts as (select device, min(u.day) as first_day from usage_days u group by device)
    select d.day, count(*)::int, (count(*) filter (where f.first_day = d.day))::int
    from usage_days d join firsts f using (device)
    where d.day > current_date - least(p_days, 365)
    group by d.day order by d.day;
end $$;

create or replace function usage_breakdown(p_days int default 7)
returns table (kind text, name text, devices int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return query
    with recent as (select * from usage_days u where u.day > current_date - least(p_days, 365))
    select 'feature'::text, f, count(distinct r.device)::int from recent r, unnest(r.features) f group by f
    union all select 'serie', coalesce(r.serie, '?'), count(distinct r.device)::int from recent r group by r.serie
    union all select 'lang', coalesce(r.lang, '?'), count(distinct r.device)::int from recent r group by r.lang
    union all select 'total', 'devices', count(distinct r.device)::int from recent r
    order by 1, 3 desc;
end $$;
revoke all on function usage_daily(int) from public;
revoke all on function usage_breakdown(int) from public;
grant execute on function usage_daily(int) to authenticated;
grant execute on function usage_breakdown(int) to authenticated;

-- Crash reports older than 90 days are dropped now and then.
create or replace function insights_cleanup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if random() < 0.01 then delete from client_errors where at < now() - interval '90 days'; end if;
  return null;
end $$;
drop trigger if exists cleanup on client_errors;
create trigger cleanup after insert on client_errors for each statement execute function insights_cleanup();
