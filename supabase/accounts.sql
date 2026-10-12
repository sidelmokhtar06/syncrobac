-- SyncroBac student accounts: progress sync (safe to re-run). Paste into Supabase → SQL Editor → Run.
-- One row per synced record (settings, tasks, sessions, days, chapter states, custom chapters,
-- links, mistakes). Each student can only read and write their own rows (RLS).
-- Merge rule: per record, the most recent client edit wins (client_updated_at).

create table if not exists user_records (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  collection text not null check (collection in ('settings', 'tasks', 'sessions', 'days', 'chapters', 'customChapters', 'links', 'mistakes')),
  id text not null check (length(id) between 1 and 120),
  data jsonb check (data is null or pg_column_size(data) < 32768), -- no single record over 32 KB
  deleted boolean not null default false,          -- tombstone, so deletions sync too
  client_updated_at bigint not null,               -- device clock (ms) of the last edit
  updated_at timestamptz not null default now(),   -- server time, for incremental pulls
  primary key (user_id, collection, id)
);
create index if not exists user_records_pull on user_records (user_id, updated_at);

alter table user_records enable row level security;
drop policy if exists "own records" on user_records;
create policy "own records" on user_records for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Batch upsert with last-write-wins. Runs as the caller, so RLS still applies.
create or replace function sync_push(records jsonb) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if jsonb_array_length(records) > 500 then raise exception 'batch too large'; end if;
  insert into user_records as u (user_id, collection, id, data, deleted, client_updated_at)
  select auth.uid(), r->>'collection', r->>'id', r->'data', coalesce((r->>'deleted')::boolean, false), (r->>'client_updated_at')::bigint
  from jsonb_array_elements(records) r
  on conflict (user_id, collection, id) do update
    set data = excluded.data, deleted = excluded.deleted,
        client_updated_at = excluded.client_updated_at, updated_at = now()
    where u.client_updated_at < excluded.client_updated_at;
end $$;
revoke execute on function sync_push(jsonb) from public, anon;
grant execute on function sync_push(jsonb) to authenticated;

-- "Supprimer mon compte": deletes the auth user; their records go with it (on delete cascade).
create or replace function delete_my_account() returns void
language sql security definer set search_path = public, auth as $$
  delete from auth.users where id = auth.uid();
$$;
revoke execute on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;
