#!/usr/bin/env bash
# Isolated recovery test. No production writes; never dump SQL or PII.
set -Eeuo pipefail
umask 077
[[ "$GITHUB_EVENT_NAME" == push && "$GITHUB_REF" == refs/heads/main ]] || exit 2
[[ "$XSTORE019O_TEST_ONLY" == SUPABASE_LOCAL_CLONE_ONLY ]] || exit 2
[[ "$BACKUP_WORK" == "$GITHUB_WORKSPACE"/* && -s "$BACKUP_WORK/restore-check.dump" ]] || exit 2
work="$RUNNER_TEMP/xstore019o-cli-$GITHUB_RUN_ID"
db_container=supabase_db_xstore019o_compatible_proof
log="$RUNNER_TEMP/xstore019o-cli-stderr"
cleanup(){
  cd "$work" 2>/dev/null || true
  supabase stop --no-backup >/dev/null 2>&1 || true
  rm -rf "$work"
  rm -f "$log" "$RUNNER_TEMP/xstore019o-cli-parity"
}
trap cleanup EXIT
mkdir -p "$work"; cd "$work"
supabase init --yes >/dev/null
node <<'NODE'
const fs=require('node:fs'), assert=require('node:assert/strict');
const path='supabase/config.toml';
const before=fs.readFileSync(path,'utf8');
assert.match(before,/project_id\s*=\s*"/);
fs.writeFileSync(path,before.replace(/^project_id\s*=\s*".*"/m,'project_id = "xstore019o_compatible_proof"'),{mode:0o600});
NODE
if ! supabase start --exclude studio,postgres-meta,imgproxy,logflare,vector,edge-runtime,supavisor,mailpit,realtime,storage-api,postgrest,kong,gotrue >/dev/null 2>"$log"; then
 echo '::error::XSTORE_019O_SUPABASE_CLONE_START=FAIL'; exit 1
fi
docker inspect "$db_container" >/dev/null
proof="$(docker exec "$db_container" psql -U postgres -d postgres -AtX -v ON_ERROR_STOP=1 -c "SELECT CASE WHEN to_regclass('auth.users') IS NOT NULL AND to_regclass('storage.objects') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END")"
[[ "$proof" == PASS ]] || { echo '::error::XSTORE_019O_AUTH_STORAGE_MISSING'; exit 1; }
echo 'XSTORE_019O_INITIALIZED_PLATFORM_PREREQUISITES=PASS'
# Docker exec/cp only after disconnecting the disposable database from network.
for net in $(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$db_container"); do
 docker network disconnect -f "$net" "$db_container" >/dev/null
done
[[ "$(docker inspect -f '{{len .NetworkSettings.Networks}}' "$db_container")" == 0 ]] || exit 1
echo 'XSTORE_019O_LOCAL_RESTORE_NETWORK_ISOLATED=PASS'
docker cp "$BACKUP_WORK/restore-check.dump" "$db_container:/tmp/magasin-archive.dump"
restore_stage(){
 local schema="$1" stage="$2" label="$3"
 : > "$log"
 if ! docker exec "$db_container" pg_restore --exit-on-error --schema="$schema" --section="$stage" --username=supabase_admin --dbname=postgres /tmp/magasin-archive.dump >/dev/null 2>"$log"; then
  node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-restore-error-classifier.mjs" "$log"
  echo "::error::XSTORE_019O_INITIALIZED_CLONE_$label=FAIL"; exit 1
 fi
 echo "XSTORE_019O_INITIALIZED_CLONE_$label=PASS"
}
# Original Auth data COPY must respect already-enforced Auth foreign keys.
# All private table identifiers and TOC contents stay in the disposable runner.
docker exec "$db_container" pg_restore --list /tmp/magasin-archive.dump > "$work/archive.toc"
docker exec "$db_container" psql -U postgres -d postgres -AtX -F '|' -v ON_ERROR_STOP=1 -c "SELECT cn.nspname||'.'||child.relname, pn.nspname||'.'||parent.relname FROM pg_constraint con JOIN pg_class child ON child.oid=con.conrelid JOIN pg_namespace cn ON cn.oid=child.relnamespace JOIN pg_class parent ON parent.oid=con.confrelid JOIN pg_namespace pn ON pn.oid=parent.relnamespace WHERE con.contype='f' AND cn.nspname='auth' ORDER BY 1,2" > "$work/auth-fks.tsv"
node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-auth-data-toposort.mjs" "$work/archive.toc" "$work/auth-fks.tsv" "$work/auth-replay.toc"
docker cp "$work/auth-replay.toc" "$db_container:/tmp/auth-replay.toc"
: > "$log"
if ! docker exec "$db_container" pg_restore --exit-on-error --single-transaction --section=data --use-list=/tmp/auth-replay.toc --username=supabase_admin --dbname=postgres /tmp/magasin-archive.dump >/dev/null 2>"$log"; then
 node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-restore-error-classifier.mjs" "$log"
 echo "::error::XSTORE_019O_INITIALIZED_CLONE_AUTH_DATA=FAIL"; exit 1
fi
echo 'XSTORE_019O_INITIALIZED_CLONE_AUTH_DATA=PASS; FK_ENFORCED'
restore_stage storage data STORAGE_DATA
for stage in pre-data data post-data; do restore_stage public "$stage" "PUBLIC_$stage"; done
docker cp "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-owner-acl-recovery-fingerprint.sql" "$db_container:/tmp/parity.sql"
docker exec "$db_container" psql -U postgres -d postgres -AtX -v ON_ERROR_STOP=1 -f /tmp/parity.sql > "$RUNNER_TEMP/xstore019o-cli-parity" 2>"$log" || exit 1
[[ "$(cat "$RUNNER_TEMP/xstore019o-cli-parity")" == PASS ]] || { echo '::error::XSTORE_019O_CLI_CLONE_OWNER_ACL_RLS_PARITY=FAIL'; exit 1; }
echo 'XSTORE_019O_CLI_CLONE_OWNER_ACL_RLS_PARITY=PASS; FULL_DISASTER_RECOVERY=NOT_PROVEN; NO_PRODUCTION_WRITE'
