#!/usr/bin/env bash
# XSTORE-019O Supabase platform preflight only. NO production data or Secrets.
set -Eeuo pipefail
umask 077
[[ "${GITHUB_EVENT_NAME:-}" == "push" && "${GITHUB_REF:-}" == "refs/heads/main" ]] || {
  echo '::error::XSTORE_019O_TRUSTED_MAIN_ONLY'; exit 2;
}
[[ -n "${RUNNER_TEMP:-}" && -n "${GITHUB_RUN_ID:-}" ]] || exit 2
work="$RUNNER_TEMP/xstore019o-platform-${GITHUB_RUN_ID}"
mkdir -p "$work"
cleanup(){
  cd "$work" 2>/dev/null || true
  supabase stop --no-backup >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT
cd "$work"
supabase init --yes >/dev/null
# This is a disposable stand-alone Supabase project, NOT MAGASIN production.
# Project name and installed system schemas are the only metadata checked.
node <<'NODE'
const fs=require('node:fs'),assert=require('node:assert/strict');
const path='supabase/config.toml';
const original=fs.readFileSync(path,'utf8');
assert.match(original,/project_id\s*=\s*"/);
const patched=original.replace(/^project_id\s*=\s*".*"/m,'project_id = "xstore019o_platform_proof"');
fs.writeFileSync(path,patched,{mode:0o600});
NODE
# Start database and local platform migrations without costly optional services.
# No Auth JWT or production connection is injected into the runner.
supabase start --exclude studio,postgres-meta,imgproxy,logflare,vector,edge-runtime,supavisor,mailpit,realtime,storage-api,postgrest,kong,gotrue >/dev/null
db_container="supabase_db_xstore019o_platform_proof"
docker inspect "$db_container" >/dev/null 2>&1 || {
  echo '::error::XSTORE_019O_LOCAL_PLATFORM_DATABASE_NOT_STARTED'; exit 1;
}
result="$(docker exec "$db_container" psql -U postgres -d postgres -AtX -v ON_ERROR_STOP=1 -c \
  "SELECT CASE WHEN to_regclass('auth.users') IS NOT NULL AND to_regclass('storage.objects') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END")"
if [[ "$result" != PASS ]]; then
  echo '::error::XSTORE_019O_PLATFORM_AUTH_STORAGE_PREREQUISITES=FAIL'; exit 1;
fi
echo 'XSTORE_019O_PLATFORM_AUTH_STORAGE_PREREQUISITES=PASS; NO_PRODUCTION_CONNECTOR; NO_PII'
