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
# The image restarts itself while it sets up, and creates its roles at the end.
# Wait until the roles exist, so migrations never run against a half-built one.
ready() {
  [[ "$(docker exec "$NAME" psql -U supabase_admin -d postgres -Atc "select count(*) from pg_roles where rolname in ('anon', 'authenticated', 'service_role')" 2>/dev/null)" == "3" ]]
}
until ready; do sleep 2; done
sleep 2
until ready; do sleep 2; done

psql_in() { docker exec -i "$NAME" psql -v ON_ERROR_STOP=1 -q -U supabase_admin -d postgres; }

# Hosted Supabase projects no longer grant new tables to anyone by default. The
# image does, so undo that here, and the migrations must grant what they need.
echo "alter default privileges for role supabase_admin in schema public revoke all on tables from anon, authenticated, service_role;" | psql_in

for file in supabase/migrations/*.sql; do
  echo "migration: $file"
  psql_in < "$file"
done
for file in supabase/tests/*.sql; do
  echo "test: $file"
  psql_in < "$file"
done
echo "database tests passed"
