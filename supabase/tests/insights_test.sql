-- Feedback, crash reports, anonymous usage: anyone can send, only an admin with two-factor can read.
\set ON_ERROR_STOP on
insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001', 'admin@x.mr'), ('bbbbbbbb-0000-0000-0000-000000000002', 'eleve@x.mr');
insert into admins values ('aaaaaaaa-0000-0000-0000-000000000001');

-- Signed-out student sends feedback and a crash report
select as_anon();
set role anon;
insert into feedback (kind, message, context) values ('idea', 'Ajouter la philo', '{"v":"1.0.0"}');
insert into client_errors (message, page) values ('TypeError: x is undefined', '/focus');
select check_true((select count(*) from feedback) = 0, 'anon cannot read feedback back');
select check_true((select count(*) from client_errors) = 0, 'anon cannot read crash reports');
do $$ begin
  insert into feedback (kind, message, done) values ('bug', 'marquer fait', true);
  raise exception 'FAIL: anon inserted a done row';
exception when insufficient_privilege then raise notice 'ok  anon cannot pre-mark feedback as done'; end $$;
do $$ begin
  insert into feedback (kind, message, user_id) values ('bug', 'usurpation', 'bbbbbbbb-0000-0000-0000-000000000002');
  raise exception 'FAIL: anon impersonated a student';
exception when insufficient_privilege then raise notice 'ok  feedback cannot be sent in someone else''s name'; end $$;
do $$ begin
  insert into feedback (kind, message) values ('bug', 'x');
  raise exception 'FAIL: 1-char message accepted';
exception when check_violation then raise notice 'ok  empty messages rejected'; end $$;
select track_day('c0ffee00-0000-0000-0000-000000000001', current_date, 'C', 'ar', array['focus', 'plan']);
select track_day('c0ffee00-0000-0000-0000-000000000001', current_date, 'C', 'ar', array['focus', 'mistakes']);
select track_day('c0ffee00-0000-0000-0000-000000000002', current_date, 'D', 'fr', array['focus']);
select track_day('c0ffee00-0000-0000-0000-000000000003', current_date - 30, 'D', 'fr', array['focus']);
select check_true((select count(*) from usage_days) = 0, 'raw usage rows are not readable');
do $$ begin
  insert into usage_days (device, day) values (gen_random_uuid(), current_date);
  raise exception 'FAIL: anon wrote usage rows directly';
exception when insufficient_privilege then raise notice 'ok  usage only goes through track_day'; end $$;
do $$ begin
  perform usage_daily(30);
  raise exception 'FAIL: anon read usage stats';
exception when insufficient_privilege then raise notice 'ok  signed-out visitors get no usage stats'; end $$;
reset role;
select check_true((select features from usage_days where device = 'c0ffee00-0000-0000-0000-000000000001') @> array['focus', 'plan', 'mistakes']
  and (select cardinality(features) from usage_days where device = 'c0ffee00-0000-0000-0000-000000000001') = 3, 'features of the day are merged without duplicates');
select check_true((select count(*) from usage_days) = 2, 'days with a wrong phone clock are ignored');

-- A student (not admin) sees nothing
select as_user('bbbbbbbb-0000-0000-0000-000000000002', 'aal2');
set role authenticated;
select check_true((select count(*) from feedback) = 0, 'students cannot read feedback');
do $$ begin
  perform usage_breakdown(7);
  raise exception 'FAIL: student read usage stats';
exception when insufficient_privilege then raise notice 'ok  students get no usage stats'; end $$;
-- Admin with password only (aal1) sees nothing
select as_user('aaaaaaaa-0000-0000-0000-000000000001', 'aal1');
select check_true((select count(*) from feedback) = 0, 'admin without two-factor cannot read feedback');
-- Admin with two-factor
select as_user('aaaaaaaa-0000-0000-0000-000000000001', 'aal2');
select check_true((select count(*) from feedback) = 1 and (select count(*) from client_errors) = 1, 'admin with two-factor reads feedback and crashes');
update feedback set done = true;
select check_true((select done from feedback limit 1), 'admin can mark feedback as done');
select check_true((select active from usage_daily(30) where day = current_date) = 2
  and (select new_devices from usage_daily(30) where day = current_date) = 2, 'daily active and new devices counted');
select check_true((select devices from usage_breakdown(7) where kind = 'feature' and name = 'focus') = 2
  and (select devices from usage_breakdown(7) where kind = 'serie' and name = 'C') = 1, 'feature and série breakdown');
delete from client_errors;
select check_true((select count(*) from client_errors) = 0, 'admin can clear crash reports');
reset role;
