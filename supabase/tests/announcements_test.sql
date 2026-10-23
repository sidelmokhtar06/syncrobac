-- Announcements: everyone reads live published messages, only an admin with two-factor writes.
\set ON_ERROR_STOP on
insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'admin@x.mr'), ('bbbbbbbb-0000-0000-0000-000000000002', 'eleve@x.mr');
insert into admins values ('aaaaaaaa-0000-0000-0000-000000000001');
insert into series (id, code, name_fr, name_ar) values ('C', 'M', 'Maths', 'رياضيات') on conflict do nothing;

select as_user('aaaaaaaa-0000-0000-0000-000000000001', 'aal2');
set role authenticated;
insert into announcements (title_fr, body_fr, title_ar) values ('Bienvenue', 'Bonne révision !', 'مرحبا');
insert into announcements (serie_id, title_fr, link) values ('C', 'Sujet maths 2024 en ligne', '/resources/maths');
insert into announcements (title_ar, published) values ('مسودة', false);
insert into announcements (title_fr, starts_at) values ('Plus tard', now() + interval '1 day');
insert into announcements (title_fr, starts_at, expires_at) values ('Terminé', now() - interval '2 days', now() - interval '1 day');
select check_true((select count(*) from announcements) = 5, 'admin with two-factor writes and sees every message');
do $$ begin
  insert into announcements (body_fr) values ('sans titre');
  raise exception 'FAIL: message without a title accepted';
exception when check_violation then raise notice 'ok  a message needs a title in at least one language'; end $$;
do $$ begin
  insert into announcements (title_fr, link) values ('Lien', 'javascript:alert(1)');
  raise exception 'FAIL: javascript link accepted';
exception when check_violation then raise notice 'ok  links are app pages or https only'; end $$;
do $$ begin
  insert into announcements (title_fr, body_fr) values ('Long', repeat('x', 501));
  raise exception 'FAIL: 501-char body accepted';
exception when check_violation then raise notice 'ok  messages are at most 500 characters'; end $$;

select as_anon();
set role anon;
select check_true((select count(*) from announcements) = 2, 'everyone reads published messages within their dates only');
do $$ begin
  insert into announcements (title_fr) values ('Spam');
  raise exception 'FAIL: anon wrote a message';
exception when insufficient_privilege then raise notice 'ok  anon cannot write messages'; end $$;

select as_user('bbbbbbbb-0000-0000-0000-000000000002', 'aal2');
set role authenticated;
update announcements set title_fr = 'Piraté';
delete from announcements;
select as_user('aaaaaaaa-0000-0000-0000-000000000001', 'aal1');
update announcements set title_fr = 'Piraté';
reset role;
select check_true((select count(*) from announcements) = 5 and not exists (select 1 from announcements where title_fr = 'Piraté'), 'students and password-only admins cannot change messages');
select check_true((select count(*) from admin_audit where table_name = 'announcements') = 5, 'messages are recorded in the audit log');
