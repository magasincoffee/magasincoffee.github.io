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
  rm -f "$log" "$RUNNER_TEMP/xstore019o-private-proof"
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
