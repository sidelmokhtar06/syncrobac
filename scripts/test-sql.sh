#!/usr/bin/env bash
# Runs the Supabase SQL files on a throwaway Postgres (Docker) and checks the security rules.
# Usage: pnpm test:sql
set -euo pipefail
cd "$(dirname "$0")/.."
name="syncrobac-sqltest-$$"
docker run -d --rm --name "$name" -e POSTGRES_PASSWORD=test postgres:16-alpine >/dev/null
trap 'docker rm -f "$name" >/dev/null' EXIT
until docker exec "$name" pg_isready -U postgres -q 2>/dev/null; do sleep 0.5; done
sleep 1

for test in supabase/tests/*_test.sql; do
  echo "── $test"
  db="t$(basename "$test" _test.sql)"
  docker exec "$name" createdb -U postgres "$db"
  if ! out=$(cat supabase/tests/_auth_stub.sql supabase/setup.sql supabase/security.sql supabase/accounts.sql supabase/insights.sql supabase/exams.sql supabase/announcements.sql "$test" |
    docker exec -i "$name" psql -U postgres -d "$db" -q -v ON_ERROR_STOP=1 2>&1); then
    echo "$out" | grep -E 'ok  |FAIL|ERROR' | sed 's/^.*NOTICE:  //'
    echo "✗ $test failed"
    exit 1
  fi
  echo "$out" | grep -E 'ok  ' | sed 's/^.*NOTICE:  //'
done
echo "✓ all SQL tests passed"
