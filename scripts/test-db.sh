#!/usr/bin/env bash
# Tests the database's access rules: starts Supabase's Postgres image, applies
# every migration in supabase/migrations, then runs each file in supabase/tests.
# Needs Docker. Uses one container, so it is quick and works in CI.
set -euo pipefail

IMAGE="${SUPABASE_DB_IMAGE:-public.ecr.aws/supabase/postgres:17.11.0.018}"
NAME="strut-db-test-$$"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null
# The image restarts once while it sets itself up, so wait for it to settle.
until docker exec "$NAME" psql -U supabase_admin -d postgres -Atc "select 1" >/dev/null 2>&1; do sleep 2; done
sleep 4
until docker exec "$NAME" psql -U supabase_admin -d postgres -Atc "select 1" >/dev/null 2>&1; do sleep 2; done

psql_in() { docker exec -i "$NAME" psql -v ON_ERROR_STOP=1 -q -U supabase_admin -d postgres; }

for file in supabase/migrations/*.sql; do
  echo "migration: $file"
  psql_in < "$file"
done
for file in supabase/tests/*.sql; do
  echo "test: $file"
  psql_in < "$file"
done
echo "database tests passed"
