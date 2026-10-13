-- Minimal stand-in for the Supabase pieces the SQL files rely on (roles, auth schema, JWT claims),
-- so they can be tested on plain Postgres. Tests pick a user with: select as_user('<uuid>', 'aal2');
do $$ begin create role anon nologin; create role authenticated nologin; exception when duplicate_object then null; end $$; -- roles are per server
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
create schema auth;
grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key, email text);
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt() ->> 'sub')::uuid $$;

-- Test helpers
create function as_user(sub uuid, aal text default 'aal1') returns void language sql as
  $$ select set_config('request.jwt.claims', json_build_object('sub', sub, 'aal', aal)::text, false) $$;
create function as_anon() returns void language sql as $$ select set_config('request.jwt.claims', '', false) $$;
create function check_true(ok boolean, what text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FAIL: %', what; end if;
  raise notice 'ok  %', what;
end $$;
grant execute on all functions in schema public to anon, authenticated;
