-- Past exam papers: everyone reads published ones, only an admin with two-factor writes.
\set ON_ERROR_STOP on
insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'admin@x.mr'), ('bbbbbbbb-0000-0000-0000-000000000002', 'eleve@x.mr');
insert into admins values ('aaaaaaaa-0000-0000-0000-000000000001');
insert into series (id, code, name_fr, name_ar) values ('C', 'M', 'Maths', 'رياضيات') on conflict do nothing;
insert into subjects (id, name_fr, name_ar) values ('maths', 'Mathématiques', 'الرياضيات') on conflict do nothing;

-- Admin with two-factor adds papers
select as_user('aaaaaaaa-0000-0000-0000-000000000001', 'aal2');
set role authenticated;
insert into exam_papers (serie_id, subject_id, year, kind, file_path) values ('C', 'maths', 2024, 'subject', 'c/maths/2024-normale-subject-ab12.pdf');
insert into exam_papers (serie_id, subject_id, year, kind, url) values ('C', 'maths', 2024, 'solution', 'https://example.org/corrige.pdf');
insert into exam_papers (subject_id, year, session, file_path, published) values ('maths', 2023, 'complementaire', 'all/maths/2023-x.pdf', false);
select check_true((select count(*) from exam_papers) = 3, 'admin with two-factor adds papers and sees unpublished ones');
do $$ begin
  insert into exam_papers (subject_id, year, url) values ('maths', 2022, 'http://insecure.org/x.pdf');
  raise exception 'FAIL: http link accepted';
exception when check_violation then raise notice 'ok  only https links accepted'; end $$;
do $$ begin
  insert into exam_papers (subject_id, year, url, file_path) values ('maths', 2022, 'https://a.org/x.pdf', 'a/x.pdf');
  raise exception 'FAIL: two sources accepted';
exception when check_violation then raise notice 'ok  a paper has exactly one source'; end $$;
do $$ begin
  insert into exam_papers (subject_id, year, file_path) values ('maths', 2022, '../etc/passwd');
  raise exception 'FAIL: odd file path accepted';
exception when check_violation then raise notice 'ok  file paths are plain lowercase PDF paths'; end $$;
do $$ begin
  insert into exam_papers (subject_id, year, url) values ('maths', 1850, 'https://a.org/x.pdf');
  raise exception 'FAIL: impossible year accepted';
exception when check_violation then raise notice 'ok  impossible years rejected'; end $$;

-- Signed-out students read published papers only, and cannot write
select as_anon();
set role anon;
select check_true((select count(*) from exam_papers) = 2, 'everyone reads published papers only');
do $$ begin
  insert into exam_papers (subject_id, year, url) values ('maths', 2020, 'https://evil.org/x.pdf');
  raise exception 'FAIL: anon added a paper';
exception when insufficient_privilege then raise notice 'ok  anon cannot add papers'; end $$;

-- A student, and an admin without two-factor, cannot change anything
select as_user('bbbbbbbb-0000-0000-0000-000000000002', 'aal2');
set role authenticated;
update exam_papers set url = 'https://evil.org/x.pdf' where kind = 'solution';
delete from exam_papers;
select as_user('aaaaaaaa-0000-0000-0000-000000000001', 'aal1');
update exam_papers set year = 1999;
delete from exam_papers;
reset role;
select check_true((select count(*) from exam_papers) = 3 and (select url from exam_papers where kind = 'solution') = 'https://example.org/corrige.pdf'
  and not exists (select 1 from exam_papers where year = 1999), 'students and password-only admins cannot change papers');
select check_true((select count(*) from admin_audit where table_name = 'exam_papers') = 3, 'paper changes are recorded in the audit log');
