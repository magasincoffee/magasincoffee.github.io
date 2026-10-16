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
  rm -f "$log" "$RUNNER_TEMP/xstore019o-cli-parity" "$RUNNER_TEMP/xstore019o-cli-parity-diag" "$RUNNER_TEMP/xstore019o-cli-acl-diag"
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
node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-auth-data-toposort.mjs" "$work/archive.toc" "$work/auth-fks.tsv" "$work/auth-replay.toc" "$work/auth-clear.sql"
# Disposable local clone may have initialized Auth seed rows absent from empty restore target.
# Delete only original archived Auth tables in reverse FK order. No cascade and no disabled FK.
docker cp "$work/auth-clear.sql" "$db_container:/tmp/auth-clear.sql"
: > "$log"
if ! docker exec "$db_container" psql -U supabase_admin -d postgres -qAtX -v ON_ERROR_STOP=1 -f /tmp/auth-clear.sql >/dev/null 2>"$log"; then
 node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-restore-error-classifier.mjs" "$log"
 echo '::error::XSTORE_019O_INITIALIZED_AUTH_SEED_CLEAR=FAIL_CLOSED'; exit 1
fi
echo 'XSTORE_019O_INITIALIZED_AUTH_SEED_CLEAR=PASS; FK_ENFORCED; ISOLATED_ONLY'
docker cp "$work/auth-replay.toc" "$db_container:/tmp/auth-replay.toc"
: > "$log"
if ! docker exec "$db_container" pg_restore --exit-on-error --single-transaction --section=data --use-list=/tmp/auth-replay.toc --username=supabase_admin --dbname=postgres /tmp/magasin-archive.dump >/dev/null 2>"$log"; then
 node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-restore-error-classifier.mjs" "$log"
 echo "::error::XSTORE_019O_INITIALIZED_CLONE_AUTH_DATA=FAIL"; exit 1
fi
echo 'XSTORE_019O_INITIALIZED_CLONE_AUTH_DATA=PASS; FK_ENFORCED'
# Initialized Supabase Storage can contain seed rows that conflict with genuine archived keys.
# Reconcile only archived Storage tables, in enforced FK dependency order; no FK or permission bypass.
docker exec "$db_container" psql -U postgres -d postgres -AtX -F '|' -v ON_ERROR_STOP=1 -c "SELECT cn.nspname||'.'||child.relname, pn.nspname||'.'||parent.relname FROM pg_constraint con JOIN pg_class child ON child.oid=con.conrelid JOIN pg_namespace cn ON cn.oid=child.relnamespace JOIN pg_class parent ON parent.oid=con.confrelid JOIN pg_namespace pn ON pn.oid=parent.relnamespace WHERE con.contype='f' AND cn.nspname='storage' ORDER BY 1,2" > "$work/storage-fks.tsv"
# Detect every enabled or disabled DELETE trigger; protected tables must already be empty.
# Do not disable triggers, forge Storage API writes or reveal table identifiers in logs.
docker exec "$db_container" psql -U postgres -d postgres -AtX -v ON_ERROR_STOP=1 -c "SELECT DISTINCT c.relname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='storage' AND NOT t.tgisinternal AND (t.tgtype::int & 8)<>0 ORDER BY 1" > "$work/storage-protected-delete.tsv"
node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-storage-data-toposort.mjs" "$work/archive.toc" "$work/storage-fks.tsv" "$work/storage-protected-delete.tsv" "$work/storage-replay.toc" "$work/storage-clear.sql"
docker cp "$work/storage-clear.sql" "$db_container:/tmp/storage-clear.sql"
: > "$log"
if ! docker exec "$db_container" psql -U supabase_admin -d postgres -qAtX -v ON_ERROR_STOP=1 -v VERBOSITY=sqlstate -f /tmp/storage-clear.sql >/dev/null 2>"$log"; then
 node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-restore-error-classifier.mjs" "$log"
 echo '::error::XSTORE_019O_INITIALIZED_STORAGE_SEED_CLEAR=FAIL_CLOSED'; exit 1
fi
echo 'XSTORE_019O_INITIALIZED_STORAGE_SEED_CLEAR=PASS; FK_ENFORCED; ISOLATED_ONLY'
docker cp "$work/storage-replay.toc" "$db_container:/tmp/storage-replay.toc"
: > "$log"
if ! docker exec "$db_container" pg_restore --exit-on-error --single-transaction --section=data --use-list=/tmp/storage-replay.toc --username=supabase_admin --dbname=postgres /tmp/magasin-archive.dump >/dev/null 2>"$log"; then
 node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-restore-error-classifier.mjs" "$log"
 echo "::error::XSTORE_019O_INITIALIZED_CLONE_STORAGE_DATA=FAIL"; exit 1
fi
echo 'XSTORE_019O_INITIALIZED_CLONE_STORAGE_DATA=PASS; FK_ENFORCED'
# Replay authenticated production Public DEFAULT ACL before creating Public objects.
node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-early-default-acl.mjs" "$work/archive.toc" "$work/public-defaults.toc"
docker cp "$work/public-defaults.toc" "$db_container:/tmp/public-defaults.toc"
: > "$log"
if ! docker exec "$db_container" pg_restore --exit-on-error --single-transaction --use-list=/tmp/public-defaults.toc --username=supabase_admin --dbname=postgres /tmp/magasin-archive.dump >/dev/null 2>"$log"; then
 node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-restore-error-classifier.mjs" "$log"
 echo '::error::XSTORE_019O_EARLY_DEFAULT_ACL_RESTORE=FAIL'; exit 1
