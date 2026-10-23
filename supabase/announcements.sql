-- SyncroBac announcements: messages the admin writes, shown in the app (card on Today + inbox).
-- Safe to re-run. Paste into Supabase → SQL Editor → Run, after setup.sql and security.sql.
-- Targeting: a série (or every série) + language. A student sees the version in their app language;
-- a message with only a French version reaches only students using the app in French (same for Arabic).
-- Everyone can READ published messages within their dates; only admins (with two-factor) can WRITE.

create table if not exists announcements (
  id bigint generated always as identity primary key,
  serie_id text references series on delete cascade,                   -- null = every série
  title_fr text check (title_fr is null or length(title_fr) between 2 and 80),
  body_fr text check (body_fr is null or length(body_fr) <= 500),
  title_ar text check (title_ar is null or length(title_ar) between 2 and 80),
  body_ar text check (body_ar is null or length(body_ar) <= 500),
  link text check (link is null or link ~ '^(/[a-z0-9/_-]*|https://[^\s]+)$'), -- a page of the app or a website
  published boolean not null default true,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,                                               -- null = no end
  created_at timestamptz not null default now(),
  check (title_fr is not null or title_ar is not null),                -- at least one language
  check (expires_at is null or expires_at > starts_at)
);

alter table announcements enable row level security;
drop policy if exists "public read live" on announcements;
drop policy if exists "admin write" on announcements;
create policy "public read live" on announcements for select
  using ((published and starts_at <= now() and (expires_at is null or expires_at > now())) or is_admin());
create policy "admin write" on announcements for all using (is_admin()) with check (is_admin());

-- Every change is recorded in admin_audit (when security.sql has been run).
do $$
begin
  if exists (select 1 from pg_proc where proname = 'audit_change') then
    drop trigger if exists audit_announcements on announcements;
    create trigger audit_announcements after insert or update or delete on announcements for each row execute function audit_change();
  end if;
end $$;
