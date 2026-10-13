-- Student sync: last-write-wins, isolation between students, deletion cascade.
\set ON_ERROR_STOP on
insert into auth.users values ('11111111-1111-1111-1111-111111111111', 'a@x.mr'), ('22222222-2222-2222-2222-222222222222', 'b@x.mr');

select as_user('11111111-1111-1111-1111-111111111111');
set role authenticated;
select sync_push('[{"collection":"tasks","id":"t1","data":{"text":"v2"},"client_updated_at":200}]');
select sync_push('[{"collection":"tasks","id":"t1","data":{"text":"old"},"client_updated_at":100}]');
select check_true((select data->>'text' from user_records where id = 't1') = 'v2', 'older edit does not overwrite a newer one');
select sync_push('[{"collection":"tasks","id":"t1","data":null,"deleted":true,"client_updated_at":300}]');
select check_true((select deleted from user_records where id = 't1'), 'deletion is stored as a tombstone');
do $$ begin
  perform sync_push('[{"collection":"passwords","id":"x","data":{},"client_updated_at":1}]');
  raise exception 'FAIL: unknown collection accepted';
exception when check_violation then raise notice 'ok  unknown collection rejected'; end $$;
do $$ begin
  insert into user_records (user_id, collection, id, data, client_updated_at) values ('22222222-2222-2222-2222-222222222222', 'tasks', 'evil', '{}', 1);
  raise exception 'FAIL: wrote a row for another student';
exception when insufficient_privilege then raise notice 'ok  cannot write rows for another student'; end $$;

select as_user('22222222-2222-2222-2222-222222222222');
select check_true((select count(*) from user_records) = 0, 'a student cannot read another student''s rows');

reset role;
select as_anon();
set role anon;
do $$ begin
  perform sync_push('[]');
  raise exception 'FAIL: anon can push';
exception when insufficient_privilege then raise notice 'ok  signed-out visitors cannot push'; end $$;
reset role;

select as_user('11111111-1111-1111-1111-111111111111');
set role authenticated;
select delete_my_account();
reset role;
select check_true((select count(*) from user_records where user_id = '11111111-1111-1111-1111-111111111111') = 0, 'deleting the account erases its data');
