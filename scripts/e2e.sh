#!/usr/bin/env bash
# Runs the browser tests against a local Supabase (needs Docker). Starts only
# what Strut uses, builds the app against it, and runs the tests.
set -euo pipefail

supabase_cmd() { if command -v supabase >/dev/null 2>&1; then supabase "$@"; else npx supabase "$@"; fi; }

cleanup() { supabase_cmd stop --no-backup >/dev/null 2>&1 || true; }
trap cleanup EXIT

supabase_cmd start -x studio,storage-api,imgproxy,edge-runtime,logflare,vector,mailpit,postgres-meta,supavisor
eval "$(supabase_cmd status -o env | sed 's/^/export /')"

# The app reads these when it is built.
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${PUBLISHABLE_KEY:-$ANON_KEY}"

pnpm build
npx playwright test
