-- SyncroBac past exam papers (annales). Safe to re-run. Paste into Supabase → SQL Editor → Run,
-- after setup.sql and security.sql. One row per document: a subject (sujet) or its solution (corrigé).
-- The PDF is either uploaded to the `exam-papers` storage bucket (file_path) or an external https link (url).
-- Everyone can READ published papers; only admins (with two-factor, see security.sql) can WRITE.

create table if not exists exam_papers (
  id bigint generated always as identity primary key,
  serie_id text references series on delete cascade,              -- null = every série
  subject_id text not null references subjects on delete cascade,
  year int not null check (year between 1990 and 2100),
  session text not null default 'normale' check (session in ('normale', 'complementaire')),
  kind text not null default 'subject' check (kind in ('subject', 'solution')),
  title text check (title is null or length(title) <= 120),       -- optional, e.g. 'Exercice 3 corrigé en vidéo'
  file_path text check (file_path is null or file_path ~ '^[a-z0-9/_.-]+\.pdf$'),
  url text check (url is null or url like 'https://%'),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  check ((file_path is null) <> (url is null))                   -- exactly one source
);
create index if not exists exam_papers_subject on exam_papers (subject_id, year desc);

alter table exam_papers enable row level security;
drop policy if exists "public read published" on exam_papers;
drop policy if exists "admin write" on exam_papers;
create policy "public read published" on exam_papers for select using (published or is_admin());
create policy "admin write" on exam_papers for all using (is_admin()) with check (is_admin());

-- Every change is recorded in admin_audit (when security.sql has been run).
do $$
begin
  if exists (select 1 from pg_proc where proname = 'audit_change') then
    drop trigger if exists audit_exam_papers on exam_papers;
    create trigger audit_exam_papers after insert or update or delete on exam_papers for each row execute function audit_change();
  end if;
end $$;

-- PDF storage: public bucket (students download without an account), PDF only, 20 MB max.
-- Only admins can upload, replace or delete files. (Skipped where Supabase Storage isn't installed, e.g. tests.)
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('exam-papers', 'exam-papers', true, 20971520, array['application/pdf'])
    on conflict (id) do update set public = true, file_size_limit = 20971520, allowed_mime_types = array['application/pdf'];

    drop policy if exists "exam papers admin insert" on storage.objects;
    drop policy if exists "exam papers admin update" on storage.objects;
    drop policy if exists "exam papers admin delete" on storage.objects;
    create policy "exam papers admin insert" on storage.objects for insert to authenticated
      with check (bucket_id = 'exam-papers' and public.is_admin());
    create policy "exam papers admin update" on storage.objects for update to authenticated
      using (bucket_id = 'exam-papers' and public.is_admin()) with check (bucket_id = 'exam-papers' and public.is_admin());
    create policy "exam papers admin delete" on storage.objects for delete to authenticated
      using (bucket_id = 'exam-papers' and public.is_admin());
  end if;
end $$;
