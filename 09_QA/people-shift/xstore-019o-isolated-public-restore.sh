#!/usr/bin/env bash
# XSTORE-019O: diagnostic, public schema only, never production restore.
set -Eeuo pipefail
umask 077
: "$BACKUP_WORK" "$RUNNER_TEMP" "$GITHUB_WORKSPACE" "$GITHUB_RUN_ID"
[[ "$XSTORE019O_TEST_ONLY" == ISOLATED_PUBLIC_ONLY ]] || { echo '::error::ISOLATED_PUBLIC_OPT_IN_REQUIRED'; exit 2; }
[[ "$GITHUB_EVENT_NAME" == push && "$GITHUB_REF" == refs/heads/main ]] || { echo '::error::TRUSTED_MAIN_ONLY'; exit 2; }
[[ "$BACKUP_WORK" == "$GITHUB_WORKSPACE"/* && -s "$BACKUP_WORK/restore-check.dump" ]] || { echo '::error::PRIVATE_BACKUP_NOT_READY'; exit 2; }

container="xstore019o-public-$GITHUB_RUN_ID"
log="$RUNNER_TEMP/xstore019o-public-private-stderr"
cleanup(){
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -f "$log" "$RUNNER_TEMP/xstore019o-private-proof" "$RUNNER_TEMP/xstore019o-private-archive-toc" "$RUNNER_TEMP/xstore019o-auth-user-first.toc" "$RUNNER_TEMP/xstore019o-auth-remainder.toc"
}
trap cleanup EXIT
# Network-disabled database container. No host mounts or production DB URLs.
docker run --rm -d --network none --name "$container" \
  -e POSTGRES_PASSWORD=synthetic-disposable-only \
  supabase/postgres:17.6.1.173 \
  postgres -c config_file=/etc/postgresql/postgresql.conf >/dev/null
stable=0; previous=''
for i in $(seq 1 75); do
  start=''
  if docker exec "$container" pg_isready -U postgres -q >/dev/null 2>&1; then
    start="$(docker exec "$container" psql -U postgres -d postgres -AtX -c 'select pg_postmaster_start_time()::text' 2>/dev/null || true)"
  fi
  if [[ -n "$start" && "$start" == "$previous" ]]; then stable=$((stable+1)); else stable=0; fi
  previous="$start"
  if ((stable>=8)); then break; fi
  sleep 2
done
((stable>=8)) || { echo '::error::ISOLATED_PG17_NOT_STABLE'; exit 1; }
docker exec "$container" createdb -U postgres xstore019o_public >/dev/null 2>"$log" || {
  echo '::error::ISOLATED_PUBLIC_DB_CREATE_FAILED'; exit 1;
}
docker cp "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-isolated-platform-roles.sql" "$container:/tmp/roles.sql"
docker exec "$container" psql -U supabase_admin -d postgres -q -v ON_ERROR_STOP=1 -f /tmp/roles.sql >/dev/null 2>"$log" || {
  echo '::error::ISOLATED_ROLE_BOOTSTRAP_FAILED'; exit 1;
}
echo 'XSTORE_019O_ISOLATED_PUBLIC_ROLES=PASS; NO_PRODUCTION_WRITE'
# Inventory archive metadata locally; never emit full TOC, SQL, relation names
# or any production data. If Auth's canonical prerequisite table is absent
# entirely, the solution is a correctly initialized Supabase clone, NOT a fake
# table and NOT a skipped foreign key.
toc="$RUNNER_TEMP/xstore019o-private-archive-toc"
if ! docker exec -i "$container" pg_restore --list \
   < "$BACKUP_WORK/restore-check.dump" > "$toc" 2>"$log"; then
  echo '::error::XSTORE_019O_ENCRYPTED_ARCHIVE_TOC_FAIL'; exit 1;
fi
if grep -Eq '^[0-9]+;.*[[:space:]]TABLE auth users[[:space:]]' "$toc"; then
  echo 'XSTORE_019O_AUTH_USERS_TABLE_IN_ARCHIVE=YES; NO_PII_OUTPUT'
else
  echo 'XSTORE_019O_AUTH_USERS_TABLE_IN_ARCHIVE=NO; NO_PII_OUTPUT'
fi

# Run 38751306755 identified first Auth pre-data CREATE_TYPE referencing
# an Auth relation that exists in the encrypted TOC but is not yet created.
# Reorder exactly the Auth SCHEMA and users TABLE definitions (in that order) before remaining Auth pre-data
# entries; every TOC item is still restored once, without --no-owner/--no-acl.
# Do not print the encrypted archive TOC or SQL object names in runner logs.
user_toc="$RUNNER_TEMP/xstore019o-auth-user-first.toc"
remaining_toc="$RUNNER_TEMP/xstore019o-auth-remainder.toc"
node - "$toc" "$user_toc" "$remaining_toc" <<'NODE'
const fs=require('node:fs'), assert=require('node:assert/strict');
const [input,firstFile,restFile]=process.argv.slice(2);
const lines=fs.readFileSync(input,'utf8').split(/\r?\n/);
const isSchema=(line)=>/^\d+;.*\sSCHEMA - auth\s/.test(line);
const isUsers=(line)=>/^\d+;.*\sTABLE auth users\s/.test(line);
assert.equal(lines.filter(isSchema).length,1,'EXPECTED_EXACTLY_ONE_AUTH_SCHEMA_DEFINITION');
assert.equal(lines.filter(isUsers).length,1,'EXPECTED_EXACTLY_ONE_AUTH_USERS_TABLE_DEFINITION');
const selected=(line)=>isSchema(line)||isUsers(line);
const header=lines.filter(x=>/^;/.test(x)).join('\n')+'\n';
fs.writeFileSync(firstFile,header+[...lines.filter(isSchema),...lines.filter(isUsers)].join('\n')+'\n',{mode:0o600});
fs.writeFileSync(restFile,lines.map(x=>selected(x)?'; '+x:x).join('\n'),{mode:0o600});
console.log('XSTORE_019O_AUTH_SCHEMA_THEN_USERS_TOC=PASS; EXACTLY_ONCE; ALL_ENTRIES_PRESERVED; NO_SQL_OUTPUT');
NODE
# pg_restore executes INSIDE Docker: its --use-list paths must exist there,
# not merely under the runner's private $RUNNER_TEMP filesystem.
docker cp "$user_toc" "$container:/tmp/auth-users-first.toc"
docker cp "$remaining_toc" "$container:/tmp/auth-remainder.toc"
echo 'XSTORE_019O_AUTH_TOC_PRIVATE_CONTAINER_COPY=PASS; NO_SQL_OUTPUT'
: > "$log"
if ! docker exec -i "$container" pg_restore --exit-on-error \
    --use-list=/tmp/auth-users-first.toc --schema=auth --section=pre-data \
    --username=supabase_admin --dbname=xstore019o_public \
    < "$BACKUP_WORK/restore-check.dump" >/dev/null 2>"$log"; then
  node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-restore-error-classifier.mjs" "$log"
  echo '::error::XSTORE_019O_AUTH_USERS_EARLY_TABLE=FAIL; NO_PRODUCTION_WRITE'
  exit 1
fi
echo 'XSTORE_019O_AUTH_SCHEMA_THEN_USERS=PASS; NO_PRODUCTION_WRITE'
# Actual main run 38734337460: public post-data ADD_FOREIGN_KEY failed because
# the referenced AUTH relation did not exist in this isolated clone. Restore
# the real Auth prerequisite definitions and rows from the same authenticated
# AES-256-GCM archive before enforcing public FKs. This does not claim to
# restore Auth triggers/policies or a full Supabase disaster recovery.
for stage in pre-data data; do
  : > "$log"
  if ! docker exec -i "$container" pg_restore --exit-on-error \
       --schema=auth --section="$stage" --username=supabase_admin \
       --use-list=/tmp/auth-remainder.toc \
       --dbname=xstore019o_public < "$BACKUP_WORK/restore-check.dump" \
       >/dev/null 2>"$log"; then
    node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-restore-error-classifier.mjs" "$log"
    echo "::error::XSTORE_019O_AUTH_PREREQUISITE_$stage=FAIL; NO_PRODUCTION_WRITE"
    exit 1
  fi
  echo "XSTORE_019O_AUTH_PREREQUISITE_$stage=PASS; NO_PRODUCTION_WRITE"
done

# Never skip ownership, GRANT/REVOKE, FK or RLS.
for stage in pre-data data post-data; do
  : > "$log"
  if ! docker exec -i "$container" pg_restore --exit-on-error \
       --schema=public --section="$stage" --username=supabase_admin \
       --dbname=xstore019o_public < "$BACKUP_WORK/restore-check.dump" \
       >/dev/null 2>"$log"; then
    node "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-restore-error-classifier.mjs" "$log"
    echo "::error::XSTORE_019O_PUBLIC_$stage=FAIL; NO_PRODUCTION_WRITE"
    exit 1
  fi
  echo "XSTORE_019O_PUBLIC_$stage=PASS; NO_PRODUCTION_WRITE"
done

docker cp "$GITHUB_WORKSPACE/09_QA/people-shift/xstore-019o-owner-acl-recovery-fingerprint.sql" "$container:/tmp/parity.sql"
if ! docker exec "$container" psql -U postgres -d xstore019o_public -AtX -v ON_ERROR_STOP=1 \
    -f /tmp/parity.sql > "$RUNNER_TEMP/xstore019o-private-proof" 2>"$log"; then
  echo '::error::XSTORE_019O_PUBLIC_METADATA_QUERY=FAIL'; exit 1;
fi
proof="$(cat "$RUNNER_TEMP/xstore019o-private-proof")"
if [[ "$proof" != PASS ]]; then
  echo '::error::XSTORE_019O_PUBLIC_OWNER_ACL_RLS_PARITY=FAIL'; exit 1;
fi
echo 'XSTORE_019O_PUBLIC_OWNER_ACL_RLS_PARITY=PASS; NO_PRODUCTION_WRITE; NO_PII_OUTPUT'
echo 'XSTORE_019O_FULL_SYSTEM_DISASTER_RESTORE=NOT_PROVEN'
