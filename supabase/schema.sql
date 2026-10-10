-- SyncroBac content schema (safe to re-run). Usually you run supabase/setup.sql, which includes this + the seed.
-- Everyone can READ published content; only users listed in `admins` can WRITE.
-- Edit content in Supabase → Table Editor (spreadsheet-like). See docs/ADMIN.md.

create table if not exists admins (
  user_id uuid primary key references auth.users on delete cascade
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create table if not exists series (
  id text primary key,                 -- 'C', 'D', 'TM', …
  code text not null,                  -- official short code ('M', 'SN', …)
  name_fr text not null,
  name_ar text not null,
  position int not null default 0,
  active boolean not null default true
);

create table if not exists subjects (
  id text primary key,                 -- 'maths', 'physics', …
  name_fr text not null,
  name_ar text not null
);

-- Which subjects a série has, with its coefficient. Change coefficients here.
create table if not exists serie_subjects (
  serie_id text references series on delete cascade,
  subject_id text references subjects on delete cascade,
  coeff numeric not null check (coeff > 0),
  position int not null default 0,
  source text not null default 'generic' check (source in ('official', 'draft', 'generic')),
  name_fr text,                        -- optional per-série name (e.g. 'Sciences islamiques' in LO)
  name_ar text,
  primary key (serie_id, subject_id)
);

create table if not exists chapters (
  serie_id text not null,
  subject_id text not null,
  chapter_key text not null,           -- stable id; students' progress is keyed on it — don't rename
  title_fr text not null,
  title_ar text not null,
  weeks int,                           -- official recommended duration (optional)
  position int not null default 0,
  primary key (serie_id, subject_id, chapter_key),
  foreign key (serie_id, subject_id) references serie_subjects on delete cascade
);

create table if not exists resources (
  id bigint generated always as identity primary key,
  title text not null,
  url text not null check (url like 'https://%'),
  category text not null default 'site' check (category in ('group', 'site', 'video', 'app')),
  description_fr text,
  description_ar text,
  serie_id text references series on delete set null,   -- null = every série
  subject_id text references subjects on delete set null,
  position int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Key/values: bac_date ('"2027-07-05T08:00:00Z"'), content_version (bump to push updates).
create table if not exists app_config (
  key text primary key,
  value jsonb not null
);

alter table admins enable row level security;
alter table series enable row level security;
alter table subjects enable row level security;
alter table serie_subjects enable row level security;
alter table chapters enable row level security;
alter table resources enable row level security;
alter table app_config enable row level security;

drop policy if exists "admins read self" on admins;
create policy "admins read self" on admins for select using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['series', 'subjects', 'serie_subjects', 'chapters', 'app_config'] loop
    execute format('drop policy if exists "public read" on %I', t);
    execute format('drop policy if exists "admin write" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('create policy "admin write" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

drop policy if exists "public read published" on resources;
drop policy if exists "admin write" on resources;
create policy "public read published" on resources for select using (published or is_admin());
create policy "admin write" on resources for all using (is_admin()) with check (is_admin());