fi
echo 'XSTORE_019O_EARLY_DEFAULT_ACL_RESTORE=PASS; ARCHIVE_ONLY; ISOLATED_ONLY'
for stage in pre-data data post-data; do restore_stage public "$stage" "PUBLIC_$stage"; done
# pg_restore --section stages can omit standalone ACL/DEFAULT ACL TOC entries.
# Replay ONLY authentic archived public privilege entries without section filtering.
node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-public-acl-toc.mjs" "$work/archive.toc" "$work/public-acl-replay.toc"
docker cp "$work/public-acl-replay.toc" "$db_container:/tmp/public-acl-replay.toc"
: > "$log"
if ! docker exec "$db_container" pg_restore --exit-on-error --single-transaction --use-list=/tmp/public-acl-replay.toc --username=supabase_admin --dbname=postgres /tmp/magasin-archive.dump >/dev/null 2>"$log"; then
 node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-restore-error-classifier.mjs" "$log"
 echo '::error::XSTORE_019O_PUBLIC_ACL_REPLAY=FAIL'; exit 1
fi
echo 'XSTORE_019O_PUBLIC_ACL_REPLAY=PASS; ORIGINAL_ARCHIVE_ONLY; NO_PRIVILEGE_BYPASS'
docker cp "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-owner-acl-recovery-fingerprint.sql" "$db_container:/tmp/parity.sql"
docker exec "$db_container" psql -U postgres -d postgres -AtX -v ON_ERROR_STOP=1 -f /tmp/parity.sql > "$RUNNER_TEMP/xstore019o-cli-parity" 2>"$log" || exit 1
if [[ "$(cat "$RUNNER_TEMP/xstore019o-cli-parity")" != PASS ]]; then
 # Metadata-only diagnostic: emit exactly eleven binary PASS/FAIL flags, no SQL/data.
 docker cp "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-initialized-parity-dimensions.sql" "$db_container:/tmp/parity-dimensions.sql"
 : > "$log"
 if ! docker exec "$db_container" psql -U postgres -d postgres -AtX -v ON_ERROR_STOP=1 -f /tmp/parity-dimensions.sql > "$RUNNER_TEMP/xstore019o-cli-parity-diag" 2>"$log"; then
  echo '::error::XSTORE_019O_PARITY_DIMENSIONS_DIAGNOSTIC_FAILED'; exit 1
 fi
 node - "$RUNNER_TEMP/xstore019o-cli-parity-diag" <<'NODE'
const fs=require('node:fs');
const got=fs.readFileSync(process.argv[2],'utf8').trim();
const fields=got.split('; ');
const expected=['REL_OWNER','REL_ACL','REL_RLS','FN_OWNER','FN_ACL','FN_DEFINER','POL_ACCESS','POL_PREDICATE','REL_COUNT','FN_COUNT','POL_COUNT'];
const good=fields.length===expected.length+1 && fields[0]==='XSTORE_019O_PARITY_DIMENSIONS' &&
 expected.every((name,i)=>fields[i+1]===name+'=PASS'||fields[i+1]===name+'=FAIL');
if(!good){console.error('::error::XSTORE_019O_PARITY_DIMENSIONS_OUTPUT_INVALID');process.exit(1)}
console.log(got);
NODE
 # Compare effective privileges, ACL grantors and explicit-vs-default representation.
 docker cp "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-effective-acl-diag.sql" "$db_container:/tmp/effective-acl-diag.sql"
 : > "$log"
 if ! docker exec "$db_container" psql -U postgres -d postgres -AtX -v ON_ERROR_STOP=1 -f /tmp/effective-acl-diag.sql > "$RUNNER_TEMP/xstore019o-cli-acl-diag" 2>"$log"; then
  echo '::error::XSTORE_019O_ACL_EFFECTIVE_DIAG_QUERY_FAILED'; exit 1
 fi
 node - "$RUNNER_TEMP/xstore019o-cli-acl-diag" <<'NODE'
const fs=require('node:fs');
const got=fs.readFileSync(process.argv[2],'utf8').trim();
const fields=got.split('; ');
const keys=['REL_EDGES','FN_EDGES','REL_NULL','FN_NULL','REL_SEMANTICS','FN_SEMANTICS','REL_GRANTOR','FN_GRANTOR'];
const valid=fields.length===9 && fields[0]==='XSTORE_019O_ACL_EFFECTIVE_DIAG' &&
 keys.every((k,i)=>fields[i+1]===k+'=PASS'||fields[i+1]===k+'=FAIL');
if(!valid){console.error('::error::XSTORE_019O_ACL_EFFECTIVE_DIAG_OUTPUT_INVALID');process.exit(1)}
console.log(got);
NODE
 echo '::error::XSTORE_019O_CLI_CLONE_OWNER_ACL_RLS_PARITY=FAIL'; exit 1
fi
echo 'XSTORE_019O_CLI_CLONE_OWNER_ACL_RLS_PARITY=PASS; FULL_DISASTER_RECOVERY=NOT_PROVEN; NO_PRODUCTION_WRITE'
